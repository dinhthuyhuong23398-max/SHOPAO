import React, { useState, useEffect } from 'react';
import type { Locale } from '../lib/types';
import { text } from '../lib/i18n';

interface FloatingWidgetsProps {
  lang: Locale;
  instagram: string;
  orderApiUrl?: string;
  sheetId?: string;
}

interface OrderItem {
  orderId: string;
  createdAt: string;
  customerName: string;
  phone: string;
  address: string;
  productName: string;
  fabric: string;
  color: string;
  quantity: number | string;
  sizeOrMeasurements: string;
  customDesign: string;
  note: string;
  status: string;
  trackingCode?: string;
  adminNote?: string;
}

const STORAGE_ORDERS_KEY = 'michelle_recent_orders';
const STORAGE_API_KEY = 'michelle_order_api_url';

export default function FloatingWidgets({
  lang,
  instagram = 'michelle1998kr',
  orderApiUrl = '',
  sheetId = '1E2ywyOPViJ73f5JrSzYRDQcQNaHOD5FrvCwHojrSb1s'
}: FloatingWidgetsProps) {
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [isApiConfigOpen, setIsApiConfigOpen] = useState(false);

  // Active API URL (from prop or localStorage)
  const [activeApiUrl, setActiveApiUrl] = useState(orderApiUrl);

  // Tracking State
  const [trackingQuery, setTrackingQuery] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');
  const [trackingResults, setTrackingResults] = useState<OrderItem[]>([]);
  const [searched, setSearched] = useState(false);

  // Order Form State
  const [orderForm, setOrderForm] = useState({
    customerName: '',
    phone: '',
    address: '',
    productName: '',
    fabric: 'Lụa Tô Châu (Suzhou Silk)',
    color: '',
    quantity: 1,
    sizeType: 'bespoke', // 'bespoke' | 'standard'
    standardSize: 'M',
    bust: '',
    waist: '',
    hips: '',
    height: '',
    weight: '',
    customDesign: '',
    note: ''
  });

  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{ orderId: string; phone: string } | null>(null);
  const [orderError, setOrderError] = useState('');

  // Initialize
  useEffect(() => {
    try {
      const savedApi = localStorage.getItem(STORAGE_API_KEY);
      if (savedApi) {
        setActiveApiUrl(savedApi);
      }
    } catch {}

    // Listen for custom open events from other components (like ProductCustomizer or Proposal)
    const handleOpenOrder = (e: any) => {
      const detail = e.detail || {};
      const prodName = detail.product?.name?.[lang] || detail.product?.name?.en || detail.product?.id || '';
      const fabName = detail.fabricId === 'ruby' ? 'Lụa Ruby (Ruby Silk)' : 'Lụa Tô Châu (Suzhou Silk)';
      const col = detail.colorId ? `No. ${detail.colorId}` : '';

      setOrderForm(prev => ({
        ...prev,
        productName: prodName || prev.productName,
        fabric: fabName,
        color: col || prev.color,
        quantity: detail.quantity || 1,
        note: detail.note || prev.note
      }));
      setOrderSuccess(null);
      setOrderError('');
      setIsOrderOpen(true);
    };

    const handleOpenTracking = () => {
      setIsTrackingOpen(true);
    };

    window.addEventListener('michelle:open-order', handleOpenOrder);
    window.addEventListener('michelle:open-tracking', handleOpenTracking);

    return () => {
      window.removeEventListener('michelle:open-order', handleOpenOrder);
      window.removeEventListener('michelle:open-tracking', handleOpenTracking);
    };
  }, [lang]);

  // Save API URL
  const saveApiUrl = (url: string) => {
    setActiveApiUrl(url);
    try {
      localStorage.setItem(STORAGE_API_KEY, url);
    } catch {}
    setIsApiConfigOpen(false);
  };

  // Tra cứu đơn hàng
  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = trackingQuery.trim();
    if (!query) return;

    setTrackingLoading(true);
    setTrackingError('');
    setTrackingResults([]);
    setSearched(true);

    try {
      let found: OrderItem[] = [];

      // 1. Kiểm tra API Google Apps Script nếu có
      if (activeApiUrl) {
        try {
          const res = await fetch(`${activeApiUrl}?query=${encodeURIComponent(query)}`);
          const data = await res.json();
          if (data && data.success && Array.isArray(data.orders)) {
            found = data.orders;
          }
        } catch (fetchErr) {
          console.warn('API lookup failed, falling back to local memory', fetchErr);
        }
      }

      // 2. Nếu API chưa có hoặc không ra kết quả, tra cứu trong localStorage gần đây
      if (found.length === 0) {
        const raw = localStorage.getItem(STORAGE_ORDERS_KEY);
        if (raw) {
          const localList: OrderItem[] = JSON.parse(raw);
          const cleanQuery = query.toLowerCase().replace(/\D/g, '');
          found = localList.filter(item => {
            const idMatch = item.orderId.toLowerCase().includes(query.toLowerCase());
            const phoneMatch = cleanQuery.length >= 4 && item.phone.replace(/\D/g, '').includes(cleanQuery);
            return idMatch || phoneMatch;
          });
        }
      }

      if (found.length > 0) {
        setTrackingResults(found);
      } else {
        setTrackingError(
          text(
            lang,
            '입력하신 정보와 일치하는 주문을 찾을 수 없습니다. 번호 또는 주문 코드를 다시 확인해 주세요.',
            'No orders found matching your details. Please verify your phone number or order code.',
            'Không tìm thấy đơn hàng với thông tin này. Quý khách vui lòng kiểm tra lại số điện thoại hoặc mã đơn hàng.'
          )
        );
      }
    } catch (err: any) {
      setTrackingError(err?.message || 'Lỗi khi tra cứu');
    } finally {
      setTrackingLoading(false);
    }
  };

  // Đặt hàng
  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.customerName.trim() || !orderForm.phone.trim() || !orderForm.address.trim()) {
      setOrderError(text(lang, '필수 항목을 모두 입력해 주세요.', 'Please complete all required fields.', 'Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ nhận hàng.'));
      return;
    }

    setOrderSubmitting(true);
    setOrderError('');

    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const orderId = `MS-${dateStr}-${randCode}`;

    let sizeInfo = '';
    if (orderForm.sizeType === 'bespoke') {
      const parts = [];
      if (orderForm.bust) parts.push(`Ngực: ${orderForm.bust}cm`);
      if (orderForm.waist) parts.push(`Eo: ${orderForm.waist}cm`);
      if (orderForm.hips) parts.push(`Mông: ${orderForm.hips}cm`);
      if (orderForm.height) parts.push(`Cao: ${orderForm.height}cm`);
      if (orderForm.weight) parts.push(`Nặng: ${orderForm.weight}kg`);
      sizeInfo = parts.length ? `[May đo] ${parts.join(' | ')}` : '[May đo theo số đo tư vấn]';
    } else {
      sizeInfo = `[Size chuẩn] ${orderForm.standardSize}`;
    }

    const payload: OrderItem = {
      orderId,
      createdAt: now.toLocaleString('vi-VN'),
      customerName: orderForm.customerName.trim(),
      phone: orderForm.phone.trim(),
      address: orderForm.address.trim(),
      productName: orderForm.productName.trim() || 'Thiết kế lụa may đo Michelle',
      fabric: orderForm.fabric,
      color: orderForm.color || 'Tư vấn mã màu qua Instagram',
      quantity: orderForm.quantity,
      sizeOrMeasurements: sizeInfo,
      customDesign: orderForm.customDesign.trim(),
      note: orderForm.note.trim(),
      status: 'Chờ xác nhận'
    };

    try {
      // 1. Lưu vào localStorage của khách để tra cứu ngay lập tức
      try {
        const raw = localStorage.getItem(STORAGE_ORDERS_KEY);
        const list: OrderItem[] = raw ? JSON.parse(raw) : [];
        list.unshift(payload);
        localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(list.slice(0, 20)));
      } catch {}

      // 2. Gửi về Google Sheet qua Apps Script API nếu có URL
      if (activeApiUrl) {
        try {
          await fetch(activeApiUrl, {
            method: 'POST',
            mode: 'no-cors', // Tránh CORS block từ browser khi post tới Google Script
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
        } catch (postErr) {
          console.warn('POST to Apps Script failed, saved locally', postErr);
        }
      }

      setOrderSuccess({ orderId, phone: orderForm.phone.trim() });
    } catch (err: any) {
      setOrderError(err?.message || 'Có lỗi khi đặt hàng. Vui lòng thử lại.');
    } finally {
      setOrderSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Đã hoàn thành':
        return 'status-completed';
      case 'Đang vận chuyển':
        return 'status-shipping';
      case 'Đang may':
      case 'Đang cắt may':
        return 'status-tailoring';
      default:
        return 'status-pending';
    }
  };

  return (
    <>
      {/* 1. HAI NÚT NỔI BÊN PHẢI MÀN HÌNH (FLOATING DOCK) */}
      <aside className="floating-action-dock" aria-label="Quick Actions">
        {/* Nút 1: Instagram Logo Button */}
        <a
          href={`https://www.instagram.com/${instagram}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="floating-btn floating-btn-instagram"
          aria-label={text(lang, '인스타그램 상담', 'Chat on Instagram', 'Tư vấn Instagram @' + instagram)}
        >
          <span className="floating-tooltip">
            {text(lang, '인스타그램 @' + instagram, 'Instagram @' + instagram, 'Tư vấn Instagram @' + instagram)}
          </span>
          <svg className="instagram-logo-svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        </a>

        {/* Nút 2: Tra Cứu Trạng Thái Đơn Hàng (Order Tracking Button) */}
        <button
          type="button"
          onClick={() => {
            setIsTrackingOpen(true);
            setSearched(false);
            setTrackingError('');
          }}
          className="floating-btn floating-btn-tracking"
          aria-label={text(lang, '주문 배송 조회', 'Order Tracking', 'Kiểm tra trạng thái đơn hàng')}
        >
          <span className="floating-tooltip">
            {text(lang, '주문 배송 조회', 'Order Status', 'Tra cứu đơn hàng')}
          </span>
          <svg className="tracking-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
            <circle cx="18" cy="18" r="3" fill="#c5a880" stroke="#1c2e22" strokeWidth="1.5"></circle>
            <line x1="20" y1="20" x2="22" y2="22" stroke="#e8d8be" strokeWidth="2"></line>
          </svg>
        </button>
      </aside>

      {/* 2. MODAL TRA CỨU ĐƠN HÀNG (ORDER TRACKING MODAL) */}
      {isTrackingOpen && (
        <div className="modal-backdrop" onClick={() => setIsTrackingOpen(false)}>
          <div className="modal-dialog tracking-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="eyebrow">MICHELLE STORE · ORDER TRACKING</span>
                <h3>{text(lang, '주문 및 배송 상태 조회', 'Order & Delivery Tracking', 'Kiểm Tra Trạng Thái Đơn Hàng')}</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsTrackingOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleTrackOrder} className="tracking-search-form">
                <label htmlFor="trackingInput">
                  {text(lang, '전화번호 또는 주문번호 입력', 'Enter Phone Number or Order Code', 'Nhập số điện thoại hoặc mã đơn hàng (MS-...)')}:
                </label>
                <div className="search-input-group">
                  <input
                    id="trackingInput"
                    type="text"
                    required
                    value={trackingQuery}
                    onChange={e => setTrackingQuery(e.target.value)}
                    placeholder={text(lang, '예: 01012345678 또는 MS-261016-1234', 'e.g. 0901234567 or MS-261016-1234', 'Ví dụ: 0987654321 hoặc MS-261016-1234')}
                  />
                  <button type="submit" className="button primary" disabled={trackingLoading}>
                    {trackingLoading ? '...' : text(lang, '조회', 'Search', 'Tra cứu')}
                  </button>
                </div>
              </form>

              {trackingError && (
                <div className="tracking-notice warning">
                  <p>{trackingError}</p>
                  <a
                    href={`https://ig.me/m/${instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button secondary small-btn"
                  >
                    💬 {text(lang, '인스타그램으로 직접 문의하기', 'Ask Michelle on Instagram', 'Hỏi trực tiếp qua Instagram')} ↗
                  </a>
                </div>
              )}

              {trackingResults.length > 0 && (
                <div className="tracking-results-list">
                  {trackingResults.map((item, idx) => (
                    <div className="order-status-card" key={idx}>
                      <div className="order-card-top">
                        <div>
                          <span className="order-id-badge">{item.orderId}</span>
                          <span className="order-date">{item.createdAt}</span>
                        </div>
                        <span className={`status-pill ${getStatusColor(item.status)}`}>
                          ● {item.status}
                        </span>
                      </div>

                      <div className="order-card-content">
                        <div className="info-row">
                          <span className="info-label">{text(lang, '고객 정보', 'Customer', 'Khách hàng')}:</span>
                          <span className="info-val"><b>{item.customerName}</b> ({item.phone})</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">{text(lang, '배송 주소', 'Address', 'Địa chỉ')}:</span>
                          <span className="info-val">{item.address}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">{text(lang, '선택 상품', 'Products', 'Sản phẩm')}:</span>
                          <span className="info-val">
                            {item.productName} · {item.fabric} · {item.color} (SL: {item.quantity})
                          </span>
                        </div>
                        {item.sizeOrMeasurements && (
                          <div className="info-row">
                            <span className="info-label">{text(lang, '사이즈/치수', 'Size/Measure', 'Size / Số đo')}:</span>
                            <span className="info-val">{item.sizeOrMeasurements}</span>
                          </div>
                        )}
                        {item.customDesign && (
                          <div className="info-row">
                            <span className="info-label">{text(lang, '맞춤 요청', 'Custom Note', 'Yêu cầu riêng')}:</span>
                            <span className="info-val">{item.customDesign}</span>
                          </div>
                        )}
                        {item.trackingCode && (
                          <div className="info-row tracking-code-highlight">
                            <span className="info-label">🚚 {text(lang, '운송장 번호', 'Tracking No', 'Mã vận đơn')}:</span>
                            <span className="info-val"><b>{item.trackingCode}</b></span>
                          </div>
                        )}
                        {item.adminNote && (
                          <div className="info-row admin-note-row">
                            <span className="info-label">💬 {text(lang, '미셸 안내', 'Shop Note', 'Ghi chú từ shop')}:</span>
                            <span className="info-val">{item.adminNote}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searched && trackingResults.length === 0 && !trackingError && (
                <p className="field-hint text-center">
                  {text(lang, '주문 내역이 없습니다.', 'No matching orders.', 'Không có kết quả tra cứu.')}
                </p>
              )}

              <div className="modal-footer-tools">
                <span className="muted-text">
                  Sheet ID: <code>{sheetId.substring(0, 8)}...</code>
                </span>
                <button
                  type="button"
                  className="link-btn text-muted"
                  onClick={() => setIsApiConfigOpen(!isApiConfigOpen)}
                >
                  ⚙️ {text(lang, 'API 연동 설정', 'API Config', 'Cài đặt kết nối Sheet')}
                </button>
              </div>

              {isApiConfigOpen && (
                <div className="api-config-box">
                  <p className="field-hint">
                    {text(
                      lang,
                      'Google Apps Script Web App URL을 입력하시면 실시간 시트 데이터와 동기화됩니다:',
                      'Enter your deployed Google Apps Script Web App URL to sync live data:',
                      'Dán URL Web App Google Apps Script để đồng bộ trực tiếp với Google Sheet:'
                    )}
                  </p>
                  <div className="input-group">
                    <input
                      type="url"
                      defaultValue={activeApiUrl}
                      id="apiUrlInput"
                      placeholder="https://script.google.com/macros/s/.../exec"
                    />
                    <button
                      type="button"
                      className="button secondary small-btn"
                      onClick={() => {
                        const input = document.getElementById('apiUrlInput') as HTMLInputElement;
                        if (input) saveApiUrl(input.value.trim());
                      }}
                    >
                      {text(lang, '저장', 'Save', 'Lưu')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. MODAL ĐẶT HÀNG TRỰC TIẾP (DIRECT ORDER MODAL) */}
      {isOrderOpen && (
        <div className="modal-backdrop" onClick={() => setIsOrderOpen(false)}>
          <div className="modal-dialog order-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="eyebrow">MICHELLE STORE · ĐẶT HÀNG</span>
                <h3>{text(lang, '온라인 주문 신청서', 'Place Your Order', 'Phiếu Đặt Hàng Trực Tuyến')}</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsOrderOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {orderSuccess ? (
                <div className="order-success-view">
                  <div className="success-badge">✓</div>
                  <h4>{text(lang, '주문이 성공적으로 접수되었습니다!', 'Order Placed Successfully!', 'Đặt Hàng Thành Công!')}</h4>
                  <p className="order-id-announce">
                    {text(lang, '주문 코드', 'Your Order Code', 'Mã đơn hàng của bạn')}:<br />
                    <strong>{orderSuccess.orderId}</strong>
                  </p>
                  <p className="muted">
                    {text(
                      lang,
                      '주문 정보가 Michelle Store 구글 시트에 안전하게 등록되었습니다. 언제든지 화면 오른쪽 "주문 배송 조회" 버튼에서 전화번호로 배송 상태를 확인하실 수 있습니다.',
                      'Your order has been recorded into Michelle Store’s management sheet. You can track progress anytime with the Order Tracking button on the right.',
                      'Thông tin đơn hàng đã được gửi và lưu về Google Sheet quản lý của Michelle Store. Bạn có thể bấm nút Tra cứu đơn hàng ở thanh nổi bên phải để kiểm tra tiến độ may đo và giao hàng bất cứ lúc nào!'
                    )}
                  </p>
                  <div className="success-actions">
                    <a
                      href={`https://ig.me/m/${instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button primary full-width"
                    >
                      💬 {text(lang, '인스타그램으로 주문 확인 메시지 보내기', 'Confirm with Michelle on Instagram', 'Nhắn tin xác nhận qua Instagram @' + instagram)} ↗
                    </a>
                    <button
                      type="button"
                      className="button secondary full-width"
                      onClick={() => {
                        setIsOrderOpen(false);
                        setOrderSuccess(null);
                        setTrackingQuery(orderSuccess.phone);
                        setIsTrackingOpen(true);
                      }}
                    >
                      🔍 {text(lang, '방금 주문한 내역 조회하기', 'View My Order Status', 'Kiểm tra trạng thái đơn vừa đặt')}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleOrderSubmit} className="order-form">
                  {orderError && <p className="notice warning">{orderError}</p>}

                  {/* Thông tin sản phẩm đang chọn */}
                  <div className="form-section-card">
                    <span className="card-sub-title">01. {text(lang, '선택한 디자인 및 원단', 'Selected Garment', 'Sản phẩm & Chất liệu lụa')}</span>
                    <div className="selected-summary-box">
                      <p><b>{text(lang, '디자인', 'Design', 'Thiết kế')}:</b> {orderForm.productName || text(lang, '실크 맞춤 디자인', 'Bespoke Silk Design', 'Thiết kế lụa theo yêu cầu')}</p>
                      <div className="flex-row">
                        <span><b>{text(lang, '원단', 'Fabric', 'Loại vải')}:</b> {orderForm.fabric}</span>
                        <span><b>{text(lang, '컬러', 'Color', 'Mã màu')}:</b> {orderForm.color || text(lang, '컬러차트 선택', 'Palette Selection', 'Tư vấn theo bảng màu')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Thông tin khách hàng */}
                  <div className="form-section-card">
                    <span className="card-sub-title">02. {text(lang, '고객 배송 정보', 'Shipping Details', 'Thông tin nhận hàng')}</span>
                    <div className="form-grid-2">
                      <div className="form-field">
                        <label htmlFor="customerName">{text(lang, '성함', 'Full Name', 'Họ và tên người nhận')} *</label>
                        <input
                          id="customerName"
                          type="text"
                          required
                          value={orderForm.customerName}
                          onChange={e => setOrderForm({ ...orderForm, customerName: e.target.value })}
                          placeholder={text(lang, '예: 김미셸', 'e.g. Jane Doe', 'Ví dụ: Nguyễn Thùy Hương')}
                        />
                      </div>
                      <div className="form-field">
                        <label htmlFor="customerPhone">{text(lang, '연락처 (전화번호)', 'Phone Number', 'Số điện thoại nhận hàng')} *</label>
                        <input
                          id="customerPhone"
                          type="tel"
                          required
                          value={orderForm.phone}
                          onChange={e => setOrderForm({ ...orderForm, phone: e.target.value })}
                          placeholder={text(lang, '예: 01012345678', 'e.g. 0901234567', 'Ví dụ: 0912345678')}
                        />
                      </div>
                    </div>

                    <div className="form-field">
                      <label htmlFor="customerAddress">{text(lang, '배송지 주소', 'Delivery Address', 'Địa chỉ nhận hàng chi tiết')} *</label>
                      <input
                        id="customerAddress"
                        type="text"
                        required
                        value={orderForm.address}
                        onChange={e => setOrderForm({ ...orderForm, address: e.target.value })}
                        placeholder={text(lang, '상세 주소를 입력해 주세요', 'Street address, city, postal code', 'Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố')}
                      />
                    </div>
                  </div>

                  {/* Size và yêu cầu may đo */}
                  <div className="form-section-card">
                    <div className="card-header-flex">
                      <span className="card-sub-title">03. {text(lang, '사이즈 & 맞춤 제작 옵션', 'Sizing & Custom Tailoring', 'Size / Số đo & Yêu cầu riêng')}</span>
                      <div className="size-type-tabs">
                        <button
                          type="button"
                          className={orderForm.sizeType === 'bespoke' ? 'active' : ''}
                          onClick={() => setOrderForm({ ...orderForm, sizeType: 'bespoke' })}
                        >
                          {text(lang, '치수 맞춤 (May đo)', 'Bespoke', 'May đo theo số đo')}
                        </button>
                        <button
                          type="button"
                          className={orderForm.sizeType === 'standard' ? 'active' : ''}
                          onClick={() => setOrderForm({ ...orderForm, sizeType: 'standard' })}
                        >
                          {text(lang, '기성 사이즈 (S/M/L)', 'Standard Size', 'Size chuẩn (S/M/L)')}
                        </button>
                      </div>
                    </div>

                    {orderForm.sizeType === 'bespoke' ? (
                      <div className="measurements-inputs-grid">
                        <div className="measure-mini-field">
                          <label>{text(lang, '가슴', 'Bust', 'Vòng 1 (Ngực)')}</label>
                          <div className="mini-input">
                            <input
                              type="number"
                              step="any"
                              placeholder="cm"
                              value={orderForm.bust}
                              onChange={e => setOrderForm({ ...orderForm, bust: e.target.value })}
                            />
                            <span>cm</span>
                          </div>
                        </div>
                        <div className="measure-mini-field">
                          <label>{text(lang, '허리', 'Waist', 'Vòng 2 (Eo)')}</label>
                          <div className="mini-input">
                            <input
                              type="number"
                              step="any"
                              placeholder="cm"
                              value={orderForm.waist}
                              onChange={e => setOrderForm({ ...orderForm, waist: e.target.value })}
                            />
                            <span>cm</span>
                          </div>
                        </div>
                        <div className="measure-mini-field">
                          <label>{text(lang, '엉덩이', 'Hips', 'Vòng 3 (Mông)')}</label>
                          <div className="mini-input">
                            <input
                              type="number"
                              step="any"
                              placeholder="cm"
                              value={orderForm.hips}
                              onChange={e => setOrderForm({ ...orderForm, hips: e.target.value })}
                            />
                            <span>cm</span>
                          </div>
                        </div>
                        <div className="measure-mini-field">
                          <label>{text(lang, '키', 'Height', 'Chiều cao')}</label>
                          <div className="mini-input">
                            <input
                              type="number"
                              step="any"
                              placeholder="cm"
                              value={orderForm.height}
                              onChange={e => setOrderForm({ ...orderForm, height: e.target.value })}
                            />
                            <span>cm</span>
                          </div>
                        </div>
                        <div className="measure-mini-field">
                          <label>{text(lang, '몸무게', 'Weight', 'Cân nặng')}</label>
                          <div className="mini-input">
                            <input
                              type="number"
                              step="any"
                              placeholder="kg"
                              value={orderForm.weight}
                              onChange={e => setOrderForm({ ...orderForm, weight: e.target.value })}
                            />
                            <span>kg</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="standard-size-selector">
                        <label className="field-hint-inline">{text(lang, '사이즈 선택', 'Choose size', 'Chọn size:')}</label>
                        <div className="size-buttons-group">
                          {['S', 'M', 'L', 'XL'].map(sz => (
                            <button
                              type="button"
                              key={sz}
                              className={`size-btn ${orderForm.standardSize === sz ? 'selected' : ''}`}
                              onClick={() => setOrderForm({ ...orderForm, standardSize: sz })}
                            >
                              {sz}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="form-field mt-3">
                      <label htmlFor="customDesign">{text(lang, '디자인 맞춤 수정 요청', 'Custom Design Requests', 'Yêu cầu thiết kế riêng')} (Tùy chọn)</label>
                      <input
                        id="customDesign"
                        type="text"
                        value={orderForm.customDesign}
                        onChange={e => setOrderForm({ ...orderForm, customDesign: e.target.value })}
                        placeholder={text(lang, '예: 기장 5cm 연장, 소매 칠부 등', 'e.g. +5cm longer length, 3/4 sleeves', 'Ví dụ: May dài thêm 5cm, làm tay lỡ, hạ cổ áo 2cm...')}
                      />
                    </div>

                    <div className="form-field mt-2">
                      <label htmlFor="orderNote">{text(lang, '기타 메모 / 배송 요청사항', 'Notes', 'Ghi chú thêm')} (Tùy chọn)</label>
                      <textarea
                        id="orderNote"
                        rows={2}
                        value={orderForm.note}
                        onChange={e => setOrderForm({ ...orderForm, note: e.target.value })}
                        placeholder={text(lang, '문의사항이나 배송 요청사항을 남겨주세요.', 'Any questions or delivery preferences', 'Ghi chú về thời gian nhận hàng hoặc lưu ý riêng...')}
                      />
                    </div>
                  </div>

                  <div className="order-actions">
                    <button type="submit" className="button primary full-width" disabled={orderSubmitting}>
                      {orderSubmitting ? 'Đang gửi đơn hàng...' : '✓ ' + text(lang, '주문서 제출하기', 'Submit Order', 'Xác Nhận Đặt Hàng & Lưu Vào Hệ Thống')}
                    </button>
                    <p className="privacy-note text-center">
                      🔒 {text(
                        lang,
                        '주문 정보는 구글 시트에 안전하게 암호화되어 전송됩니다.',
                        'Your order details are transmitted securely to Google Sheet.',
                        'Đơn hàng được lưu tự động về Google Sheet quản lý của Michelle Store.'
                      )}
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
