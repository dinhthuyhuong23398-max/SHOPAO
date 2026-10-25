import {sitePath} from '../lib/paths';
import {useEffect,useState} from 'react';
import type {Catalog,Product,Locale,FabricId} from '../lib/types';
import {text} from '../lib/i18n';
import {MAX_NOTE,encodeRecovery} from '../lib/shop';
import {useCart,addSelection,updateSelection} from '../lib/store';
import {StorageNotice,CopyField} from './ShopShared';

const LINEN_DATA: Record<string, {
  sizes: string[];
  colors: { id: string; name: { ko: string; en: string; vi: string }; hex: string }[];
}> = {
  'ML-31': {
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [
      { id: 'black', name: { ko: '블랙', en: 'Black', vi: 'Đen' }, hex: '#222222' },
      { id: 'white', name: { ko: '화이트', en: 'White', vi: 'Trắng' }, hex: '#fcfcfc' },
      { id: 'beige', name: { ko: '베이지', en: 'Beige', vi: 'Be' }, hex: '#d9cdb8' },
      { id: 'brown', name: { ko: '브라운', en: 'Brown', vi: 'Nâu' }, hex: '#7a5238' },
      { id: 'khaki', name: { ko: '올리브 카키', en: 'Olive Khaki', vi: 'Xanh rêu' }, hex: '#586249' }
    ]
  },
  'ML-32': {
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [
      { id: 'brown', name: { ko: '초콜릿 브라운', en: 'Chocolate Brown', vi: 'Nâu sô cô la' }, hex: '#4e3328' },
      { id: 'black', name: { ko: '블랙', en: 'Black', vi: 'Đen' }, hex: '#222222' }
    ]
  },
  'ML-33': {
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [
      { id: 'white', name: { ko: '클래식 화이트', en: 'Classic White', vi: 'Trắng tinh khôi' }, hex: '#fcfcfc' },
      { id: 'pink', name: { ko: '파스텔 핑크', en: 'Pastel Pink', vi: 'Hồng phấn' }, hex: '#f2d5da' },
      { id: 'lilac', name: { ko: '라벤더 라일락', en: 'Lavender Lilac', vi: 'Tím pastel' }, hex: '#d8cfdf' },
      { id: 'burgundy', name: { ko: '버건디', en: 'Burgundy', vi: 'Đỏ đô' }, hex: '#72202f' },
      { id: 'yellow', name: { ko: '버터 옐로우', en: 'Butter Yellow', vi: 'Vàng bơ' }, hex: '#f5e49f' }
    ]
  },
  'ML-34': {
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [
      { id: 'oatmeal', name: { ko: '오트밀 베이지', en: 'Oatmeal Beige', vi: 'Be Yến Mạch' }, hex: '#d8cbba' },
      { id: 'white', name: { ko: '크리스프 화이트', en: 'Crisp White', vi: 'Trắng Tinh Khôi' }, hex: '#fcfcfc' },
      { id: 'black', name: { ko: '미드나잇 블랙', en: 'Midnight Black', vi: 'Đen Tuyền' }, hex: '#222222' },
      { id: 'navy', name: { ko: '클래식 네이비', en: 'Classic Navy', vi: 'Xanh Navy' }, hex: '#212d45' },
      { id: 'khaki', name: { ko: '웜 카키', en: 'Warm Khaki', vi: 'Khaki / Nâu Tây' }, hex: '#7a6e55' },
      { id: 'wine', name: { ko: '리치 와인', en: 'Rich Wine', vi: 'Đỏ Rượu Vang' }, hex: '#5f232b' }
    ]
  }
};

const SILK_COLOR_CHARTS: Record<FabricId, {
  ko: string;
  en: string;
  images: string[];
}> = {
  suzhou: {
    ko: '수저우 실크',
    en: 'SUZHOU SILK',
    images: Array.from({length: 6}, (_, index) => sitePath(`/fabrics/suzhou/color-${String(index + 1).padStart(2, '0')}.jpg`))
  },
  ruby: {
    ko: '루비 실크',
    en: 'RUBY SILK',
    images: Array.from({length: 6}, (_, index) => sitePath(`/fabrics/ruby/color-${String(index + 1).padStart(2, '0')}.jpg`))
  }
};

