import React, { useState } from 'react';
import { ChevronDown, Search, Globe, LogOut, Shield, User } from 'lucide-react';
import type { UserRole, User as AppUser } from '../types/datasoft';

interface HeaderProps {
  currentUser: AppUser | null;
  onSwitchUser: (role: UserRole) => void;
  onLogout: () => void;
  title: string;
  subtitle?: string;
  quickSearchText: string;
  onQuickSearchChange: (text: string) => void;
  onTriggerQuickSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSwitchUser,
  onLogout,
  title,
  subtitle,
  quickSearchText,
  onQuickSearchChange,
  onTriggerQuickSearch,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const roleConfig: Record<UserRole, { label: string; badge: string; desc: string }> = {
    admin: {
      label: 'Quản trị viên (Admin)',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      desc: 'Toàn quyền cấu hình, quản trị tài khoản, backup DATASOFT',
    },
    manager: {
      label: 'Chủ cửa hàng (Manager)',
      badge: 'bg-purple-50 text-purple-700 border-purple-200',
      desc: 'Xem báo cáo doanh thu, công nợ, quản lý kho tổng',
    },
    sales: {
      label: 'Bán hàng (Sales)',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      desc: 'Lên đơn, báo giá, xem tồn kho (ẩn hoàn toàn giá vốn)',
    },
    technician: {
      label: 'Kỹ thuật viên (Tech)',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      desc: 'Tiếp nhận, cập nhật sửa chữa, đề xuất xuất linh kiện',
    },
  };

  const currentRole = currentUser?.role || 'sales';
  const currentInfo = roleConfig[currentRole];

  return (
    <header className="h-14 bg-white/70 backdrop-blur-md border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0 no-print font-sans select-none">
      {/* Title & Path */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 tracking-tight leading-none">{title}</h2>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      {/* Global Quick Search */}
      <div className="flex-1 max-w-sm mx-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onTriggerQuickSearch();
          }}
          className="relative"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 stroke-[1.75]" />
          <input
            type="text"
            placeholder="Tra cứu: Số IMEI, SĐT khách, Mã SC-..."
            value={quickSearchText}
            onChange={(e) => onQuickSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100/70 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-all font-mono placeholder:font-sans placeholder:text-slate-400"
          />
        </form>
      </div>

      {/* Right Controls: Role Switcher & Profile */}
      <div className="flex items-center gap-3">
        {/* Role Switcher Selector */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200/80 hover:border-slate-300 bg-white/90 shadow-2xs text-left text-xs transition-colors cursor-pointer"
          >
            <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px]">
              {currentUser?.fullName.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="font-semibold text-slate-900 leading-tight">
                {currentUser?.fullName}
              </div>
              <div className="text-[10px] text-slate-400 font-mono uppercase">
                {currentInfo.label}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-100 text-xs">
                <p className="font-semibold text-slate-800">Chuyển đổi Vai trò (Demo RBAC)</p>
                <p className="text-[11px] text-slate-500">
                  Thử nghiệm phân quyền tài khoản lập tức
                </p>
              </div>

              <div className="p-1 space-y-1">
                {(['admin', 'manager', 'sales', 'technician'] as UserRole[]).map((r) => {
                  const conf = roleConfig[r];
                  const isCurrent = currentRole === r;
                  return (
                    <button
                      key={r}
                      onClick={() => {
                        onSwitchUser(r);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                        isCurrent ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-slate-900">{conf.label}</span>
                        {isCurrent && <span className="text-[10px] text-emerald-600 font-bold">Hiện tại</span>}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{conf.desc}</p>
                    </button>
                  );
                })}

                <div className="pt-2 border-t mt-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-xl text-xs text-rose-600 hover:bg-rose-50 font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Đăng xuất phiên làm việc
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
