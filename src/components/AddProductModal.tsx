import React, { useState, useEffect } from 'react';
import {
  X,
  Boxes,
  Sparkles,
  Building2,
  FolderTree,
  DollarSign,
  Barcode,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import type { Category, Product, Supplier } from '../types/datasoft';
import { apiFetch } from '../utils/api';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (product: Product) => void;
  initialSupplierId?: string;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
  initialSupplierId,
}) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [hasSerialImei, setHasSerialImei] = useState(true);
  const [importPrice, setImportPrice] = useState<number>(1000000);
  const [retailPrice, setRetailPrice] = useState<number>(1350000);
  const [stockQuantity, setStockQuantity] = useState<number>(5);
  const [warrantyMonths, setWarrantyMonths] = useState<number>(36);
  const [supplierId, setSupplierId] = useState(initialSupplierId || '');

  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
    }
  }, [isOpen]);

  const loadDependencies = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, supps] = await Promise.all([
        apiFetch<Category[]>('/api/categories'),
        apiFetch<Supplier[]>('/api/suppliers'),
      ]);
      setCategories(cats);
      setSuppliers(supps);

      if (cats.length > 0 && !categoryId) {
        setCategoryId(cats[0].id);
      }
      if (supps.length > 0 && !supplierId) {
        setSupplierId(initialSupplierId || supps[0].id);
      }
    } catch (err: any) {
      console.error('Lỗi nạp dependencies:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Tự động sinh mã SKU theo chữ cái đầu của tên sản phẩm
   * (Ví dụ: "Bàn phím cơ DareU" -> "BPCD-XXX")
   */
  const handleGenerateSku = () => {
    if (!name.trim()) {
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      setSku(`PRD-${randomSuffix}`);
      return;
    }

    const normalized = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim();

    const words = normalized.split(/\s+/).filter(Boolean);
    let prefix = '';
    if (words.length >= 2) {
      prefix = words.map((w) => w[0].toUpperCase()).slice(0, 4).join('');
    } else if (words.length === 1) {
      prefix = words[0].slice(0, 3).toUpperCase();
    } else {
      prefix = 'PRD';
    }

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setSku(`${prefix}-${randomSuffix}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên sản phẩm');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const selectedCat = categories.find((c) => c.id === categoryId);
      const payload: Partial<Product> = {
        name: name.trim(),
        sku: sku.trim().toUpperCase() || undefined,
        categoryId: categoryId || 'CAT-02',
        categoryName: selectedCat?.name,
        hasSerialImei,
        importPrice: Math.max(0, Number(importPrice) || 0),
        retailPrice: Math.max(0, Number(retailPrice) || 0),
        wholesalePrice: Math.max(0, Math.round(Number(retailPrice) * 0.95)),
        stockQuantity: Math.max(0, Number(stockQuantity) || 0),
        minStockAlert: 2,
        unit: 'Chiếc',
        warrantyMonths: Number(warrantyMonths) || 12,
        supplierId: supplierId || undefined,
        description: '',
      };

      const created = await apiFetch<Product>('/api/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Reset
      setName('');
      setSku('');
      onProductCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi thêm sản phẩm mới');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-900/20 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white/95 backdrop-blur-md border border-zinc-200/60 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Tiêu đề modal: Thêm Sản Phẩm Mới */}
        <div className="p-4 border-b border-zinc-200/60 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Thêm Sản Phẩm Mới</h3>
              <p className="text-[11px] text-slate-400">
                Linh kiện phần cứng, thiết bị máy tính hoặc phụ kiện rời
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          {/* Hàng 1: Tên Sản Phẩm * (Input bắt buộc) */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Tên Sản Phẩm <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Bàn phím cơ DareU EK87, SSD Kingston 500GB..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
            />
          </div>

          {/* Hàng 2 chia 2 cột: Mã SKU / Barcode | Danh Mục */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Mã SKU / Barcode (Tùy chọn)
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  placeholder="Để trống để tự tạo SKU"
                  className="w-full pl-3 pr-24 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={handleGenerateSku}
                  className="absolute right-1.5 px-2.5 py-1 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                  title="Tự động tạo mã SKU dựa trên tên sản phẩm"
                >
                  <Sparkles className="w-3 h-3" />
                  Tạo mã
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Danh Mục</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Hàng 3: Checkbox hasSerialImei */}
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={hasSerialImei}
                onChange={(e) => setHasSerialImei(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
              />
              <span className="font-semibold text-slate-800 text-xs">
                Sản phẩm này quản lý bảo hành theo mã IMEI/Serial riêng lẻ
              </span>
            </label>
            <p className="text-[11px] text-slate-400 mt-1 pl-6">
              {hasSerialImei
                ? 'Sản phẩm sẽ yêu cầu quét mã Serial/IMEI từng chiếc khi nhập kho và xuất bán.'
                : 'Hàng rời / số lượng (cáp, keo, ốc vít): Chỉ theo dõi số lượng tồn, không yêu cầu quét Serial.'}
            </p>
          </div>

          {/* Hàng 4 chia 2 cột: Giá Vốn (VNĐ) | Giá Bán Lẻ (VNĐ) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Giá Vốn (Giá nhập - VNĐ)
              </label>
              <input
                type="number"
                step={10000}
                value={importPrice}
                onChange={(e) => setImportPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Giá Bán Lẻ (Giá xuất - VNĐ)
              </label>
              <input
                type="number"
                step={10000}
                value={retailPrice}
                onChange={(e) => setRetailPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Hàng 5 chia 2 cột: Số Lượng Nhập Kho Ban Đầu | Thời hạn bảo hành */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Số Lượng Nhập Kho Ban Đầu
              </label>
              <input
                type="number"
                min="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Thời hạn bảo hành</label>
              <select
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
              >
                <option value={0}>Không bảo hành</option>
                <option value={1}>1 Tháng (Bao test)</option>
                <option value={3}>3 Tháng</option>
                <option value={6}>6 Tháng</option>
                <option value={12}>12 Tháng (1 Năm)</option>
                <option value={24}>24 Tháng (2 Năm)</option>
                <option value={36}>36 Tháng (Mặc định chính hãng 3 năm)</option>
              </select>
            </div>
          </div>

          {/* Hàng 6: Nhà Cung Cấp (Liên kết nguồn hàng chính hãng) */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              Nhà Cung Cấp (Liên kết nguồn hàng chính hãng)
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
            >
              <option value="">-- Chưa liên kết nhà cung cấp cố định --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.code}] {s.name} {s.contactPerson ? `(${s.contactPerson})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Hàng 7: Nút Hủy bỏ và Tạo sản phẩm (Màu nền xanh tím đậm) */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-700/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Đang tạo...' : 'Tạo sản phẩm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
