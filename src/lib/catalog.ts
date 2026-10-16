import { z } from 'zod';
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import type { Catalog, Design, Fabric } from './types';
import fabricData from '../content/fabrics.json';
import settingsData from '../content/settings.json';

const localized = z.object({ ko: z.string().min(1), en: z.string().min(1), vi: z.string().optional() });
const fabricId = z.enum(['suzhou', 'ruby']);
const imagePath = z.string().regex(/^assets\/(designs|fabrics)\/[a-zA-Z0-9_\-/.]+\.(jpg|jpeg|png|webp)$/).refine(p => !p.includes('..'));
const designSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9-]{1,100}$/), slug: z.string().regex(/^[a-z0-9-]+$/),
  category: z.enum(['dress', 'top', 'trouser', 'sleepwear', 'loungewear', 'skirt']), name: localized, description: localized,
  image: imagePath, published: z.boolean(), featured: z.boolean(), order: z.number(),
  priceMin: z.number().int().positive().nullable().default(null), priceMax: z.number().int().positive().nullable().default(null),
  fabrics: z.array(fabricId).min(1),
  reviews: z.array(z.object({ label: localized, url: z.url().refine(value => {
    const url = new URL(value);
    return url.protocol === 'https:' && ['instagram.com', 'www.instagram.com', 'threads.net', 'www.threads.net', 'threads.com', 'www.threads.com'].includes(url.hostname);
  }, 'Use an Instagram or Threads HTTPS URL') })).default([]),
  gallery: z.array(imagePath).optional().default([]),
}).refine(d => (d.priceMin === null && d.priceMax === null) || (d.priceMin !== null && d.priceMax !== null && d.priceMin <= d.priceMax), 'Provide both price bounds, in ascending order');
export const settings = z.object({ instagram: z.string().regex(/^[A-Za-z0-9_.]+$/), threads: z.string().regex(/^[A-Za-z0-9_.]+$/), currency: z.literal('KRW'), defaultLocale: z.literal('ko'), brand: z.string(), sheetId: z.string().optional(), orderApiUrl: z.string().optional() }).parse(settingsData);
export const fabrics: Fabric[] = z.array(z.object({ id: fabricId, name: localized, description: localized, charts: z.array(imagePath), colors: z.array(z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/).refine(id=>id!=='consult', 'consult is reserved for consultation'), code: z.string(), name: localized, hex: z.string().regex(/^#[a-fA-F0-9]{6}$/) })) })).parse(fabricData);
const records = import.meta.glob('../content/designs/*.json', { eager: true, import: 'default' });
export const designs: Design[] = Object.values(records).map(value => designSchema.parse(value)).filter(d => d.published).sort((a,b) => a.order - b.order);
if (!designs.length) throw new Error('Publish at least one design before building the store.');
if (new Set(designs.map(d=>d.id)).size !== designs.length || new Set(designs.map(d=>d.slug)).size !== designs.length) throw new Error('Design IDs and slugs must be unique.');
if (new Set(fabrics.map(f=>f.id)).size !== fabrics.length) throw new Error('Fabric IDs must be unique.');
for (const fabric of fabrics) {
  if (new Set(fabric.colors.map(c=>c.id)).size !== fabric.colors.length) throw new Error('Color IDs must be unique within each silk.');
}
for (const design of designs) {
  if (design.fabrics.some(id=>!fabrics.some(f=>f.id===id))) throw new Error('Design references an unknown fabric: ' + design.id);
}
const images = import.meta.glob<ImageMetadata>('../../assets/{designs,fabrics}/**/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });
export function sourceImage(path: string) {
  const source = images['../../' + path];
  if (!source) throw new Error('Missing catalog image: ' + path);
  return source;
}
let prepared: Promise<Catalog> | undefined;
export function getCatalog(): Promise<Catalog> {
  return prepared ??= Promise.all(designs.map(async design => {
    const src = sourceImage(design.image);
    const [large, thumb] = await Promise.all([getImage({ src, width: 1000, format: 'webp', quality: 82 }), getImage({ src, width: 480, format: 'webp', quality: 80 })]);
    const galleryUrls = await Promise.all((design.gallery || []).map(async gPath => {
      const gSrc = sourceImage(gPath);
      const gLarge = await getImage({ src: gSrc, width: 1000, format: 'webp', quality: 82 });
      return gLarge.src;
    }));
    return { ...design, imageUrl: large.src, thumbnailUrl: thumb.src, galleryUrls };
  })).then(products => ({ designs: products, fabrics, instagram: settings.instagram }));
}
