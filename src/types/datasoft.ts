/**
 * DATASOFT Data Types & RBAC Definitions
 * Tương thích với 11 file JSON trong thư mục DATASOFT
 */

export type UserRole = 'admin' | 'manager' | 'sales' | 'technician';

export interface User {
  id: string;
  username: string;
  passwordHash?: string;
  salt?: string;
  fullName: string;
  role: UserRole;
  phone: string;
  active: boolean;
  createdAt: string;
  permissions?: string[];
}

export type RepairStatus =
  | 'received'          // Tiếp nhận mới
  | 'diagnosing'        // Đang kiểm tra / Chuẩn đoán lỗi
  | 'waiting_approval'  // Đã báo giá, chờ khách đồng ý
  | 'waiting_parts'     // Chờ linh kiện về
  | 'repairing'         // Đang tiến hành sửa chữa
  | 'testing'           // Sửa xong, đang test máy (QA)
  | 'completed'         // Đã hoàn tất sửa, sẵn sàng trả máy
  | 'delivered'         // Đã giao máy cho khách, thu tiền
  | 'cancelled';        // Khách hủy / Không sửa được

export interface RepairPartUsed {
  productId: string;
  productName: string;
  imei?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  addedAt: string;
}

export interface RepairTicket {
  id: string;
  ticketCode: string;          // Ví dụ: SC-202610-001
  customerId: string;
  customerName: string;
  customerPhone: string;
  deviceName: string;          // Ví dụ: Laptop Dell XPS 15 9500
  model: string;
  deviceSerialImei: string;     // Số Serial / Service Tag / IMEI máy
  passCode?: string;           // Mật khẩu mở máy
  issueDescription: string;    // Mô tả lỗi khách báo
  technicalDiagnosis?: string; // Chuẩn đoán của kỹ thuật
  accessories: string;         // Phụ kiện kèm (Sạc, balo, chuột, túi...)
  deviceCondition: string;     // Tình trạng ngoại quan (xước góc, móp đáy...)
  status: RepairStatus;
  technicianId?: string;       // ID kỹ thuật viên phụ trách
  technicianName?: string;
  estimatedCost: number;       // Dự toán chi phí ban đầu
  finalCost: number;           // Tổng chi phí sửa chữa & linh kiện
  depositAmount: number;       // Tiền khách đã đặt cọc
  partsUsed: RepairPartUsed[]; // Linh kiện xuất kho dùng cho máy này
  receivedDate: string;
  estimatedCompletionDate?: string;
  completedDate?: string;
  deliveredDate?: string;
  warrantyPeriodMonths: number;// Bảo hành dịch vụ sửa chữa (thường 1 - 3 tháng)
  notes?: string;
}

export interface Product {
  id: string;
  sku: string;                 // Mã hàng hóa (ví dụ: SSD-KS-500G)
  name: string;
  categoryId: string;
  categoryName?: string;
  importPrice: number;         // Giá vốn nhập kho (ẩn với Sales)
  costPrice?: number;          // Giá vốn (alias phục vụ kiểm thử và tương thích)
  retailPrice: number;         // Giá bán lẻ
  wholesalePrice: number;      // Giá bán buôn/kỹ thuật
  stockQuantity: number;
  minStockAlert: number;       // Ngưỡng cảnh báo tồn kho tối thiểu
  unit: string;                // Đơn vị tính: Chiếc, Bộ, Cây, Tuýp
  hasSerialImei: boolean;      // Có quản lý theo số Serial/IMEI không
  warrantyMonths: number;      // Thời gian bảo hành (tháng)
  description?: string;
  supplierId?: string;
}

export interface ImeiRecord {
  id: string;
  imei: string;                // Số IMEI hoặc Serial Number
  productId: string;
  productName: string;
  status: 'in_stock' | 'sold' | 'faulty' | 'repairing';
  invoiceId?: string;
  repairTicketId?: string;
  supplierId?: string;
  purchaseDate: string;
  exportDate?: string;
  note?: string;
}

export interface Customer {
  id: string;
  code: string;                // Mã khách: KH-0001
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalSpent: number;          // Tổng tiền đã mua sắm/sửa chữa
  currentDebt: number;         // Công nợ hiện tại
  createdAt: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  imei?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  warrantyMonths: number;
}

export interface Invoice {
  id: string;
  invoiceCode: string;         // HD-202610-001
  customerId: string;
  customerName: string;
  customerPhone: string;
  salesId: string;
  salesName: string;
  items: InvoiceItem[];
  subTotal: number;
  discount: number;
  finalAmount: number;
  paidAmount: number;
  debtAmount: number;
  paymentMethod: 'cash' | 'transfer' | 'debt';
  status: 'paid' | 'partial' | 'debt';
  createdAt: string;
  note?: string;
}

