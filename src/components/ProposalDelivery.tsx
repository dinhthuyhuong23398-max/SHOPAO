import { useEffect, useRef, useState } from 'react';
import type { ProposalInput } from '../lib/proposal-document';
import { proposalImages, type ProposalImage } from '../lib/proposal-image';
import { text } from '../lib/i18n';

export default function ProposalDelivery({ input, message }: { input: ProposalInput; message: string }) {
  const { lang, catalog } = input;
  const [images, setImages] = useState<ProposalImage[]>([]);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState('');
  const generation = useRef(0);

  // A second tab can edit the cart while photos load. Discard any outdated export.
  useEffect(() => {
    generation.current++;
    setImages([]);
    setExporting(false);
    setStatus('');
    return () => { generation.current++; };
  }, [message]);
  useEffect(() => () => { images.forEach(image => URL.revokeObjectURL(image.url)); }, [images]);

  async function exportImages() {
    const request = ++generation.current;
    setExporting(true);
    setStatus('');
    try {
      const result = await proposalImages(input);
      if (request === generation.current) setImages(result);
      else result.forEach(image => URL.revokeObjectURL(image.url));
    } catch {
      if (request === generation.current) setStatus(text(lang,
        '사진을 불러오거나 이미지를 만들지 못했어요. 다시 시도하거나 아래 메시지 복사를 이용해 주세요.',
        'A photo or image could not be prepared. Try again, or use the text option below.'));
    } finally {
      if (request === generation.current) setExporting(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setStatus(text(lang, '복사했어요. 인스타그램에서 붙여넣고 전송해 주세요.', 'Copied. Paste and send it in your Instagram conversation.'));
    } catch {
      setStatus(text(lang, '복사가 차단되었어요. 아래 메시지를 직접 선택해서 복사해 주세요.', 'Copy was blocked. Select and copy the message below.'));
    }
  }

  return <>
    <aside className="handoff-panel">
      <span className="eyebrow">YOUR EDIT, READY TO SHARE</span>
      <h2>{text(lang, '이미지로 전해 주세요', 'Send your visual proposal')}</h2>
      <p>{text(lang,
        '디자인 사진, 선택한 컬러칩과 코드, 메모와 치수가 한눈에 담긴 제안서예요. 이미지를 저장한 뒤 인스타그램 대화창에 첨부해 주세요.',
        'Your designs, selected swatches and codes, notes, and measurements in one visual proposal. Save the images, then attach them in your Instagram conversation.')}</p>
      {!images.length && <button className="button primary full-width" type="button" onClick={exportImages} disabled={exporting || !message} aria-busy={exporting}>
        {exporting ? text(lang, '사진과 컬러를 담는 중…', 'Preparing your images…') : text(lang, '1. 제안서 이미지 만들기', '1. Create proposal images')} <span>↓</span>
      </button>}
      {images.length > 0 && <div className="proposal-downloads">
        <p className="download-instruction" role="status">{text(lang, `1. 이미지 ${images.length}장을 모두 저장해 주세요.`, `1. Save all ${images.length} image(s).`)}</p>
        {images.map((image, index) => <figure className="proposal-export-preview" key={image.url}>
          <a href={image.url} target="_blank" rel="noopener noreferrer" aria-label={text(lang, `제안서 이미지 ${index + 1} 크게 보기`, `View proposal image ${index + 1} full size`)}>
            <img src={image.url} width="1080" height="1440" alt={text(lang, `디자인 사진과 컬러칩이 포함된 제안서 ${index + 1} / ${images.length}`, `Proposal with design photos and color swatches, ${index + 1} of ${images.length}`)} />
          </a>
          <figcaption><a className="button primary full-width" href={image.url} download={image.filename}>{text(lang, '이미지 다운로드', 'Download image')} {index + 1} / {images.length} <span>↓</span></a></figcaption>
        </figure>)}
      </div>}
      <a className="button secondary full-width" href={`https://ig.me/m/${catalog.instagram}`} target="_blank" rel="noopener noreferrer">2. {text(lang, '인스타그램 열기', 'Open Instagram')} <span>↗</span></a>
      <p className="field-hint">{text(lang, '저장한 이미지를 대화창에 첨부해 직접 전송해 주세요. 여러 장이면 모두 첨부해 주세요.', 'Attach and send the saved images yourself. If there is more than one page, include every image.')}</p>
      <p className="form-status" role="status">{status}</p>
      <p className="field-hint">{text(lang, '대화창이 열리지 않나요? 프로필의 메시지 버튼을 눌러 주세요. 인스타그램 로그인이 필요할 수 있어요.', 'If the conversation does not open, use the Message button on Michelle’s profile. Instagram may ask you to sign in.')}</p>
      <a className="text-link" href={`https://www.instagram.com/${catalog.instagram}/`} target="_blank" rel="noopener noreferrer">@{catalog.instagram} ↗</a>
      <p className="field-hint">{text(lang, '이미지에는 입력한 치수와 메모가 포함돼요. 사진과 컬러칩은 참고용이며, 최종 색상은 미셸과 확인해 주세요.', 'Images include your measurements and notes. Photos and swatches are references; confirm the final shade with Michelle.')}</p>
    </aside>
    <details className="proposal-text proposal-text-fallback">
      <summary>{text(lang, '텍스트로 보내고 싶어요', 'Prefer to send text?')} <span>+</span></summary>
      <p className="field-hint">{text(lang, '이미지를 보내기 어려울 때 메시지를 복사해서 사용해 주세요.', 'Copy this message if you cannot send the images.')}</p>
      <button className="button secondary" type="button" onClick={copy}>{text(lang, '제안서 메시지 복사', 'Copy proposal text')} ↗</button>
      <label htmlFor="proposal-message">{text(lang, '전송할 메시지', 'Your message')}</label>
      <textarea id="proposal-message" readOnly rows={15} value={message} onFocus={event => event.currentTarget.select()} />
    </details>
  </>;
}
