import {sitePath} from '../lib/paths';
import {useEffect,useState} from 'react';
import type {Catalog,Locale,Measurements,UnitSystem} from '../lib/types';
import {text} from '../lib/i18n';
import {useCart} from '../lib/store';
import {MEASUREMENTS_KEY,measurementKeys,measurementLabel,validMeasurements,resolveItem,colorLabel,priceLabel,buildProposal} from '../lib/shop';
import ProposalDelivery from './ProposalDelivery';
import {StorageNotice} from './ShopShared';

const blank={chest:'',waist:'',hips:'',height:'',weight:''};
const help={
  chest:{ko:'가슴의 가장 넓은 부분을 수평으로 둘러 재주세요.',en:'Measure around the fullest part of your chest, keeping the tape level.'},
  waist:{ko:'허리의 가장 잘록한 부분을 편안하게 둘러 재주세요.',en:'Measure around your natural waist without tightening the tape.'},
  hips:{ko:'엉덩이의 가장 넓은 부분을 수평으로 둘러 재주세요.',en:'Measure around the fullest part of your hips with the tape level.'},
  height:{ko:'신발을 벗고 바르게 선 상태에서 재주세요.',en:'Measure your height standing straight without shoes.'},
  weight:{ko:'현재 몸무게를 입력해 주세요.',en:'Enter your current body weight.'},
};
const factor=(key:keyof Measurements,unit:UnitSystem)=>unit==='metric'?1:key==='weight'?0.45359237:2.54;

