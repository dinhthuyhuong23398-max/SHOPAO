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
  email?: string;
  address: string;
  productId?: string;
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
  language?: string;
  source?: string;
  pageUrl?: string;
  itemDetails?: string;
}

const STORAGE_ORDERS_KEY = 'michelle_recent_orders';
const DEFAULT_ORDER_API_URL = 'https://script.google.com/macros/s/AKfycbw7pFJx50ZJhgIzckJ_9Bjsx4Jrly7Teg6m7rlajsH1dS7MAJQS0sgxdnCHLN_4uoFZgQ/exec';

// Keep legacy Vietnamese status values readable from existing order records, but never display Vietnamese labels.
const normalizeStatusValue = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  const key = raw.toLocaleLowerCase();
  if (['chờ xác nhận', 'đang chờ lễ tân', 'pending confirmation', 'reception pending', '접수 대기'].includes(key)) return 'Pending Confirmation';
  if (['đang cắt may', 'đang may', 'tailoring', '제작 중'].includes(key)) return 'Tailoring';
  if (['đang vận chuyển', 'shipping', '배송 중'].includes(key)) return 'Shipping';
  if (['đã hoàn thành', 'completed', '배송 완료'].includes(key)) return 'Completed';
  return raw;
};

const normalizeOrderRecord = (record: Record<string, any>): OrderItem => ({
  orderId: String(record.orderId ?? record['Mã đơn'] ?? ''),
  createdAt: String(record.createdAt ?? record['Thời gian tạo'] ?? ''),
  customerName: String(record.customerName ?? record['Họ tên khách'] ?? ''),
  phone: String(record.phone ?? record['Số điện thoại'] ?? ''),
  email: String(record.email ?? record.Email ?? ''),
  address: String(record.address ?? record['Địa chỉ nhận hàng'] ?? ''),
  productId: String(record.productId ?? record['Mã SP'] ?? ''),
  productName: String(record.productName ?? record['Tên sản phẩm'] ?? ''),
  fabric: String(record.fabric ?? record['Chất liệu'] ?? ''),
  color: String(record.color ?? record['Màu / mã màu'] ?? ''),
  quantity: record.quantity ?? record['Số lượng'] ?? '',
  sizeOrMeasurements: String(record.sizeOrMeasurements ?? record['Size / số đo'] ?? ''),
  customDesign: String(record.customDesign ?? record['Yêu cầu chỉnh sửa'] ?? ''),
  note: String(record.note ?? record['Ghi chú đơn hàng'] ?? ''),
  status: normalizeStatusValue(record.status ?? record['Trạng thái'] ?? ''),
  trackingCode: String(record.trackingCode ?? record['Mã vận đơn'] ?? ''),
  adminNote: String(record.adminNote ?? record['Ghi chú nội bộ'] ?? ''),
  language: String(record.language ?? record['Ngôn ngữ'] ?? ''),
  source: String(record.source ?? record['Nguồn'] ?? ''),
  pageUrl: String(record.pageUrl ?? record['URL trang'] ?? ''),
  itemDetails: String(record.itemDetails ?? record['Chi tiết lựa chọn'] ?? '')
});

