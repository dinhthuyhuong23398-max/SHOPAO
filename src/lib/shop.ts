import type { Cart, Catalog, Selection, Locale, Measurements, UnitSystem, Product } from './types';

export const CART_KEY = 'michelle.selections.v1';
export const MEASUREMENTS_KEY = 'michelle.measurements.v1';
export const MAX_ITEMS = 50;
export const MAX_NOTE = 500;
export const EMPTY_CART: Cart = { version: 1, items: [] };
const identifier = /^[a-zA-Z0-9_-]{1,100}$/;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export function parseCart(value: unknown): Cart {
  if (!record(value) || value.version !== 1 || !Array.isArray(value.items) || value.items.length > MAX_ITEMS) throw new Error('Invalid selection data');
  const seen = new Set<string>();
  const items = value.items.map((item: unknown): Selection => {
    if (!record(item) || typeof item.id !== 'string' || !identifier.test(item.id) || seen.has(item.id) || typeof item.designId !== 'string' || !identifier.test(item.designId) || typeof item.colorId !== 'string' || !identifier.test(item.colorId) || !['suzhou','ruby'].includes(String(item.fabricId)) || !Number.isInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 99 || typeof item.note !== 'string' || item.note.length > MAX_NOTE) throw new Error('Invalid selection item');
    seen.add(item.id);
    return { id:item.id, designId:item.designId, colorId:item.colorId, fabricId:item.fabricId as Selection['fabricId'], quantity:Number(item.quantity), note:item.note };
  });
  return { version: 1, items };
}

export function addItem(cart: Cart, item: Selection): Cart {
  parseCart({version:1,items:[item]});
  const existing = cart.items.find(i => i.designId === item.designId && i.fabricId === item.fabricId && i.colorId === item.colorId && i.note === item.note);
  if (existing) {
    if (existing.quantity + item.quantity > 99) throw new Error('quantity');
    return {version:1,items:cart.items.map(i=>i.id===existing.id?{...i,quantity:i.quantity+item.quantity}:i)};
  }
  if (cart.items.length >= MAX_ITEMS) throw new Error('capacity');
  return parseCart({version:1,items:[...cart.items,item]});
}

export function resolveItem(item: Selection, catalog: Catalog) {
  const design = catalog.designs.find(d => d.id === item.designId && d.published);
  const fabric = catalog.fabrics.find(f => f.id === item.fabricId);
  const color = fabric?.colors.find(c => c.id === item.colorId);
  const available = !!design && !!fabric && design.fabrics.includes(item.fabricId) && (item.colorId === 'consult' || !!color);
  return { design, fabric, color, available };
}

export function colorLabel(item: Selection, catalog: Catalog, lang: Locale) {
  if (item.colorId === 'consult') {
    if (lang === 'vi') return 'Tư vấn màu sắc';
    return lang === 'ko' ? '색상 상담' : 'Color consultation';
  }
  const color = resolveItem(item,catalog).color;
  const colorName = color ? (color.name[lang] || color.name.en || color.name.ko) : '';
  const prefix = lang === 'vi' ? 'Màu' : (lang === 'ko' ? '색상' : 'Color');
  return color ? `${colorName} · ${color.code}` : `${prefix} ${item.colorId}`;
}

export function priceLabel(design: Pick<Product,'priceMin'|'priceMax'>, lang: Locale) {
  if (design.priceMin === null || design.priceMax === null) {
    if (lang === 'vi') return 'Liên hệ báo giá';
    return lang === 'ko' ? '가격 문의' : 'Ask for pricing';
  }
  const format = (value:number) => new Intl.NumberFormat(lang === 'ko'?'ko-KR':lang === 'vi'?'vi-VN':'en-US',{style:'currency',currency:'KRW',maximumFractionDigits:0}).format(value);
  if (design.priceMin === design.priceMax) {
    return format(design.priceMin);
  }
  return `${format(design.priceMin)} – ${format(design.priceMax)}`;
}