export default function Proposal({catalog,lang}:{catalog:Catalog;lang:Locale}) {
  const {cart,ready,persistent,unreadable}=useCart();
  const [units,setUnits]=useState<UnitSystem>('metric');
  const [fields,setFields]=useState(blank);
  const [metric,setMetric]=useState<Partial<Measurements>>({});
  const [loaded,setLoaded]=useState(false);
  const [sessionWarning,setSessionWarning]=useState(false);
  const [review,setReview]=useState(false);
  useEffect(()=>{
    try{
      const raw=sessionStorage.getItem(MEASUREMENTS_KEY);
      if(raw){const saved=JSON.parse(raw);if(saved.version===1&&(saved.units==='metric'||saved.units==='imperial')&&saved.metric&&typeof saved.metric==='object'){
        const safe:Partial<Measurements>={};const next={...blank};
        for(const key of measurementKeys){if(typeof saved.metric[key]==='number'&&Number.isFinite(saved.metric[key])&&saved.metric[key]>0&&saved.metric[key]<=25400){safe[key]=saved.metric[key];next[key]=String(Number((saved.metric[key]/factor(key,saved.units)).toFixed(2)));}}
        setMetric(safe);setFields(next);setUnits(saved.units);
      }}
    }catch{setSessionWarning(true)}
    setLoaded(true);
  },[]);
  useEffect(()=>{if(!loaded)return;try{sessionStorage.setItem(MEASUREMENTS_KEY,JSON.stringify({version:1,units,metric}));}catch{setSessionWarning(true)}},[metric,units,loaded]);
  const measurements=Object.fromEntries(measurementKeys.map(key=>[key,Number(fields[key])])) as unknown as Measurements;
  const available=cart.items.length>0&&cart.items.every(item=>resolveItem(item,catalog).available);
  const complete=validMeasurements(measurements)&&measurementKeys.every(key=>fields[key].trim()!=='');
  const proposal=available&&complete?buildProposal(cart,measurements,units,catalog,lang):'';
  function update(key:keyof Measurements,value:string){setFields(previous=>({...previous,[key]:value}));const numeric=Number(value);setMetric(previous=>({...previous,[key]:value!==''&&Number.isFinite(numeric)&&numeric>0?numeric*factor(key,units):undefined}));}
  function changeUnits(next:UnitSystem){if(next===units)return;setUnits(next);setFields(Object.fromEntries(measurementKeys.map(key=>[key,metric[key]===undefined?'':String(Number((metric[key]!/factor(key,next)).toFixed(2)))])) as typeof blank);}
  if(!ready||!loaded)return <p className="loading-state">{text(lang,'제안서를 준비하고 있어요…','Preparing your proposal…')}</p>;
  if(!available)return <div className="empty-state"><h2>{text(lang,'선택을 먼저 확인해 주세요','Review your selections first')}</h2><p>{text(lang,'제안서를 만들려면 제작 가능한 아이템이 필요해요.','Add a piece and review any unavailable options before creating a proposal.')}</p><a className="button primary" href={sitePath(`/${lang}/selections/`)}>{text(lang,'나의 선택으로','My selections')} →</a></div>;
  return <div className="proposal-flow"><div className="progress-steps"><span className="complete">01 {text(lang,'나의 선택','Selections')}</span><span className={!review?'active':'complete'}>02 {text(lang,'신체 치수','Measurements')}</span><span className={review?'active':''}>03 {text(lang,'제안서','Proposal')}</span></div><StorageNotice lang={lang} persistent={persistent} unreadable={unreadable}/>
    {!review?<form className="measurement-layout" onSubmit={event=>{event.preventDefault();if(complete){setReview(true);window.scrollTo({top:0,behavior:'smooth'})}}}>
      <div className="measurement-form"><span className="eyebrow">MADE TO YOUR MEASURE</span><h2>{text(lang,'한 번의 입력으로, 모든 아이템에.','One set of measurements. Every piece.')}</h2><p>{text(lang,'한 사람의 신체 치수를 입력해 주세요. 모든 선택에 함께 전달돼요.','Enter one person’s body measurements. They apply to every selected piece.')}</p><div className="unit-switch" role="group" aria-label={text(lang,'측정 단위','Measurement units')}><button type="button" aria-pressed={units==='metric'} onClick={()=>changeUnits('metric')}>cm / kg</button><button type="button" aria-pressed={units==='imperial'} onClick={()=>changeUnits('imperial')}>in / lb</button></div><div className="measurement-fields">{measurementKeys.map(key=><div className="measurement-field" key={key}><label htmlFor={`measure-${key}`}>{measurementLabel(key,lang)}<span>*</span></label><div className="input-with-unit"><input id={`measure-${key}`} name={key} type="number" inputMode="decimal" min="0.01" max="10000" step="any" required value={fields[key]} onChange={event=>update(key,event.target.value)} aria-describedby={`help-${key}`}/><span>{key==='weight'?(units==='metric'?'kg':'lb'):(units==='metric'?'cm':'in')}</span></div><p id={`help-${key}`} className="field-hint">{help[key][lang]}</p></div>)}</div><p className="privacy-note">{text(lang,'치수는 현재 탭에만 저장되며 서버로 전송되지 않아요. 인스타그램에 직접 보내기 전까지 미셸에게 전달되지 않아요.','Measurements stay in this tab and are not uploaded. Michelle receives them only when you send your proposal on Instagram.')}</p>{sessionWarning&&<p className="notice warning">{text(lang,'이 탭에 치수를 저장할 수 없어요. 페이지를 새로 열면 다시 입력해야 해요.','This tab cannot save measurements. You’ll need to re-enter them after reopening the page.')}</p>}<button className="button primary full-width" type="submit">{text(lang,'제안서 확인하기','Review my proposal')} →</button><a className="text-link continue-link" href={sitePath(`/${lang}/selections/`)}>← {text(lang,'선택 수정하기','Edit my selections')}</a></div>
      <aside className="measure-guide"><span className="eyebrow">A LITTLE GUIDANCE</span><h3>{text(lang,'편안한 핏의 시작','A comfortable fit starts here')}</h3><svg className="body-guide" viewBox="0 0 240 330" fill="none" aria-hidden="true"><circle cx="120" cy="35" r="22" stroke="currentColor" strokeWidth="1.3"/><path d="M94 63 65 76 45 159 60 168 85 108 86 170 74 217 87 302 108 302 120 229 132 302 153 302 166 217 154 170 155 108 180 168 195 159 175 76 146 63" stroke="currentColor" strokeWidth="1.3"/><path d="M77 106H163M86 165H154M76 204H164" stroke="#9c7f59" strokeDasharray="3 3"/><circle cx="169" cy="106" r="9" fill="#f1eadf"/><circle cx="160" cy="165" r="9" fill="#f1eadf"/><circle cx="170" cy="204" r="9" fill="#f1eadf"/><text x="166" y="110" fontSize="11" fill="currentColor">1</text><text x="157" y="169" fontSize="11" fill="currentColor">2</text><text x="167" y="208" fontSize="11" fill="currentColor">3</text></svg><ol><li>{text(lang,'가슴의 가장 넓은 부분','The fullest part of your chest')}</li><li>{text(lang,'허리의 가장 잘록한 부분','Your natural waist')}</li><li>{text(lang,'엉덩이의 가장 넓은 부분','The fullest part of your hips')}</li></ol><p>{text(lang,'줄자를 너무 조이지 말고 바닥과 수평으로 유지해 주세요. 혼자 재기 어렵다면 다른 분의 도움을 받아보세요.','Keep the tape level and comfortable. Ask someone to help if measuring on your own is difficult.')}</p></aside>
    </form>:<div className="proposal-review"><div className="proposal-paper"><div className="paper-heading"><span className="eyebrow">MICHELLE STORE</span><span className="serif">Your personal edit.</span></div><h2>{text(lang,'사이즈 맞춤 제안서','Made-to-measure silk proposal')}</h2><p className="field-hint">{text(lang,'선택한 디자인의 사이즈 맞춤 제작과 최종 가격을 확인하기 위한 상담 요청이에요.','A consultation request for your selected designs, made to your measurements, with final pricing to be confirmed.')}</p>{cart.items.map(item=>{const {design,fabric,color}=resolveItem(item,catalog);return <div className="proposal-item" key={item.id}><img src={design!.thumbnailUrl} width="96" height="128" alt={design!.name[lang]}/><div><span className="eyebrow">{design!.id}</span><h3>{design!.name[lang]}</h3><p>{fabric!.name[lang]} · {item.quantity}{text(lang,'개',' piece(s)')}</p><div className="proposal-color"><span className={`proposal-color-chip ${color?'':'unconfirmed'}`} style={color?{backgroundColor:color.hex}:undefined} aria-hidden="true">{color?'':'?'}</span><p>{colorLabel(item,catalog,lang)}</p></div><p>{priceLabel(design!,lang)}</p>{item.note&&<p className="item-note-text"><b>{text(lang,'메모','Note')}:</b> {item.note}</p>}</div></div>})}<div className="measurement-summary"><h3>{text(lang,'신체 치수','Body measurements')}</h3><dl>{measurementKeys.map(key=><div key={key}><dt>{measurementLabel(key,lang)}</dt><dd>{fields[key]} {key==='weight'?(units==='metric'?'kg':'lb'):(units==='metric'?'cm':'in')}</dd></div>)}</dl><button type="button" className="small-link" onClick={()=>setReview(false)}>{text(lang,'치수 수정','Edit measurements')}</button></div></div><ProposalDelivery input={{cart,catalog,measurements,units,lang}} message={proposal}/></div>}
  </div>;
}
