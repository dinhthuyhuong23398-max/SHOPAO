import { layoutProposal, PAGE, proposalDocument, type ProposalInput, type PieceBlock, type ProposalDocument } from './proposal-document';
import { text } from './i18n';

export interface ProposalImage { url: string; filename: string }
const SANS = '"Noto Sans KR Variable", sans-serif';
const COLORS = { paper: '#f7f5ee', ink: '#26382c', muted: '#686d61', line: '#d9dace', white: '#fffefa' };

function loadPhoto(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const photo = new Image();
    const timeout = window.setTimeout(() => { photo.onload = photo.onerror = null; reject(new Error('Photo timed out')); }, 15000);
    photo.onload = () => { clearTimeout(timeout); resolve(photo); };
    photo.onerror = () => { clearTimeout(timeout); reject(new Error('Photo could not be loaded')); };
    photo.src = src;
  });
}

/** Preserve the original photo; the separate swatch indicates the chosen color. */
function drawPhoto(ctx: CanvasRenderingContext2D, photo: HTMLImageElement, x: number, y: number) {
  const width = 184, height = 230;
  ctx.fillStyle = '#eeeee6';
  ctx.fillRect(x, y, width, height);
  const scale = Math.min(width / photo.naturalWidth, height / photo.naturalHeight);
  const w = photo.naturalWidth * scale, h = photo.naturalHeight * scale;
  ctx.drawImage(photo, x + (width - w) / 2, y + (height - h) / 2, w, h);
}

function line(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, color = COLORS.ink) {
  ctx.font = `400 ${size}px ${SANS}`;
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}

function drawPiece(ctx: CanvasRenderingContext2D, block: PieceBlock, photo: HTMLImageElement, lang: ProposalInput['lang']) {
  const { piece, top, height, nameLines, colorLines, headerHeight, noteLines } = block;
  const left = PAGE.left;
  ctx.fillStyle = COLORS.white;
  ctx.fillRect(left, top, PAGE.widthInside, height);
  ctx.strokeStyle = COLORS.line;
  ctx.strokeRect(left + .5, top + .5, PAGE.widthInside - 1, height - 1);
  drawPhoto(ctx, photo, left + 24, top + 24);
  line(ctx, text(lang, '디자인 참고 사진', 'Design reference'), left + 24, top + 274, 16, COLORS.muted);
  const x = left + 240;
  line(ctx, `${String(piece.number).padStart(2, '0')} / ${piece.designId}${block.continued ? text(lang, ' · 메모 계속', ' · note continued') : ''}`, x, top + 43, 18, COLORS.muted);
  let y = top + 87;
  nameLines.forEach(value => { line(ctx, value, x, y, 30); y += 39; });
  line(ctx, `${piece.fabric}  ·  ${text(lang, '수량', 'Quantity')} ${piece.quantity}`, x, y + 4, 23);
  y += 27;
  ctx.fillStyle = piece.swatch ?? COLORS.paper;
  ctx.fillRect(x, y, 54, 54);
  ctx.strokeStyle = piece.swatch ? '#b7bbae' : '#b0b4a5';
  ctx.setLineDash(piece.swatch ? [] : [5, 4]);
  ctx.strokeRect(x + .5, y + .5, 53, 53);
  ctx.setLineDash([]);
  if (!piece.swatch) line(ctx, '?', x + 19, y + 36, 26, COLORS.muted);
  let labelY = y + 22;
  colorLines.forEach(value => { line(ctx, value, x + 76, labelY, 24); labelY += 31; });
  line(ctx, piece.colorCode ? `${text(lang, '컬러 코드', 'Color code')} ${piece.colorCode}` : text(lang, '컬러 코드 미정', 'Color code to be confirmed'), x + 76, labelY - 1, 20, COLORS.muted);
  line(ctx, piece.price, x, labelY + 41, 21, COLORS.muted);
  if (noteLines.length) {
    const start = top + headerHeight;
    ctx.strokeStyle = COLORS.line;
    ctx.beginPath(); ctx.moveTo(left + 24, start); ctx.lineTo(left + PAGE.widthInside - 24, start); ctx.stroke();
    line(ctx, text(lang, '아이템 메모', 'Item note'), left + 24, start + 30, 18, COLORS.muted);
    noteLines.forEach((value, index) => line(ctx, value, left + 24, start + 64 + index * 33, 24));
  }
}