export default function ProductCustomizer({product,catalog,lang}:{product:Product;catalog:Catalog;lang:Locale}) {
  const {cart,ready,persistent,unreadable}=useCart();
  const isLinen = product.slug.includes('linen') || ['ML-31', 'ML-32', 'ML-33', 'ML-34'].includes(product.id);
  const linenInfo = LINEN_DATA[product.id] || { sizes: ['XS', 'S', 'M', 'L'], colors: [] };

  const [fabricId,setFabric]=useState<FabricId|''>(isLinen ? 'suzhou' : '');
  const [colorId,setColor]=useState('');
  const [selectedSize, setSize] = useState('S');
  const [linenColorId, setLinenColorId] = useState(linenInfo.colors[0]?.id || '');
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
    if(item){
      setEditId(item.id);
      setFabric(item.fabricId);
      setColor(item.colorId);
      setQuantity(item.quantity);
      setNote(item.note);
      if(isLinen && item.colorId) {
        setLinenColorId(item.colorId);
      }
    }
  },[ready,loaded,cart,product.id,isLinen]);

  const fabric=catalog.fabrics.find(f=>f.id===fabricId);
  const color=fabric?.colors.find(c=>c.id===colorId);
  const repeatedCodes=fabric?[...new Set(fabric.colors.filter((c,index,colors)=>colors.some((other,otherIndex)=>otherIndex!==index&&other.code===c.code)).map(c=>c.code))]:[];
  const selectedSilkColor=colorId==='consult'?text(lang,'미셸과 상담','Discuss with Michelle','Tư vấn cùng Michelle'):color?.name[lang];

  const currentLinenColorObj = linenInfo.colors.find(c => c.id === linenColorId);
  const selectedLinenColorName = linenColorId === 'consult' 
    ? text(lang, '미셸과 상담', 'Discuss with Michelle', 'Tư vấn cùng Michelle')
    : (currentLinenColorObj?.name[lang] || currentLinenColorObj?.name.en || '');

  function chooseFabric(id:FabricId){setFabric(id);setColor('');setSaved(false);setMessage('');}

  function save(event:React.SyntheticEvent<HTMLFormElement>){
    event.preventDefault();
    if(isLinen) {
      try {
        const itemNote = `[Size: ${selectedSize}${selectedLinenColorName ? ` · Màu: ${selectedLinenColorName}` : ''}] ${note}`.trim();
        const effectiveColor = linenColorId || 'default';
        if(editId&&cart.items.some(i=>i.id===editId)){
          updateSelection(editId,{fabricId:'suzhou',colorId:effectiveColor,quantity,note:itemNote});
        } else {
          addSelection({id:crypto.randomUUID(),designId:product.id,fabricId:'suzhou',colorId:effectiveColor,quantity,note:itemNote});
        }
        setSaved(true);
        setMessage(text(lang,'나의 선택에 저장했어요.','Saved to your selections.','Đã thêm vào túi đồ của bạn.'));
      } catch {
        setSaved(false);
        setMessage(text(lang,'수량 또는 선택 개수를 확인해 주세요.','Please check your selection.','Vui lòng kiểm tra lại số lượng.'));
      }
      return;
    }

    if(!fabricId||!colorId)return;
    try{
      if(editId&&cart.items.some(i=>i.id===editId)){updateSelection(editId,{fabricId,colorId,quantity,note});}
      else{addSelection({id:crypto.randomUUID(),designId:product.id,fabricId,colorId,quantity,note});}
      setSaved(true);setMessage(text(lang,'나의 선택에 저장했어요.','Saved to your selections.','Đã thêm vào túi đồ của bạn.'));
    }catch{setSaved(false);setMessage(text(lang,'수량 또는 선택 개수를 확인해 주세요. (아이템 50개, 각 수량 99개까지)','Please check your selection size (up to 50 items, 99 pieces each).','Vui lòng kiểm tra lại số lượng (tối đa 50 mẫu, mỗi mẫu 99 cái).'));}
  }

  const isOrderReady = isLinen ? ready : (ready && !!fabricId);
  const isSaveReady = isLinen ? (ready && !saved) : (ready && !!fabricId && !!colorId && !saved);

  return <form className="customizer" onSubmit={save}>
    {isLinen ? (
      <>
        {/* Linen Option 01: Standard Ready-to-Wear Size */}
        <fieldset>
          <legend>
            <span>01</span> {text(lang,'사이즈 선택 (기성 표준 사이즈)','Select Size (Standard Ready-to-Wear)','Chọn kích cỡ (Size may sẵn)')} 
            <small>· {selectedSize}</small>
          </legend>
          <div className="size-options-grid">
            {linenInfo.sizes.map(s => (
              <label key={s} className={`size-option ${selectedSize === s ? 'selected' : ''}`}>
                <input 
                  type="radio" 
                  name="linenSize" 
                  value={s} 
                  checked={selectedSize === s} 
                  onChange={() => { setSize(s); setSaved(false); }} 
                  required 
                />
                <span>{s}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Linen Option 02: Linen Color Options */}
        {linenInfo.colors.length > 0 && (
          <fieldset>
            <legend>
              <span>02</span> {text(lang,'컬러 선택','Choose your color','Chọn màu sắc')}
              {selectedLinenColorName && <small>· {selectedLinenColorName}</small>}
            </legend>
            <div className="swatch-grid">
              {linenInfo.colors.map(c => (
                <label 
                  key={c.id} 
                  className={`swatch-label ${linenColorId === c.id ? 'selected' : ''}`} 
                  title={c.name[lang] || c.name.en}
                >
                  <input 
                    type="radio" 
                    name="linenColor" 
                    value={c.id} 
                    checked={linenColorId === c.id} 
                    onChange={() => { setLinenColorId(c.id); setSaved(false); }} 
                    aria-label={c.name[lang] || c.name.en} 
                  />
                  <span className="swatch" style={{ backgroundColor: c.hex }} aria-hidden="true">
                    <span>{linenColorId === c.id ? '✓' : ''}</span>
                  </span>
                  <small>{c.name[lang] || c.name.en}</small>
                </label>
              ))}
            </div>
            <label className="consult-option">
              <input 
                type="radio" 
                name="linenColor" 
                value="consult" 
                checked={linenColorId === 'consult'} 
                onChange={() => { setLinenColorId('consult'); setSaved(false); }} 
              />
              {text(lang,'컬러는 미셸과 상담할게요','I’ll discuss the color with Michelle','Tư vấn màu trực tiếp cùng Michelle')}
            </label>
          </fieldset>
        )}
      </>
    ) : (
      <>
        {/* Silk Option 01: Fabric Choice (Suzhou / Ruby) */}
        <fieldset>
          <legend><span>01</span> {text(lang,'실크 선택','Choose your silk','Chọn chất liệu lụa')}</legend>
          <div className="fabric-options">
            {catalog.fabrics.filter(f=>product.fabrics.includes(f.id)).map(f => (
              <label key={f.id} className={`fabric-option ${fabricId===f.id?'selected':''}`}>
                <input type="radio" name="fabric" value={f.id} checked={fabricId===f.id} onChange={()=>chooseFabric(f.id)} required/>
                <span className="fabric-option-name">{f.name[lang]||f.name.en}</span>
                <small>{f.id.toUpperCase()} SILK</small>
                <span className="choice-mark" aria-hidden="true">{fabricId===f.id?'✓':'+'}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Silk Option 02: Customer-provided fabric photos and color code */}
        <fieldset>
          <legend>
            <span>02</span> {text(lang,'컬러 선택','Choose your color','Chọn màu sắc')}
            {selectedSilkColor && <small>{selectedSilkColor}{color && ` · ${color.code}`}</small>}
          </legend>
          {!fabric ? (
            <p className="field-hint">{text(lang,'먼저 실크를 선택해 주세요.','Choose a silk to see its colors.','Vui lòng chọn loại lụa để xem bảng màu.')}</p>
          ) : (
            <>
              <div className="silk-chart-sections">
                {(Object.keys(SILK_COLOR_CHARTS) as FabricId[])
                  .filter(chartId => product.fabrics.includes(chartId))
                  .map(chartId => {
                    const chart = SILK_COLOR_CHARTS[chartId];
                    const chartFabric = catalog.fabrics.find(item => item.id === chartId);
                    if (!chartFabric) return null;
                    return <section key={chartId} className={`silk-chart-card ${fabricId === chartId ? 'selected' : ''}`}>
                      <button type="button" className="silk-chart-heading" onClick={() => chooseFabric(chartId)} aria-pressed={fabricId === chartId}>
                        <span>{chart.ko}</span>
                        <small>{chart.en}</small>
                        <b aria-hidden="true">{fabricId === chartId ? '✓' : '+'}</b>
                      </button>
                      <div className="silk-chart-gallery">
                        {chart.images.map((image, index) => <button key={image} type="button" className={`silk-chart-image-link ${fabricId === chartId ? 'selected' : ''}`} onClick={() => chooseFabric(chartId)} aria-label={`${chart.en} color chart ${index + 1}`} aria-pressed={fabricId === chartId}>
                          <img src={image} alt={`${chart.en} color chart ${index + 1}`} loading="lazy" />
                        </button>)}
                      </div>
                      {fabricId === chartId && (
                        <div className="silk-color-picker" role="group" aria-label={text(lang, '컬러 선택', 'Choose a color')}>
                          <p className="silk-color-picker-title">{text(lang, '컬러를 선택하세요', 'Select a color')}</p>
                          <div className="silk-color-grid">
                            {chartFabric.colors.map(item => {
                              const isSelected = colorId === item.id;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  className={`silk-color-option ${isSelected ? 'selected' : ''}`}
                                  onClick={() => { setColor(item.id); setSaved(false); }}
                                  aria-pressed={isSelected}
                                  aria-label={`${item.code} · ${item.name[lang] || item.name.en}`}
                                >
                                  <span className="silk-color-chip" style={{ backgroundColor: item.hex }}>
                                    {isSelected && <span className="silk-color-check" aria-hidden="true">✓</span>}
                                  </span>
                                  <span className="silk-color-meta">
                                    <b>{item.code}</b>
                                    <small>{item.name[lang] || item.name.en}</small>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </section>;
                  })}
              </div>
              <label className="consult-option"><input type="radio" name="color" value="consult" checked={colorId==='consult'} onChange={()=>{setColor('consult');setSaved(false)}} required/>{text(lang,'컬러는 미셸과 상담할게요','I’ll discuss the color with Michelle','Tư vấn màu trực tiếp cùng Michelle')}</label>
              <p className="field-hint">{fabric.colors.length?text(lang,`컬러는 첫 번째 ${fabric.name.ko} 컬러북 기준이에요. 화면과 실제 원단의 색은 다를 수 있어요.`,`Colors refer to the first ${fabric.name.en} color book. Screen colors may differ from the fabric.`,`Bảng màu tham chiếu theo danh mục màu ${fabric.name.vi || fabric.name.en}. Màu hiển thị trên màn hình có thể có độ chênh nhẹ so với thực tế.`):(fabric.description[lang]||fabric.description.en)}</p>
              {repeatedCodes.length>0&&<p className="field-hint">{text(lang,`컬러북의 ${repeatedCodes.join('·')}번은 서로 다른 색에 쓰여요. 색상 이름도 함께 확인해 주세요.`,`The chart uses codes ${repeatedCodes.join(' and ')} for different shades. Check the color name as well.`)}</p>}
              {fabric.charts.length>0&&<a className="small-link" href={sitePath(`/${lang}/fabrics/#${fabric.id}`)} target="_blank" rel="noopener">{text(lang,'원본 컬러북 보기','View original color books')} ↗</a>}
            </>
          )}
        </fieldset>
      </>
    )}

    {/* Quantity Stepper */}
    <div className="quantity-row">
      <label htmlFor="quantity">{text(lang,'수량','Quantity','Số lượng')}</label>
      <div className="stepper">
        <button type="button" aria-label={text(lang,'수량 줄이기','Decrease quantity','Giảm số lượng')} disabled={quantity<=1} onClick={()=>{setQuantity(quantity-1);setSaved(false)}}>−</button>
        <input id="quantity" type="number" min="1" max="99" required value={quantity} onChange={e=>{setQuantity(Number(e.target.value));setSaved(false)}}/>
        <button type="button" aria-label={text(lang,'수량 늘리기','Increase quantity','Tăng số lượng')} disabled={quantity>=99} onClick={()=>{setQuantity(quantity+1);setSaved(false)}}>+</button>
      </div>
    </div>

    {/* Item Note */}
    <label className="note-label" htmlFor="item-note">
      {text(lang,'아이템 메모','Item note','Ghi chú')} <span>{text(lang,'선택','Optional','Tùy chọn')}</span>
    </label>
    <textarea 
      id="item-note" 
      rows={3} 
      maxLength={MAX_NOTE} 
      value={note} 
      onChange={e=>{setNote(e.target.value);setSaved(false)}} 
      placeholder={isLinen ? text(lang, '사이즈, 컬러, 배송 관련 요청사항을 남겨주세요.', 'Any questions about size, color, or shipping?', 'Ghi chú thêm về kích cỡ, màu sắc hoặc yêu cầu giao hàng...') : text(lang,'사이즈, 컬러, 제작 일정 등 궁금한 점을 남겨주세요.','Questions about sizing, color or production timing? Leave them here.','Ghi chú thêm về số đo, màu sắc hoặc lịch trình may...')}
    />
    <span className="character-count">{note.length} / {MAX_NOTE}</span>

    {/* Buttons Stack */}
    <div className="customizer-buttons-stack">
      <button 
        type="button" 
        className="button order-now-btn full-width" 
        disabled={!isOrderReady}
        onClick={() => {
          const detailFabric = isLinen ? '100% Premium Natural Linen' : (fabricId === 'ruby' ? 'Lụa Ruby (Ruby Silk)' : 'Lụa Tô Châu (Suzhou Silk)');
          const detailColor = isLinen 
            ? (selectedLinenColorName || text(lang, '기본 색상', 'Standard Color', 'Màu theo ảnh mẫu'))
            : (colorId === 'consult' ? text(lang, '상담 후 결정', 'Consultation', 'Tư vấn cùng Michelle') : (color?.name[lang] || colorId));
          const detailNote = isLinen ? `[Size: ${selectedSize}${selectedLinenColorName ? ` · Màu: ${selectedLinenColorName}` : ''}] ${note}`.trim() : note;

          window.dispatchEvent(new CustomEvent('michelle:open-order', {
            detail: {
              product,
              fabricId: isLinen ? 'linen' : fabricId,
              fabricName: detailFabric,
              colorId: detailColor,
              itemDetails: `${product.id} · ${product.name[lang] || product.name.en} · ${detailFabric} · ${detailColor} · x${quantity}`,
              size: isLinen ? selectedSize : undefined,
              quantity,
              note: detailNote
            }
          }));
        }}
      >
        <svg className="order-button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8h12l1 13H5L6 8Z" />
          <path d="M9 8a3 3 0 0 1 6 0" />
        </svg>
        <span>{text(lang, '바로 주문하기 (배송 정보 입력)', 'Order Now (Delivery Form)', 'Đặt Hàng Nhanh (Giao tận nơi)')}</span>
        <span className="button-arrow" aria-hidden="true">↗</span>
      </button>
      <button className="button secondary full-width" disabled={!isSaveReady} type="submit">
        {saved?text(lang,'선택에 저장됨','Added to selections','Đã thêm vào túi đồ'):editId?text(lang,'선택 수정하기','Update selection','Cập nhật lựa chọn'):text(lang,'나의 선택에 담기','Add to my selections','Thêm vào túi đồ')}<span>{saved?'✓':'+'}</span>
      </button>
    </div>
    <p className="form-status" role="status">{message}</p>
    {saved&&<a className="button secondary full-width" href={sitePath(`/${lang}/selections/`)}>{text(lang,'나의 선택 확인하기','View my selections','Xem túi đồ của tôi')} →</a>}
    <StorageNotice lang={lang} persistent={persistent} unreadable={unreadable}/>
    {!persistent&&cart.items.length>0&&<><p className="field-hint">{text(lang,'복구 링크를 저장해 다른 브라우저에서 열어 주세요. 메모와 치수는 링크에 포함되지 않아요.','Save this link and open it in another browser. It excludes notes and measurements.')}</p><CopyField value={`${window.location.origin}${sitePath(`/${lang}/restore/`)}#${encodeRecovery(cart)}`} label={text(lang,'복구 링크 복사','Copy recovery link')} lang={lang}/></>}
    <p className="field-hint centered">
      {isLinen 
        ? text(lang, '기성복 컬렉션은 표준 사이즈(XS, S, M, L)로 제작되어 별도의 맞춤 치수 입력이 필요하지 않습니다.', 'Ready-to-wear items are crafted to standard sizes (XS, S, M, L) and do not require custom body measurements.', 'Sản phẩm may sẵn theo bảng size chuẩn XS, S, M, L, không cần đo lại số đo cơ thể.')
        : text(lang,'치수는 모든 아이템을 고른 뒤 한 번만 입력해요.','Enter your measurements once, after choosing all your pieces.','Số đo cơ thể chỉ cần nhập một lần sau khi bạn đã chọn xong các mẫu lụa.')
      }
    </p>
  </form>;
}

