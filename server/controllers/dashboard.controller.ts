import { Router, Response, NextFunction } from 'express';
import { JsonDatabaseEngine } from '../db/jsonEngine';
import { AuthService, AuthenticatedRequest } from '../services/authService';
import type { Debt, Invoice, Product, RepairTicket } from '../../src/types/datasoft';

export class DashboardController {
  private router: Router;
  private db: JsonDatabaseEngine;
  private authService: AuthService;

  constructor() {
    this.router = Router();
    this.db = JsonDatabaseEngine.getInstance();
    this.authService = new AuthService();
    this.setupRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private setupRoutes() {
    // BẢO MẬT (RBAC): Bọc toàn bộ router qua Auth Middleware.
    // CHỈ cho phép user có role 'admin' hoặc 'manager' truy cập.
    // Chặn triệt để 'sales' và 'technician' để bảo vệ giá nhập kho và lợi nhuận.
    this.router.use(this.authService.authenticateMiddleware);
    this.router.use(this.authService.requireRoles(['admin', 'manager']));

    this.router.get('/overview', this.getOverview.bind(this));
    this.router.get('/low-stock', this.getLowStock.bind(this));
    this.router.get('/top-selling', this.getTopSelling.bind(this));
    this.router.get('/debts-alert', this.getDebtsAlert.bind(this));
    this.router.get('/recent-orders', this.getRecentOrders.bind(this));
  }

  /**
   * API /api/dashboard/overview
   * Tính toán Doanh thu, Lợi nhuận (Doanh thu - Giá vốn nhập kho), Số đơn hàng, Công nợ
   */
  private async getOverview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const [invoices, products, debts, repairs] = await Promise.all([
        this.db.getList<Invoice>('invoices.json'),
        this.db.getList<Product>('products.json'),
        this.db.getList<Debt>('debts.json'),
        this.db.getList<RepairTicket>('repairs.json'),
      ]);

      // Bảng tra cứu giá vốn O(1) theo productId
      const productCostMap = new Map<string, number>();
      for (const p of products) {
        productCostMap.set(p.id, Number(p.importPrice) || 0);
      }

      const timeRange = (req.query.timeRange as string) || 'month';
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      let startDate: Date;
      let timeRangeLabel = '';

      switch (timeRange) {
        case 'week': {
          const startOfWeek = new Date(now);
          const day = startOfWeek.getDay();
          const diffToMonday = (day === 0 ? -6 : 1) - day;
          startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);
          startOfWeek.setHours(0, 0, 0, 0);
          startDate = startOfWeek;
          timeRangeLabel = `Tuần này (${startOfWeek.toLocaleDateString('vi-VN')} - nay)`;
          break;
        }
        case 'quarter': {
          const currentQuarter = Math.floor(currentMonth / 3);
          startDate = new Date(currentYear, currentQuarter * 3, 1, 0, 0, 0);
          timeRangeLabel = `Quý ${currentQuarter + 1}/${currentYear}`;
          break;
        }
        case 'year': {
          startDate = new Date(currentYear, 0, 1, 0, 0, 0);
          timeRangeLabel = `Năm ${currentYear}`;
          break;
        }
        case 'month':
        default: {
          startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0);
          timeRangeLabel = `Tháng ${currentMonth + 1}/${currentYear}`;
          break;
        }
      }

      let totalRevenue = 0;
      let totalCost = 0;
      let rangeRevenue = 0;
      let rangeCost = 0;
      let rangeOrders = 0;

      for (const inv of invoices) {
        const invDate = new Date(inv.createdAt);
        const inSelectedRange = invDate >= startDate && invDate <= now;

        const invFinal = Number(inv.finalAmount) || 0;
        totalRevenue += invFinal;

        let invCost = 0;
        if (Array.isArray(inv.items)) {
          for (const item of inv.items) {
            const qty = Number(item.quantity) || 1;
            const unitCost = productCostMap.has(item.productId)
              ? productCostMap.get(item.productId)!
              : (Number(item.unitPrice) || 0) * 0.7; // Fallback an toàn nếu linh kiện cũ không còn trong kho
            invCost += unitCost * qty;
          }
        }

        totalCost += invCost;

        if (inSelectedRange) {
          rangeRevenue += invFinal;
          rangeCost += invCost;
          rangeOrders += 1;
        }
      }

      const totalProfit = Math.max(0, totalRevenue - totalCost);
      const rangeProfit = Math.max(0, rangeRevenue - rangeCost);
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      const rangeMargin = rangeRevenue > 0 ? (rangeProfit / rangeRevenue) * 100 : 0;

      // Thống kê công nợ
      const customerDebts = debts.filter((d) => d.type === 'customer' && d.status !== 'completed');
      const supplierDebts = debts.filter((d) => d.type === 'supplier' && d.status !== 'completed');
      const totalDebtCustomer = customerDebts.reduce((sum, d) => sum + (Number(d.remainingDebt) || 0), 0);
      const totalDebtSupplier = supplierDebts.reduce((sum, d) => sum + (Number(d.remainingDebt) || 0), 0);

      // Thống kê sửa chữa
      const activeRepairs = repairs.filter(
        (r) => r.status !== 'completed' && r.status !== 'delivered' && r.status !== 'cancelled'
      );
      const completedRepairs = repairs.filter((r) => r.status === 'completed' || r.status === 'delivered');

      // Sản phẩm cảnh báo tồn kho
      const lowStockProducts = products.filter(
        (p) => p.stockQuantity <= p.minStockAlert && p.stockQuantity < 900
      );

      res.json({
        timeRange,
        timeRangeLabel,
        totalRevenue,
        totalCost,
        totalProfit,
        profitMargin: Number(profitMargin.toFixed(1)),
        totalOrders: invoices.length,
        monthRevenue: rangeRevenue,
        monthProfit: rangeProfit,
        monthCost: rangeCost,
        monthOrders: rangeOrders,
        monthMargin: Number(rangeMargin.toFixed(1)),
        rangeRevenue,
        rangeProfit,
        rangeCost,
        rangeOrders,
        rangeMargin: Number(rangeMargin.toFixed(1)),
        totalDebtReceivable: totalDebtCustomer,
        totalDebtPayable: totalDebtSupplier,
        activeRepairsCount: activeRepairs.length,
        completedRepairsCount: completedRepairs.length,
        lowStockCount: lowStockProducts.length,
        lastUpdated: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Lỗi tính toán chỉ số thống kê tổng quan: ' + err.message });
    }
  }

  /**
   * API /api/dashboard/low-stock
   * Lọc từ products.json các mặt hàng sắp hết (stockQuantity <= minStockAlert)
   */
  private async getLowStock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const products = await this.db.getList<Product>('products.json');

      const lowStockItems = products
        .filter((p) => p.stockQuantity <= p.minStockAlert && p.stockQuantity < 900)
        .map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          categoryId: p.categoryId,
          categoryName: p.categoryName || 'Linh kiện',
          stockQuantity: p.stockQuantity,
          minStockAlert: p.minStockAlert,
          unit: p.unit,
          importPrice: p.importPrice,
          retailPrice: p.retailPrice,
          suggestedRestock: Math.max(1, p.minStockAlert * 2 - p.stockQuantity),
          severity: p.stockQuantity === 0 ? 'critical' : 'warning',
        }))
        .sort((a, b) => {
          // Ưu tiên hàng đã hết hẳn (stock = 0) trước, sau đó đến số lượng thấp nhất
          if (a.stockQuantity === 0 && b.stockQuantity > 0) return -1;
          if (b.stockQuantity === 0 && a.stockQuantity > 0) return 1;
          return a.stockQuantity - b.stockQuantity;
        });

      res.json(lowStockItems);
    } catch (err: any) {
      res.status(500).json({ error: 'Lỗi tải danh sách cảnh báo tồn kho: ' + err.message });
    }
  }

  /**
   * API /api/dashboard/top-selling
   * Phân tích invoices.json kết hợp products.json để xếp hạng top 10 mặt hàng bán chạy nhất
   */
  private async getTopSelling(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const [invoices, products] = await Promise.all([
        this.db.getList<Invoice>('invoices.json'),
        this.db.getList<Product>('products.json'),
      ]);

      const productMap = new Map<string, Product>();
      for (const p of products) {
        productMap.set(p.id, p);
      }

      interface SalesRecord {
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

      const salesMap = new Map<string, SalesRecord>();

      for (const inv of invoices) {
        if (!Array.isArray(inv.items)) continue;

        for (const item of inv.items) {
          const prod = productMap.get(item.productId);
          const qty = Number(item.quantity) || 1;
          const rev = Number(item.total) || (Number(item.unitPrice) || 0) * qty;
          const unitCost = prod ? Number(prod.importPrice) || 0 : (Number(item.unitPrice) || 0) * 0.7;
          const cost = unitCost * qty;
          const profit = rev - cost;

          const existing = salesMap.get(item.productId);
          if (existing) {
            existing.quantitySold += qty;
            existing.totalRevenue += rev;
            existing.totalCost += cost;
            existing.totalProfit += profit;
            existing.orderCount += 1;
          } else {
            salesMap.set(item.productId, {
              productId: item.productId,
              sku: prod?.sku || 'SKU-UNKNOWN',
              name: item.productName || prod?.name || 'Sản phẩm linh kiện',
              categoryName: prod?.categoryName || 'Linh kiện máy tính',
              quantitySold: qty,
              totalRevenue: rev,
              totalCost: cost,
              totalProfit: profit,
              orderCount: 1,
              currentStock: prod ? prod.stockQuantity : 0,
              unit: prod?.unit || 'Chiếc',
            });
          }
        }
      }

      // Xếp hạng top 10 theo số lượng bán ra
      const topSelling = Array.from(salesMap.values())
        .sort((a, b) => b.quantitySold - a.quantitySold)
        .slice(0, 10);

      res.json(topSelling);
    } catch (err: any) {
      res.status(500).json({ error: 'Lỗi tổng hợp sản phẩm bán chạy: ' + err.message });
    }
  }

  /**
   * API /api/dashboard/debts-alert
   * Lọc từ debts.json các khoản nợ khách hàng cần thu hoặc nợ nhà cung cấp cần trả sắp đến hạn thanh toán
   */
  private async getDebtsAlert(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const debts = await this.db.getList<Debt>('debts.json');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activeDebts = debts.filter((d) => Number(d.remainingDebt) > 0 && d.status !== 'completed');

      const enrichedDebts = activeDebts.map((d) => {
        let isOverdue = false;
        let daysUntilDue = 0;

        if (d.dueDate) {
          const due = new Date(d.dueDate);
          due.setHours(0, 0, 0, 0);
          const diffTime = due.getTime() - today.getTime();
          daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          isOverdue = daysUntilDue < 0;
        }

        return {
          ...d,
          isOverdue,
          daysUntilDue,
          urgency: isOverdue ? 'overdue' : daysUntilDue <= 7 ? 'upcoming_soon' : 'normal',
        };
      });

      // Sắp xếp: Quá hạn lên đầu tiên, sau đó đến khoản nợ sắp đến hạn gần nhất
      enrichedDebts.sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return a.daysUntilDue - b.daysUntilDue;
      });

      const customerDebts = enrichedDebts.filter((d) => d.type === 'customer');
      const supplierDebts = enrichedDebts.filter((d) => d.type === 'supplier');

      const totalOverdueAmount = enrichedDebts
        .filter((d) => d.isOverdue)
        .reduce((sum, d) => sum + (Number(d.remainingDebt) || 0), 0);

      const totalUpcomingAmount = enrichedDebts
        .filter((d) => !d.isOverdue && d.daysUntilDue <= 7)
        .reduce((sum, d) => sum + (Number(d.remainingDebt) || 0), 0);

      res.json({
        summary: {
          overdueCount: enrichedDebts.filter((d) => d.isOverdue).length,
          upcomingCount: enrichedDebts.filter((d) => !d.isOverdue && d.daysUntilDue <= 7).length,
          totalOverdueAmount,
          totalUpcomingAmount,
          totalCustomerDebt: customerDebts.reduce((sum, d) => sum + Number(d.remainingDebt), 0),
          totalSupplierDebt: supplierDebts.reduce((sum, d) => sum + Number(d.remainingDebt), 0),
        },
        customerDebts,
        supplierDebts,
        allAlerts: enrichedDebts.slice(0, 15),
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Lỗi tải danh sách cảnh báo công nợ: ' + err.message });
    }
  }

  /**
   * API /api/dashboard/recent-orders
   * Lấy danh sách hóa đơn gần đây kèm đầy đủ thông tin thanh toán
   */
  private async getRecentOrders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const invoices = await this.db.getList<Invoice>('invoices.json');

      const sorted = [...invoices].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      res.json(sorted.slice(0, 10));
    } catch (err: any) {
      res.status(500).json({ error: 'Lỗi tải danh sách đơn hàng gần đây: ' + err.message });
    }
  }
}