export interface Debt {
  id: string;
  type: 'customer' | 'supplier';
  entityId: string;
  entityName: string;
  entityPhone?: string;
  referenceCode: string;       // Mã hóa đơn hoặc phiếu nhập
  totalDebt: number;
  paidAmount: number;
  remainingDebt: number;
  dueDate: string;
  status: 'pending' | 'partially_paid' | 'completed' | 'overdue';
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface WarrantyClaim {
  id: string;
  claimDate: string;
  issueDescription: string;
  actionTaken: string;
  returnedDate?: string;
}

export interface Warranty {
  id: string;
  warrantyCode: string;        // BH-202610-001
  invoiceId?: string;
  repairTicketId?: string;
  productId?: string;
  productName: string;
  imei: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'voided';
  claims: WarrantyClaim[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  type: 'product' | 'service';
  description?: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  currentDebt: number;
}

export interface StoreSettings {
  storeName: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  taxId?: string;
  bankName: string;
  bankAccount: string;
  bankOwner: string;
  invoiceFooterNote: string;
  repairTicketFooterNote: string;
  warrantyPolicy: string;
  lastBackupDate?: string;
}

export interface AuthSession {
  user: User;
  token: string;
}

export interface PcBuildItem {
  categoryId: string;
  categoryName?: string;
  productId: string;
  productName: string;
  sku?: string;
  imei?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  warrantyMonths?: number;
}

export interface PcBuild {
  id: string;
  buildCode: string;
  buildName: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  creatorId: string;
  creatorName?: string;
  items: PcBuildItem[];
  totalPrice: number;
  discount: number;
  finalPrice: number;
  note?: string;
  createdAt: string;
  status: 'draft' | 'converted_to_invoice';
  convertedInvoiceCode?: string;
}

export interface PrintTemplate {
  id: string;
  templateName: string;
  type: 'invoice' | 'repair_ticket' | 'quote';
  htmlContent: string;
  isDefault: boolean;
  variables: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface PrintHistoryItem {
  id: string;
  documentId: string;
  documentCode: string;
  documentType: 'invoice' | 'repair_ticket' | 'pc_build';
  templateId?: string;
  printedBy: string;
  printedByName: string;
  printedAt: string;
}

export interface DashboardOverview {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  totalOrders: number;
  monthRevenue: number;
  monthProfit: number;
  monthCost: number;
  monthOrders: number;
  monthMargin: number;
  totalDebtReceivable: number;
  totalDebtPayable: number;
  activeRepairsCount: number;
  completedRepairsCount: number;
  lowStockCount: number;
  lastUpdated: string;
}

export interface LowStockItem {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryName: string;
  stockQuantity: number;
  minStockAlert: number;
  unit: string;
  importPrice: number;
  retailPrice: number;
  suggestedRestock: number;
  severity: 'critical' | 'warning';
}

export interface TopSellingItem {
  productId: string;
  sku: string;
  name: string;
  categoryName: string;
  quantitySold: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  orderCount: number;
  currentStock: number;
  unit: string;
}

export interface DebtAlertItem extends Debt {
  isOverdue: boolean;
  daysUntilDue: number;
  urgency: 'overdue' | 'upcoming_soon' | 'normal';
}

export interface DebtsAlertData {
  summary: {
    overdueCount: number;
    upcomingCount: number;
    totalOverdueAmount: number;
    totalUpcomingAmount: number;
    totalCustomerDebt: number;
    totalSupplierDebt: number;
  };
  customerDebts: DebtAlertItem[];
  supplierDebts: DebtAlertItem[];
  allAlerts: DebtAlertItem[];
}

export interface PurchaseReceiptItem {
  productId: string;
  productName: string;
  sku?: string;
  quantity: number;
  importPrice: number;
  total: number;
  imeis?: string[];
}

export interface PurchaseReceipt {
  id: string;
  receiptCode: string;
  sourceType: 'supplier' | 'customer';
  supplierId?: string;
  supplierName: string;
  supplierPhone?: string;
  items: PurchaseReceiptItem[];
  totalAmount: number;
  paidAmount: number;
  debtAmount: number;
  paymentMethod: 'cash' | 'transfer' | 'debt';
  status: 'paid' | 'partial' | 'debt';
  note?: string;
  createdAt: string;
  createdBy: string;
  createdByName?: string;
}

export interface CustomerPurchasedItem {
  productId: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  imei?: string;
  invoiceCode: string;
  invoiceId: string;
  purchaseDate: string;
  warrantyMonths: number;
}

export interface CustomerProfileData {
  customer: Customer;
  stats: {
    totalSpent: number;
    totalOrders: number;
    totalRepairs: number;
    currentDebt: number;
    totalPaidDebt: number;
  };
  invoices: Invoice[];
  repairs: RepairTicket[];
  debts: Debt[];
  purchasedItems: CustomerPurchasedItem[];
}

export type DashboardTimeRange = 'week' | 'month' | 'quarter' | 'year';



