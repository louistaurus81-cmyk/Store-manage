import React, { useState, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  User,
  Plus,
  Minus,
  X,
  Barcode,
  Printer,
  ChevronRight,
  Check,
  AlertCircle,
  CreditCard,
  Banknote,
  Percent,
} from 'lucide-react';
import type { Customer, Product, Invoice, InvoiceItem } from '../../types/datasoft';
import { apiFetch, formatVND } from '../../utils/api';
import { MobileInvoice } from './MobileInvoice';

interface MobilePOSProps {
  onSuccessInvoice?: (invoice: Invoice) => void;
  onNavigateTab?: (tab: string) => void;
}

export const MobilePOS: React.FC<MobilePOSProps> = ({
  onSuccessInvoice,
  onNavigateTab,
}) => {
  // Data lists
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Cart state
  const [cartItems, setCartItems] = useState<InvoiceItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash' | 'debt'>('transfer');

  // Bottom sheets
  const [showCustomerSheet, setShowCustomerSheet] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showAddItemSheet, setShowAddItemSheet] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');

  // Serial/IMEI picker bottom sheet
  const [productForImei, setProductForImei] = useState<Product | null>(null);
  const [availableImeis, setAvailableImeis] = useState<string[]>([]);
  const [loadingImeis, setLoadingImeis] = useState(false);

  // Result invoice modal
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, custs] = await Promise.all([
        apiFetch<Product[]>('/api/products'),
        apiFetch<Customer[]>('/api/customers'),
      ]);
      setProducts(prods);
      setCustomers(custs);
    } catch (err) {
      console.error('Lỗi nạp dữ liệu POS Mobile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setShowCustomerSheet(false);
  };

  const handleOpenImeiPicker = async (p: Product) => {
    setProductForImei(p);
    setLoadingImeis(true);
    try {
      const imeis = await apiFetch<any[]>(`/api/imei/product/${p.id}`);
      const inStock = imeis.filter((i) => i.status === 'in_stock').map((i) => i.imei);
      setAvailableImeis(inStock);
    } catch (err) {
      setAvailableImeis([]);
    } finally {
      setLoadingImeis(false);
    }
  };

  const handleAddItem = (p: Product, chosenImei?: string) => {
    if (p.hasSerialImei && !chosenImei) {
      handleOpenImeiPicker(p);
      return;
    }

    if (chosenImei) {
      // Check if already in cart
      if (cartItems.some((it) => it.imei === chosenImei)) {
        alert(`Serial/IMEI [${chosenImei}] đã có trong giỏ hàng!`);
        return;
      }
      const newItem: InvoiceItem = {
        productId: p.id,
        productName: p.name,
        quantity: 1,
        unitPrice: p.retailPrice,
        costPrice: p.costPrice || p.importPrice || 0,
        total: p.retailPrice,
        imei: chosenImei,
        warrantyMonths: p.warrantyMonths,
      };
      setCartItems([...cartItems, newItem]);
      setProductForImei(null);
      setShowAddItemSheet(false);
      return;
    }

    // Non-serialized item
    const existing = cartItems.find((it) => it.productId === p.id && !it.imei);
    if (existing) {
      setCartItems(
        cartItems.map((it) =>
          it === existing
            ? { ...it, quantity: it.quantity + 1, total: (it.quantity + 1) * it.unitPrice }
            : it
        )
      );
    } else {
      const newItem: InvoiceItem = {
        productId: p.id,
        productName: p.name,
        quantity: 1,
        unitPrice: p.retailPrice,
        costPrice: p.costPrice || p.importPrice || 0,
        total: p.retailPrice,
        warrantyMonths: p.warrantyMonths,
      };
      setCartItems([...cartItems, newItem]);
    }
    setShowAddItemSheet(false);
  };

  const handleRemoveItem = (index: number) => {
    setCartItems(cartItems.filter((_, idx) => idx !== index));
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
    const item = cartItems[index];
    if (item.imei) return; // Serialized item quantity is fixed at 1
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      handleRemoveItem(index);
    } else {
      setCartItems(
        cartItems.map((it, idx) =>
          idx === index ? { ...it, quantity: newQty, total: newQty * it.unitPrice } : it
        )
      );
    }
  };

  const subTotal = cartItems.reduce((acc, it) => acc + it.total, 0);
  const finalTotal = Math.max(0, subTotal - discount);

  // Auto-sync discount when percent changes
  const handleDiscountPercentChange = (pct: number) => {
    const validPct = Math.max(0, Math.min(100, pct));
    setDiscountPercent(validPct);
    const calculatedDiscount = Math.round((subTotal * validPct) / 100);
    setDiscount(calculatedDiscount);
    if (paymentMethod !== 'debt') {
      setPaidAmount(Math.max(0, subTotal - calculatedDiscount));
    }
  };

  const handleDiscountAmountChange = (amount: number) => {
    const validAmount = Math.max(0, Math.min(subTotal, amount));
    setDiscount(validAmount);
    setDiscountPercent(subTotal > 0 ? Math.round((validAmount / subTotal) * 100) : 0);
    if (paymentMethod !== 'debt') {
      setPaidAmount(Math.max(0, subTotal - validAmount));
    }
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      alert('Giỏ hàng trống! Hãy thêm linh kiện trước khi tạo đơn.');
      return;
    }

    try {
      const payload = {
        customerId: selectedCustomer?.id,
        customerName: customerName.trim() || 'Khách vãng lai',
        customerPhone: customerPhone.trim() || undefined,
        items: cartItems,
        subTotal,
        discount,
        finalAmount: finalTotal,
        paidAmount: Math.max(0, paidAmount),
        paymentMethod,
        note: 'Đơn hàng tạo từ Mobile POS Thịnh Phát Technology',
      };

      const invoice = await apiFetch<Invoice>('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setCreatedInvoice(invoice);
      setCartItems([]);
      setSelectedCustomer(null);
      setCustomerName('');
      setCustomerPhone('');
      setDiscount(0);
      setDiscountPercent(0);
      setPaidAmount(0);

      if (onSuccessInvoice) onSuccessInvoice(invoice);
    } catch (err: any) {
      alert(err.message || 'Lỗi lập hóa đơn bán lẻ');
    }
  };

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearchQuery.trim()) return true;
    const q = customerSearchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.code.toLowerCase().includes(q);
  });

  const filteredProducts = products.filter((p) => {
    if (!productSearchQuery.trim()) return true;
    const q = productSearchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-full bg-[#f8f9fc] text-slate-800 font-sans pb-16">
      {/* 1. Header Title iOS Style */}
      <div className="px-5 pt-6 pb-4">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
          Thịnh Phát Technology · POS
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          New Invoice
        </h1>
      </div>

      <div className="px-5 space-y-4">
        {/* 2. Thẻ Card Chọn Khách Hàng (To, Chạm mở Bottom Sheet) */}
        <div
          onClick={() => setShowCustomerSheet(true)}
          className="bg-white rounded-3xl p-4 shadow-sm border border-zinc-100 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
              <User className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Khách Hàng
              </div>
              <div className="text-sm font-bold text-slate-900 truncate mt-0.5">
                {selectedCustomer ? selectedCustomer.name : customerName || 'Chọn hoặc nhập khách hàng...'}
              </div>
              <div className="text-xs font-mono text-zinc-500 truncate">
                {selectedCustomer ? `SĐT: ${selectedCustomer.phone} · ${selectedCustomer.code}` : customerPhone || 'Chạm để tìm kiếm khách cũ'}
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-400 shrink-0" />
        </div>

        {/* 3. Danh Sách Linh Kiện (Mỗi mặt hàng là 1 box xám nhạt bg-zinc-50 có nút X rõ ràng) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Linh Kiện Đã Chọn ({cartItems.length})
            </span>
            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={() => setCartItems([])}
                className="text-xs text-rose-500 font-semibold cursor-pointer active:scale-95"
              >
                Xóa tất cả
              </button>
            )}
          </div>

          {cartItems.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-zinc-100 space-y-2">
              <ShoppingCart className="w-8 h-8 text-zinc-300 mx-auto stroke-[1.5]" />
              <div className="text-xs font-bold text-zinc-700">
                Chưa có linh kiện nào trong đơn
              </div>
              <div className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                Bấm nút "+ Add Item" màu tím bên dưới để thêm sản phẩm từ kho.
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {cartItems.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-zinc-50/90 rounded-2xl p-3.5 border border-zinc-200/60 shadow-2xs flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-slate-900 truncate">
                      {item.productName}
                    </div>
                    {item.imei && (
                      <div className="text-[10px] font-mono font-bold text-purple-700 flex items-center gap-1 mt-0.5">
                        <Barcode className="w-3 h-3 shrink-0" />
                        Serial: {item.imei}
                      </div>
                    )}
                    <div className="text-xs font-mono font-bold text-emerald-700 mt-1">
                      {formatVND(item.total)}
                    </div>
                  </div>

                  {/* Quantity Stepper hoặc nút X */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!item.imei && (
                      <div className="flex items-center bg-white rounded-xl border border-zinc-200/80 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(idx, -1)}
                          className="w-8 h-8 flex items-center justify-center text-zinc-500 active:scale-90"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold font-mono">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(idx, 1)}
                          className="w-8 h-8 flex items-center justify-center text-zinc-500 active:scale-90"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                      title="Xóa mặt hàng"
                    >
                      <X className="w-4 h-4 stroke-[2]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Nút "+ Add Item" Màu Tím Nổi Bật (Yêu Cầu 3) */}
          <button
            type="button"
            onClick={() => setShowAddItemSheet(true)}
            className="w-full min-h-[48px] rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md shadow-purple-600/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            + Add Item
          </button>
        </div>

        {/* 4. Nhập Liệu Chiết Khấu & Thanh Toán (Inputs min-height 44px) */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-100 space-y-4">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
            Thanh Toán & Chiết Khấu
          </span>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                Chiết khấu (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={discountPercent || ''}
                placeholder="0"
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 0) handleDiscountPercentChange(val);
                }}
                className="w-full min-h-[44px] px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-base sm:text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                Giảm tiền mặt (đ)
              </label>
              <input
                type="number"
                min={0}
                value={discount || ''}
                placeholder="0"
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 0) handleDiscountAmountChange(val);
                }}
                className="w-full min-h-[44px] px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-base sm:text-sm font-mono font-bold text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white"
              />
            </div>
          </div>

          {/* Phương thức thanh toán (3 nút to) */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 mb-1.5">
              Phương Thức
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('transfer');
                  setPaidAmount(finalTotal);
                }}
                className={`min-h-[44px] rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  paymentMethod === 'transfer'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                Chuyển Khoản
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('cash');
                  setPaidAmount(finalTotal);
                }}
                className={`min-h-[44px] rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                Tiền Mặt
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('debt');
                  setPaidAmount(0);
                }}
                className={`min-h-[44px] rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  paymentMethod === 'debt'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                Ghi Nợ
              </button>
            </div>
          </div>

          {/* Tiền khách trả */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
              Khách Thanh Toán Trước (đ)
            </label>
            <input
              type="number"
              min={0}
              value={paidAmount || ''}
              placeholder="0"
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val >= 0) setPaidAmount(val);
              }}
              className="w-full min-h-[44px] px-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-base sm:text-sm font-mono font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white"
            />
          </div>

          {/* Tổng tiền tóm tắt */}
          <div className="pt-3 border-t border-zinc-100 flex items-baseline justify-between">
            <span className="text-xs font-bold text-zinc-500">Tổng Cần Trả:</span>
            <span className="text-xl font-black font-mono text-slate-900">
              {formatVND(finalTotal)}
            </span>
          </div>
        </div>

        {/* Nút Hoàn tất thanh toán */}
        <button
          type="button"
          onClick={handleCheckout}
          disabled={cartItems.length === 0}
          className="w-full min-h-[52px] rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-extrabold text-sm shadow-lg shadow-purple-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Printer className="w-5 h-5 stroke-[2]" />
          HOÀN TẤT & XUẤT HÓA ĐƠN
        </button>
      </div>

      {/* ======================================================== */}
      {/* BOTTOM SHEET 1: CHỌN KHÁCH HÀNG (Vuốt từ dưới lên)       */}
      {/* ======================================================== */}
      {showCustomerSheet && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl shadow-2xl border-t border-zinc-200/60 w-full max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-10 h-1 rounded-full bg-zinc-300" />
            </div>

            <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">
                Chọn Khách Hàng
              </h3>
              <button
                type="button"
                onClick={() => setShowCustomerSheet(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 active:scale-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input (44px min-height) */}
            <div className="p-4 border-b border-zinc-100">
              <div className="relative">
                <Search className="w-5 h-5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm Tên, Số điện thoại, Mã KH..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="w-full min-h-[44px] pl-11 pr-4 bg-zinc-50 border border-zinc-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredCustomers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelectCustomer(c)}
                  className="p-3.5 bg-zinc-50/70 hover:bg-purple-50/50 rounded-2xl border border-zinc-200/60 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] transition-all"
                >
                  <div>
                    <div className="font-bold text-xs text-slate-900">{c.name}</div>
                    <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                      SĐT: {c.phone} · Mã: {c.code}
                    </div>
                  </div>
                  {c.currentDebt > 0 && (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
                      Nợ: {formatVND(c.currentDebt)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* BOTTOM SHEET 2: ADD ITEM (Thêm linh kiện)                */}
      {/* ======================================================== */}
      {showAddItemSheet && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl shadow-2xl border-t border-zinc-200/60 w-full max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-10 h-1 rounded-full bg-zinc-300" />
            </div>

            <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">
                Thêm Linh Kiện Vào Đơn
              </h3>
              <button
                type="button"
                onClick={() => setShowAddItemSheet(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 active:scale-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input (44px min-height) */}
            <div className="p-4 border-b border-zinc-100">
              <div className="relative">
                <Search className="w-5 h-5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm linh kiện, mã SKU..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="w-full min-h-[44px] pl-11 pr-4 bg-zinc-50 border border-zinc-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
            </div>

            {/* Products List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleAddItem(p)}
                  className="p-3.5 bg-zinc-50/70 hover:bg-purple-50/50 rounded-2xl border border-zinc-200/60 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-slate-900 truncate">
                      {p.name}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                      SKU: {p.sku} · Tồn: {p.stockQuantity}
                    </div>
                    {p.hasSerialImei && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded-md mt-1 border border-purple-200/60">
                        <Barcode className="w-3 h-3" /> Quản lý IMEI
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-xs text-slate-900">
                      {formatVND(p.retailPrice)}
                    </div>
                    <span className="text-[10px] font-bold text-purple-600 block mt-1">
                      + Thêm
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* BOTTOM SHEET 3: CHỌN SỐ SERIAL / IMEI TỒN KHO            */}
      {/* ======================================================== */}
      {productForImei && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl shadow-2xl border-t border-zinc-200/60 w-full max-h-[75vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-10 h-1 rounded-full bg-zinc-300" />
            </div>

            <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Chọn Số Serial / IMEI
                </h3>
                <p className="text-[11px] text-zinc-400 truncate max-w-xs">
                  {productForImei.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProductForImei(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 active:scale-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingImeis ? (
                <div className="p-8 text-center text-xs text-zinc-400">
                  Đang tải danh sách IMEI...
                </div>
              ) : availableImeis.length === 0 ? (
                <div className="p-8 text-center text-xs text-rose-500">
                  Không còn số IMEI nào ở trạng thái "Trong kho"!
                </div>
              ) : (
                availableImeis.map((imei) => (
                  <button
                    key={imei}
                    type="button"
                    onClick={() => handleAddItem(productForImei, imei)}
                    className="w-full p-3.5 bg-zinc-50 hover:bg-purple-50 text-left font-mono font-bold text-xs rounded-xl border border-zinc-200/60 flex items-center justify-between active:scale-[0.98] cursor-pointer"
                  >
                    <span>{imei}</span>
                    <span className="text-purple-600 text-xs font-sans font-bold">
                      Chọn
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hiển thị chi tiết Hóa đơn vừa tạo thành công */}
      {createdInvoice && (
        <MobileInvoice
          invoice={createdInvoice}
          onClose={() => setCreatedInvoice(null)}
          onPrint={(inv) => alert(`In hóa đơn: ${inv.invoiceCode}`)}
        />
      )}
    </div>
  );
};
