import { describe, it, expect } from 'vitest';
import { layoutProposal, PAGE, proposalDocument, wrapText, type ProposalInput } from '../src/lib/proposal-document';
import type { Catalog, Selection } from '../src/lib/types';

const catalog: Catalog = {
  instagram: 'michelle1998kr',
  designs: [{ id: 'ML-01', slug: 'dress', category: 'dress', name: { ko: '드레스', en: 'Dress' }, description: { ko: '설명', en: 'Description' }, image: 'assets/designs/dress.jpg', imageUrl: '/dress.webp', thumbnailUrl: '/dress-small.webp', priceMin: null, priceMax: null, published: true, featured: true, order: 1, fabrics: ['suzhou', 'ruby'], reviews: [] }],
  fabrics: [
    { id: 'suzhou', name: { ko: '수저우', en: 'Suzhou' }, description: { ko: '설명', en: 'Description' }, charts: [], colors: [
      { id: '04', code: '04', name: { ko: '아이보리', en: 'Ivory' }, hex: '#e9dfca' },
      { id: '76', code: '76', name: { ko: '올리브', en: 'Olive' }, hex: '#687532' },
    ] },
    { id: 'ruby', name: { ko: '루비', en: 'Ruby' }, description: { ko: '설명', en: 'Description' }, charts: [], colors: [] },
  ],
};
const item: Selection = { id: 'one', designId: 'ML-01', fabricId: 'suzhou', colorId: '04', quantity: 1, note: '기장 문의' };
const input = (items: Selection[]): ProposalInput => ({ cart: { version: 1, items }, catalog, lang: 'ko', units: 'metric', measurements: { chest: 88, waist: 68, hips: 94, height: 168, weight: 55 } });
// Conservative full-width glyph metrics exercise Korean wrapping without a browser.
const measure = (value: string, size: number) => Array.from(value).length * size;

describe('visual proposal content', () => {
  it('keeps each variant paired with its exact swatch, code, photo, quantity and note', () => {
    const document = proposalDocument(input([item, { ...item, id: 'two', colorId: '76', quantity: 2, note: '소매 문의' }]));
    expect(document.count).toBe(3);
    expect(document.pieces.map(piece => [piece.photo, piece.colorCode, piece.swatch, piece.quantity, piece.note])).toEqual([
      ['/dress-small.webp', '04', '#e9dfca', 1, '기장 문의'],
      ['/dress-small.webp', '76', '#687532', 2, '소매 문의'],
    ]);
    expect(document.measurements).toContainEqual({ label: '가슴둘레', value: '88 cm' });
    expect(document.pieces[0].price).toBe('가격 문의');
  });
  it('never invents a Ruby color from an item note', () => {
    const document = proposalDocument(input([{ ...item, fabricId: 'ruby', colorId: 'consult', note: '네이비를 원해요' }]));
    expect(document.pieces[0]).toMatchObject({ swatch: null, colorCode: null, colorName: '미셸과 색상 상담', note: '네이비를 원해요' });
  });
  it('uses the selected language and units in the visual document', () => {
    const document = proposalDocument({ ...input([item]), lang: 'en', units: 'imperial', measurements: { chest: 35, waist: 27, hips: 37, height: 66, weight: 121 } });
    expect(document.pieces[0]).toMatchObject({ name: 'Dress', colorName: 'Ivory', price: 'Ask for pricing' });
    expect(document.measurements).toContainEqual({ label: 'Weight', value: '121 lb' });
    expect(document.measurements).toContainEqual({ label: 'Height', value: '66 in' });
  });
});

describe('visual proposal pagination', () => {
  it('fits a normal two-item proposal and shared measurements on one page', () => {
    const pages = layoutProposal(proposalDocument(input([item, { ...item, id: 'two', colorId: '76' }])), measure);
    expect(pages).toHaveLength(1);
    expect(pages[0].map(block => block.kind)).toEqual(['piece', 'piece', 'measurements']);
  });
  it('preserves all long-note lines and all variants across pages without overlaps', () => {
    const note = Array.from({ length: 70 }, (_, index) => `질문${index}`).join('\n');
    const document = proposalDocument(input([item, { ...item, id: 'two', colorId: '76', note }]));
    const pages = layoutProposal(document, measure);
    expect(pages.length).toBeGreaterThan(1);
    const blocks = pages.flat();
    expect(blocks.filter(block => block.kind === 'measurements')).toHaveLength(1);
    const continuedItem = blocks.filter(block => block.kind === 'piece' && block.piece.number === 2);
    expect(continuedItem.flatMap(block => block.kind === 'piece' ? block.noteLines : [])).toEqual(note.split('\n'));
    expect(continuedItem.some(block => block.kind === 'piece' && block.continued)).toBe(true);
    for (const page of pages) {
      expect(page.length).toBeGreaterThan(0);
      let previousBottom = PAGE.top;
      for (const block of page) {
        expect(block.top).toBeGreaterThanOrEqual(previousBottom);
        expect(block.top + block.height).toBeLessThanOrEqual(PAGE.bottom);
        previousBottom = block.top + block.height;
      }
    }
  });
  it('wraps long Korean text and emoji without losing characters', () => {
    const note = '실크💚'.repeat(100);
    const lines = wrapText(note, 904, 24, measure);
    expect(lines.join('')).toBe(note);
    expect(lines.every(line => measure(line, 24) <= 904)).toBe(true);
  });
});
