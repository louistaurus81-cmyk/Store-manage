import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Users,
  Settings,
  Plus,
} from 'lucide-react';

interface FloatingBottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenQuickPOS?: () => void;
}

export const FloatingBottomNav: React.FC<FloatingBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenQuickPOS,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: LayoutDashboard,
    },
    {
      id: 'pos',
      label: 'Hóa đơn',
      icon: Receipt,
    },
    {
      id: 'customers',
      label: 'Khách hàng',
      icon: Users,
    },
    {
      id: 'admin',
      label: 'Cài đặt',
      icon: Settings,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-4 inset-x-4 z-50 max-w-sm mx-auto block md:hidden select-none no-print"
    >
      <div className="bg-white/85 backdrop-blur-md rounded-full shadow-2xl shadow-purple-950/15 border border-zinc-200/70 px-4 py-2 flex items-center justify-between">
        {/* Nav item 1: Home */}
        {(() => {
          const item = navItems[0];
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-full transition-all duration-150 active:scale-90 cursor-pointer ${
                isActive
                  ? 'text-purple-600 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.5]'}`} />
              <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
            </button>
          );
        })()}

        {/* Nav item 2: Hóa đơn */}
        {(() => {
          const item = navItems[1];
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-full transition-all duration-150 active:scale-90 cursor-pointer ${
                isActive
                  ? 'text-purple-600 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.5]'}`} />
              <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
            </button>
          );
        })()}

        {/* Nút FAB (Floating Action Button) hình dấu + màu tím nổi bật */}
        <div className="relative -top-3">
          <button
            type="button"
            onClick={() => {
              if (onOpenQuickPOS) onOpenQuickPOS();
              else onSelectTab('pos');
            }}
            title="Tạo đơn hàng / POS mới"
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-purple-600/35 border-2 border-white transition-all duration-150 active:scale-90 cursor-pointer"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Nav item 3: Khách hàng */}
        {(() => {
          const item = navItems[2];
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-full transition-all duration-150 active:scale-90 cursor-pointer ${
                isActive
                  ? 'text-purple-600 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.5]'}`} />
              <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
            </button>
          );
        })()}

        {/* Nav item 4: Cài đặt */}
        {(() => {
          const item = navItems[3];
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-full transition-all duration-150 active:scale-90 cursor-pointer ${
                isActive
                  ? 'text-purple-600 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.5]'}`} />
              <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
            </button>
          );
        })()}
      </div>
    </nav>
  );
};
