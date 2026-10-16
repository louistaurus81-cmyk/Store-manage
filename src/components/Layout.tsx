import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { FloatingBottomNav } from './FloatingBottomNav';
import type { UserRole, User as AppUser } from '../types/datasoft';

interface LayoutProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: AppUser | null;
  onLogout: () => void;
  onSwitchRole: (role: UserRole) => void;
  quickSearchText: string;
  onQuickSearchChange: (text: string) => void;
  onTriggerQuickSearch: () => void;
  title: string;
  subtitle?: string;
  onOpenQuickPOS?: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onLogout,
  onSwitchRole,
  quickSearchText,
  onQuickSearchChange,
  onTriggerQuickSearch,
  title,
  subtitle,
  onOpenQuickPOS,
  children,
}) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f5f5f7] text-slate-800 font-sans">
      {/* 1. Desktop Sidebar: Ẩn hoàn toàn trên mobile (< 768px), hiện trên desktop (md:) */}
      <div className="hidden md:flex shrink-0 h-full">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={onSelectTab}
          currentUser={currentUser}
          onLogout={onLogout}
          dbFilesCount={14}
        />
      </div>

      {/* 2. Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Desktop Header: Ẩn trên mobile vì mobile đã có iOS Large Title theo mẫu thiết kế */}
        <div className="hidden md:block shrink-0">
          <Header
            currentUser={currentUser}
            onSwitchUser={onSwitchRole}
            onLogout={onLogout}
            title={title}
            subtitle={subtitle}
            quickSearchText={quickSearchText}
            onQuickSearchChange={onQuickSearchChange}
            onTriggerQuickSearch={onTriggerQuickSearch}
          />
        </div>

        {/* View Content: Có padding-bottom (pb-24) trên mobile để không bị che bởi Floating Nav */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
          {children}
        </main>

        {/* 3. Floating Bottom Navigation: Chỉ hiện trên mobile (block md:hidden) */}
        <FloatingBottomNav
          currentTab={currentTab}
          onSelectTab={onSelectTab}
          onOpenQuickPOS={onOpenQuickPOS}
        />
      </div>
    </div>
  );
};