export default function FloatingWidgets({
  lang,
  instagram = 'michelle1998kr',
  orderApiUrl = '',
  sheetId = '1E2ywyOPViJ73f5JrSzYRDQcQNaHOD5FrvCwHojrSb1s'
}: FloatingWidgetsProps) {
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isOrderOpen, setIsOrderOpen] = useState(false);

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
    email: '',
    address: '',
    productName: '',
    productId: '',
    fabric: lang === 'ko' ? '수저우 고급 합성섬유 혼방 실크 (Suzhou premium synthetic-blend silk)' : 'Suzhou premium synthetic-blend silk',
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
    note: '',
    itemDetails: ''
  });

  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{ orderId: string; phone: string } | null>(null);
  const [orderError, setOrderError] = useState('');

  // Initialize
  useEffect(() => {
    // Listen for custom open events from other components (like ProductCustomizer or Proposal)
    const handleOpenOrder = (e: any) => {
      const detail = e.detail || {};
      const isLinenProd = detail.product?.slug?.includes('linen') || ['ML-31', 'ML-32', 'ML-33', 'ML-34'].includes(detail.product?.id);
      const prodName = detail.product?.name?.[lang] || detail.product?.name?.en || detail.product?.id || '';
      const fabName = detail.fabricName || (isLinenProd ? '100% Premium Natural Linen' : (detail.fabricId === 'ruby' ? (lang === 'ko' ? '루비 고급 합성섬유 혼방 실크 (Ruby premium synthetic-blend silk)' : 'Ruby premium synthetic-blend silk') : (lang === 'ko' ? '수저우 고급 합성섬유 혼방 실크 (Suzhou premium synthetic-blend silk)' : 'Suzhou premium synthetic-blend silk')));
      const col = detail.colorId || '';
      const sizeVal = detail.size || 'M';

      setOrderForm(prev => ({
        ...prev,
        productName: prodName || prev.productName,
        productId: detail.product?.id || prev.productId,
        fabric: fabName,
        color: col || prev.color,
        itemDetails: detail.itemDetails || prev.itemDetails,
        quantity: detail.quantity || 1,
        sizeType: isLinenProd ? 'standard' : prev.sizeType,
        standardSize: isLinenProd ? sizeVal : prev.standardSize,
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

  // Order lookup
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

      // 1. Check Google Apps Script API
      {
        try {
          const apiUrl = orderApiUrl || DEFAULT_ORDER_API_URL;
          const res = await fetch(`${apiUrl}?query=${encodeURIComponent(query)}&_=${Date.now()}`);
          const data = await res.json();
          if (data && data.success && Array.isArray(data.orders)) {
            found = data.orders.map(normalizeOrderRecord);
          }
        } catch (fetchErr) {
          console.warn('API lookup failed, falling back to local memory', fetchErr);
        }
      }

      // 2. Fallback to localStorage
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
            'No orders found matching your details. Please verify your phone number or order code.')
        );
      }
    } catch (err: any) {
      setTrackingError(err?.message || (lang === 'ko' ? '조회 중 오류가 발생했습니다.' : 'Error during lookup.'));
    } finally {
      setTrackingLoading(false);
    }
  };

  // Place order
  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.customerName.trim() || !orderForm.phone.trim() || !orderForm.address.trim()) {
      setOrderError(text(lang, '필수 항목을 모두 입력해 주세요.', 'Please complete all required fields.'));
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
      if (orderForm.bust) parts.push(lang === 'ko' ? `가슴: ${orderForm.bust}cm` : `Bust: ${orderForm.bust}cm`);
      if (orderForm.waist) parts.push(lang === 'ko' ? `허리: ${orderForm.waist}cm` : `Waist: ${orderForm.waist}cm`);
      if (orderForm.hips) parts.push(lang === 'ko' ? `힙: ${orderForm.hips}cm` : `Hips: ${orderForm.hips}cm`);
      if (orderForm.height) parts.push(lang === 'ko' ? `키: ${orderForm.height}cm` : `Height: ${orderForm.height}cm`);
      if (orderForm.weight) parts.push(lang === 'ko' ? `몸무게: ${orderForm.weight}kg` : `Weight: ${orderForm.weight}kg`);
      sizeInfo = parts.length ? `[${lang === 'ko' ? '맞춤제작' : 'Bespoke'}] ${parts.join(' | ')}` : `[${lang === 'ko' ? '상담 후 맞춤' : 'Bespoke via consultation'}]`;
    } else {
      sizeInfo = `[${lang === 'ko' ? '기성사이즈' : 'Standard'}] ${orderForm.standardSize}`;
    }

    const payload: OrderItem = {
      orderId,
      createdAt: now.toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US'),
      customerName: orderForm.customerName.trim(),
      phone: orderForm.phone.trim(),
      email: orderForm.email.trim(),
      address: orderForm.address.trim(),
      productId: orderForm.productId.trim(),
      productName: orderForm.productName.trim() || (lang === 'ko' ? '미셸 맞춤 고급 합성섬유 혼방 실크 디자인' : 'Michelle Bespoke Design'),
      fabric: orderForm.fabric,
      color: orderForm.color || (lang === 'ko' ? '인스타그램 색상 상담' : 'Color consultation via Instagram'),
      quantity: orderForm.quantity,
      sizeOrMeasurements: sizeInfo,
      customDesign: orderForm.customDesign.trim(),
      note: orderForm.note.trim(),
      status: lang === 'ko' ? '접수 대기' : 'Pending Confirmation',
      language: lang,
      source: 'SHOPAO web',
      pageUrl: window.location.href,
      itemDetails: orderForm.itemDetails || ''
    };

    try {
      // 1. Save to local storage
      try {
        const raw = localStorage.getItem(STORAGE_ORDERS_KEY);
        const list: OrderItem[] = raw ? JSON.parse(raw) : [];
        list.unshift(payload);
        localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(list.slice(0, 20)));
      } catch {}

      // 2. Send to Google Sheet
      try {
        const apiUrl = (orderApiUrl || DEFAULT_ORDER_API_URL).replace(/\/$/, '');
        await fetch(apiUrl, {
          method: 'POST',
          mode: 'no-cors',
          keepalive: true,
          headers: {
            // text/plain is a CORS-safelisted content type and works reliably on mobile browsers.
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify(payload)
        });
      } catch (postErr) {
        console.warn('POST to Apps Script failed, saved locally', postErr);
      }

      setOrderSuccess({ orderId, phone: orderForm.phone.trim() });
    } catch (err: any) {
      setOrderError(err?.message || (lang === 'ko' ? '주문 처리 중 오류가 발생했습니다. 다시 시도해 주세요.' : 'An error occurred while placing order. Please try again.'));
    } finally {
      setOrderSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (normalizeStatusValue(status)) {
      case 'Completed': return 'status-completed';
      case 'Shipping': return 'status-shipping';
      case 'Tailoring': return 'status-tailoring';
      default: return 'status-pending';
    }
  };

  const getStatusLabel = (status: string) => {
    const normalized = normalizeStatusValue(status);
    if (lang === 'en') return normalized || 'Checking status';
    switch (normalized) {
      case 'Pending Confirmation': return '접수 대기';
      case 'Tailoring': return '제작 중';
      case 'Shipping': return '배송 중';
      case 'Completed': return '배송 완료';
      default: return normalized || '상태 확인 중';
    }
  };


