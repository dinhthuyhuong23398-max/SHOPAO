export type Locale = 'ko' | 'vi' | 'en';
export type Localized = { ko: string; en: string; vi?: string; [key: string]: string | undefined };
export type FabricId = 'suzhou' | 'ruby';
export interface Color { id: string; code: string; name: Localized; hex: string }
export interface Fabric { id: FabricId; name: Localized; description: Localized; colors: Color[]; charts: string[] }
export interface Design {
  id: string; slug: string; category: 'dress' | 'top' | 'trouser' | 'sleepwear' | 'loungewear' | 'skirt'; name: Localized;
  description: Localized; image: string; published: boolean; featured: boolean; order: number;
  priceMin: number | null; priceMax: number | null; fabrics: FabricId[];
  reviews: { label: Localized; url: string }[];
  gallery?: string[];
}
export interface Product extends Design { imageUrl: string; thumbnailUrl: string; galleryUrls?: string[]; }
export interface Catalog { designs: Product[]; fabrics: Fabric[]; instagram: string }
export interface Selection {
  id: string; designId: string; colorId: string; fabricId: FabricId; quantity: number; note: string;
}
export interface Cart { version: 1; items: Selection[] }
export interface Measurements { chest: number; waist: number; hips: number; height: number; weight: number }
export type UnitSystem = 'metric' | 'imperial';
