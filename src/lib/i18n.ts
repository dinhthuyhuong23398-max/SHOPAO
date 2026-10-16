import type { Locale } from './types';
export const locales: Locale[] = ['ko', 'en'];

export function text(lang: Locale, ko: string, en: string, vi?: string): string {
  if (lang === 'vi') return vi || en;
  if (lang === 'ko') return ko;
  return en;
}

export const categoryNames: Record<string, { ko: string; en: string; vi: string }> = {
  dress: { ko: '드레스', en: 'Dresses', vi: 'Đầm (Dresses)' },
  top: { ko: '탑 & 블라우스', en: 'Tops & blouses', vi: 'Áo & Blouse (Tops)' },
  trouser: { ko: '트라우저', en: 'Trousers', vi: 'Quần (Trousers)' },
  sleepwear: { ko: '슬립웨어', en: 'Sleepwear', vi: 'Đồ ngủ (Sleepwear)' },
  loungewear: { ko: '라운지웨어', en: 'Loungewear', vi: 'Đồ mặc nhà (Loungewear)' },
  skirt: { ko: '스커트', en: 'Skirts', vi: 'Chân váy (Skirts)' }
};

export const collectionTypes = {
  silk: {
    ko: '맞춤 실크 (치수 맞춤 제작)',
    en: 'Bespoke Silk (Made to Measure)',
    vi: 'Đồ Lụa May Đo (Theo số đo riêng)'
  },
  linen: {
    ko: '린넨 컬렉션 (기성 사이즈)',
    en: 'Ready-to-wear Linen (Standard sizes)',
    vi: 'Đồ Linen May Sẵn (Size chuẩn)'
  }
};
