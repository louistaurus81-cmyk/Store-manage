/**
 * PHẦN MỀM THỊNH PHÁT - DATASOFT
 * Hệ thống Quản lý Cửa hàng Buôn bán & Sửa chữa Máy tính
 * Phong cách UI/UX macOS hiện đại, Authentication & Route Protection
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './views/LoginView';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './views/DashboardView';
import { PosView } from './views/PosView';
import { PcBuilderView } from './views/PcBuilderView';
import { RepairsView } from './views/RepairsView';
import { InventoryView } from './views/InventoryView';
import { PurchasingView } from './views/PurchasingView';
import { CustomersView } from './views/CustomersView';
import { SuppliersView } from './views/SuppliersView';
import { SalesView } from './views/SalesView';
import { WarrantyView } from './views/WarrantyView';
import { DebtsView } from './views/DebtsView';
import { PrintTemplatesView } from './views/PrintTemplatesView';
import { AdminView } from './views/AdminView';
import { Layout } from './components/Layout';
import { MobileDashboard } from './views/mobile/MobileDashboard';
import { MobilePOS } from './views/mobile/MobilePOS';
import type { UserRole } from './types/datasoft';

function MainApp() {
  const { user, isAuthenticated, isLoading, logout, switchRoleDemo } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('pos'); // Default to POS as requested!
  const [quickSearchText, setQuickSearchText] = useState('');
  const [targetRepairId, setTargetRepairId] = useState<string | undefined>(undefined);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#f5f5f7] font-sans">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-md text-white font-bold flex items-center justify-center text-lg animate-pulse mb-3">
          TP
        </div>
        <div className="text-xs font-semibold text-slate-600">Đang khởi động PHẦN MỀM THỊNH PHÁT...</div>
        <div className="text-[11px] text-slate-400 font-mono mt-1">Kết nối DATASOFT JSON Engine</div>
      </div>
    );
  }

  // YÊU CẦU 2: Route Protection - Chuyển hướng về trang Login nếu chưa đăng nhập
  if (!isAuthenticated || !user) {
    return <LoginView />;
  }

  const handleSelectRepairFromDashboard = (ticketId: string) => {
    setTargetRepairId(ticketId);
    setCurrentTab('repairs');
  };

  const handleTriggerQuickSearch = () => {
    if (!quickSearchText.trim()) return;
    if (quickSearchText.toUpperCase().startsWith('SC-')) {
      setCurrentTab('repairs');
    } else {
      setCurrentTab('warranty');
    }
  };

  const tabTitles: Record<string, { title: string; subtitle: string }> = {
    pos: {
      title: 'Quầy Thu Ngân (POS) & Giao Dịch Bán Hàng',
      subtitle: 'Xuất hóa đơn bán lẻ, quản lý số Serial/IMEI và trừ tồn kho trực tiếp',
    },
    purchasing: {
      title: 'Quản Lý Nhập Kho Hàng (Goods Receipt)',
      subtitle: 'Tạo phiếu nhập từ nhà cung cấp/khách lẻ, sinh số Serial/IMEI và hạch toán công nợ',
    },
    suppliers: {
      title: 'Quản Trị Nhà Cung Cấp & Đối Tác Nguồn Hàng',
      subtitle: 'Quản lý thông tin phân phối, lịch sử phiếu nhập kho và đối soát công nợ phải trả',
    },
    customers: {
      title: 'Hồ Sơ Khách Hàng & Tra Cứu Giao Dịch (CRM)',
      subtitle: 'Quản lý thông tin liên hệ, lịch sử mua hàng, sửa chữa và công nợ chi tiết',
    },
    'pc-builder': {
      title: 'Xây Dựng Cấu Hình PC (PC Builder)',
      subtitle: 'Lắp ráp linh kiện theo slot, ước tính công suất nguồn Wattage và chuyển đổi sang hóa đơn',
    },
    dashboard: {
      title: 'Bảng Điều Khiển Quản Lý (Owner Dashboard)',
      subtitle: 'Giám sát chỉ số tài chính, lợi nhuận gộp thực tế, cảnh báo kho và rủi ro công nợ',
    },
    repairs: {
      title: 'Tiếp Nhận Sửa Chữa & Bảo Hành Máy Tính',
      subtitle: 'Quy trình tiếp nhận, chuẩn đoán lỗi, xuất linh kiện kho và bàn giao máy',
    },
    inventory: {
      title: 'Kho Hàng & Lịch Sử Serial / IMEI',
      subtitle: 'Quản lý danh mục linh kiện, tra cứu serial và ẩn giá vốn theo quyền Sales',
    },
    warranty: {
      title: 'Tra Cứu Sổ Bảo Hành & Lịch Sử Sửa Chữa',
      subtitle: 'Kiểm tra bảo hành theo số Serial/IMEI hoặc số điện thoại khách hàng',
    },
    debts: {
      title: 'Sổ Theo Dõi Công Nợ Khách Hàng & Nhà Cung Cấp',
      subtitle: 'Hạch toán thu nợ bán trả góp và trả nợ linh kiện nhà cung cấp',
    },
    'print-templates': {
      title: 'Quản Lý Mẫu In HTML/CSS & Nhật Ký In',
      subtitle: 'Tùy biến hóa đơn, phiếu sửa chữa và theo dõi lịch sử bản in chống gian lận',
    },
    admin: {
      title: 'Quản Trị Hệ Thống DATASOFT & Cấu Hình Ubuntu',
      subtitle: 'Kiểm tra trạng thái 14 file JSON, quản trị tài khoản RBAC và lệnh systemd',
    },
  };

  const currentHeaderInfo = tabTitles[currentTab] || tabTitles.pos;

  return (
    <Layout
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      currentUser={user}
      onLogout={logout}
      onSwitchRole={switchRoleDemo}
      quickSearchText={quickSearchText}
      onQuickSearchChange={setQuickSearchText}
      onTriggerQuickSearch={handleTriggerQuickSearch}
      title={currentHeaderInfo.title}
      subtitle={currentHeaderInfo.subtitle}
      onOpenQuickPOS={() => setCurrentTab('pos')}
    >
      {/* 1. POS View: Responsive Mobile POS (< 768px) vs Desktop POS (>= 768px) */}
      {currentTab === 'pos' && (
        <>
          <div className="block md:hidden">
            <MobilePOS
              onNavigateTab={setCurrentTab}
            />
          </div>
          <div className="hidden md:block">
            <PosView onNavigateToTab={setCurrentTab} />
          </div>
        </>
      )}

      {currentTab === 'purchasing' && (
        <PurchasingView userRole={user.role} onNavigateToTab={setCurrentTab} />
      )}

      {currentTab === 'suppliers' && (
        <SuppliersView userRole={user.role} onNavigateToTab={setCurrentTab} />
      )}

      {currentTab === 'customers' && (
        <CustomersView userRole={user.role} onNavigateToTab={setCurrentTab} />
      )}

      {currentTab === 'pc-builder' && <PcBuilderView />}

      {/* 2. Dashboard View: Responsive Mobile Dashboard (< 768px) vs Desktop Dashboard (>= 768px) */}
      {currentTab === 'dashboard' && (
        <>
          <div className="block md:hidden">
            <MobileDashboard
              userRole={user.role}
              onNavigateTab={setCurrentTab}
              onOpenQuickPOS={() => setCurrentTab('pos')}
            />
          </div>
          <div className="hidden md:block">
            <DashboardView
              userRole={user.role}
              onNavigateTab={setCurrentTab}
              onSelectRepair={handleSelectRepairFromDashboard}
            />
          </div>
        </>
      )}

      {currentTab === 'repairs' && (
        <RepairsView
          userRole={user.role}
          initialSelectedId={targetRepairId}
          onClearInitialId={() => setTargetRepairId(undefined)}
        />
      )}

      {currentTab === 'inventory' && <InventoryView userRole={user.role} />}

      {currentTab === 'warranty' && <WarrantyView />}

      {currentTab === 'debts' && <DebtsView />}

      {currentTab === 'print-templates' && <PrintTemplatesView />}

      {currentTab === 'admin' && <AdminView />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
