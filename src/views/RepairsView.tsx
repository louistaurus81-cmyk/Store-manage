import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  Cpu,
  ChevronRight,
  User,
  Phone,
  HardDrive,
  Key,
  Shield,
  Layers,
  FileText,
} from 'lucide-react';
import type {
  Product,
  RepairPartUsed,
  RepairStatus,
  RepairTicket,
  StoreSettings,
  User as AppUser,
  UserRole,
} from '../types/datasoft';
import { apiFetch, formatVND, formatDate } from '../utils/api';
import { RepairPrintModal } from '../components/RepairPrintModal';

interface RepairsViewProps {
  userRole: UserRole;
  initialSelectedId?: string;
  onClearInitialId?: () => void;
}

export const RepairsView: React.FC<RepairsViewProps> = ({
  userRole,
  initialSelectedId,
  onClearInitialId,
}) => {
  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [technicians, setTechnicians] = useState<AppUser[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedTicket, setSelectedTicket] = useState<RepairTicket | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showAddPartModal, setShowAddPartModal] = useState(false);

  // New Ticket Form State
  const [createForm, setCreateForm] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    deviceName: '',
    model: '',
    deviceSerialImei: '',
    passCode: '',
    issueDescription: '',
    accessories: 'Thân máy + Sạc zin',
    deviceCondition: 'Vỏ xước nhẹ theo thời gian sử dụng, không móp vỡ',
    estimatedCost: 350000,
    depositAmount: 0,
    estimatedCompletionDate: '',
    technicianId: '',
    warrantyPeriodMonths: 3,
    notes: '',
  });

  // Add Part Form State
  const [partForm, setPartForm] = useState({
    productId: '',
    quantity: 1,
    chosenImei: '',
  });
  const [availableImeis, setAvailableImeis] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  useEffect(() => {
    if (initialSelectedId && tickets.length > 0) {
      const match = tickets.find((t) => t.id === initialSelectedId);
      if (match) {
        setSelectedTicket(match);
      }
      if (onClearInitialId) onClearInitialId();
    }
  }, [initialSelectedId, tickets]);

  const loadData = async () => {
    setLoading(true);
    try {
      const queryParam = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const [ticketList, productList, userList, storeSet] = await Promise.all([
        apiFetch<RepairTicket[]>(`/api/repairs${queryParam}`),
        apiFetch<Product[]>('/api/products'),
        apiFetch<AppUser[]>('/api/users'),
        apiFetch<StoreSettings>('/api/system/settings'),
      ]);
      setTickets(ticketList);
      setProducts(productList);
      setTechnicians(userList.filter((u) => u.role === 'technician' || u.role === 'admin'));
      setSettings(storeSet);
    } catch (err) {
      console.error('Lỗi tải dữ liệu sửa chữa:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.customerName || !createForm.customerPhone || !createForm.deviceName) {
      alert('Vui lòng điền đầy đủ Tên khách, SĐT và Tên thiết bị!');
      return;
    }

    try {
      const newTicket = await apiFetch<RepairTicket>('/api/repairs', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      setShowCreateModal(false);
      setTickets([newTicket, ...tickets]);
      setSelectedTicket(newTicket);
      // Reset form
      setCreateForm({
        customerName: '',
        customerPhone: '',
        customerAddress: '',
        deviceName: '',
        model: '',
        deviceSerialImei: '',
        passCode: '',
        issueDescription: '',
        accessories: 'Thân máy + Sạc zin',
        deviceCondition: 'Vỏ xước nhẹ theo thời gian sử dụng, không móp vỡ',
        estimatedCost: 350000,
        depositAmount: 0,
        estimatedCompletionDate: '',
        technicianId: '',
        warrantyPeriodMonths: 3,
        notes: '',
      });
    } catch (err: any) {
      alert(err.message || 'Lỗi tạo phiếu sửa chữa');
    }
  };

  const handleUpdateStatus = async (
    newStatus: RepairStatus,
    extra?: { diagnosis?: string; notes?: string; finalCost?: number }
  ) => {
    if (!selectedTicket) return;

    try {
      const updated = await apiFetch<RepairTicket>(`/api/repairs/${selectedTicket.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: newStatus,
          diagnosis: extra?.diagnosis ?? selectedTicket.technicalDiagnosis,
          notes: extra?.notes ?? selectedTicket.notes,
          finalCost: extra?.finalCost ?? selectedTicket.finalCost,
        }),
      });

      setSelectedTicket(updated);
      setTickets(tickets.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err: any) {
      alert(err.message || 'Lỗi cập nhật trạng thái');
    }
  };

  const handleProductSelectForPart = async (productId: string) => {
    setPartForm({ ...partForm, productId, chosenImei: '' });
    const product = products.find((p) => p.id === productId);
    if (product && product.hasSerialImei) {
      try {
        const imeis = await apiFetch<any[]>(`/api/imeis?productId=${productId}&status=in_stock`);
        setAvailableImeis(imeis.map((i) => i.imei));
      } catch {
        setAvailableImeis([]);
      }
    } else {
      setAvailableImeis([]);
    }
  };

  const handleAddPartToRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !partForm.productId) {
      alert('Vui lòng chọn sản phẩm / linh kiện');
      return;
    }

    try {
      const updated = await apiFetch<RepairTicket>(`/api/repairs/${selectedTicket.id}/parts`, {
        method: 'POST',
        body: JSON.stringify(partForm),
      });

      setSelectedTicket(updated);
      setTickets(tickets.map((t) => (t.id === updated.id ? updated : t)));
      setShowAddPartModal(false);
      setPartForm({ productId: '', quantity: 1, chosenImei: '' });
      // Tải lại danh sách sản phẩm để cập nhật số tồn
      const updatedProducts = await apiFetch<Product[]>('/api/products');
      setProducts(updatedProducts);
    } catch (err: any) {
      alert(err.message || 'Lỗi xuất linh kiện vào ca sửa');
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.ticketCode.toLowerCase().includes(q) ||
      t.customerName.toLowerCase().includes(q) ||
      t.customerPhone.includes(q) ||
      t.deviceName.toLowerCase().includes(q) ||
      t.deviceSerialImei.toLowerCase().includes(q)
    );
  });

  const statusMap: Record<
    RepairStatus,
    { label: string; badge: string; step: number }
  > = {
    received: { label: 'Tiếp nhận mới', badge: 'bg-slate-100 text-slate-800 border-slate-300', step: 1 },
    diagnosing: { label: 'Đang chuẩn đoán', badge: 'bg-blue-50 text-blue-700 border-blue-200', step: 2 },
    waiting_approval: { label: 'Chờ khách duyệt giá', badge: 'bg-purple-50 text-purple-700 border-purple-200', step: 3 },
    waiting_parts: { label: 'Chờ linh kiện về', badge: 'bg-amber-50 text-amber-700 border-amber-200', step: 3 },
    repairing: { label: 'Đang sửa chữa', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', step: 4 },
    testing: { label: 'Đang test kiểm thử', badge: 'bg-teal-50 text-teal-700 border-teal-200', step: 5 },
    completed: { label: 'Đã hoàn tất (Chờ lấy)', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', step: 6 },
    delivered: { label: 'Đã giao máy & Thu tiền', badge: 'bg-green-100 text-green-800 border-green-300', step: 7 },
    cancelled: { label: 'Khách hủy / Trả lại', badge: 'bg-rose-50 text-rose-700 border-rose-200', step: 0 },
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm mã phiếu, IMEI, SĐT, tên khách..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Filter Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="received">Tiếp nhận mới</option>
            <option value="diagnosing">Đang chuẩn đoán</option>
            <option value="waiting_approval">Chờ khách duyệt</option>
            <option value="waiting_parts">Chờ linh kiện</option>
            <option value="repairing">Đang sửa chữa</option>
            <option value="testing">Đang kiểm thử</option>
            <option value="completed">Đã hoàn thành</option>
            <option value="delivered">Đã trả máy</option>
            <option value="cancelled">Khách hủy</option>
          </select>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Tiếp nhận ca sửa mới
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="p-3 w-32">Mã phiếu</th>
                <th className="p-3">Khách hàng & SĐT</th>
                <th className="p-3">Thiết bị & Serial/IMEI</th>
                <th className="p-3">Lỗi tiếp nhận</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Kỹ thuật viên</th>
                <th className="p-3 text-right">Chi phí</th>
                <th className="p-3 text-center w-20">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Đang nạp dữ liệu từ DATASOFT/repairs.json...
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Không tìm thấy phiếu sửa chữa nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => {
                  const st = statusMap[t.status] || {
                    label: t.status,
                    badge: 'bg-slate-100 text-slate-700',
                  };
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                        selectedTicket?.id === t.id ? 'bg-emerald-50/50' : ''
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-emerald-700">{t.ticketCode}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{t.customerName}</div>
                        <div className="text-[11px] font-mono text-slate-500">{t.customerPhone}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-900">{t.deviceName}</div>
                        <div className="text-[11px] font-mono text-slate-500">{t.deviceSerialImei}</div>
                      </td>
                      <td className="p-3 max-w-xs">
                        <p className="line-clamp-2 text-slate-600">{t.issueDescription}</p>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold border ${st.badge}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">{t.technicianName || 'Chưa gán KTV'}</td>
                      <td className="p-3 text-right font-mono font-semibold text-slate-900">
                        {formatVND(t.finalCost)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicket(t);
                            setShowPrintModal(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                          title="In phiếu tiếp nhận"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Ticket Drawer / Detail Inspector */}
      {selectedTicket && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-slate-900 font-mono">
                  {selectedTicket.ticketCode}
                </h3>
                <span
                  className={`px-3 py-1 rounded-md text-xs font-semibold border ${
                    statusMap[selectedTicket.status].badge
                  }`}
                >
                  {statusMap[selectedTicket.status].label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tiếp nhận ngày: {formatDate(selectedTicket.receivedDate)} · Dự kiến hoàn thành:{' '}
                {selectedTicket.estimatedCompletionDate
                  ? formatDate(selectedTicket.estimatedCompletionDate)
                  : 'Chưa đặt hẹn'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPrintModal(true)}
                className="px-3 py-1.5 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                In phiếu tiếp nhận
              </button>
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-3 py-1.5 text-slate-400 hover:text-slate-600 text-xs"
              >
                Đóng chi tiết
              </button>
            </div>
          </div>

          {/* Quick Workflow Action Buttons (1-touch transitions) */}
          <div>
            <div className="text-xs font-semibold text-slate-700 uppercase mb-2">
              Chuyển nhanh trạng thái quy trình:
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleUpdateStatus('diagnosing')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedTicket.status === 'diagnosing'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                1. Đang kiểm tra / Chuẩn đoán
              </button>

              <button
                onClick={() => handleUpdateStatus('waiting_approval')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedTicket.status === 'waiting_approval'
                    ? 'bg-purple-600 text-white font-semibold'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                2. Chờ khách duyệt giá
              </button>

              <button
                onClick={() => handleUpdateStatus('waiting_parts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedTicket.status === 'waiting_parts'
                    ? 'bg-amber-600 text-white font-semibold'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                3. Chờ linh kiện về
              </button>

              <button
                onClick={() => handleUpdateStatus('repairing')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedTicket.status === 'repairing'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                4. Đang tiến hành sửa chữa
              </button>

              <button
                onClick={() => handleUpdateStatus('testing')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedTicket.status === 'testing'
                    ? 'bg-teal-600 text-white font-semibold'
                    : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                }`}
              >
                5. Kiểm thử máy (QA)
              </button>

              <button
                onClick={() => handleUpdateStatus('completed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedTicket.status === 'completed'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                6. Đã xong · Báo khách lấy máy
              </button>

              <button
                onClick={() => handleUpdateStatus('delivered')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedTicket.status === 'delivered'
                    ? 'bg-green-700 text-white font-semibold'
                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                }`}
              >
                7. Đã trả khách & kích hoạt bảo hành
              </button>

              <button
                onClick={() => handleUpdateStatus('cancelled')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 ml-auto"
              >
                Khách hủy / Không sửa
              </button>
            </div>
          </div>

          {/* Device & Customer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Customer Box */}
            <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2 text-xs">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-500" />
                Khách hàng
              </div>
              <div className="text-sm font-bold text-slate-900">{selectedTicket.customerName}</div>
              <div className="font-mono text-slate-600 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                {selectedTicket.customerPhone}
              </div>
            </div>

            {/* Device Box */}
            <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2 text-xs">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-slate-500" />
                Thiết bị tiếp nhận
              </div>
              <div className="text-sm font-bold text-slate-900">{selectedTicket.deviceName}</div>
              <div className="font-mono text-slate-600">Model: {selectedTicket.model}</div>
              <div className="font-mono text-slate-900 font-semibold">
                Serial/IMEI: {selectedTicket.deviceSerialImei}
              </div>
              <div className="font-mono text-slate-600 flex items-center gap-1">
                <Key className="w-3.5 h-3.5" />
                Mật khẩu: {selectedTicket.passCode || 'Không có'}
              </div>
            </div>

            {/* Technician & Financial Box */}
            <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2 text-xs">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-slate-500" />
                Kỹ thuật & Chi phí
              </div>
              <div>
                Kỹ thuật viên:{' '}
                <strong className="text-slate-900">
                  {selectedTicket.technicianName || 'Chưa gán KTV'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Dự toán:</span>
                <span className="font-mono">{formatVND(selectedTicket.estimatedCost)}</span>
              </div>
              <div className="flex justify-between">
                <span>Đã đặt cọc:</span>
                <span className="font-mono text-emerald-700 font-semibold">
                  {formatVND(selectedTicket.depositAmount)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-sm border-t border-slate-200 pt-1 text-slate-900">
                <span>Tổng chi phí:</span>
                <span className="font-mono text-emerald-600">{formatVND(selectedTicket.finalCost)}</span>
              </div>
            </div>
          </div>

          {/* Issues and Technical Diagnosis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 border border-slate-200 rounded-lg">
              <span className="font-semibold text-slate-800 block mb-1">Tình trạng lỗi khách báo:</span>
              <p className="text-slate-700 whitespace-pre-wrap">{selectedTicket.issueDescription}</p>
              <div className="mt-3 text-[11px] text-slate-500">
                <strong>Phụ kiện:</strong> {selectedTicket.accessories} | <strong>Ngoại quan:</strong>{' '}
                {selectedTicket.deviceCondition}
              </div>
            </div>

            <div className="p-4 border border-slate-200 rounded-lg">
              <span className="font-semibold text-slate-800 block mb-1">
                Chuẩn đoán & Đề xuất kỹ thuật:
              </span>
              <p className="text-slate-700 whitespace-pre-wrap">
                {selectedTicket.technicalDiagnosis || 'Chưa có ghi chép chuẩn đoán.'}
              </p>
              <div className="mt-3 text-[11px] text-slate-500">
                <strong>Bảo hành dịch vụ:</strong> {selectedTicket.warrantyPeriodMonths} tháng
              </div>
            </div>
          </div>

          {/* Spare Parts Used (Xuất kho linh kiện vào ca sửa) */}
          <div className="border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-600" />
                  Linh kiện đã xuất từ Kho vào máy này
                </h4>
                <p className="text-xs text-slate-500">
                  Hệ thống tự động trừ tồn kho và gán Serial/IMEI linh kiện vào ca sửa chữa
                </p>
              </div>

              <button
                onClick={() => setShowAddPartModal(true)}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Xuất linh kiện từ kho
              </button>
            </div>

            {selectedTicket.partsUsed && selectedTicket.partsUsed.length > 0 ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="p-2">Tên linh kiện</th>
                    <th className="p-2">Số Serial/IMEI linh kiện</th>
                    <th className="p-2 text-center">Số lượng</th>
                    <th className="p-2 text-right">Đơn giá</th>
                    <th className="p-2 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedTicket.partsUsed.map((part, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-medium text-slate-900">{part.productName}</td>
                      <td className="p-2 font-mono text-emerald-700 font-semibold">
                        {part.imei || '-'}
                      </td>
                      <td className="p-2 text-center font-mono">{part.quantity}</td>
                      <td className="p-2 text-right font-mono">{formatVND(part.unitPrice)}</td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900">
                        {formatVND(part.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                Chưa có linh kiện nào được xuất cho thiết bị này. Nhấn nút bên trên để lấy linh kiện từ
                kho.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Tiếp nhận máy mới */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-600" />
                Tiếp nhận thiết bị máy tính sửa chữa
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="font-semibold text-slate-800 border-b pb-1 text-xs uppercase tracking-wide">
                1. Thông tin Khách hàng
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Họ tên khách hàng *</label>
                  <input
                    type="text"
                    required
                    value={createForm.customerName}
                    onChange={(e) => setCreateForm({ ...createForm, customerName: e.target.value })}
                    placeholder="Ví dụ: Nguyễn Văn Hùng"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    value={createForm.customerPhone}
                    onChange={(e) => setCreateForm({ ...createForm, customerPhone: e.target.value })}
                    placeholder="Ví dụ: 0912345678"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="font-semibold text-slate-800 border-b pb-1 text-xs uppercase tracking-wide pt-2">
                2. Thông tin Máy & Tình trạng lỗi
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Tên thiết bị tiếp nhận *</label>
                  <input
                    type="text"
                    required
                    value={createForm.deviceName}
                    onChange={(e) => setCreateForm({ ...createForm, deviceName: e.target.value })}
                    placeholder="Ví dụ: Laptop Asus ROG Strix G15"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Model / Cấu hình</label>
                  <input
                    type="text"
                    value={createForm.model}
                    onChange={(e) => setCreateForm({ ...createForm, model: e.target.value })}
                    placeholder="Ví dụ: G513RC (Ryzen 7 / RTX 3050)"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Số Serial / Service Tag / IMEI</label>
                  <input
                    type="text"
                    value={createForm.deviceSerialImei}
                    onChange={(e) => setCreateForm({ ...createForm, deviceSerialImei: e.target.value })}
                    placeholder="Ví dụ: ST-ASUS882910"
                    className="w-full px-3 py-2 border rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Mật khẩu mở máy</label>
                  <input
                    type="text"
                    value={createForm.passCode}
                    onChange={(e) => setCreateForm({ ...createForm, passCode: e.target.value })}
                    placeholder="Ví dụ: 123456 hoặc Không có"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Mô tả tình trạng lỗi do khách báo *</label>
                <textarea
                  required
                  rows={2}
                  value={createForm.issueDescription}
                  onChange={(e) => setCreateForm({ ...createForm, issueDescription: e.target.value })}
                  placeholder="Ví dụ: Bật không lên nguồn, đèn sạc nhấp nháy màu cam, máy có hiện tượng nóng bất thường..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Phụ kiện kèm theo</label>
                  <input
                    type="text"
                    value={createForm.accessories}
                    onChange={(e) => setCreateForm({ ...createForm, accessories: e.target.value })}
                    placeholder="Sạc zin, túi chống sốc, chuột..."
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Ngoại quan máy</label>
                  <input
                    type="text"
                    value={createForm.deviceCondition}
                    onChange={(e) => setCreateForm({ ...createForm, deviceCondition: e.target.value })}
                    placeholder="Mặt A xước nhẹ, bản lề chắc chắn..."
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="font-semibold text-slate-800 border-b pb-1 text-xs uppercase tracking-wide pt-2">
                3. Chi phí, Phân công & Bảo hành
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Dự toán chi phí (VNĐ)</label>
                  <input
                    type="number"
                    step={10000}
                    value={createForm.estimatedCost}
                    onChange={(e) => setCreateForm({ ...createForm, estimatedCost: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Tiền đặt cọc (VNĐ)</label>
                  <input
                    type="number"
                    step={10000}
                    value={createForm.depositAmount}
                    onChange={(e) => setCreateForm({ ...createForm, depositAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Phân công KTV</label>
                  <select
                    value={createForm.technicianId}
                    onChange={(e) => setCreateForm({ ...createForm, technicianId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Chọn kỹ thuật viên</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 shadow-xs"
                >
                  Tạo Phiếu & Lưu DATASOFT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Xuất linh kiện kho vào ca sửa */}
      {showAddPartModal && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-600" />
              Xuất linh kiện từ Kho vào phiếu {selectedTicket.ticketCode}
            </h3>

            <form onSubmit={handleAddPartToRepair} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Chọn linh kiện / dịch vụ trong kho *</label>
                <select
                  required
                  value={partForm.productId}
                  onChange={(e) => handleProductSelectForPart(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">-- Chọn linh kiện --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.stockQuantity <= 0 && p.stockQuantity < 900}>
                      {p.name} · Giá: {formatVND(p.retailPrice)} (Tồn: {p.stockQuantity} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              {availableImeis.length > 0 && (
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    Chọn số Serial/IMEI linh kiện xuất kho:
                  </label>
                  <select
                    value={partForm.chosenImei}
                    onChange={(e) => setPartForm({ ...partForm, chosenImei: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">-- Chọn IMEI tồn kho --</option>
                    {availableImeis.map((imei) => (
                      <option key={imei} value={imei}>
                        {imei}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-600 font-medium mb-1">Số lượng xuất</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={partForm.quantity}
                  onChange={(e) => setPartForm({ ...partForm, quantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddPartModal(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 shadow-xs"
                >
                  Xác nhận xuất kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {showPrintModal && selectedTicket && (
        <RepairPrintModal
          ticket={selectedTicket}
          settings={settings}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};
