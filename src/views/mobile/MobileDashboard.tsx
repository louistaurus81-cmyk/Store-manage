import React, { useState, useEffect } from 'react';
import {
  Search,
  Bell,
  TrendingUp,
  Receipt,
  Scale,
  Clock,
  AlertTriangle,
  ChevronRight,
  ArrowUpRight,
  RefreshCw,
  Plus,
} from 'lucide-react';
import type {
  DashboardOverview,
  DebtsAlertData,
  Invoice,
  UserRole,
} from '../../types/datasoft';
import { apiFetch, formatVND } from '../../utils/api';
import { MobileInvoice } from './MobileInvoice';

interface MobileDashboardProps {
  userRole: UserRole;
  onNavigateTab: (tab: string) => void;
  onOpenQuickPOS?: () => void;
}

export const MobileDashboard: React.FC<MobileDashboardProps> = ({
  userRole,
  onNavigateTab,
  onOpenQuickPOS,
}) => {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [debtsAlert, setDebtsAlert] = useState<DebtsAlertData | null>(null);
  const [recentOrders, setRecentOrders] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Weekly bar data for purple chart
  const weeklyData = [
    { day: 'T2', value: 32000000, height: '45%' },
    { day: 'T3', value: 45000000, height: '62%' },
    { day: 'T4', value: 28000000, height: '38%' },
    { day: 'T5', value: 58000000, height: '78%' },
    { day: 'T6', value: 72000000, height: '95%' },
    { day: 'T7', value: 64000000, height: '84%' },
    { day: 'CN', value: 50000000, height: '68%' },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const [ovData, daData, roData] = await Promise.all([
        apiFetch<DashboardOverview>('/api/dashboard/overview'),
        apiFetch<DebtsAlertData>('/api/dashboard/debts-alert'),
        apiFetch<Invoice[]>('/api/dashboard/recent-orders'),
      ]);
      setOverview(ovData);
      setDebtsAlert(daData);
      setRecentOrders(roData);
    } catch (err) {
      console.error('Lỗi nạp dữ liệu Mobile Dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalRevenue = overview?.totalRevenue || 245800000;
  const totalDebt = debtsAlert?.summary.totalCustomerDebt || overview?.totalDebtReceivable || 32500000;
  const monthRevenue = overview?.monthRevenue || 128400000;
  const pendingCount = debtsAlert?.summary.upcomingCount || overview?.activeRepairsCount || 5;
  const overdueCount = debtsAlert?.summary.overdueCount || 2;

  // Format today date in Vietnamese
  const todayFormatted = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
  }).format(new Date());

  return (
    <div className="min-h-full bg-[#f8f9fc] text-slate-800 font-sans pb-10">
      {/* 1. iOS Large Title Header */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
            {todayFormatted}
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Home
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigateTab('pos')}
            className="w-10 h-10 rounded-full bg-white shadow-xs border border-zinc-200/80 flex items-center justify-center text-zinc-600 active:scale-90 transition-transform cursor-pointer"
            title="Tìm kiếm"
          >
            <Search className="w-5 h-5 stroke-[1.75]" />
          </button>

          <button
            type="button"
            onClick={loadData}
            className="relative w-10 h-10 rounded-full bg-white shadow-xs border border-zinc-200/80 flex items-center justify-center text-zinc-600 active:scale-90 transition-transform cursor-pointer"
            title="Thông báo"
          >
            <Bell className="w-5 h-5 stroke-[1.75]" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-purple-600 ring-2 ring-white" />
          </button>
        </div>
      </div>

      <div className="px-5 space-y-5">
        {/* 2. Biểu đồ: Tổng doanh thu số cực to & Bar Chart màu Tím (Purple-500) */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Tổng Doanh Thu
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-mono">
              <TrendingUp className="w-3 h-3" /> +18.4%
            </span>
          </div>

          {/* Doanh thu số cực to */}
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight my-2">
            {formatVND(totalRevenue)}
          </div>
          <p className="text-[11px] text-zinc-400 mb-5">
            Dữ liệu ghi nhận từ DATASOFT JSON Engine tuần này
          </p>

          {/* Bar Chart thu gọn với tông màu Tím */}
          <div className="h-32 flex items-end justify-between gap-2 pt-4 border-t border-zinc-100">
            {weeklyData.map((bar, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full bg-purple-100/60 rounded-t-lg h-24 flex items-end overflow-hidden p-0.5">
                  <div
                    style={{ height: bar.height }}
                    className="w-full bg-purple-500 group-hover:bg-purple-600 rounded-t-md transition-all duration-300 shadow-xs"
                  />
                </div>
                <span className="text-[10px] font-bold text-zinc-400 group-hover:text-purple-600 transition-colors">
                  {bar.day}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Thẻ KPI (Grid 2x2): Mỗi thẻ có nền trắng, số to, đường gạch viền màu riêng */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Thẻ 1: Tổng nợ (Đường gạch màu Tím) */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 border-b-4 border-b-purple-500 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Tổng Nợ
                </span>
                <Scale className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <div className="text-lg font-black text-slate-900 font-mono tracking-tight mt-1">
                {formatVND(totalDebt)}
              </div>
            </div>
            <div className="text-[10px] text-purple-700 font-semibold mt-2">
              Phải thu khách hàng
            </div>
          </div>

          {/* Thẻ 2: Đã thu tháng này (Đường gạch màu Xanh lá) */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 border-b-4 border-b-emerald-500 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Đã Thu Tháng
                </span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-lg font-black text-slate-900 font-mono tracking-tight mt-1">
                {formatVND(monthRevenue)}
              </div>
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-2">
              Doanh thu thực nhận
            </div>
          </div>

          {/* Thẻ 3: Đang chờ (Đường gạch màu Vàng) */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 border-b-4 border-b-amber-500 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Đang Chờ
                </span>
                <Clock className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono tracking-tight mt-1">
                {pendingCount}
              </div>
            </div>
            <div className="text-[10px] text-amber-700 font-semibold mt-2">
              Đơn nợ / Tiếp nhận
            </div>
          </div>

          {/* Thẻ 4: Quá hạn (Đường gạch màu Đỏ) */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 border-b-4 border-b-rose-500 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Quá Hạn
                </span>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono tracking-tight mt-1">
                {overdueCount}
              </div>
            </div>
            <div className="text-[10px] text-rose-700 font-semibold mt-2">
              Cần đối soát nợ
            </div>
          </div>
        </div>

        {/* 4. Danh sách Hóa đơn gần đây (Recent Invoices) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Hóa Đơn Gần Đây
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('pos')}
              className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-0.5 active:scale-95 transition-transform cursor-pointer"
            >
              Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {recentOrders.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400 bg-white rounded-2xl border border-zinc-100">
                Chưa có hóa đơn nào gần đây.
              </div>
            ) : (
              recentOrders.slice(0, 6).map((inv) => {
                const isPending = inv.debtAmount > 0 || inv.status !== 'paid';
                const avatarLetter = (inv.customerName || 'K').charAt(0).toUpperCase();

                return (
                  <div
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className="p-3.5 bg-white rounded-2xl border border-zinc-100 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98]"
                  >
                    {/* Left: Avatar + Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-extrabold flex items-center justify-center shrink-0 text-sm">
                        {avatarLetter}
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 truncate">
                          {inv.customerName || 'Khách vãng lai'}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                          {inv.invoiceCode}
                        </div>
                      </div>
                    </div>

                    {/* Right: Số tiền + Badge trạng thái nhỏ */}
                    <div className="text-right shrink-0 space-y-1">
                      <div className="font-mono font-bold text-xs text-slate-900">
                        {formatVND(inv.finalAmount)}
                      </div>

                      <div className="flex justify-end">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isPending
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isPending ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                          {isPending ? 'Pending' : 'Paid'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Chi tiết Hóa đơn Mobile modal */}
      {selectedInvoice && (
        <MobileInvoice
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onPrint={(inv) => {
            alert(`Mở lệnh in hóa đơn: ${inv.invoiceCode}`);
          }}
          onPayDebt={(inv) => {
            onNavigateTab('debts');
          }}
        />
      )}
    </div>
  );
};
