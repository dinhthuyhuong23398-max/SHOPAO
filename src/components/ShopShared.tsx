import { useState } from 'react';
import type {Locale} from '../lib/types';
import {text} from '../lib/i18n';

export function StorageNotice({lang,persistent,unreadable=false}:{lang:Locale;persistent:boolean;unreadable?:boolean}) {
  if(!persistent) return <p className="notice warning" role="status">{text(lang,'이 브라우저에서는 선택을 저장할 수 없어요. 페이지를 떠나기 전에 복구 링크를 저장해 주세요.','This browser cannot save your selections. Save a recovery link before leaving this page.')}</p>;
  if(unreadable) return <p className="notice warning" role="status">{text(lang,'이전에 저장한 선택을 읽을 수 없어요. 복구 링크를 사용하거나 새로 선택해 주세요.','Your previously saved selections could not be read. Use a recovery link or start a new selection.')}</p>;
  return null;
}
export function CopyField({value,label,lang}:{value:string;label:string;lang:Locale}) {
  const [status,setStatus]=useState('');
  async function copy(){try{await navigator.clipboard.writeText(value);setStatus(text(lang,'복사했어요.','Copied.'));}catch{setStatus(text(lang,'아래 내용을 길게 누르거나 선택해서 직접 복사해 주세요.','Select the text below and copy it manually.'));}}
  return <div className="copy-field"><button type="button" className="button secondary" onClick={copy}>{label} <span>↗</span></button><p className="copy-status" aria-live="polite">{status}</p><textarea aria-label={label} readOnly value={value} onFocus={event=>event.currentTarget.select()} rows={3}/></div>;
}
