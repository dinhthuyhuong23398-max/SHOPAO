import {describe,it,expect} from 'vitest';
import {addItem,parseCart,decodeRecovery,encodeRecovery,buildProposal,resolveItem,toMetric,fromMetric,validMeasurements,priceLabel} from '../src/lib/shop';
import type {Cart,Catalog,Selection,Measurements} from '../src/lib/types';
const item:Selection={id:'a',designId:'ML-01',fabricId:'suzhou',colorId:'04',quantity:1,note:'기장 조절 가능할까요?'};
const cart:Cart={version:1,items:[item]};
const catalog:Catalog={instagram:'michelle1998kr',fabrics:[{id:'suzhou',name:{ko:'수저우',en:'Suzhou'},description:{ko:'설명',en:'Description'},charts:[],colors:[{id:'04',code:'04',name:{ko:'아이보리',en:'Ivory'},hex:'#eeeeee'}]},{id:'ruby',name:{ko:'루비',en:'Ruby'},description:{ko:'설명',en:'Description'},charts:[],colors:[]}],designs:[{id:'ML-01',slug:'dress',category:'dress',name:{ko:'드레스',en:'Dress'},description:{ko:'설명',en:'Description'},image:'assets/designs/dress.jpg',imageUrl:'/dress.webp',thumbnailUrl:'/dress.webp',published:true,featured:true,order:1,priceMin:null,priceMax:null,fabrics:['suzhou','ruby'],reviews:[]}]};
const measurements:Measurements={chest:90,waist:70,hips:96,height:168,weight:58};

describe('selection lifecycle',()=>{
  it('merges identical variants and notes, while preserving variants and different questions',()=>{
    expect(addItem(cart,{...item,id:'b',quantity:2}).items).toEqual([{...item,quantity:3}]);
    expect(addItem(cart,{...item,id:'b',colorId:'61'}).items).toHaveLength(2);
    expect(addItem(cart,{...item,id:'b',fabricId:'ruby',colorId:'consult'}).items).toHaveLength(2);
    expect(addItem(cart,{...item,id:'b',note:'다른 질문'}).items).toHaveLength(2);
    expect(cart.items[0].quantity).toBe(1);
  });
  it('rejects bad quantities, duplicate IDs, future versions, and oversized notes',()=>{
    for(const quantity of [0,-1,1.5,100,NaN,Infinity,'1'])expect(()=>parseCart({version:1,items:[{...item,quantity}]})).toThrow();
    expect(()=>parseCart({version:2,items:[]})).toThrow();
    expect(()=>parseCart({version:1,items:[item,item]})).toThrow();
    expect(()=>parseCart({version:1,items:[{...item,note:'a'.repeat(501)}]})).toThrow();
    expect(()=>addItem({version:1,items:[{...item,quantity:99}]},item)).toThrow();
  });
  it('flags removed designs and colors without silently deleting the selection',()=>{
    expect(resolveItem(item,catalog).available).toBe(true);
    expect(resolveItem({...item,colorId:'removed'},catalog).available).toBe(false);
    expect(resolveItem({...item,designId:'gone'},catalog).available).toBe(false);
    expect(resolveItem({...item,fabricId:'ruby',colorId:'consult'},catalog).available).toBe(true);
    expect(resolveItem({...item,fabricId:'ruby',colorId:'04'},catalog).available).toBe(false);
  });
});
describe('recovery links',()=>{
  it('restores selections but strips all notes, measurements and unknown fields',()=>{
    const encoded=encodeRecovery({...cart,measurements} as Cart);
    const decoded=decodeRecovery(encoded);
    expect(decoded.items[0]).toEqual({...item,id:'restored-0',note:''});
    const payload=atob(encoded.replace(/-/g,'+').replace(/_/g,'/'));
    expect(payload).not.toContain('note');expect(payload).not.toContain('measurements');
    expect(decoded.items[0].colorId).toBe('04');
  });
  it('rejects malformed, empty, oversized and invalid payloads',()=>{
    for(const data of ['', '%%%', 'abc', 'a'.repeat(20001),btoa('{"v":2,"i":[]}'),btoa('{"v":1,"i":[["ML-01","suzhou","04",-1]]}')])expect(()=>decodeRecovery(data)).toThrow();
  });
});
describe('measurement and proposal correctness',()=>{
  it('converts all units without changing canonical metric values',()=>{
    const imperial=fromMetric(measurements,'imperial');
    expect(imperial.height).toBeCloseTo(66.1417,3);
    const restored=toMetric(imperial,'imperial');
    Object.keys(measurements).forEach(key=>expect(restored[key as keyof Measurements]).toBeCloseTo(measurements[key as keyof Measurements],9));
    for(const bad of [0,-1,Infinity,NaN,'90'])expect(validMeasurements({...measurements,chest:bad})).toBe(false);
    expect(validMeasurements(measurements)).toBe(true);
  });
  it('includes each note and shared measurements once in Korean and English',()=>{
    const ko=buildProposal(cart,measurements,'metric',catalog,'ko');
    expect(ko).toContain(item.note);expect(ko).toContain('수저우');expect(ko).toContain('아이보리 · 04');expect(ko).toContain('가격 문의');expect(ko.match(/가슴둘레/g)).toHaveLength(1);
    const en=buildProposal(cart,fromMetric(measurements,'imperial'),'imperial',catalog,'en');
    expect(en).toContain('Suzhou');expect(en).toContain('66.14 in');expect(en).toContain('lb');expect(en).toContain('Note:');
  });
  it('does not generate empty, incomplete, or unavailable proposals',()=>{
    expect(()=>buildProposal({version:1,items:[]},measurements,'metric',catalog,'ko')).toThrow();
    expect(()=>buildProposal(cart,{...measurements,waist:0},'metric',catalog,'ko')).toThrow();
    expect(()=>buildProposal({version:1,items:[{...item,colorId:'missing'}]},measurements,'metric',catalog,'ko')).toThrow();
  });
  it('shows KRW ranges only when supplied',()=>{
    expect(priceLabel(catalog.designs[0],'ko')).toBe('가격 문의');
    expect(priceLabel({priceMin:100000,priceMax:150000},'en')).toMatch(/100,000.*150,000/);
  });
});
