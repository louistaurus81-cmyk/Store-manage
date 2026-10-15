import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Receipt,
  Boxes,
  AlertTriangle,
  Flame,
  Scale,
  RefreshCw,
  Plus,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Calendar,
  DollarSign,
  Coins,
  Package,
  Sparkles,
  ChevronRight,
  UserCheck,
  Building2,
  ArrowRight,
  X,
} from 'lucide-react';
import type {
  DashboardOverview,
  LowStockItem,
  TopSellingItem,
  DebtsAlertData,
  DebtAlertItem,
  Invoice,
  UserRole,
  DashboardTimeRange,
} from '../types/datasoft';
import { apiFetch, formatVND, formatDate, formatDateOnly } from '../utils/api';

interface DashboardViewProps {
  userRole: UserRole;
  onNavigateTab: (tab: string) => void;
  onSelectRepair: (ticketId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  userRole,
  onNavigateTab,
  onSelectRepair,
}) => {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [topSelling, setTopSelling] = useState<TopSellingItem[]>([]);
  const [debtsAlert, setDebtsAlert] = useState<DebtsAlertData | null>(null);
  const [recentOrders, setRecentOrders] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal Nhập Hàng Nhanh
  const [restockModalItem, setRestockModalItem] = useState<LowStockItem | null>(null);
  const [restockQuantity, setRestockQuantity] = useState<number>(5);
  const [restockSubmitting, setRestockSubmitting] = useState(false);

  // Modal Thu Nợ / Thanh Toán Nợ Nhanh
  const [payDebtModalItem, setPayDebtModalItem] = useState<DebtAlertItem | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payNote, setPayNote] = useState<string>('');
  const [paySubmitting, setPaySubmitting] = useState(false);

  // Toast thông báo
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isAuthorized = userRole === 'admin' || userRole === 'manager';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (isAuthorized) {
      loadDashboardData();
    } else {
      setLoading(false);
    }
  }, [userRole]);

  const loadDashboardData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [ovData, lsData, tsData, daData, roData] = await Promise.all([
        apiFetch<DashboardOverview>('/api/dashboard/overview'),
        apiFetch<LowStockItem[]>('/api/dashboard/low-stock'),
        apiFetch<TopSellingItem[]>('/api/dashboard/top-selling'),
        apiFetch<DebtsAlertData>('/api/dashboard/debts-alert'),
        apiFetch<Invoice[]>('/api/dashboard/recent-orders'),
      ]);

      setOverview(ovData);
      setLowStock(lsData);
      setTopSelling(tsData);
      setDebtsAlert(daData);
      setRecentOrders(roData);

      if (isManualRefresh) {
        showToast('Đã làm mới toàn bộ số liệu thống kê máy chủ!');
      }
    } catch (err: any) {
      console.error('Lỗi nạp dữ liệu Dashboard Quản lý:', err);
      setError(err.message || 'Không thể tải dữ liệu bảng điều khiển.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Xử lý nạp thêm kho (Tạo đơn nhập nhanh)
  const handleConfirmRestock = async () => {
    if (!restockModalItem || restockQuantity <= 0) return;
    setRestockSubmitting(true);
    try {
      const newStock = restockModalItem.stockQuantity + Number(restockQuantity);
      await apiFetch(`/api/products/${restockModalItem.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          stockQuantity: newStock,
        }),
      });

      showToast(`Đã nhập thêm +${restockQuantity} ${restockModalItem.unit} cho "${restockModalItem.name}"!`);
      setRestockModalItem(null);
      await loadDashboardData(true);
    } catch (err: any) {
      alert('Lỗi nhập hàng: ' + err.message);
    } finally {
      setRestockSubmitting(false);
    }
  };

  // Xử lý thanh toán nợ nhanh
  const handleConfirmPayDebt = async () => {
    if (!payDebtModalItem || payAmount <= 0) return;
    setPaySubmitting(true);
    try {
      await apiFetch(`/api/debts/${payDebtModalItem.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          amount: payAmount,
          note: payNote || 'Thanh toán trực tiếp từ Bảng điều khiển Quản lý',
        }),
      });

      showToast(`Đã ghi nhận thanh toán ${formatVND(payAmount)} cho ${payDebtModalItem.entityName}!`);
      setPayDebtModalItem(null);
      await loadDashboardData(true);
    } catch (err: any) {
      alert('Lỗi ghi nhận thanh toán: ' + err.message);
    } finally {
      setPaySubmitting(false);
    }
  };

  // BẢO MẬT (RBAC): Chặn truy cập nếu vai trò không phải Admin hoặc Manager
  if (!isAuthorized) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[70vh]">
        <div className="w-full bg-white border border-slate-200/80 rounded-2xl p-8 shadow-xs text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Khu Vực Báo Cáo Tài Chính & Quản Lý Nội Bộ
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Tính năng này yêu cầu quyền <strong>Chủ Cửa Hàng (Manager)</strong> hoặc{' '}
              <strong>Quản Trị Viên (Admin)</strong>. Vai trò hiện tại của bạn là{' '}
              <span className="font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold">
                {userRole.toUpperCase()}
              </span>{' '}
              được cấu hình ẩn giá vốn nhập kho và biên lợi nhuận theo chính sách bảo mật RBAC.
            </p>
          </div>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => onNavigateTab('pos')}
              className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs flex items-center gap-2"
            >
              <Receipt className="w-4 h-4" />
              Đến Quầy Thu Ngân (POS)
            </button>
            <button
              onClick={() => onNavigateTab('repairs')}
              className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs flex items-center gap-2"
            >
              <Boxes className="w-4 h-4" />
              Tiếp Nhận Sửa Chữa
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 animate-spin">
          <RefreshCw className="w-5 h-5" />
        </div>
        <div className="text-xs font-semibold text-slate-600">Đang tổng hợp dữ liệu Bảng Điều Khiển Quản Lý...</div>
        <div className="text-[11px] text-slate-400 font-mono">Tính toán giá vốn và lợi nhuận từ invoices.json & products.json</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-lg border border-slate-700/60 flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header macOS Bar */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Bảng Điều Khiển Quản Lý (Owner Dashboard)
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              MÁY CHỦ TRUNG TÂM · KẾT NỐI SẴN SÀNG
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Giám sát chỉ số tài chính, biên lợi nhuận thực tế (Doanh thu - Giá vốn), cảnh báo tồn kho và theo dõi công nợ.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className="px-3 py-2 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-60"
            title="Làm mới số liệu tức thì"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={() => onNavigateTab('inventory')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-800 rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
          >
            <Boxes className="w-3.5 h-3.5 text-slate-600" />
            <span>Kho tổng</span>
          </button>

          <button
            onClick={() => onNavigateTab('debts')}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
          >
            <Scale className="w-3.5 h-3.5 text-slate-300" />
            <span>Sổ công nợ</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => loadDashboardData()} className="underline font-semibold ml-2">
            Thử lại
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* HÀNG 1: 4 THẺ KPI CARDS (Doanh thu, Lợi nhuận, Nợ, Đơn hàng) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Doanh thu tháng */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Doanh thu tháng</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {formatVND(overview?.monthRevenue || 0)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="inline-flex items-center text-emerald-600 font-semibold font-mono">
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                100%
              </span>
              <span>· {overview?.monthOrders || 0} đơn hàng bán ra</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Toàn thời gian:</span>
            <span className="font-mono font-medium text-slate-600">{formatVND(overview?.totalRevenue || 0)}</span>
          </div>
        </div>

        {/* Card 2: LỢI NHUẬN THÁNG (NỔI BẬT ĐẶC BIỆT THEO YÊU CẦU) */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-white to-teal-500/5 border-2 border-emerald-500/50 rounded-2xl p-4 shadow-sm ring-2 ring-emerald-500/10 transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Lợi nhuận tháng</span>
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white font-mono font-bold text-[10px]">
                {overview?.monthMargin || 0}%
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold font-mono text-emerald-700 tracking-tight">
              {formatVND(overview?.monthProfit || 0)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-emerald-900/80 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Đã trừ giá vốn ({formatVND(overview?.monthCost || 0)})</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-emerald-100/80 flex items-center justify-between text-[11px] text-emerald-700/80">
            <span>Lợi nhuận gộp toàn kỳ:</span>
            <span className="font-mono font-bold text-emerald-800">{formatVND(overview?.totalProfit || 0)}</span>
          </div>
        </div>

        {/* Card 3: Tổng nợ phải thu */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng nợ phải thu</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-amber-700 tracking-tight">
              {formatVND(overview?.totalDebtReceivable || 0)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-semibold text-amber-800">
                {debtsAlert?.customerDebts.length || 0} khách hàng
              </span>
              <span>chưa thu hồi</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Nợ cần trả nhà CC:</span>
            <span className="font-mono font-medium text-slate-600">{formatVND(overview?.totalDebtPayable || 0)}</span>
          </div>
        </div>

        {/* Card 4: Tổng đơn hàng & Sửa chữa */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng đơn hàng</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {overview?.totalOrders || 0}{' '}
              <span className="text-sm font-normal text-slate-400 font-sans">hóa đơn</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="text-indigo-600 font-semibold font-mono">
                +{overview?.completedRepairsCount || 0}
              </span>
              <span>ca sửa chữa hoàn tất</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Ca sửa đang xử lý:</span>
            <span className="font-mono font-semibold text-amber-600">
              {overview?.activeRepairsCount || 0} thiết bị
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* HÀNG 2: GRID 2 CỘT (Sản phẩm sắp hết hàng & Bán chạy nhất) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cột trái: Bảng Sản phẩm sắp hết hàng */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Sản phẩm sắp hết hàng</h3>
                <p className="text-[11px] text-slate-400">
                  Tồn kho &lt;= ngưỡng cảnh báo an toàn. Cần tạo đơn nhập hàng.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60 font-mono">
              {lowStock.length} mã
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            {lowStock.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">Tồn kho linh kiện đều ở mức an toàn</p>
                <p className="text-[11px] text-slate-400">Không có mặt hàng nào chạm ngưỡng cảnh báo tối thiểu.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/60 text-slate-500 border-b border-slate-100 font-semibold">
                    <th className="py-2.5 px-4">Tên linh kiện & SKU</th>
                    <th className="py-2.5 px-3 text-center">Tồn / Ngưỡng</th>
                    <th className="py-2.5 px-3 text-center">Tình trạng</th>
                    <th className="py-2.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStock.map((prod) => {
                    const isZero = prod.stockQuantity === 0;
                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 line-clamp-1 max-w-[240px]" title={prod.name}>
                            {prod.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                            <span className="font-mono text-slate-500 font-medium">{prod.sku}</span>
                            <span>·</span>
                            <span>{prod.categoryName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-baseline justify-center gap-1">
                            <span
                              className={`font-mono font-bold text-sm ${
                                isZero ? 'text-rose-600' : 'text-amber-600'
                              }`}
                            >
                              {prod.stockQuantity}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">/ {prod.minStockAlert} {prod.unit}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">Giá vốn: {formatVND(prod.importPrice)}</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isZero ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 animate-pulse">
                              Cháy hàng (0)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                              Sắp hết ({prod.stockQuantity})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setRestockModalItem(prod);
                              setRestockQuantity(prod.suggestedRestock || 5);
                            }}
                            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold transition-all shadow-xs inline-flex items-center gap-1 active:scale-95"
                          >
                            <Plus className="w-3 h-3" />
                            Tạo đơn nhập
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
            <span>Gợi ý: Cần bù tối thiểu theo hạn mức gối đầu</span>
            <button
              onClick={() => onNavigateTab('inventory')}
              className="text-slate-900 hover:text-emerald-700 font-semibold flex items-center gap-1 transition-colors"
            >
              Mở trang Kho Hàng <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Cột phải: Bảng Sản phẩm bán chạy nhất */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Sản phẩm bán chạy nhất</h3>
                <p className="text-[11px] text-slate-400">Xếp hạng theo số lượng bán và doanh thu thực tế</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200/60 font-mono">
              Top {topSelling.length}
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            {topSelling.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Chưa có dữ liệu bán lẻ trong hóa đơn.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/60 text-slate-500 border-b border-slate-100 font-semibold">
                    <th className="py-2.5 px-3 text-center w-10">#</th>
                    <th className="py-2.5 px-3">Tên sản phẩm</th>
                    <th className="py-2.5 px-3 text-center">Đã bán</th>
                    <th className="py-2.5 px-3 text-right">Doanh thu</th>
                    <th className="py-2.5 px-4 text-right">Lợi nhuận</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topSelling.map((item, idx) => {
                    const medalColors = [
                      'bg-amber-400 text-amber-950 font-bold',
                      'bg-slate-300 text-slate-800 font-bold',
                      'bg-amber-700 text-amber-100 font-bold',
                    ];
                    const badgeClass = medalColors[idx] || 'bg-slate-100 text-slate-600 font-medium';

                    return (
                      <tr key={item.productId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`w-5 h-5 rounded-md inline-flex items-center justify-center text-[10px] font-mono ${badgeClass}`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 line-clamp-1 max-w-[200px]" title={item.name}>
                            {item.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{item.sku}</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {item.quantitySold}
                          </span>{' '}
                          <span className="text-[11px] text-slate-400">{item.unit}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                          {formatVND(item.totalRevenue)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-mono font-bold text-emerald-700">
                            +{formatVND(item.totalProfit)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
            <span>Dữ liệu liên kết trực tiếp từ invoices.json</span>
            <button
              onClick={() => onNavigateTab('pos')}
              className="text-slate-900 hover:text-emerald-700 font-semibold flex items-center gap-1 transition-colors"
            >
              Lập hóa đơn mới <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* HÀNG 3: GRID 2 CỘT (Đơn hàng gần đây & Cảnh báo Công nợ) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cột trái: Đơn hàng gần đây */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Đơn hàng gần đây</h3>
                <p className="text-[11px] text-slate-400">Lịch sử xuất hóa đơn bán lẻ tại quầy</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('pos')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
            >
              Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Chưa có đơn hàng nào được tạo.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/60 text-slate-500 border-b border-slate-100 font-semibold">
                    <th className="py-2.5 px-4">Mã HĐ</th>
                    <th className="py-2.5 px-3">Khách hàng</th>
                    <th className="py-2.5 px-3 text-right">Tổng tiền</th>
                    <th className="py-2.5 px-4 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.slice(0, 6).map((order) => {
                    const isPaid = order.status === 'paid';
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-slate-900">{order.invoiceCode}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {formatDate(order.createdAt)}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{order.customerName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{order.customerPhone}</div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="font-mono font-bold text-slate-900">{formatVND(order.finalAmount)}</div>
                          <div className="text-[10px] text-slate-400">
                            {order.paymentMethod === 'transfer' ? 'Chuyển khoản' : order.paymentMethod === 'debt' ? 'Ghi nợ' : 'Tiền mặt'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isPaid ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                              Đã thu đủ
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/50">
                              Nợ: {formatVND(order.debtAmount)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Cột phải: Cảnh báo Công nợ (Khách hàng & NCC) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Cảnh báo Công nợ</h3>
                <p className="text-[11px] text-slate-400">
                  Các khoản nợ sắp đến hạn hoặc đã quá hạn cần đối soát
                </p>
              </div>
            </div>
            {debtsAlert?.summary.overdueCount ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 animate-pulse font-mono">
                {debtsAlert.summary.overdueCount} quá hạn
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 font-mono">
                {debtsAlert?.allAlerts.length || 0} khoản
              </span>
            )}
          </div>

          <div className="flex-1 overflow-x-auto">
            {!debtsAlert || debtsAlert.allAlerts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Không có khoản nợ nào cần thu hồi hoặc thanh toán.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/60 text-slate-500 border-b border-slate-100 font-semibold">
                    <th className="py-2.5 px-4">Đối tác / Khách</th>
                    <th className="py-2.5 px-3">Loại nợ</th>
                    <th className="py-2.5 px-3 text-right">Còn nợ</th>
                    <th className="py-2.5 px-4 text-center">Hạn chót</th>
                    <th className="py-2.5 px-3 text-right">Xử lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {debtsAlert.allAlerts.slice(0, 6).map((debt) => {
                    const isOverdue = debt.isOverdue;
                    const isCustomer = debt.type === 'customer';

                    return (
                      <tr key={debt.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 line-clamp-1 max-w-[150px]">
                            {debt.entityName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{debt.referenceCode}</div>
                        </td>
                        <td className="py-3 px-3">
                          {isCustomer ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                              <UserCheck className="w-3 h-3" /> Thu khách
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700">
                              <Building2 className="w-3 h-3" /> Trả NCC
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="font-mono font-bold text-slate-900">
                            {formatVND(debt.remainingDebt)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Tổng: {formatVND(debt.totalDebt)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="font-mono text-[11px] text-slate-700">
                            {formatDateOnly(debt.dueDate)}
                          </div>
                          {isOverdue ? (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                              Quá hạn {Math.abs(debt.daysUntilDue)} ngày
                            </span>
                          ) : debt.daysUntilDue <= 7 ? (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                              Còn {debt.daysUntilDue} ngày
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Bình thường</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setPayDebtModalItem(debt);
                              setPayAmount(debt.remainingDebt);
                              setPayNote('');
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[10px] font-semibold transition-all shadow-xs"
                          >
                            Thu/Trả
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
            <span>
              Tổng nợ quá hạn: <strong className="text-rose-600 font-mono">{formatVND(debtsAlert?.summary.totalOverdueAmount || 0)}</strong>
            </span>
            <button
              onClick={() => onNavigateTab('debts')}
              className="text-slate-900 hover:text-emerald-700 font-semibold flex items-center gap-1 transition-colors"
            >
              Sổ công nợ chi tiết <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: TẠO ĐƠN NHẬP HÀNG NHANH CHO MẶT HÀNG SẮP HẾT */}
      {/* ========================================================= */}
      {restockModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Tạo đơn nhập hàng nhanh</h3>
                  <p className="text-[11px] text-slate-500">Cập nhật số lượng tồn kho tức thì</p>
                </div>
              </div>
              <button
                onClick={() => setRestockModalItem(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="text-xs font-bold text-slate-900">{restockModalItem.name}</div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Mã SKU: <strong className="font-mono text-slate-700">{restockModalItem.sku}</strong></span>
                  <span>Hiện có: <strong className="font-mono text-rose-600">{restockModalItem.stockQuantity}</strong> {restockModalItem.unit}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                  <span>Giá vốn nhập: <strong className="font-mono text-slate-700">{formatVND(restockModalItem.importPrice)}</strong></span>
                  <span>Ngưỡng tối thiểu: <strong className="font-mono text-slate-700">{restockModalItem.minStockAlert}</strong></span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Số lượng cần nhập thêm ({restockModalItem.unit}):</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Đề xuất: +{restockModalItem.suggestedRestock} {restockModalItem.unit}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={restockQuantity}
                    onChange={(e) => setRestockQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <div className="flex gap-1">
                    {[5, 10, 20].map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => setRestockQuantity(qty)}
                        className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-700 transition-colors"
                      >
                        +{qty}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-800 space-y-1">
                <div className="flex justify-between">
                  <span>Tồn kho sau khi nhập:</span>
                  <span className="font-mono font-bold">
                    {restockModalItem.stockQuantity + Number(restockQuantity)} {restockModalItem.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Ước tính tiền hàng nhập:</span>
                  <span className="font-mono font-bold">
                    {formatVND(restockModalItem.importPrice * Number(restockQuantity))}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRestockModalItem(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmRestock}
                disabled={restockSubmitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {restockSubmitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Xác nhận nhập kho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: THU NỢ / THANH TOÁN NỢ NHANH */}
      {/* ========================================================= */}
      {payDebtModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {payDebtModalItem.type === 'customer' ? 'Thu nợ khách hàng' : 'Thanh toán nợ nhà cung cấp'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Mã tham chiếu: {payDebtModalItem.referenceCode}</p>
                </div>
              </div>
              <button
                onClick={() => setPayDebtModalItem(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="text-xs font-bold text-slate-900">{payDebtModalItem.entityName}</div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Hạn chót: <strong className="font-mono text-slate-700">{formatDateOnly(payDebtModalItem.dueDate)}</strong></span>
                  <span>Tổng nợ: <strong className="font-mono text-slate-700">{formatVND(payDebtModalItem.totalDebt)}</strong></span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500">Số tiền còn nợ:</span>
                  <span className="font-mono font-bold text-rose-600 text-sm">
                    {formatVND(payDebtModalItem.remainingDebt)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Số tiền thanh toán kỳ này (VNĐ):</span>
                  <button
                    type="button"
                    onClick={() => setPayAmount(payDebtModalItem.remainingDebt)}
                    className="text-[11px] text-emerald-600 hover:underline font-semibold"
                  >
                    Trả toàn bộ
                  </button>
                </label>
                <input
                  type="number"
                  min="1000"
                  max={payDebtModalItem.remainingDebt}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Ghi chú đối soát:</label>
                <input
                  type="text"
                  placeholder="VD: Khách chuyển khoản VCB, đã nhận tiền mặt..."
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPayDebtModalItem(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmPayDebt}
                disabled={paySubmitting || payAmount <= 0}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {paySubmitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Xác nhận thanh toán
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
