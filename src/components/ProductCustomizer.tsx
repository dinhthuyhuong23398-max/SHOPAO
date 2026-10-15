import {sitePath} from '../lib/paths';
import {useEffect,useState} from 'react';
import type {Catalog,Product,Locale,FabricId} from '../lib/types';
import {text} from '../lib/i18n';
import {MAX_NOTE,encodeRecovery} from '../lib/shop';
import {useCart,addSelection,updateSelection} from '../lib/store';
import {StorageNotice,CopyField} from './ShopShared';

export default function ProductCustomizer({product,catalog,lang}:{product:Product;catalog:Catalog;lang:Locale}) {
  const {cart,ready,persistent,unreadable}=useCart();
  const [fabricId,setFabric]=useState<FabricId|''>('');
  const [colorId,setColor]=useState('');
  const [quantity,setQuantity]=useState(1);
  const [note,setNote]=useState('');
  const [editId,setEditId]=useState('');
  const [loaded,setLoaded]=useState(false);
  const [message,setMessage]=useState('');
  const [saved,setSaved]=useState(false);
  useEffect(()=>{
    if(!ready||loaded)return;
    setLoaded(true);
    const id=new URLSearchParams(window.location.search).get('edit');
    const item=cart.items.find(i=>i.id===id&&i.designId===product.id);
    if(item){setEditId(item.id);setFabric(item.fabricId);setColor(item.colorId);setQuantity(item.quantity);setNote(item.note);}
  },[ready,loaded,cart,product.id]);
  const fabric=catalog.fabrics.find(f=>f.id===fabricId);
  const color=fabric?.colors.find(c=>c.id===colorId);
  const repeatedCodes=fabric?[...new Set(fabric.colors.filter((c,index,colors)=>colors.some((other,otherIndex)=>otherIndex!==index&&other.code===c.code)).map(c=>c.code))]:[];
  const selectedColor=colorId==='consult'?text(lang,'미셸과 상담','Discuss with Michelle'):color?.name[lang];
  function chooseFabric(id:FabricId){setFabric(id);setColor('');setSaved(false);setMessage('');}
  function save(event:React.SyntheticEvent<HTMLFormElement>){
    event.preventDefault();
    if(!fabricId||!colorId)return;
    try{
      if(editId&&cart.items.some(i=>i.id===editId)){updateSelection(editId,{fabricId,colorId,quantity,note});}
      else{addSelection({id:crypto.randomUUID(),designId:product.id,fabricId,colorId,quantity,note});}
      setSaved(true);setMessage(text(lang,'나의 선택에 저장했어요.','Saved to your selections.'));
    }catch{setSaved(false);setMessage(text(lang,'수량 또는 선택 개수를 확인해 주세요. (아이템 50개, 각 수량 99개까지)','Please check your selection size (up to 50 items, 99 pieces each).'));}
  }
  return <form className="customizer" onSubmit={save}>
    <fieldset><legend><span>01</span> {text(lang,'실크 선택','Choose your silk','Chọn chất liệu lụa')}</legend><div className="fabric-options">{catalog.fabrics.filter(f=>product.fabrics.includes(f.id)).map(f=><label key={f.id} className={`fabric-option ${fabricId===f.id?'selected':''}`}><input type="radio" name="fabric" value={f.id} checked={fabricId===f.id} onChange={()=>chooseFabric(f.id)} required/><span className="fabric-option-name">{f.name[lang]||f.name.en}</span><small>{f.id.toUpperCase()} SILK</small><span className="choice-mark" aria-hidden="true">{fabricId===f.id?'✓':'+'}</span></label>)}</div></fieldset>
    <fieldset><legend><span>02</span> {text(lang,'컬러 선택','Choose your color','Chọn màu sắc')}{selectedColor&&<small>{selectedColor}{color&&` · ${color.code}`}</small>}</legend>
      {!fabric?<p className="field-hint">{text(lang,'먼저 실크를 선택해 주세요.','Choose a silk to see its colors.','Vui lòng chọn loại lụa để xem bảng màu.')}</p>:<>
        {fabric.colors.length>0&&<div className="swatch-grid">{fabric.colors.map(c=><label key={c.id} className={`swatch-label ${c.id===colorId?'selected':''}`} title={`${c.name[lang]||c.name.en} · ${c.code}`}><input type="radio" name="color" value={c.id} checked={colorId===c.id} onChange={()=>{setColor(c.id);setSaved(false)}} aria-label={`${c.name[lang]||c.name.en} · ${c.code}`} required/><span className="swatch" style={{backgroundColor:c.hex}} aria-hidden="true"><span>{c.id===colorId?'✓':''}</span></span><small>{c.code}</small></label>)}</div>}
        <label className="consult-option"><input type="radio" name="color" value="consult" checked={colorId==='consult'} onChange={()=>{setColor('consult');setSaved(false)}} required/>{text(lang,'컬러는 미셸과 상담할게요','I’ll discuss the color with Michelle','Tư vấn màu trực tiếp cùng Michelle')}</label>
        <p className="field-hint">{fabric.colors.length?text(lang,`컬러는 첫 번째 ${fabric.name.ko} 컬러북 기준이에요. 화면과 실제 원단의 색은 다를 수 있어요.`,`Colors refer to the first ${fabric.name.en} color book. Screen colors may differ from the fabric.`,`Bảng màu tham chiếu theo danh mục màu ${fabric.name.vi || fabric.name.en}. Màu hiển thị trên màn hình có thể có độ chênh nhẹ so với thực tế.`):(fabric.description[lang]||fabric.description.en)}</p>
        {repeatedCodes.length>0&&<p className="field-hint">{text(lang,`컬러북의 ${repeatedCodes.join('·')}번은 서로 다른 색에 쓰여요. 색상 이름도 함께 확인해 주세요.`,`The chart uses codes ${repeatedCodes.join(' and ')} for different shades. Check the color name as well.`)}</p>}
        {fabric.charts.length>0&&<a className="small-link" href={sitePath(`/${lang}/fabrics/#${fabric.id}`)} target="_blank" rel="noopener">{text(lang,'원본 컬러북 보기','View original color books')} ↗</a>}
      </>}
    </fieldset>
    <div className="quantity-row"><label htmlFor="quantity">{text(lang,'수량','Quantity')}</label><div className="stepper"><button type="button" aria-label={text(lang,'수량 줄이기','Decrease quantity')} disabled={quantity<=1} onClick={()=>{setQuantity(quantity-1);setSaved(false)}}>−</button><input id="quantity" type="number" min="1" max="99" required value={quantity} onChange={e=>{setQuantity(Number(e.target.value));setSaved(false)}}/><button type="button" aria-label={text(lang,'수량 늘리기','Increase quantity')} disabled={quantity>=99} onClick={()=>{setQuantity(quantity+1);setSaved(false)}}>+</button></div></div>
    <label className="note-label" htmlFor="item-note">{text(lang,'아이템 메모','Item note')} <span>{text(lang,'선택','Optional')}</span></label><textarea id="item-note" rows={3} maxLength={MAX_NOTE} value={note} onChange={e=>{setNote(e.target.value);setSaved(false)}} placeholder={text(lang,'사이즈, 컬러, 제작 일정 등 궁금한 점을 남겨주세요.','Questions about sizing, color or production timing? Leave them here.')}/><span className="character-count">{note.length} / {MAX_NOTE}</span>
    <button className="button primary full-width" disabled={!ready||!fabricId||!colorId||saved} type="submit">{saved?text(lang,'선택에 저장됨','Added to selections'):editId?text(lang,'선택 수정하기','Update selection'):text(lang,'나의 선택에 담기','Add to my selections')}<span>{saved?'✓':'+'}</span></button>
    <p className="form-status" role="status">{message}</p>{saved&&<a className="button secondary full-width" href={sitePath(`/${lang}/selections/`)}>{text(lang,'나의 선택 확인하기','View my selections')} →</a>}
    <StorageNotice lang={lang} persistent={persistent} unreadable={unreadable}/>
    {!persistent&&cart.items.length>0&&<><p className="field-hint">{text(lang,'복구 링크를 저장해 다른 브라우저에서 열어 주세요. 메모와 치수는 링크에 포함되지 않아요.','Save this link and open it in another browser. It excludes notes and measurements.')}</p><CopyField value={`${window.location.origin}${sitePath(`/${lang}/restore/`)}#${encodeRecovery(cart)}`} label={text(lang,'복구 링크 복사','Copy recovery link')} lang={lang}/></>}
    <p className="field-hint centered">{text(lang,'치수는 모든 아이템을 고른 뒤 한 번만 입력해요.','Enter your measurements once, after choosing all your pieces.')}</p>
  </form>;
}
