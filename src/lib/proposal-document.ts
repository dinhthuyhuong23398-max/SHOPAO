import type { Cart, Catalog, Locale, Measurements, UnitSystem } from './types';
import { buildProposal, measurementKeys, measurementLabel, priceLabel, resolveItem } from './shop';
import { text } from './i18n';

export interface ProposalInput {
  cart: Cart; catalog: Catalog; measurements: Measurements; units: UnitSystem; lang: Locale;
}
export interface ProposalPiece {
  number: number; designId: string; name: string; photo: string;
  fabric: string; quantity: number; colorName: string; colorCode: string | null;
  swatch: string | null; price: string; note: string;
}

export function proposalDocument(input: ProposalInput) {
  const { cart, catalog, measurements, units, lang } = input;
  // Validate against the same source data as the on-screen proposal.
  buildProposal(cart, measurements, units, catalog, lang);
  return {
    lang,
    pieces: cart.items.map((item, index): ProposalPiece => {
      const { design, fabric, color } = resolveItem(item, catalog);
      return {
        number: index + 1, designId: design!.id, name: design!.name[lang],
        photo: design!.thumbnailUrl, fabric: fabric!.name[lang], quantity: item.quantity,
        colorName: color?.name[lang] ?? text(lang, '미셸과 색상 상담', 'Discuss color with Michelle'),
        colorCode: color?.code ?? null, swatch: color?.hex ?? null,
        price: priceLabel(design!, lang), note: item.note.trim(),
      };
    }),
    measurements: measurementKeys.map(key => ({
      label: measurementLabel(key, lang),
      value: `${Number(measurements[key].toFixed(2))} ${key === 'weight' ? (units === 'metric' ? 'kg' : 'lb') : (units === 'metric' ? 'cm' : 'in')}`,
    })),
    count: cart.items.reduce((total, item) => total + item.quantity, 0),
  };
}

export type ProposalDocument = ReturnType<typeof proposalDocument>;
export type MeasureText = (value: string, size: number) => number;
export const PAGE = { width: 1080, height: 1440, left: 64, widthInside: 952, top: 200, bottom: 1248, gap: 18 };
const TEXT_WIDTH = 672, NOTE_WIDTH = PAGE.widthInside - 48, NOTE_LINE = 33;

export function wrapText(value: string, width: number, size: number, measure: MeasureText): string[] {
  const lines: string[] = [];
  for (const paragraph of value.replace(/\r\n?/g, '\n').split('\n')) {
    let line = '';
    for (const character of Array.from(paragraph)) {
      if (line && measure(line + character, size) > width) { lines.push(line); line = ''; }
      line += character;
    }
    lines.push(line);
  }
  return lines;
}

export type PieceBlock = {
  kind: 'piece'; piece: ProposalPiece; top: number; height: number;
  nameLines: string[]; colorLines: string[]; headerHeight: number;
  noteLines: string[]; continued: boolean;
};
export type MeasurementBlock = { kind: 'measurements'; top: number; height: number };
export type ProposalPage = (PieceBlock | MeasurementBlock)[];

/** Keep each photo and color together. Repeat the item when long notes continue. */
export function layoutProposal(document: ProposalDocument, measure: MeasureText): ProposalPage[] {
  const pages: ProposalPage[] = [[]];
  let cursor = PAGE.top;
  const nextPage = () => { pages.push([]); cursor = PAGE.top; };
  const append = (block: PieceBlock | MeasurementBlock) => {
    pages[pages.length - 1].push(block);
    cursor += block.height + PAGE.gap;
  };
  for (const piece of document.pieces) {
    const nameLines = wrapText(piece.name, TEXT_WIDTH, 30, measure);
    const colorLines = wrapText(piece.colorName, TEXT_WIDTH - 78, 24, measure);
    const headerHeight = Math.max(286, 201 + nameLines.length * 39 + colorLines.length * 31);
    if (headerHeight + 88 > PAGE.bottom - PAGE.top) throw new Error('Design title is too long for the proposal');
    const notes = piece.note ? wrapText(piece.note, NOTE_WIDTH, 24, measure) : [];
    let offset = 0;
    do {
      const hasNotes = notes.length > offset;
      const minimum = headerHeight + (hasNotes ? 55 + NOTE_LINE : 0);
      if (cursor + minimum > PAGE.bottom) nextPage();
      const capacity = Math.max(0, Math.floor((PAGE.bottom - cursor - headerHeight - 55) / NOTE_LINE));
      const noteLines = hasNotes ? notes.slice(offset, offset + capacity) : [];
      const height = headerHeight + (hasNotes ? 55 + noteLines.length * NOTE_LINE : 0);
      append({ kind: 'piece', piece, top: cursor, height, nameLines, colorLines, headerHeight, noteLines, continued: offset > 0 });
      offset += noteLines.length;
    } while (offset < notes.length);
  }
  const height = 198;
  if (cursor + height > PAGE.bottom) nextPage();
  append({ kind: 'measurements', top: cursor, height });
  return pages;
}