// A recovery link deliberately excludes free text, body measurements, and prices.
export function encodeRecovery(cart: Cart): string {
  const clean = parseCart(cart);
  const payload = {v:1,i:clean.items.map(i=>[i.designId,i.fabricId,i.colorId,i.quantity])};
  return btoa(JSON.stringify(payload)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function decodeRecovery(encoded: string): Cart {
  if (encoded.length > 20000 || !/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error('Invalid recovery link');
  const value:unknown = JSON.parse(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')));
  if (!record(value) || value.v !== 1 || !Array.isArray(value.i) || value.i.length === 0 || value.i.length > MAX_ITEMS) throw new Error('Invalid recovery link');
  return parseCart({version:1,items:value.i.map((entry:unknown,index:number)=>{
    if (!Array.isArray(entry) || entry.length !== 4) throw new Error('Invalid recovery item');
    return {id:`restored-${index}`,designId:entry[0],fabricId:entry[1],colorId:entry[2],quantity:entry[3],note:''};
  })});
}

export const measurementKeys = ['chest','waist','hips','height','weight'] as const;
export function validMeasurements(value: unknown): value is Measurements {
  return record(value) && measurementKeys.every(key => typeof value[key] === 'number' && Number.isFinite(value[key]) && Number(value[key]) > 0 && Number(value[key]) <= 10000);
}
export function toMetric(value: Measurements, units: UnitSystem): Measurements {
  if (units === 'metric') return {...value};
  return {chest:value.chest*2.54,waist:value.waist*2.54,hips:value.hips*2.54,height:value.height*2.54,weight:value.weight*0.45359237};
}
export function fromMetric(value: Measurements, units: UnitSystem): Measurements {
  if (units === 'metric') return {...value};
  return {chest:value.chest/2.54,waist:value.waist/2.54,hips:value.hips/2.54,height:value.height/2.54,weight:value.weight/0.45359237};
}
export function measurementLabel(key: keyof Measurements, lang: Locale) {
  const labels: Record<keyof Measurements, { ko: string; en: string; vi: string }> = {
    chest: { ko: '가슴둘레', en: 'Chest', vi: 'Vòng ngực' },
    waist: { ko: '허리둘레', en: 'Waist', vi: 'Vòng eo' },
    hips: { ko: '엉덩이둘레', en: 'Hips', vi: 'Vòng mông' },
    height: { ko: '키', en: 'Height', vi: 'Chiều cao' },
    weight: { ko: '몸무게', en: 'Weight', vi: 'Cân nặng' }
  };
  return labels[key][lang] || labels[key].en;
}
export function buildProposal(cart: Cart, measurements: Measurements, units: UnitSystem, catalog: Catalog, lang: Locale): string {
  parseCart(cart);
  if (!cart.items.length || !validMeasurements(measurements) || cart.items.some(item=>!resolveItem(item,catalog).available)) throw new Error('Incomplete proposal');
  const greeting = lang === 'vi' 
    ? 'Xin chào Michelle, mình muốn đặt may đo các thiết kế lụa theo số đo cá nhân dưới đây:' 
    : (lang === 'ko' ? '안녕하세요 미셸님, 아래 디자인의 사이즈 맞춤 제작 상담을 요청드려요.' : 'Hi Michelle, I would like a quote for these designs made to my measurements.');
  const lines = [greeting, ''];
  cart.items.forEach((item,index)=>{
    const {design,fabric} = resolveItem(item,catalog);
    const dName = design!.name[lang] || design!.name.en || design!.name.ko;
    const fName = fabric!.name[lang] || fabric!.name.en || fabric!.name.ko;
    const qtyUnit = lang === 'vi' ? 'chiếc' : (lang === 'ko' ? '개' : 'piece(s)');
    const noteLabel = lang === 'vi' ? 'Ghi chú' : (lang === 'ko' ? '메모' : 'Note');
    lines.push(`${index+1}. ${dName} (${design!.id})`, `   ${fName} / ${colorLabel(item,catalog,lang)} / ${item.quantity} ${qtyUnit}`,`   ${priceLabel(design!,lang)}`);
    if(item.note.trim()) lines.push(`   ${noteLabel}: ${item.note.trim()}`);
  });
  const measureTitle = lang === 'vi' ? 'Số đo cơ thể cá nhân' : (lang === 'ko' ? '신체 치수 (한 사람 기준)' : 'Body measurements (one person)');
  lines.push('', measureTitle);
  for (const key of measurementKeys) lines.push(`${measurementLabel(key,lang)}: ${Number(measurements[key].toFixed(2))} ${key==='weight'?(units==='metric'?'kg':'lb'):(units==='metric'?'cm':'in')}`);
  const closing = lang === 'vi' 
    ? 'Nhờ Michelle tư vấn giúp mình về màu sắc, giá và thời gian hoàn thiện nhé. Cảm ơn Michelle!' 
    : (lang === 'ko' ? '최종 가격과 색상, 제작 가능 여부 및 소요 기간을 안내해 주세요. 감사합니다.' : 'Please confirm the final price, color availability and production time. Thank you.');
  lines.push('', closing);
  return lines.join('\n');
}