function drawMeasurements(ctx: CanvasRenderingContext2D, document: ProposalDocument, top: number, height: number) {
  ctx.fillStyle = '#e9eddf';
  ctx.fillRect(PAGE.left, top, PAGE.widthInside, height);
  line(ctx, text(document.lang, '신체 치수 · 한 사람 기준', 'Body measurements · one person'), PAGE.left + 24, top + 42, 25);
  document.measurements.forEach((measurement, index) => {
    const x = PAGE.left + 24 + (index % 3) * 310;
    const y = top + 84 + Math.floor(index / 3) * 63;
    line(ctx, measurement.label, x, y, 18, COLORS.muted);
    line(ctx, measurement.value, x, y + 30, 25);
  });
}

/** Render locally, including design thumbnails and color swatches, with automatic pagination. */
export async function proposalImages(input: ProposalInput): Promise<ProposalImage[]> {
  const documentData = proposalDocument(input);
  const fontText = JSON.stringify(documentData) + '사이즈 맞춤 제안서 디자인 참고 사진 수량 컬러 코드 미정 아이템 메모 신체 치수 한 사람 기준 화면 색상은 참고용입니다 최종 가격과 제작 가능 여부는 상담 후 확정됩니다';
  const photoSources = [...new Set(documentData.pieces.map(piece => piece.photo))];
  const [, photos] = await Promise.all([
    Promise.all([document.fonts.load(`24px ${SANS}`, fontText), document.fonts.load('56px "Cormorant Garamond Variable"', 'Michelle Store')]),
    Promise.all(photoSources.map(loadPhoto)),
  ]);
  const photoMap = new Map(photoSources.map((src, index) => [src, photos[index]]));
  const canvas = document.createElement('canvas');
  canvas.width = PAGE.width; canvas.height = PAGE.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  const pages = layoutProposal(documentData, (value, size) => {
    ctx.font = `400 ${size}px ${SANS}`;
    return ctx.measureText(value).width;
  });
  const results: ProposalImage[] = [];
  try {
    for (let index = 0; index < pages.length; index++) {
      ctx.fillStyle = COLORS.paper;
      ctx.fillRect(0, 0, PAGE.width, PAGE.height);
      ctx.fillStyle = COLORS.ink;
      ctx.font = '56px "Cormorant Garamond Variable", Georgia, serif';
      ctx.fillText('Michelle Store', PAGE.left, 86);
      line(ctx, text(input.lang, '사이즈 맞춤 제안서', 'Made-to-measure silk proposal'), PAGE.left, 132, 28);
      const count = `${text(input.lang, '총', 'Total')} ${documentData.count}${text(input.lang, '개', ' pieces')}`;
      ctx.textAlign = 'right'; line(ctx, count, PAGE.width - PAGE.left, 132, 21, COLORS.muted); ctx.textAlign = 'left';
      ctx.strokeStyle = COLORS.line;
      ctx.beginPath(); ctx.moveTo(PAGE.left, 162); ctx.lineTo(PAGE.width - PAGE.left, 162); ctx.stroke();
      for (const block of pages[index]) {
        if (block.kind === 'piece') drawPiece(ctx, block, photoMap.get(block.piece.photo)!, input.lang);
        else drawMeasurements(ctx, documentData, block.top, block.height);
      }
      line(ctx, text(input.lang, '사진은 디자인 참고용이며, 옆의 컬러칩이 선택하신 색상입니다.', 'Photos show the design. The separate swatch shows your selected color.'), PAGE.left, 1296, 19, COLORS.muted);
      line(ctx, text(input.lang, '화면 색상은 참고용입니다. 최종 가격과 제작 가능 여부는 상담 후 확정됩니다.', 'Screen colors are approximate. Final pricing and availability require confirmation.'), PAGE.left, 1328, 19, COLORS.muted);
      line(ctx, `@${input.catalog.instagram}`, PAGE.left, 1391, 18, COLORS.muted);
      ctx.textAlign = 'right'; line(ctx, `${index + 1} / ${pages.length}`, PAGE.width - PAGE.left, 1391, 18, COLORS.muted); ctx.textAlign = 'left';
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Export failed')), 'image/png'));
      results.push({ url: URL.createObjectURL(blob), filename: `michelle-proposal-${index + 1}-of-${pages.length}.png` });
    }
    return results;
  } catch (error) {
    results.forEach(result => URL.revokeObjectURL(result.url));
    throw error;
  }
}
