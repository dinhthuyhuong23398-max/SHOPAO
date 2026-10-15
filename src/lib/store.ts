import { useSyncExternalStore } from 'react';
import type { Cart, Selection } from './types';
import { CART_KEY, EMPTY_CART, parseCart, addItem } from './shop';

type Snapshot = {cart:Cart;ready:boolean;persistent:boolean;unreadable:boolean};
const serverSnapshot:Snapshot = {cart:EMPTY_CART,ready:false,persistent:true,unreadable:false};
let snapshot:Snapshot = serverSnapshot;
let initialized = false;
const listeners = new Set<()=>void>();
function publish() { listeners.forEach(fn=>fn()); window.dispatchEvent(new CustomEvent('michelle:cart',{detail:{count:snapshot.cart.items.reduce((n,i)=>n+i.quantity,0)}})); }
function read() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    try { snapshot={cart:raw?parseCart(JSON.parse(raw)):EMPTY_CART,ready:true,persistent:true,unreadable:false}; }
    catch { snapshot={cart:EMPTY_CART,ready:true,persistent:true,unreadable:true}; }
  } catch { snapshot={...snapshot,ready:true,persistent:false}; }
}
function getSnapshot() {
  if(!initialized && typeof window!=='undefined') {
    initialized=true; read();
    window.addEventListener('storage',event=>{if(event.key===CART_KEY || event.key===null){read();publish();}});
  }
  return snapshot;
}
export function useCart() { return useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn)};},getSnapshot,()=>serverSnapshot); }
export function saveCart(cart:Cart) {
  const parsed=parseCart(cart);
  let persistent=true;
  try {localStorage.setItem(CART_KEY,JSON.stringify(parsed));} catch {persistent=false;}
  snapshot={cart:parsed,ready:true,persistent,unreadable:false}; publish();
  return persistent;
}
export function addSelection(item:Selection) { saveCart(addItem(getSnapshot().cart,item)); }
export function updateSelection(id:string,patch:Partial<Pick<Selection,'quantity'|'note'|'fabricId'|'colorId'>>) { saveCart({version:1,items:getSnapshot().cart.items.map(i=>i.id===id?{...i,...patch}:i)}); }
export function removeSelection(id:string) { saveCart({version:1,items:getSnapshot().cart.items.filter(i=>i.id!==id)}); }
