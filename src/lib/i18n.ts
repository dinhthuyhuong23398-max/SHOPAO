import type { Locale } from './types';
export const locales:Locale[]=['ko','en'];
export function text(lang:Locale,ko:string,en:string){return lang==='ko'?ko:en;}
export const categoryNames={dress:{ko:'드레스',en:'Dresses'},top:{ko:'탑 & 블라우스',en:'Tops & blouses'},trouser:{ko:'트라우저',en:'Trousers'}};
