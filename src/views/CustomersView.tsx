import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Receipt,
  Wrench,
  Scale,
  Barcode,
  ArrowRight,
  ChevronRight,
  ArrowUpRight,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  X,
  CreditCard,
  Package,
} from 'lucide-react';
import type { Customer, CustomerProfileData, UserRole } from '../types/datasoft';
import { apiFetch, formatVND, formatDate, formatDateOnly } from '../utils/api';

interface CustomersViewProps {
  userRole: UserRole;
  onNavigateToTab?: (tab: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ userRole, onNavigateToTab }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected customer for Profile mini dashboard
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<CustomerProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<'items' | 'invoices' | 'repairs' | 'debts'>('items');

  // Modal thêm khách hàng mới
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [addingCustomer, setAddingCustomer] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Customer[]>('/api/customers');
      setCustomers(data);
    } catch (err) {
      console.error('Lỗi tải danh sách khách hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = async (cust: Customer) => {
    setSelectedCustomerId(cust.id);
    setLoadingProfile(true);
    try {
      const data = await apiFetch<CustomerProfileData>(`/api/customers/${cust.id}/profile`);
      setProfileData(data);
    } catch (err) {
      console.error('Lỗi tải hồ sơ khách hàng:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      alert('Vui lòng nhập tên và số điện thoại khách hàng');
      return;
    }

    setAddingCustomer(true);
    try {
      const created = await apiFetch<Customer>('/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: newCustName.trim(),
          phone: newCustPhone.trim(),
          email: newCustEmail.trim() || undefined,
          address: newCustAddress.trim() || undefined,
        }),
      });

      setShowAddModal(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustEmail('');
      setNewCustAddress('');
      await loadCustomers();
      handleSelectCustomer(created);
    } catch (err: any) {
      alert(err.message || 'Lỗi thêm khách hàng mới');
    } finally {
      setAddingCustomer(false);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans text-slate-800">
      {/* Header macOS Bar */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Hồ Sơ & Quản Trị Khách Hàng (CRM)
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <Users className="w-3.5 h-3.5" />
              CRM ĐỒNG BỘ ĐA MODULE
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Tra cứu lịch sử mua linh kiện, đối soát số Serial/IMEI, theo dõi hồ sơ sửa chữa thiết bị và quản lý công nợ.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm khách hàng</span>
          </button>

          <button
            onClick={() => loadCustomers()}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all shadow-xs"
            title="Làm mới"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Danh sách khách hàng (Trái 35%) & Hồ sơ chi tiết (Phải 65%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT TRÁI (4 cols): Danh sách khách hàng & tìm kiếm */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm khách theo Tên, SĐT, Mã KH..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="text-[11px] font-semibold text-slate-400 flex justify-between px-1">
              <span>DANH SÁCH ({filteredCustomers.length})</span>
              <span>CHỌN ĐỂ XEM HỒ SƠ</span>
            </div>

            <div className="max-h-[68vh] overflow-y-auto space-y-2 pr-1">
              {filteredCustomers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Không tìm thấy khách hàng nào.
                </div>
              ) : (
                filteredCustomers.map((cust) => {
                  const isSelected = selectedCustomerId === cust.id;
                  return (
                    <div
                      key={cust.id}
                      onClick={() => handleSelectCustomer(cust)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white hover:bg-slate-50 border-slate-200/70 text-slate-800'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold text-xs truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {cust.name}
                          </span>
                          <span
                            className={`font-mono text-[10px] px-1.5 py-0.2 rounded ${
                              isSelected ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {cust.code}
                          </span>
                        </div>
                        <div
                          className={`text-[11px] font-mono mt-0.5 flex items-center gap-1 ${
                            isSelected ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          <Phone className="w-3 h-3" />
                          {cust.phone}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`font-mono font-bold text-xs ${isSelected ? 'text-emerald-300' : 'text-emerald-700'}`}>
                          {formatVND(cust.totalSpent || 0)}
                        </div>
                        {cust.currentDebt > 0 && (
                          <div className={`text-[10px] font-mono font-semibold ${isSelected ? 'text-amber-300' : 'text-rose-600'}`}>
                            Nợ: {formatVND(cust.currentDebt)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (8 cols): Dashboard Mini Hồ Sơ Khách Hàng */}
        <div className="lg:col-span-8">
          {!selectedCustomerId ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center space-y-3 shadow-xs h-full flex flex-col items-center justify-center min-h-[50vh]">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Chưa chọn khách hàng</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Nhấp vào bất kỳ khách hàng nào ở danh sách bên trái để mở Hồ sơ CRM chi tiết, lịch sử mua linh kiện và công nợ.
              </p>
            </div>
          ) : loadingProfile || !profileData ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center space-y-3 shadow-xs h-full flex flex-col items-center justify-center min-h-[50vh]">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <div className="text-xs font-semibold text-slate-600">Đang tổng hợp hồ sơ khách hàng...</div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Thẻ Header Khách Hàng */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-700 text-white font-bold flex items-center justify-center text-lg shadow-sm">
                      {profileData.customer.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">
                          {profileData.customer.name}
                        </h2>
                        <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                          {profileData.customer.code}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1 font-mono text-slate-700 font-medium">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {profileData.customer.phone}
                        </span>
                        {profileData.customer.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {profileData.customer.email}
                          </span>
                        )}
                        {profileData.customer.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {profileData.customer.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onNavigateToTab && (
                      <button
                        onClick={() => onNavigateToTab('pos')}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        Lập đơn mới
                      </button>
                    )}
                  </div>
                </div>

                {/* 4 Thống kê Mini KPI của khách hàng */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-400 font-medium">Tổng chi tiêu:</span>
                    <div className="text-sm font-bold font-mono text-emerald-700 mt-0.5">
                      {formatVND(profileData.stats.totalSpent)}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-400 font-medium">Đơn mua hàng:</span>
                    <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                      {profileData.stats.totalOrders} hóa đơn
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-400 font-medium">Ca sửa chữa máy:</span>
                    <div className="text-sm font-bold font-mono text-indigo-700 mt-0.5">
                      {profileData.stats.totalRepairs} lượt
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[11px] text-slate-400 font-medium">Công nợ hiện tại:</span>
                    <div
                      className={`text-sm font-bold font-mono mt-0.5 ${
                        profileData.stats.currentDebt > 0 ? 'text-rose-600' : 'text-slate-500'
                      }`}
                    >
                      {formatVND(profileData.stats.currentDebt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs chi tiết: Linh kiện đã mua / Hóa đơn / Sửa chữa / Công nợ */}
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
                <div className="flex border-b border-slate-100 text-xs font-semibold bg-slate-50/50 p-1.5 gap-1">
                  {[
                    { id: 'items', label: `Linh kiện đã mua (${profileData.purchasedItems.length})`, icon: Package },
                    { id: 'invoices', label: `Hóa đơn bán lẻ (${profileData.invoices.length})`, icon: Receipt },
                    { id: 'repairs', label: `Lịch sử sửa chữa (${profileData.repairs.length})`, icon: Wrench },
                    { id: 'debts', label: `Sổ công nợ (${profileData.debts.length})`, icon: Scale },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveProfileTab(t.id as any)}
                      className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                        activeProfileTab === t.id
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <t.icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>

                <div className="p-4">
                  {/* TAB 1: Danh sách linh kiện đã mua */}
                  {activeProfileTab === 'items' && (
                    <div className="overflow-x-auto">
                      {profileData.purchasedItems.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          Chưa có sản phẩm nào được ghi nhận.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                              <th className="p-2.5">Tên sản phẩm & Serial/IMEI</th>
                              <th className="p-2.5 text-center">Số lượng</th>
                              <th className="p-2.5 text-right">Đơn giá</th>
                              <th className="p-2.5 text-right">Thành tiền</th>
                              <th className="p-2.5 text-center">Mã HĐ & Ngày</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {profileData.purchasedItems.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/60">
                                <td className="p-2.5">
                                  <div className="font-semibold text-slate-900">{item.productName}</div>
                                  {item.imei && (
                                    <div className="text-[11px] font-mono text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                                      <Barcode className="w-3 h-3" />
                                      {item.imei} (BH: {item.warrantyMonths} tháng)
                                    </div>
                                  )}
                                </td>
                                <td className="p-2.5 text-center font-mono font-bold">{item.quantity}</td>
                                <td className="p-2.5 text-right font-mono">{formatVND(item.unitPrice)}</td>
                                <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                                  {formatVND(item.total)}
                                </td>
                                <td className="p-2.5 text-center font-mono">
                                  <span className="font-semibold text-blue-600">{item.invoiceCode}</span>
                                  <div className="text-[10px] text-slate-400">
                                    {formatDateOnly(item.purchaseDate)}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* TAB 2: Hóa đơn bán lẻ */}
                  {activeProfileTab === 'invoices' && (
                    <div className="overflow-x-auto">
                      {profileData.invoices.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          Chưa có hóa đơn nào của khách này.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                              <th className="p-2.5">Mã HĐ</th>
                              <th className="p-2.5">Linh kiện mua</th>
                              <th className="p-2.5 text-right">Tổng tiền</th>
                              <th className="p-2.5 text-center">Trạng thái</th>
                              <th className="p-2.5 text-center">Thời gian</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {profileData.invoices.map((inv) => (
                              <tr key={inv.id} className="hover:bg-slate-50/60">
                                <td className="p-2.5 font-mono font-bold text-blue-600">{inv.invoiceCode}</td>
                                <td className="p-2.5 text-slate-700">
                                  {inv.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}
                                </td>
                                <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                                  {formatVND(inv.finalAmount)}
                                </td>
                                <td className="p-2.5 text-center">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                      inv.status === 'paid'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-amber-50 text-amber-700'
                                    }`}
                                  >
                                    {inv.status === 'paid' ? 'Đã thu đủ' : `Còn nợ: ${formatVND(inv.debtAmount)}`}
                                  </span>
                                </td>
                                <td className="p-2.5 text-center font-mono text-[11px] text-slate-400">
                                  {formatDate(inv.createdAt)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* TAB 3: Lịch sử sửa chữa */}
                  {activeProfileTab === 'repairs' && (
                    <div className="overflow-x-auto">
                      {profileData.repairs.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          Khách hàng chưa có lịch sử tiếp nhận sửa máy.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                              <th className="p-2.5">Mã phiếu</th>
                              <th className="p-2.5">Thiết bị & Serial</th>
                              <th className="p-2.5">Tình trạng lỗi</th>
                              <th className="p-2.5 text-center">Trạng thái</th>
                              <th className="p-2.5 text-right">Chi phí</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {profileData.repairs.map((r) => (
                              <tr key={r.id} className="hover:bg-slate-50/60">
                                <td className="p-2.5 font-mono font-bold text-emerald-700">{r.ticketCode}</td>
                                <td className="p-2.5">
                                  <div className="font-semibold text-slate-900">{r.deviceName}</div>
                                  <div className="text-[10px] font-mono text-slate-400">{r.deviceSerialImei}</div>
                                </td>
                                <td className="p-2.5 text-slate-600 line-clamp-1 max-w-[200px]">
                                  {r.issueDescription}
                                </td>
                                <td className="p-2.5 text-center">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                                    {r.status}
                                  </span>
                                </td>
                                <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                                  {formatVND(r.finalCost)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* TAB 4: Sổ công nợ */}
                  {activeProfileTab === 'debts' && (
                    <div className="overflow-x-auto">
                      {profileData.debts.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          Khách hàng không có lịch sử ghi nợ.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                              <th className="p-2.5">Mã tham chiếu</th>
                              <th className="p-2.5 text-right">Tổng nợ</th>
                              <th className="p-2.5 text-right">Đã trả</th>
                              <th className="p-2.5 text-right">Còn nợ</th>
                              <th className="p-2.5 text-center">Hạn chót</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {profileData.debts.map((d) => (
                              <tr key={d.id} className="hover:bg-slate-50/60">
                                <td className="p-2.5 font-mono font-bold text-slate-800">{d.referenceCode}</td>
                                <td className="p-2.5 text-right font-mono">{formatVND(d.totalDebt)}</td>
                                <td className="p-2.5 text-right font-mono text-emerald-700">{formatVND(d.paidAmount)}</td>
                                <td className="p-2.5 text-right font-mono font-bold text-rose-600">
                                  {formatVND(d.remainingDebt)}
                                </td>
                                <td className="p-2.5 text-center font-mono">{formatDateOnly(d.dueDate)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL THÊM KHÁCH HÀNG MỚI */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                Thêm Khách Hàng Mới
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên khách hàng *:
                </label>
                <input
                  type="text"
                  placeholder="VD: Nguyễn Văn A..."
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại *:
                </label>
                <input
                  type="text"
                  placeholder="VD: 0988123456"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email liên hệ (nếu có):
                </label>
                <input
                  type="email"
                  placeholder="VD: email@example.com"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Địa chỉ giao hàng / cư trú:
                </label>
                <input
                  type="text"
                  placeholder="VD: Số 12 phố Thái Hà, Đống Đa, Hà Nội..."
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl font-semibold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={addingCustomer}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-xs flex items-center gap-1.5"
                >
                  {addingCustomer && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Lưu khách hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
