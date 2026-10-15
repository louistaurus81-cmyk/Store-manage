import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Trash2,
  Printer,
  Search,
  CreditCard,
  Banknote,
  Scale,
  User,
  Phone,
  CheckCircle,
} from 'lucide-react';
import type { Customer, Invoice, InvoiceItem, Product, StoreSettings, UserRole } from '../types/datasoft';
import { apiFetch, formatVND, formatDate } from '../utils/api';
import { InvoicePrintModal } from '../components/InvoicePrintModal';

interface SalesViewProps {
  userRole: UserRole;
}

export const SalesView: React.FC<SalesViewProps> = ({ userRole }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  const [loading, setLoading] = useState(true);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);

  // Cart Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cartItems, setCartItems] = useState<InvoiceItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'debt'>('transfer');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [orderNote, setOrderNote] = useState('');

  // Selected item to add
  const [selectedProdId, setSelectedProdId] = useState('');
  const [selectedImei, setSelectedImei] = useState('');
  const [availableImeis, setAvailableImeis] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invs, prods, custs, storeSet] = await Promise.all([
        apiFetch<Invoice[]>('/api/invoices'),
        apiFetch<Product[]>('/api/products'),
        apiFetch<Customer[]>('/api/customers'),
        apiFetch<StoreSettings>('/api/system/settings'),
      ]);
      setInvoices(invs);
      setProducts(prods);
      setCustomers(custs);
      setSettings(storeSet);
    } catch (err) {
      console.error('Lỗi nạp dữ liệu bán hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = async (prodId: string) => {
    setSelectedProdId(prodId);
    setSelectedImei('');
    const p = products.find((prod) => prod.id === prodId);
    if (p && p.hasSerialImei) {
      try {
        const imeis = await apiFetch<any[]>(`/api/imeis?productId=${prodId}&status=in_stock`);
        setAvailableImeis(imeis.map((i) => i.imei));
      } catch {
        setAvailableImeis([]);
      }
    } else {
      setAvailableImeis([]);
    }
  };

  const handleAddToCart = () => {
    const product = products.find((p) => p.id === selectedProdId);
    if (!product) return;

    if (product.hasSerialImei && !selectedImei) {
      alert('Sản phẩm này quản lý theo Serial/IMEI. Vui lòng chọn số IMEI tồn kho!');
      return;
    }

    const newItem: InvoiceItem = {
      productId: product.id,
      productName: product.name,
      imei: selectedImei || undefined,
      quantity: 1,
      unitPrice: product.retailPrice,
      discount: 0,
      total: product.retailPrice,
      warrantyMonths: product.warrantyMonths || 12,
    };

    const newCart = [...cartItems, newItem];
    setCartItems(newCart);

    // Tính lại tiền
    const subTotal = newCart.reduce((s, i) => s + i.total, 0);
    const final = Math.max(0, subTotal - discount);
    if (paymentMethod !== 'debt') {
      setPaidAmount(final);
    }

    // Reset picker
    setSelectedProdId('');
    setSelectedImei('');
    setAvailableImeis([]);
  };

  const handleRemoveFromCart = (index: number) => {
    const updated = cartItems.filter((_, idx) => idx !== index);
    setCartItems(updated);
    const subTotal = updated.reduce((s, i) => s + i.total, 0);
    const final = Math.max(0, subTotal - discount);
    if (paymentMethod !== 'debt') {
      setPaidAmount(final);
    }
  };

  const handleCustomerSelect = (phone: string) => {
    setCustomerPhone(phone);
    const c = customers.find((cust) => cust.phone === phone);
    if (c) {
      setCustomerName(c.name);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) {
      alert('Vui lòng nhập Tên và Số điện thoại khách hàng!');
      return;
    }
    if (cartItems.length === 0) {
      alert('Giỏ hàng đang trống!');
      return;
    }

    try {
      const created = await apiFetch<Invoice>('/api/invoices', {
        method: 'POST',
        body: JSON.stringify({
          customerName,
          customerPhone,
          items: cartItems,
          discount,
          paidAmount: paymentMethod === 'debt' ? 0 : paidAmount,
          paymentMethod,
          note: orderNote,
        }),
      });

      setInvoices([created, ...invoices]);
      setShowCreateOrder(false);
      setSelectedInvoiceForPrint(created);

      // Reset form
      setCartItems([]);
      setCustomerName('');
      setCustomerPhone('');
      setDiscount(0);
      setPaidAmount(0);
      setOrderNote('');

      // Reload products to update stock
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi lập hóa đơn bán hàng');
    }
  };

  const subTotal = cartItems.reduce((s, i) => s + i.total, 0);
  const finalAmount = Math.max(0, subTotal - discount);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Quản lý Bán hàng & Hóa đơn (Invoices)</h2>
          <p className="text-xs text-slate-500">
            Tự động xuất kho IMEI, kích hoạt sổ bảo hành và hạch toán công nợ khách hàng
          </p>
        </div>

        <button
          onClick={() => {
            setShowCreateOrder(true);
            setCartItems([]);
          }}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          + Lập hóa đơn bán hàng mới
        </button>
      </div>

      {/* POS Order Creator (If active) */}
      {showCreateOrder && (
        <div className="bg-white border-2 border-emerald-500 rounded-xl p-6 shadow-md space-y-5 animate-in fade-in">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              Lập Hóa Đơn Bán Lẻ & Xuất Kho IMEI
            </h3>
            <button
              onClick={() => setShowCreateOrder(false)}
              className="text-slate-400 hover:text-slate-600 text-sm"
            >
              ✕ Hủy đơn
            </button>
          </div>

          <form onSubmit={handleCheckout} className="space-y-4 text-xs">
            {/* Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Số điện thoại khách hàng *</label>
                <input
                  type="tel"
                  required
                  placeholder="Nhập SĐT khách..."
                  value={customerPhone}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-white border rounded-lg font-mono focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tên khách hàng *</label>
                <input
                  type="text"
                  required
                  placeholder="Tên khách hàng..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border rounded-lg focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Product Picker */}
            <div className="p-3 border border-slate-200 rounded-lg space-y-3">
              <div className="font-semibold text-slate-800">Thêm sản phẩm vào giỏ hàng:</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <select
                    value={selectedProdId}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">-- Chọn sản phẩm tồn kho --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.stockQuantity <= 0 && p.stockQuantity < 900}>
                        {p.name} · Giá: {formatVND(p.retailPrice)} (Tồn: {p.stockQuantity} {p.unit})
                      </option>
                    ))}
                  </select>
                </div>

                {availableImeis.length > 0 && (
                  <div>
                    <select
                      value={selectedImei}
                      onChange={(e) => setSelectedImei(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg font-mono"
                    >
                      <option value="">-- Chọn số Serial/IMEI --</option>
                      {availableImeis.map((imei) => (
                        <option key={imei} value={imei}>
                          {imei}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!selectedProdId}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 disabled:opacity-50"
              >
                + Thêm vào hóa đơn
              </button>
            </div>

            {/* Cart Table */}
            {cartItems.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="p-2">Sản phẩm & IMEI</th>
                      <th className="p-2 text-center w-16">SL</th>
                      <th className="p-2 text-right">Đơn giá</th>
                      <th className="p-2 text-right">Thành tiền</th>
                      <th className="p-2 text-center w-12">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cartItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2">
                          <div className="font-semibold text-slate-900">{item.productName}</div>
                          {item.imei && (
                            <div className="text-[11px] font-mono text-emerald-700">Serial/IMEI: {item.imei}</div>
                          )}
                        </td>
                        <td className="p-2 text-center font-mono">{item.quantity}</td>
                        <td className="p-2 text-right font-mono">{formatVND(item.unitPrice)}</td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">
                          {formatVND(item.total)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(idx)}
                            className="p-1 text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Payment Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t">
              <div className="space-y-2">
                <label className="block text-slate-700 font-semibold">Phương thức thanh toán:</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('transfer');
                      setPaidAmount(finalAmount);
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg border text-center font-medium ${
                      paymentMethod === 'transfer' ? 'bg-emerald-600 text-white border-emerald-600 font-bold' : 'hover:bg-slate-50'
                    }`}
                  >
                    Chuyển khoản QR
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('cash');
                      setPaidAmount(finalAmount);
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg border text-center font-medium ${
                      paymentMethod === 'cash' ? 'bg-emerald-600 text-white border-emerald-600 font-bold' : 'hover:bg-slate-50'
                    }`}
                  >
                    Tiền mặt
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('debt');
                      setPaidAmount(0);
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg border text-center font-medium ${
                      paymentMethod === 'debt' ? 'bg-rose-600 text-white border-rose-600 font-bold' : 'hover:bg-slate-50'
                    }`}
                  >
                    Ghi công nợ
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-right">
                <div className="flex justify-between">
                  <span>Tiền hàng:</span>
                  <span className="font-mono">{formatVND(subTotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Chiết khấu (VNĐ):</span>
                  <input
                    type="number"
                    step={10000}
                    value={discount}
                    onChange={(e) => {
                      const d = Number(e.target.value) || 0;
                      setDiscount(d);
                      if (paymentMethod !== 'debt') {
                        setPaidAmount(Math.max(0, subTotal - d));
                      }
                    }}
                    className="w-28 px-2 py-1 text-right border rounded font-mono"
                  />
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-900 border-t pt-1">
                  <span>Tổng thanh toán:</span>
                  <span className="font-mono text-emerald-700">{formatVND(finalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowCreateOrder(false)}
                className="px-4 py-2 border rounded-lg text-slate-600"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-sm"
              >
                Xác nhận Xuất Hóa Đơn
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invoices List Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse select-text">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="p-3 w-32">Mã Hóa đơn</th>
                <th className="p-3">Khách hàng & SĐT</th>
                <th className="p-3">Sản phẩm đã bán</th>
                <th className="p-3">Ngày lập</th>
                <th className="p-3">Thanh toán</th>
                <th className="p-3 text-right">Tổng tiền</th>
                <th className="p-3 text-right">Nợ lại</th>
                <th className="p-3 text-center w-20">In đơn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Đang nạp dữ liệu từ DATASOFT/invoices.json...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Chưa có hóa đơn nào được tạo.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-emerald-700">{inv.invoiceCode}</td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{inv.customerName}</div>
                      <div className="text-[11px] font-mono text-slate-500">{inv.customerPhone}</div>
                    </td>
                    <td className="p-3">
                      <div className="line-clamp-1 text-slate-800">
                        {inv.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-slate-500">{formatDate(inv.createdAt)}</td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          inv.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700'
                            : inv.status === 'partial'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {inv.status === 'paid'
                          ? 'Đã trả đủ'
                          : inv.status === 'partial'
                          ? 'Trả một phần'
                          : 'Ghi nợ'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {formatVND(inv.finalAmount)}
                    </td>
                    <td className="p-3 text-right font-mono text-rose-600 font-semibold">
                      {inv.debtAmount > 0 ? formatVND(inv.debtAmount) : '-'}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedInvoiceForPrint(inv)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                        title="Xem và In hóa đơn"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Print Modal */}
      {selectedInvoiceForPrint && (
        <InvoicePrintModal
          invoice={selectedInvoiceForPrint}
          settings={settings}
          onClose={() => setSelectedInvoiceForPrint(null)}
        />
      )}
    </div>
  );
};
