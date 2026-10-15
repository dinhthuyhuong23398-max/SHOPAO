import {sitePath} from '../lib/paths';
import {useEffect,useState} from 'react';
import type {Cart,Catalog,Locale} from '../lib/types';
import {decodeRecovery,resolveItem,colorLabel} from '../lib/shop';
import {useCart,saveCart} from '../lib/store';
import {text} from '../lib/i18n';

export default function Restore({catalog,lang}:{catalog:Catalog;lang:Locale}){
  const {cart}=useCart();const [incoming,setIncoming]=useState<Cart|null>(null);const [error,setError]=useState(false);
  const [storageError,setStorageError]=useState(false);
  useEffect(()=>{try{setIncoming(decodeRecovery(location.hash.slice(1)));}catch{setError(true)}},[]);
  function restore(){if(!incoming)return;if(saveCart(incoming))location.assign(sitePath(`/${lang}/selections/`));else setStorageError(true);}
  if(error)return <div className="empty-state"><h2>{text(lang,'링크를 확인해 주세요','This link could not be read')}</h2><p>{text(lang,'유효한 선택 복구 링크가 아니에요. 기존 선택은 변경되지 않았어요.','This is not a valid recovery link. Your existing selections have not changed.')}</p><a className="button secondary" href={sitePath(`/${lang}/selections/`)}>{text(lang,'나의 선택','My selections')}</a></div>;
  if(!incoming)return <p>{text(lang,'선택을 불러오는 중…','Loading the selection…')}</p>;
  return <div className="restore-panel"><h2>{text(lang,'이 선택을 불러올까요?','Restore these selections?')}</h2><p>{text(lang,'링크에 저장된 시점의 선택이에요. 메모와 치수는 포함되지 않아요.','This is a snapshot of the selections. Notes and measurements are not included.')}</p><ul className="restore-list">{incoming.items.map(item=>{const {design,fabric,available}=resolveItem(item,catalog);return <li key={item.id}><b>{design?.name[lang]||item.designId}</b><span>{fabric?.name[lang]||item.fabricId} / {colorLabel(item,catalog,lang)} × {item.quantity}</span>{!available&&<small className="warning">{text(lang,'현재 제공되지 않는 옵션이에요. 불러온 뒤 수정해 주세요.','An option is no longer listed. Review it after restoring.')}</small>}</li>})}</ul>{cart.items.length>0&&<p className="notice warning">{text(lang,'현재 브라우저에 저장된 선택과 메모를 이 목록으로 바꿉니다. 기존 선택을 보관하려면 먼저 복구 링크를 저장해 주세요.','This replaces your current selections and notes. Save a recovery link for the existing selection first if you want to keep it.')}</p>}{storageError&&<p className="notice warning" role="alert">{text(lang,'이 브라우저에서는 저장할 수 없어요. 이 복구 링크를 복사해 다른 브라우저에서 열어 주세요.','This browser cannot save your selection. Copy this recovery link and open it in another browser.')}</p>}<button className="button primary" onClick={restore}>{text(lang,'이 선택으로 불러오기','Restore this selection')} →</button><a className="text-link continue-link" href={sitePath(`/${lang}/selections/`)}>{text(lang,'취소하고 나의 선택으로','Cancel and keep my selections')}</a></div>;
}
