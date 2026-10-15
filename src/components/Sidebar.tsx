import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Cpu,
  Wrench,
  Boxes,
  ShieldCheck,
  Scale,
  FileCode,
  Settings,
  LogOut,
  User,
  HardDrive,
  Truck,
  Users,
  Building2,
} from 'lucide-react';
import type { UserRole, User as AppUser } from '../types/datasoft';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: AppUser | null;
  onLogout: () => void;
  dbFilesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onLogout,
  dbFilesCount = 14,
}) => {
  const role = currentUser?.role || 'sales';

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Bảng Điều Khiển Quản Lý',
      icon: LayoutDashboard,
      roles: ['admin', 'manager', 'sales', 'technician'] as UserRole[],
    },
    {
      id: 'pos',
      label: 'Quầy Thu Ngân (POS)',
      icon: ShoppingCart,
      roles: ['admin', 'manager', 'sales'] as UserRole[],
    },
    {
      id: 'purchasing',
      label: 'Nhập Kho Hàng',
      icon: Truck,
      roles: ['admin', 'manager'] as UserRole[],
    },
    {
      id: 'suppliers',
      label: 'Nhà Cung Cấp',
      icon: Building2,
      roles: ['admin', 'manager'] as UserRole[],
    },
    {
      id: 'inventory',
      label: 'Kho Hàng & IMEI',
      icon: Boxes,
      roles: ['admin', 'manager', 'sales', 'technician'] as UserRole[],
    },
    {
      id: 'customers',
      label: 'Khách Hàng & CRM',
      icon: Users,
      roles: ['admin', 'manager', 'sales', 'technician'] as UserRole[],
    },
    {
      id: 'pc-builder',
      label: 'Build Cấu Hình PC',
      icon: Cpu,
      roles: ['admin', 'manager', 'sales', 'technician'] as UserRole[],
    },
    {
      id: 'repairs',
      label: 'Tiếp Nhận Sửa Chữa',
      icon: Wrench,
      roles: ['admin', 'manager', 'sales', 'technician'] as UserRole[],
    },
    {
      id: 'warranty',
      label: 'Tra Cứu Bảo Hành',
      icon: ShieldCheck,
      roles: ['admin', 'manager', 'sales', 'technician'] as UserRole[],
    },
    {
      id: 'debts',
      label: 'Sổ Theo Dõi Công Nợ',
      icon: Scale,
      roles: ['admin', 'manager'] as UserRole[],
    },
    {
      id: 'print-templates',
      label: 'Quản Lý Mẫu In',
      icon: FileCode,
      roles: ['admin', 'manager'] as UserRole[],
    },
    {
      id: 'admin',
      label: 'Hệ Thống & Ubuntu',
      icon: Settings,
      roles: ['admin', 'manager'] as UserRole[],
    },
  ];

  const visibleItems = menuItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/80 flex flex-col shrink-0 select-none no-print font-sans">
      {/* macOS Window Controls (Traffic Lights) & Header */}
      <div className="p-4 border-b border-slate-200/60">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]/40 shadow-xs" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]/40 shadow-xs" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]/40 shadow-xs" />
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-xs text-white font-bold flex items-center justify-center text-sm">
            TP
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-slate-900 text-xs tracking-tight truncate leading-tight">
              PHẦN MỀM THỊNH PHÁT
            </h1>
            <p className="text-[10px] text-slate-500 font-mono truncate">DATASOFT · LAN SERVER</p>
          </div>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Phân Hệ Chức Năng
        </div>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0 stroke-[1.75]" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Session & Logout Footer */}
      <div className="p-3 border-t border-slate-200/70 bg-slate-50/50 space-y-2">
        {currentUser && (
          <div className="p-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0">
                {currentUser.fullName.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 truncate leading-tight">
                  {currentUser.fullName}
                </div>
                <div className="text-[10px] font-mono text-slate-400 uppercase">
                  {currentUser.role}
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
              title="Đăng xuất"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="px-2 text-[10px] text-slate-400 font-mono flex items-center justify-between">
          <span className="flex items-center gap-1">
            <HardDrive className="w-3 h-3 text-emerald-600" />
            DATASOFT JSON
          </span>
          <span className="text-emerald-700 font-semibold">{dbFilesCount} files OK</span>
        </div>
      </div>
    </aside>
  );
};
