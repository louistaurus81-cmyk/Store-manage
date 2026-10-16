import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Lock,
  Barcode,
  Tag,
  Building2,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  RefreshCw,
  FolderTree,
} from 'lucide-react';
import type { Category, ImeiRecord, Product, Supplier, UserRole } from '../types/datasoft';
import { apiFetch, formatVND } from '../utils/api';
import { AddProductModal } from '../components/AddProductModal';
import { SkeletonCard } from '../components/common/SkeletonCard';
import { EmptyState } from '../components/common/EmptyState';

interface InventoryViewProps {
  userRole: UserRole;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ userRole }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Product for IMEI management
  const [selectedProductForImei, setSelectedProductForImei] = useState<Product | null>(null);
  const [imeiList, setImeiList] = useState<ImeiRecord[]>([]);
  const [newImeiInput, setNewImeiInput] = useState('');
  const [selectedSupplierForImei, setSelectedSupplierForImei] = useState<string>('');
  const [newImeiNote, setNewImeiNote] = useState('');

  // Edit IMEI state
  const [editingImeiItem, setEditingImeiItem] = useState<ImeiRecord | null>(null);
  const [editImeiText, setEditImeiText] = useState('');
  const [editImeiNote, setEditImeiNote] = useState('');
  const [editImeiSupplierId, setEditImeiSupplierId] = useState('');

  // Modal Add Product
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // Modal Manage Categories (CRUD)
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'product' | 'service'>('product');
  const [newCatDesc, setNewCatDesc] = useState('');

  // New Product form
  const [newProductForm, setNewProductForm] = useState({
    sku: '',
    name: '',
    categoryId: 'CAT-02',
    importPrice: 1000000,
    retailPrice: 1350000,
    wholesalePrice: 1200000,
    stockQuantity: 5,
    minStockAlert: 2,
    unit: 'Chiếc',
    hasSerialImei: true,
    warrantyMonths: 36,
    description: '',
  });

  const canSeeImportPrice = userRole === 'admin' || userRole === 'manager';

  useEffect(() => {
    loadAllData();
  }, [userRole]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [prods, cats, supps] = await Promise.all([
        apiFetch<Product[]>('/api/products'),
        apiFetch<Category[]>('/api/categories'),
        apiFetch<Supplier[]>('/api/suppliers'),
      ]);
      setProducts(prods);
      setCategories(cats);
      setSuppliers(supps);
    } catch (err) {
      console.error('Lỗi tải kho hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadImeis = async (prod: Product) => {
    setSelectedProductForImei(prod);
    try {
      const imeis = await apiFetch<ImeiRecord[]>(`/api/imeis?productId=${prod.id}`);
      setImeiList(imeis);
      if (suppliers.length > 0 && !selectedSupplierForImei) {
        setSelectedSupplierForImei(suppliers[0].id);
      }
    } catch (err) {
      console.error('Lỗi tải IMEI:', err);
    }
  };

  const handleAddImei = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForImei || !newImeiInput.trim()) return;

    try {
      const record = await apiFetch<ImeiRecord>('/api/imeis', {
        method: 'POST',
        body: JSON.stringify({
          productId: selectedProductForImei.id,
          imei: newImeiInput.trim(),
          supplierId: selectedSupplierForImei || undefined,
          note: newImeiNote.trim() || undefined,
        }),
      });

      setImeiList([record, ...imeiList]);
      setNewImeiInput('');
      setNewImeiNote('');
      // Tải lại để cập nhật số tồn
      const updatedProds = await apiFetch<Product[]>('/api/products');
      setProducts(updatedProds);
      const updatedCurrent = updatedProds.find((p) => p.id === selectedProductForImei.id);
      if (updatedCurrent) setSelectedProductForImei(updatedCurrent);
    } catch (err: any) {
      alert(err.message || 'Lỗi thêm số IMEI');
    }
  };

  const handleUpdateImei = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingImeiItem || !editImeiText.trim()) return;

    try {
      const updated = await apiFetch<ImeiRecord>(`/api/imeis/${editingImeiItem.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          imei: editImeiText.trim(),
          supplierId: editImeiSupplierId || undefined,
          note: editImeiNote.trim(),
        }),
      });

      setImeiList(imeiList.map((i) => (i.id === updated.id ? updated : i)));
      setEditingImeiItem(null);
    } catch (err: any) {
      alert(err.message || 'Lỗi cập nhật số Serial/IMEI');
    }
  };

  const handleDeleteImei = async (item: ImeiRecord) => {
    if (!confirm(`Bạn có chắc muốn xóa mã Serial/IMEI [${item.imei}]? (Nếu đang trong kho, tồn kho sẽ giảm đi 1)`)) {
      return;
    }

    try {
      await apiFetch(`/api/imeis/${item.id}`, { method: 'DELETE' });
      setImeiList(imeiList.filter((i) => i.id !== item.id));

      // Tải lại để cập nhật số tồn
      const updatedProds = await apiFetch<Product[]>('/api/products');
      setProducts(updatedProds);
      if (selectedProductForImei) {
        const updatedCurrent = updatedProds.find((p) => p.id === selectedProductForImei.id);
        if (updatedCurrent) setSelectedProductForImei(updatedCurrent);
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi xóa số Serial/IMEI');
    }
  };

  // CRUD Danh mục
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      if (editingCategory) {
        const updated = await apiFetch<Category>(`/api/categories/${editingCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: newCatName.trim(),
            type: newCatType,
            description: newCatDesc.trim(),
          }),
        });
        setCategories(categories.map((c) => (c.id === updated.id ? updated : c)));
        setEditingCategory(null);
      } else {
        const created = await apiFetch<Category>('/api/categories', {
          method: 'POST',
          body: JSON.stringify({
            name: newCatName.trim(),
            type: newCatType,
            description: newCatDesc.trim(),
          }),
        });
        setCategories([...categories, created]);
      }
      setNewCatName('');
      setNewCatDesc('');
    } catch (err: any) {
      alert(err.message || 'Lỗi lưu danh mục');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa danh mục này?')) return;
    try {
      await apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
      setCategories(categories.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err.message || 'Lỗi xóa danh mục');
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await apiFetch<Product>('/api/products', {
        method: 'POST',
        body: JSON.stringify(newProductForm),
      });

      setProducts([created, ...products]);
      setShowAddProductModal(false);
      setNewProductForm({
        sku: '',
        name: '',
        categoryId: 'CAT-02',
        importPrice: 1000000,
        retailPrice: 1350000,
        wholesalePrice: 1200000,
        stockQuantity: 5,
        minStockAlert: 2,
        unit: 'Chiếc',
        hasSerialImei: true,
        warrantyMonths: 36,
        description: '',
      });
      alert(`Đã thêm sản phẩm thành công! Mã SKU: [${created.sku}]`);
    } catch (err: any) {
      alert(err.message || 'Lỗi tạo sản phẩm');
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans text-slate-800">
      {/* Top Header & Controls */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Quản Trị Kho Hàng & Serial / IMEI
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-mono">
              {products.length} mã hàng
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Quản lý số lượng tồn kho, giá vốn & bán lẻ, tra cứu IMEI và nguồn gốc Nhà cung cấp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canSeeImportPrice && (
            <button
              onClick={() => setShowCategoryModal(true)}
              className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5"
            >
              <FolderTree className="w-3.5 h-3.5 text-blue-600" />
              <span>Quản lý danh mục</span>
            </button>
          )}

          {canSeeImportPrice && (
            <button
              onClick={() => setShowAddProductModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm sản phẩm</span>
            </button>
          )}

          <button
            onClick={() => loadAllData()}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all shadow-xs"
            title="Làm mới"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên sản phẩm, mã SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {!canSeeImportPrice && (
          <div className="p-2.5 px-3 bg-blue-50 border border-blue-200/60 rounded-xl flex items-center gap-2 text-xs text-blue-800">
            <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              <strong>Chính sách RBAC:</strong> Giá vốn nhập kho đã được tự động ẩn với vai trò{' '}
              <span className="font-semibold uppercase">[{userRole}]</span>.
            </span>
          </div>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 border-b border-slate-100 font-semibold">
                <th className="p-3 w-32">Mã SKU</th>
                <th className="p-3">Tên sản phẩm & Linh kiện</th>
                <th className="p-3">Danh mục</th>
                <th className="p-3 text-center">Tồn kho</th>
                {canSeeImportPrice && <th className="p-3 text-right">Giá vốn (Nhập)</th>}
                <th className="p-3 text-right">Giá bán lẻ</th>
                <th className="p-3 text-center">Quản lý IMEI</th>
                <th className="p-3 text-center">Bảo hành</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <SkeletonCard count={6} type="table-row" />
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8">
                    <EmptyState
                      title="Kho hàng trống hoặc không tìm thấy"
                      description="Không có sản phẩm nào phù hợp với từ khóa tìm kiếm trong kho dữ liệu Thịnh Phát Technology."
                    />
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLowStock = p.stockQuantity <= p.minStockAlert && p.stockQuantity < 900;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono font-semibold text-slate-700">{p.sku}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        {p.description && (
                          <div className="text-[11px] text-slate-400 line-clamp-1">{p.description}</div>
                        )}
                      </td>
                      <td className="p-3 text-slate-600">{p.categoryName || '-'}</td>
                      <td className="p-3 text-center font-mono">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isLowStock
                              ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {p.stockQuantity >= 900 ? 'Vô hạn (Dịch vụ)' : `${p.stockQuantity} ${p.unit}`}
                        </span>
                      </td>

                      {canSeeImportPrice && (
                        <td className="p-3 text-right font-mono text-slate-600">
                          {formatVND(p.importPrice)}
                        </td>
                      )}

                      <td className="p-3 text-right font-mono font-bold text-emerald-700">
                        {formatVND(p.retailPrice)}
                      </td>

                      <td className="p-3 text-center">
                        {p.hasSerialImei ? (
                          <button
                            onClick={() => loadImeis(p)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium transition-colors inline-flex items-center gap-1 active:scale-95"
                          >
                            <Barcode className="w-3.5 h-3.5 text-emerald-600" />
                            Quản lý Serial ({p.stockQuantity})
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Hàng rời</span>
                        )}
                      </td>

                      <td className="p-3 text-center font-mono text-slate-600">
                        {p.warrantyMonths > 0 ? `${p.warrantyMonths} Tháng` : 'Không'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: QUẢN LÝ SERIAL / IMEI (CRUD & LINK SUPPLIER)     */}
      {/* ========================================================= */}
      {selectedProductForImei && (
        <div className="fixed inset-0 z-50 bg-zinc-900/20 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white/95 backdrop-blur-md border border-zinc-200/60 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Barcode className="w-4 h-4 text-emerald-600" />
                  Quản lý Serial/IMEI: {selectedProductForImei.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  SKU: {selectedProductForImei.sku} · Tồn kho hiện tại: {selectedProductForImei.stockQuantity}{' '}
                  {selectedProductForImei.unit}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedProductForImei(null);
                  setEditingImeiItem(null);
                }}
                className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Add Form with Supplier link */}
            {canSeeImportPrice && !editingImeiItem && (
              <form onSubmit={handleAddImei} className="p-4 bg-slate-50/50 border-b border-slate-100 space-y-2.5">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Nhập hoặc quét mã vạch Serial/IMEI mới..."
                    value={newImeiInput}
                    onChange={(e) => setNewImeiInput(e.target.value)}
                    required
                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />

                  <select
                    value={selectedSupplierForImei}
                    onChange={(e) => setSelectedSupplierForImei(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">-- Nguồn nhập (Nhà CC) --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shrink-0 shadow-xs"
                  >
                    + Thêm Serial
                  </button>
                </div>
              </form>
            )}

            {/* Edit IMEI Sub-Form */}
            {editingImeiItem && (
              <form onSubmit={handleUpdateImei} className="p-4 bg-blue-50/60 border-b border-blue-200/60 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                  <span>Chỉnh sửa thông tin Serial/IMEI</span>
                  <button
                    type="button"
                    onClick={() => setEditingImeiItem(null)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-normal"
                  >
                    Hủy bỏ
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={editImeiText}
                    onChange={(e) => setEditImeiText(e.target.value)}
                    required
                    className="px-3 py-1.5 border border-blue-200 rounded-xl text-xs font-mono font-bold bg-white"
                  />
                  <select
                    value={editImeiSupplierId}
                    onChange={(e) => setEditImeiSupplierId(e.target.value)}
                    className="px-3 py-1.5 border border-blue-200 rounded-xl text-xs bg-white"
                  >
                    <option value="">-- Chọn Nhà Cung Cấp --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    Lưu cập nhật
                  </button>
                </div>
              </form>
            )}

            {/* IMEI List Table */}
            <div className="max-h-72 overflow-y-auto p-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                    <th className="p-2.5">Số Serial / IMEI</th>
                    <th className="p-2.5">Nhà cung cấp</th>
                    <th className="p-2.5 text-center">Trạng thái</th>
                    <th className="p-2.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {imeiList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-400">
                        Chưa có số Serial/IMEI nào được nhập cho sản phẩm này.
                      </td>
                    </tr>
                  ) : (
                    imeiList.map((item) => {
                      const supp = suppliers.find((s) => s.id === item.supplierId);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80">
                          <td className="p-2.5 font-mono font-bold text-slate-800">{item.imei}</td>
                          <td className="p-2.5 text-slate-600">
                            {supp ? supp.name : <span className="text-slate-400">Không rõ</span>}
                          </td>
                          <td className="p-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                item.status === 'in_stock'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {item.status === 'in_stock' ? 'Trong kho' : item.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-right space-x-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingImeiItem(item);
                                setEditImeiText(item.imei);
                                setEditImeiSupplierId(item.supplierId || '');
                                setEditImeiNote(item.note || '');
                              }}
                              className="p-1 hover:bg-slate-100 text-slate-600 rounded"
                              title="Chỉnh sửa IMEI"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteImei(item)}
                              className="p-1 hover:bg-rose-50 text-rose-500 rounded"
                              title="Xóa IMEI bị nhập sai"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedProductForImei(null);
                  setEditingImeiItem(null);
                }}
                className="px-4 py-1.5 border border-slate-200 hover:bg-white rounded-xl text-slate-700 text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: QUẢN LÝ DANH MỤC (CRUD CATEGORIES)               */}
      {/* ========================================================= */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-zinc-900/20 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white/95 backdrop-blur-md border border-zinc-200/60 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">Quản lý Danh mục (categories.json)</h3>
              </div>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Thêm/Sửa danh mục */}
            <form onSubmit={handleSaveCategory} className="p-4 bg-slate-50/60 border-b border-slate-100 space-y-3 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span>{editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}</span>
                {editingCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(null);
                      setNewCatName('');
                      setNewCatDesc('');
                    }}
                    className="text-slate-400 hover:text-slate-600 font-normal"
                  >
                    Hủy sửa
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Tên danh mục (VD: Bàn phím cơ)..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  required
                  className="sm:col-span-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl"
                />
                <select
                  value={newCatType}
                  onChange={(e) => setNewCatType(e.target.value as any)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl"
                >
                  <option value="product">Sản phẩm</option>
                  <option value="service">Dịch vụ</option>
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Mô tả danh mục (tùy chọn)..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  {editingCategory ? 'Lưu cập nhật' : '+ Thêm'}
                </button>
              </div>
            </form>

            {/* Danh sách danh mục */}
            <div className="max-h-64 overflow-y-auto p-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                    <th className="p-2.5">Tên danh mục</th>
                    <th className="p-2.5">Loại</th>
                    <th className="p-2.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80">
                      <td className="p-2.5">
                        <div className="font-semibold text-slate-900">{c.name}</div>
                        {c.description && (
                          <div className="text-[11px] text-slate-400">{c.description}</div>
                        )}
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium">
                          {c.type === 'service' ? 'Dịch vụ' : 'Sản phẩm'}
                        </span>
                      </td>
                      <td className="p-2.5 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(c);
                            setNewCatName(c.name);
                            setNewCatType(c.type || 'product');
                            setNewCatDesc(c.description || '');
                          }}
                          className="p-1 hover:bg-slate-100 text-slate-600 rounded"
                          title="Sửa danh mục"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(c.id)}
                          className="p-1 hover:bg-rose-50 text-rose-500 rounded"
                          title="Xóa danh mục"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: THÊM SẢN PHẨM MỚI (YÊU CẦU 1: CHUẨN THIẾT KẾ GỐC)*/}
      {/* ========================================================= */}
      <AddProductModal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        onProductCreated={(created) => {
          setProducts([created, ...products]);
        }}
      />
    </div>
  );
};
