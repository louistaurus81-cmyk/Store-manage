import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Truck,
  UserCheck,
  Building2,
  Calendar,
  CreditCard,
  Banknote,
  Scale,
  Barcode,
  CheckCircle2,
  Trash2,
  Eye,
  X,
  RefreshCw,
  Printer,
  ChevronRight,
  ArrowRight,
  Scan,
} from 'lucide-react';
import type { Product, PurchaseReceipt, PurchaseReceiptItem, Supplier, UserRole } from '../types/datasoft';
import { apiFetch, formatVND, formatDate, formatDateOnly } from '../utils/api';
import {
  useBarcodeScanner,
  playScannerSuccessBeep,
  playScannerErrorBeep,
  sanitizeVietnameseBarcode,
} from '../hooks/useBarcodeScanner';
import { MacToastContainer, ToastMessage } from '../components/MacToast';
import { AddProductModal } from '../components/AddProductModal';

interface PurchasingViewProps {
  userRole: UserRole;
  onNavigateToTab?: (tab: string) => void;
}

export const PurchasingView: React.FC<PurchasingViewProps> = ({ userRole, onNavigateToTab }) => {
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Mode: 'list' | 'create'
  const [currentMode, setCurrentMode] = useState<'list' | 'create'>('list');
  const [selectedReceiptForView, setSelectedReceiptForView] = useState<PurchaseReceipt | null>(null);

  // Active item index receiving scanned serials
  const [activeItemIndexForScan, setActiveItemIndexForScan] = useState<number>(0);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Form states
  const [sourceType, setSourceType] = useState<'supplier' | 'customer'>('supplier');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [supplierName, setSupplierName] = useState<string>('');
  const [supplierPhone, setSupplierPhone] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'debt'>('transfer');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Items in receipt
  const [items, setItems] = useState<
    Array<{
      productId: string;
      productName: string;
      sku?: string;
      quantity: number;
      importPrice: number;
      imeisText: string;
      hasSerialImei: boolean;
      unit: string;
    }>
  >([]);

  // Item selector state
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);

  // ==========================================
  // XỬ LÝ QUÉT MÃ VẠCH TRONG NHẬP KHO HÀNG
  // ==========================================
  const handleBarcodeScanned = (barcode: string) => {
    const cleanBarcode = sanitizeVietnameseBarcode(barcode);
    if (!cleanBarcode) return;

    if (currentMode !== 'create') {
      setCurrentMode('create');
    }

    // Nếu đã có các mặt hàng trong phiếu nhập:
    if (items.length > 0) {
      // Xác định mục cần điền Serial: Ưu tiên mục đang chọn hoặc mục đầu tiên có hasSerialImei
      let targetIdx = activeItemIndexForScan;
      if (targetIdx < 0 || targetIdx >= items.length || !items[targetIdx].hasSerialImei) {
        targetIdx = items.findIndex((i) => i.hasSerialImei);
      }

      if (targetIdx !== -1) {
        const targetItem = items[targetIdx];
        const existingList = targetItem.imeisText
          .split(/[\n,;]+/)
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean);

        if (existingList.includes(cleanBarcode)) {
          playScannerErrorBeep();
          addToast(
            'warning',
            `Mã Serial [${cleanBarcode}] đã có trong phiếu nhập cho "${targetItem.productName}"!`,
            'Trùng Lặp Serial'
          );
          return;
        }

        const newImeisText = targetItem.imeisText
          ? `${targetItem.imeisText}\n${cleanBarcode}`
          : cleanBarcode;

        const updatedCount = existingList.length + 1;
        const newQuantity = Math.max(targetItem.quantity, updatedCount);

        setItems((prev) =>
          prev.map((item, idx) =>
            idx === targetIdx
              ? { ...item, imeisText: newImeisText, quantity: newQuantity }
              : item
          )
        );

        playScannerSuccessBeep();
        addToast(
          'success',
          `Đã quét Serial [${cleanBarcode}] vào "${targetItem.productName}" (Tổng: ${updatedCount} số Serial)`,
          'Quét Nhập Kho'
        );
        return;
      }
    }

    // Nếu chưa có sản phẩm nào, thử tìm sản phẩm theo SKU
    const matched = products.find(
      (p) => p.sku.toUpperCase() === cleanBarcode || p.name.toUpperCase().includes(cleanBarcode)
    );
    if (matched) {
      handleAddItem(matched.id);
      playScannerSuccessBeep();
      addToast(
        'success',
        `Đã tự động thêm [${matched.name}] vào phiếu nhập theo mã SKU`,
        'Thêm Sản Phẩm'
      );
    } else {
      playScannerErrorBeep();
      addToast(
        'info',
        `Mã Serial đã quét: [${cleanBarcode}]. Vui lòng chọn linh kiện tương ứng để gán số Serial này!`,
        'Máy Quét Nhận Diện'
      );
    }
  };

  const { isScanning } = useBarcodeScanner({
    onScan: handleBarcodeScanned,
    enabled: true,
    playFeedbackSound: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recs, prods, supps] = await Promise.all([
        apiFetch<PurchaseReceipt[]>('/api/purchases'),
        apiFetch<Product[]>('/api/products'),
        apiFetch<Supplier[]>('/api/suppliers'),
      ]);
      setReceipts(recs);
      setProducts(prods);
      setSuppliers(supps);

      if (supps.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(supps[0].id);
        setSupplierName(supps[0].name);
        setSupplierPhone(supps[0].phone || '');
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu nhập hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierChange = (suppId: string) => {
    setSelectedSupplierId(suppId);
    const found = suppliers.find((s) => s.id === suppId);
    if (found) {
      setSupplierName(found.name);
      setSupplierPhone(found.phone || '');
    }
  };

  const handleAddItem = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    if (items.some((i) => i.productId === productId)) {
      // Tăng số lượng nếu đã có
      setItems(
        items.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
      return;
    }

    setItems([
      ...items,
      {
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        quantity: 1,
        importPrice: prod.importPrice || 0,
        imeisText: '',
        hasSerialImei: prod.hasSerialImei,
        unit: prod.unit || 'Chiếc',
      },
    ]);
    setSelectedProductId('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.importPrice) || 0),
    0
  );

  const remainingDebt = Math.max(0, totalAmount - paidAmount);

  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Vui lòng thêm ít nhất một sản phẩm vào phiếu nhập');
      return;
    }

    if (!supplierName.trim()) {
      alert('Vui lòng chọn hoặc nhập tên nhà cung cấp / đối tác nhập hàng');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        sourceType,
        supplierId: sourceType === 'supplier' ? selectedSupplierId : undefined,
        supplierName: supplierName.trim(),
        supplierPhone: supplierPhone.trim(),
        items: items.map((i) => {
          // Tách IMEI từ chuỗi văn bản (dấu phẩy hoặc xuống dòng)
          const imeis = i.imeisText
            ? i.imeisText
                .split(/[\n,;]+/)
                .map((s) => s.trim().toUpperCase())
                .filter(Boolean)
            : [];
          return {
            productId: i.productId,
            productName: i.productName,
            sku: i.sku,
            quantity: Number(i.quantity) || 1,
            importPrice: Number(i.importPrice) || 0,
            imeis,
          };
        }),
        paidAmount: Number(paidAmount) || 0,
        paymentMethod,
        dueDate: remainingDebt > 0 ? dueDate : undefined,
        note,
      };

      const created = await apiFetch<PurchaseReceipt>('/api/purchases', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      alert(`Tạo phiếu nhập ${created.receiptCode} thành công! Tồn kho đã được cộng dồn.`);
      // Reset form
      setItems([]);
      setPaidAmount(0);
      setNote('');
      setCurrentMode('list');
      loadData();
    } catch (err: any) {
      alert('Lỗi tạo phiếu nhập kho: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReceipts = receipts.filter(
    (r) =>
      r.receiptCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.supplierPhone && r.supplierPhone.includes(searchQuery))
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans text-slate-800">
      {/* Header macOS Bar */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Quản Lý Nhập Hàng Kho (Purchasing)
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
              <Truck className="w-3.5 h-3.5" />
              PHIẾU NHẬP KHO & ĐỒNG BỘ SERIAL
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Barcode className="w-3.5 h-3.5 text-emerald-600" />
              {isScanning ? 'Đang đọc Barcode...' : 'Máy Quét Serial Tự Động: Sẵn sàng'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Tạo phiếu nhập từ Nhà cung cấp hoặc Khách lẻ bán lại, tự động cộng tồn kho, lưu Serial và hạch toán công nợ.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {currentMode === 'list' ? (
            <button
              onClick={() => {
                setCurrentMode('create');
                setPaidAmount(0);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo phiếu nhập mới</span>
            </button>
          ) : (
            <button
              onClick={() => setCurrentMode('list')}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span>Về danh sách phiếu</span>
            </button>
          )}

          <button
            onClick={() => loadData()}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all shadow-xs"
            title="Làm mới"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODE 1: FORM TẠO PHIẾU NHẬP KHO MỚI                      */}
      {/* ========================================================= */}
      {currentMode === 'create' && (
        <form onSubmit={handleSubmitReceipt} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cột 1 & 2: Chọn sản phẩm & danh sách linh kiện nhập (67%) */}
            <div className="lg:col-span-2 space-y-5">
              {/* Thẻ chọn sản phẩm */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-emerald-600" />
                    Danh sách sản phẩm nhập vào kho
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {items.length} mặt hàng
                  </span>
                </div>

                {/* Thanh chọn nhanh sản phẩm từ kho */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1">
                    <select
                      value={selectedProductId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__NEW__') {
                          setShowAddProductModal(true);
                          setSelectedProductId('');
                        } else {
                          setSelectedProductId(val);
                          if (val) handleAddItem(val);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    >
                      <option value="">-- Chọn sản phẩm từ danh mục kho để nhập --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.sku}] {p.name} - Tồn hiện tại: {p.stockQuantity} {p.unit}
                        </option>
                      ))}
                      <option value="__NEW__" className="text-indigo-600 font-bold">
                        + Thêm mới sản phẩm chưa có trong danh mục...
                      </option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAddProductModal(true)}
                    className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-indigo-200/70 shrink-0 transition-colors cursor-pointer"
                    title="Mở form thêm sản phẩm mới vào kho"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Thêm mới sản phẩm
                  </button>
                </div>

                {/* Bảng sản phẩm trong phiếu nhập */}
                <div className="overflow-x-auto">
                  {items.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-xl">
                      <Boxes className="w-8 h-8 text-slate-300 mx-auto" />
                      <p>Chưa có linh kiện nào trong phiếu nhập.</p>
                      <p className="text-[11px] text-slate-400">Chọn sản phẩm từ danh sách trên để thêm vào phiếu.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/70 text-slate-500 border-b border-slate-100 font-semibold">
                          <th className="py-2.5 px-3">Sản phẩm & SKU</th>
                          <th className="py-2.5 px-2 text-center w-20">Số lượng</th>
                          <th className="py-2.5 px-3 text-right w-28">Giá vốn nhập</th>
                          <th className="py-2.5 px-3 text-right w-28">Thành tiền</th>
                          <th className="py-2.5 px-2 text-center w-10">Xóa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((item, idx) => (
                          <React.Fragment key={item.productId}>
                            <tr className="hover:bg-slate-50/50">
                              <td className="py-3 px-3">
                                <div className="font-semibold text-slate-900">{item.productName}</div>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-mono">
                                  <span>{item.sku}</span>
                                  {item.hasSerialImei && (
                                    <span className="inline-flex items-center text-emerald-700 font-semibold">
                                      <Barcode className="w-3 h-3 mr-0.5" /> Quản lý IMEI
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-2 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleItemChange(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))
                                  }
                                  className="w-16 px-2 py-1 text-center font-mono font-bold bg-white border border-slate-200 rounded-lg text-xs"
                                />
                              </td>
                              <td className="py-3 px-3 text-right">
                                <input
                                  type="number"
                                  step="1000"
                                  value={item.importPrice}
                                  onChange={(e) =>
                                    handleItemChange(idx, 'importPrice', Math.max(0, parseInt(e.target.value) || 0))
                                  }
                                  className="w-24 px-2 py-1 text-right font-mono font-bold bg-white border border-slate-200 rounded-lg text-xs"
                                />
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                                {formatVND((Number(item.quantity) || 1) * (Number(item.importPrice) || 0))}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="p-1 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>

                            {/* Ô nhập Serial/IMEI nếu sản phẩm quản lý theo Serial */}
                            {item.hasSerialImei && (
                              <tr className={activeItemIndexForScan === idx ? 'bg-emerald-50/30' : 'bg-slate-50/40'}>
                                <td colSpan={5} className="p-3 pl-6 border-b border-slate-100">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                                        <Barcode className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Danh sách Serial/IMEI cho {item.quantity} {item.unit}:</span>
                                        {activeItemIndexForScan === idx ? (
                                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200 animate-pulse">
                                            ● Đang đón tín hiệu quét mã
                                          </span>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setActiveItemIndexForScan(idx)}
                                            className="text-[10px] text-slate-500 hover:text-emerald-700 underline font-normal cursor-pointer"
                                          >
                                            (Nhấp để chọn mục này khi quét)
                                          </button>
                                        )}
                                      </label>
                                      <span className="text-[10px] text-slate-400 font-normal">
                                        Đã nhập: {item.imeisText.split(/[\n,;]+/).filter((s) => s.trim()).length} / {item.quantity} mã
                                      </span>
                                    </div>
                                    <textarea
                                      rows={2}
                                      placeholder="VD: SN-892182, SN-892183... (Dùng súng bắn mã vạch quét trực tiếp vào đây)"
                                      value={item.imeisText}
                                      onFocus={() => setActiveItemIndexForScan(idx)}
                                      onChange={(e) => handleItemChange(idx, 'imeisText', e.target.value)}
                                      className={`w-full px-3 py-2 text-xs font-mono bg-white border rounded-xl transition-all focus:outline-none ${
                                        activeItemIndexForScan === idx
                                          ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                                          : 'border-slate-200 focus:border-emerald-500'
                                      }`}
                                    />
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Cột 3: Nguồn nhập, thanh toán và công nợ (33%) */}
            <div className="space-y-5">
              {/* Thẻ nguồn nhập hàng */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  Nguồn nhập hàng
                </h3>

                {/* Toggle Nguồn nhập */}
                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl gap-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setSourceType('supplier')}
                    className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      sourceType === 'supplier'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Nhà cung cấp
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSourceType('customer');
                      setSupplierName('');
                      setSupplierPhone('');
                    }}
                    className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      sourceType === 'customer'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Khách lẻ bán lại
                  </button>
                </div>

                {sourceType === 'supplier' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Chọn Nhà Cung Cấp đối tác:
                      </label>
                      <select
                        value={selectedSupplierId}
                        onChange={(e) => handleSupplierChange(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Số điện thoại liên hệ:
                      </label>
                      <input
                        type="text"
                        value={supplierPhone}
                        onChange={(e) => setSupplierPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Tên khách lẻ bán lại máy/linh kiện *:
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Anh Tuấn, Chị Hoa..."
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Số điện thoại khách lẻ:
                      </label>
                      <input
                        type="text"
                        placeholder="VD: 0988xxxxxx"
                        value={supplierPhone}
                        onChange={(e) => setSupplierPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Thẻ thanh toán & Công nợ */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Thanh toán & Công nợ
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Tổng tiền nhập hàng:</span>
                    <span className="font-mono font-bold text-base text-slate-900">
                      {formatVND(totalAmount)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Số tiền shop thanh toán ngay:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max={totalAmount}
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-emerald-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => setPaidAmount(totalAmount)}
                        className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 shrink-0"
                      >
                        Trả đủ
                      </button>
                    </div>
                  </div>

                  {remainingDebt > 0 && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-amber-900">Nợ gối đầu NCC:</span>
                        <span className="font-mono font-bold text-rose-600 text-sm">
                          {formatVND(remainingDebt)}
                        </span>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                          Hạn chót thanh toán nợ:
                        </label>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Hình thức thanh toán:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'transfer', label: 'Chuyển khoản' },
                        { id: 'cash', label: 'Tiền mặt' },
                        { id: 'debt', label: 'Ghi nợ' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id as any)}
                          className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            paymentMethod === m.id
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Ghi chú phiếu:</label>
                    <input
                      type="text"
                      placeholder="VD: Nhập lô SSD đợt 2, bảo hành 36 tháng..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting || items.length === 0}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-98"
                  >
                    {submitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Hoàn tất nhập kho & Lưu phiếu</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================= */}
      {/* MODE 2: DANH SÁCH CÁC PHIẾU NHẬP KHO ĐÃ TẠO               */}
      {/* ========================================================= */}
      {currentMode === 'list' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo mã phiếu PN, tên nhà cung cấp, SĐT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Hiển thị {filteredReceipts.length} phiếu nhập kho
            </span>
          </div>

          <div className="overflow-x-auto">
            {filteredReceipts.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <Truck className="w-8 h-8 text-slate-300 mx-auto" />
                <p>Không tìm thấy phiếu nhập kho nào phù hợp.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 text-slate-500 border-b border-slate-100 font-semibold">
                    <th className="py-2.5 px-3">Mã phiếu</th>
                    <th className="py-2.5 px-3">Nguồn nhập (NCC/Khách)</th>
                    <th className="py-2.5 px-3">Linh kiện nhập</th>
                    <th className="py-2.5 px-3 text-right">Tổng tiền</th>
                    <th className="py-2.5 px-3 text-right">Đã trả / Nợ</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    <th className="py-2.5 px-3 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReceipts.map((r) => {
                    const isPaid = r.status === 'paid';
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-slate-900">{r.receiptCode}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {formatDate(r.createdAt)}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            {r.sourceType === 'supplier' ? (
                              <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            )}
                            <span className="truncate max-w-[200px]">{r.supplierName}</span>
                          </div>
                          {r.supplierPhone && (
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {r.supplierPhone}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-slate-700 line-clamp-1 max-w-[220px]">
                            {r.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {r.items.reduce((sum, i) => sum + i.quantity, 0)} sản phẩm
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {formatVND(r.totalAmount)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="font-mono text-emerald-700 font-medium">
                            {formatVND(r.paidAmount)}
                          </div>
                          {r.debtAmount > 0 && (
                            <div className="font-mono text-rose-600 font-semibold text-[11px]">
                              Nợ: {formatVND(r.debtAmount)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isPaid ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                              Đã trả đủ
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/50">
                              Gối đầu
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedReceiptForView(r)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Xem
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL XEM CHI TIẾT PHIẾU NHẬP KHO                        */}
      {/* ========================================================= */}
      {selectedReceiptForView && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Chi tiết phiếu nhập kho: {selectedReceiptForView.receiptCode}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Ngày lập: {formatDate(selectedReceiptForView.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReceiptForView(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Nguồn nhập */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between">
                <div>
                  <span className="text-slate-400">Nguồn nhập hàng:</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {selectedReceiptForView.supplierName}
                  </div>
                  {selectedReceiptForView.supplierPhone && (
                    <div className="text-[11px] text-slate-500 font-mono">
                      SĐT: {selectedReceiptForView.supplierPhone}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-slate-400">Người tạo phiếu:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {selectedReceiptForView.createdByName || 'Hệ thống'}
                  </div>
                </div>
              </div>

              {/* Bảng linh kiện */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                      <th className="p-2.5">Tên linh kiện & SKU</th>
                      <th className="p-2.5 text-center">Số lượng</th>
                      <th className="p-2.5 text-right">Đơn giá nhập</th>
                      <th className="p-2.5 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedReceiptForView.items.map((it, idx) => (
                      <React.Fragment key={idx}>
                        <tr>
                          <td className="p-2.5 font-medium text-slate-900">
                            <div>{it.productName}</div>
                            {it.sku && <div className="text-[11px] font-mono text-slate-400">{it.sku}</div>}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold">{it.quantity}</td>
                          <td className="p-2.5 text-right font-mono">{formatVND(it.importPrice)}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                            {formatVND(it.total)}
                          </td>
                        </tr>
                        {it.imeis && it.imeis.length > 0 && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={4} className="p-2 pl-4 text-[11px] font-mono text-emerald-800">
                              Serial/IMEI ({it.imeis.length}): {it.imeis.join(', ')}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tổng kết tiền */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 font-medium">
                <div className="flex justify-between">
                  <span>Tổng tiền hàng:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {formatVND(selectedReceiptForView.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Đã thanh toán:</span>
                  <span className="font-mono font-bold">
                    {formatVND(selectedReceiptForView.paidAmount)}
                  </span>
                </div>
                {selectedReceiptForView.debtAmount > 0 && (
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>Còn nợ NCC:</span>
                    <span className="font-mono">
                      {formatVND(selectedReceiptForView.debtAmount)}
                    </span>
                  </div>
                )}
                {selectedReceiptForView.note && (
                  <div className="pt-2 border-t border-slate-200 text-slate-500">
                    Ghi chú: {selectedReceiptForView.note}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedReceiptForView(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm Sản Phẩm Mới (Yêu Cầu 1 & Yêu Cầu 3) */}
      <AddProductModal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        initialSupplierId={sourceType === 'supplier' ? selectedSupplierId : undefined}
        onProductCreated={(created) => {
          setProducts((prev) => [created, ...prev]);
          handleAddItem(created.id);
          addToast(
            'success',
            `Đã thêm sản phẩm mới [${created.name}] và tự động nạp vào phiếu nhập`,
            'Thêm Sản Phẩm Mới'
          );
        }}
      />

      {/* macOS Translucent Toast Notifications */}
      <MacToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
