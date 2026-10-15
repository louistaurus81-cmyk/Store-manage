import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Truck,
  Scale,
  Barcode,
  ArrowRight,
  ChevronRight,
  ArrowUpRight,
  DollarSign,
  CheckCircle2,
  RefreshCw,
  X,
  CreditCard,
  Edit2,
  Trash2,
  PackageCheck,
  AlertTriangle,
} from 'lucide-react';
import type { Debt, PurchaseReceipt, Supplier, UserRole } from '../types/datasoft';
import { apiFetch, formatVND, formatDate, formatDateOnly } from '../utils/api';

interface SuppliersViewProps {
  userRole: UserRole;
  onNavigateToTab?: (tab: string) => void;
}

interface SupplierProfileResponse {
  supplier: Supplier;
  stats: {
    totalImported: number;
    totalReceipts: number;
    currentDebt: number;
    totalPaid: number;
  };
  receipts: PurchaseReceipt[];
  debts: Debt[];
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({ userRole, onNavigateToTab }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected supplier for Profile mini dashboard
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<SupplierProfileResponse | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<'receipts' | 'debts' | 'info'>('receipts');

  // Modal Add / Edit Supplier
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formName, setFormName] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Supplier[]>('/api/suppliers');
      setSuppliers(data);

      if (data.length > 0 && !selectedSupplierId) {
        handleSelectSupplier(data[0]);
      }
    } catch (err) {
      console.error('Lỗi nạp danh sách nhà cung cấp:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSupplier = async (supp: Supplier) => {
    setSelectedSupplierId(supp.id);
    setLoadingProfile(true);
    try {
      const data = await apiFetch<SupplierProfileResponse>(`/api/suppliers/${supp.id}/profile`);
      setProfileData(data);
    } catch (err) {
      console.error('Lỗi nạp hồ sơ nhà cung cấp:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormName('');
    setFormContactPerson('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setActionError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setFormName(s.name);
    setFormContactPerson(s.contactPerson || '');
    setFormPhone(s.phone);
    setFormEmail(s.email || '');
    setFormAddress(s.address || '');
    setActionError(null);
    setShowModal(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      setActionError('Vui lòng nhập tên nhà cung cấp và số điện thoại liên hệ');
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      if (editingSupplier) {
        const updated = await apiFetch<Supplier>(`/api/suppliers/${editingSupplier.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: formName.trim(),
            contactPerson: formContactPerson.trim(),
            phone: formPhone.trim(),
            email: formEmail.trim() || undefined,
            address: formAddress.trim() || undefined,
          }),
        });

        setSuppliers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        setShowModal(false);
        handleSelectSupplier(updated);
      } else {
        const created = await apiFetch<Supplier>('/api/suppliers', {
          method: 'POST',
          body: JSON.stringify({
            name: formName.trim(),
            contactPerson: formContactPerson.trim(),
            phone: formPhone.trim(),
            email: formEmail.trim() || undefined,
            address: formAddress.trim() || undefined,
          }),
        });

        setSuppliers((prev) => [created, ...prev]);
        setShowModal(false);
        handleSelectSupplier(created);
      }
    } catch (err: any) {
      setActionError(err.message || 'Lỗi lưu thông tin nhà cung cấp');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSupplier = async (supp: Supplier) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa nhà cung cấp [${supp.name}]?`)) {
      return;
    }

    try {
      await apiFetch(`/api/suppliers/${supp.id}`, { method: 'DELETE' });
      const remaining = suppliers.filter((s) => s.id !== supp.id);
      setSuppliers(remaining);
      if (remaining.length > 0) {
        handleSelectSupplier(remaining[0]);
      } else {
        setSelectedSupplierId(null);
        setProfileData(null);
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi xóa nhà cung cấp');
    }
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans text-slate-800">
      {/* Header macOS Bar */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Quản Trị Nhà Cung Cấp & Nguồn Hàng
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              <Building2 className="w-3.5 h-3.5" />
              ĐỐI TÁC PHÂN PHỐI CHÍNH HÃNG
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Quản lý danh sách nhà cung ứng, theo dõi lịch sử phiếu nhập kho, số Serial/IMEI nguồn gốc và công nợ phải trả.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadSuppliers}
            disabled={loading}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all cursor-pointer"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Thêm Nhà Cung Cấp Mới
          </button>
        </div>
      </div>

      {/* Main Layout: Danh sách bên trái (35%) vs Hồ sơ chi tiết bên phải (65%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI (4 cols): Tìm kiếm & Danh sách Nhà cung cấp */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col max-h-[820px]">
          {/* Ô tìm kiếm */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm NCC theo Tên, SĐT, Mã..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
              <span>{filteredSuppliers.length} nhà cung cấp</span>
              <span>Chọn để xem lịch sử</span>
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-slate-400" />
                <span>Đang tải danh sách nhà cung cấp...</span>
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
                <span>Không tìm thấy nhà cung cấp nào</span>
              </div>
            ) : (
              filteredSuppliers.map((supp) => {
                const isSelected = selectedSupplierId === supp.id;
                return (
                  <div
                    key={supp.id}
                    onClick={() => handleSelectSupplier(supp)}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50/80 border border-indigo-200 shadow-2xs'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {supp.code}
                          </span>
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {supp.name}
                          </span>
                        </div>
                        {supp.contactPerson && (
                          <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                            LH: {supp.contactPerson}
                          </div>
                        )}
                        <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{supp.phone}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {supp.currentDebt > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Nợ {formatVND(supp.currentDebt)}
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                            Không nợ
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CỘT PHẢI (8 cols): Dashboard Hồ Sơ Chi Tiết Nhà Cung Cấp */}
        <div className="lg:col-span-8 space-y-5">
          {profileData ? (
            <>
              {/* Card Thông tin Tổng quan & Thao tác */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center font-bold text-indigo-700 text-base">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-base text-slate-900">
                          {profileData.supplier.name}
                        </h2>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {profileData.supplier.code}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        {profileData.supplier.contactPerson && (
                          <span className="font-medium text-slate-700">
                            Người liên hệ: <strong>{profileData.supplier.contactPerson}</strong>
                          </span>
                        )}
                        <span className="font-mono text-slate-600 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {profileData.supplier.phone}
                        </span>
                        {profileData.supplier.email && (
                          <span className="text-slate-500 flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {profileData.supplier.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(profileData.supplier)}
                      className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                      Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSupplier(profileData.supplier)}
                      className="px-3 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xóa
                    </button>
                    {onNavigateToTab && (
                      <button
                        type="button"
                        onClick={() => onNavigateToTab('purchasing')}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        + Nhập hàng mới
                      </button>
                    )}
                  </div>
                </div>

                {/* 4 Thẻ Chỉ Số Tài Chính & Hàng Nhập */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-blue-600" />
                      Tổng tiền hàng nhập:
                    </div>
                    <div className="font-mono font-bold text-sm text-slate-900 mt-1">
                      {formatVND(profileData.stats.totalImported)}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Số phiếu nhập kho:
                    </div>
                    <div className="font-mono font-bold text-sm text-slate-900 mt-1">
                      {profileData.stats.totalReceipts} phiếu
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-teal-600" />
                      Đã thanh toán:
                    </div>
                    <div className="font-mono font-bold text-sm text-emerald-700 mt-1">
                      {formatVND(profileData.stats.totalPaid)}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-rose-600" />
                      Công nợ hiện tại:
                    </div>
                    <div className="font-mono font-bold text-sm text-rose-600 mt-1">
                      {formatVND(profileData.stats.currentDebt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Subtabs Điều Hướng Hồ Sơ */}
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
                <div className="flex border-b border-slate-100 p-1 bg-slate-50/60 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveTab('receipts')}
                    className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeTab === 'receipts'
                        ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    Lịch Sử Phiếu Nhập Kho ({profileData.receipts.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('debts')}
                    className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeTab === 'debts'
                        ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5" />
                    Sổ Theo Dõi Công Nợ ({profileData.debts.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('info')}
                    className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeTab === 'info'
                        ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Thông Tin Địa Chỉ & Liên Hệ
                  </button>
                </div>

                {/* TAB 1: Danh Sách Phiếu Nhập Kho */}
                {activeTab === 'receipts' && (
                  <div className="overflow-x-auto p-4">
                    {profileData.receipts.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                        <Truck className="w-8 h-8 text-slate-300 mx-auto" />
                        <p>Chưa có phiếu nhập kho nào từ nhà cung cấp này.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50/70 text-slate-500 border-b border-slate-100 font-semibold">
                            <th className="py-2.5 px-3">Mã phiếu</th>
                            <th className="py-2.5 px-3">Ngày lập</th>
                            <th className="py-2.5 px-3">Linh kiện đã nhập</th>
                            <th className="py-2.5 px-3 text-right">Tổng tiền</th>
                            <th className="py-2.5 px-3 text-right">Đã trả</th>
                            <th className="py-2.5 px-3 text-right">Nợ lại</th>
                            <th className="py-2.5 px-3 text-center">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {profileData.receipts.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">
                                {r.receiptCode}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 font-mono">
                                {formatDate(r.createdAt)}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="line-clamp-1 text-slate-700">
                                  {r.items.map((it) => `${it.productName} (x${it.quantity})`).join(', ')}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                {formatVND(r.totalAmount)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                                {formatVND(r.paidAmount)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-bold">
                                {formatVND(r.debtAmount)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    r.status === 'paid'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : r.status === 'partial'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}
                                >
                                  {r.status === 'paid'
                                    ? 'Đã trả đủ'
                                    : r.status === 'partial'
                                    ? 'Trả 1 phần'
                                    : 'Ghi nợ'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* TAB 2: Công Nợ Nhà Cung Cấp */}
                {activeTab === 'debts' && (
                  <div className="overflow-x-auto p-4">
                    {profileData.debts.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                        <p>Tuyệt vời! Không có khoản công nợ nào chưa thanh toán.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50/70 text-slate-500 border-b border-slate-100 font-semibold">
                            <th className="py-2.5 px-3">Mã tham chiếu</th>
                            <th className="py-2.5 px-3">Hạn thanh toán</th>
                            <th className="py-2.5 px-3 text-right">Tổng nợ</th>
                            <th className="py-2.5 px-3 text-right">Đã thanh toán</th>
                            <th className="py-2.5 px-3 text-right">Còn nợ</th>
                            <th className="py-2.5 px-3">Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {profileData.debts.map((d) => (
                            <tr key={d.id} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                                {d.referenceCode}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-500">
                                {d.dueDate ? formatDateOnly(d.dueDate) : 'Chưa đặt'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                                {formatVND(d.totalDebt)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                                {formatVND(d.paidAmount)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-bold">
                                {formatVND(d.remainingDebt)}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500">
                                {d.notes || 'Công nợ tiền hàng nhập'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* TAB 3: Thông tin Địa chỉ & Liên hệ */}
                {activeTab === 'info' && (
                  <div className="p-6 space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
                        <span className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider block">
                          Địa chỉ kho hàng / văn phòng
                        </span>
                        <div className="flex items-start gap-2 text-slate-800 font-medium">
                          <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                          <span>{profileData.supplier.address || 'Chưa cập nhật địa chỉ'}</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
                        <span className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider block">
                          Thông tin liên lạc
                        </span>
                        <div className="space-y-1 text-slate-700">
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-mono font-semibold">{profileData.supplier.phone}</span>
                          </div>
                          {profileData.supplier.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span>{profileData.supplier.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-xs text-slate-400 space-y-2">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
              <p>Chọn một nhà cung cấp ở cột bên trái để xem hồ sơ nhập hàng & công nợ chi tiết.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL THÊM / SỬA NHÀ CUNG CẤP */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {editingSupplier ? 'Chỉnh Sửa Nhà Cung Cấp' : 'Thêm Nhà Cung Cấp Mới'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Đối tác phân phối linh kiện phần cứng & thiết bị công nghệ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSupplier} className="p-5 space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Tên Công Ty / Nhà Phân Phối <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Công ty Cổ phần Máy tính Vĩnh Xuân (SPC)..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Người Liên Hệ (Sales Rep)
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Anh Trần Hùng..."
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Số Điện Thoại <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ví dụ: 02439765415..."
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Email Đặt Hàng</label>
                <input
                  type="email"
                  placeholder="Ví dụ: sales@spc.com.vn..."
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Địa Chỉ Kho / Trụ Sở
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Số 9 ngõ 117 Thái Hà, Đống Đa, Hà Nội..."
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-700/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Đang lưu...' : editingSupplier ? 'Lưu Cập Nhật' : 'Tạo Nhà Cung Cấp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
