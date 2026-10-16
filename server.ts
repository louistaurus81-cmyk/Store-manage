import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { JsonDatabaseEngine } from './server/db/jsonEngine';
import { AuthService, AuthenticatedRequest } from './server/services/authService';
import { RepairService } from './server/services/repairService';
import { InventoryService } from './server/services/inventoryService';
import { InvoiceService } from './server/services/invoiceService';
import { PcBuildService } from './server/services/pcBuildService';
import { TemplateEngine } from './server/services/templateEngine';
import { DashboardController } from './server/controllers/dashboard.controller';
import { PurchaseService } from './server/services/purchaseService';
import type { StoreSettings } from './src/types/datasoft';

const appDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

export async function createApp() {
  const app = express();
  app.use(express.json());

  // Khởi tạo JSON Database Engine
  const db = JsonDatabaseEngine.getInstance();
  await db.initializeDatabase();
  console.log(`[DATASOFT] Cơ sở dữ liệu JSON sẵn sàng tại: ${db.getBaseDir()}`);

  const authService = new AuthService();
  const repairService = new RepairService();
  const inventoryService = new InventoryService();
  const invoiceService = new InvoiceService();
  const pcBuildService = new PcBuildService();
  const templateEngine = TemplateEngine.getInstance();
  const dashboardController = new DashboardController();
  const purchaseService = new PurchaseService();

  // Helper middleware trích xuất user nếu có token (không bắt buộc chặn)
  const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = authService.verifyToken(token);
      if (payload) {
        req.user = {
          id: payload.userId,
          username: payload.username,
          role: payload.role,
          fullName: payload.fullName,
          phone: '',
          active: true,
          createdAt: '',
        };
      }
    }
    next();
  };

  app.use(optionalAuth);

  // ==========================================
  // 1. AUTHENTICATION & USER MANAGEMENT API
  // ==========================================
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Vui lòng cung cấp tài khoản và mật khẩu' });
      }
      const result = await authService.login(username, password);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Đăng nhập thất bại' });
    }
  });

  app.get('/api/auth/me', (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Chưa đăng nhập' });
    }
    res.json(req.user);
  });

  app.get('/api/users', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await authService.getAllUsers();
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/users', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const newUser = await authService.createUser(req.body);
      res.status(201).json(newUser);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/users/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await authService.updateUser(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // DASHBOARD BẢNG ĐIỀU KHIỂN QUẢN LÝ (RBAC: Admin & Manager)
  // ==========================================
  app.use('/api/dashboard', dashboardController.getRouter());

  // ==========================================
  // 2. REPAIR & WARRANTY MODULE API
  // ==========================================
  app.get('/api/repairs', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, technicianId, searchQuery } = req.query;
      const tickets = await repairService.getTickets({
        status: status as any,
        technicianId: technicianId as string,
        searchQuery: searchQuery as string,
      });
      res.json(tickets);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/repairs/:id', async (req: Request, res: Response) => {
    try {
      const ticket = await repairService.getTicketById(req.params.id);
      if (!ticket) return res.status(404).json({ error: 'Không tìm thấy phiếu sửa chữa' });
      res.json(ticket);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/repairs', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ticket = await repairService.createTicket(req.body);
      res.status(201).json(ticket);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/repairs/:id/status', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, diagnosis, finalCost, technicianId, notes } = req.body;
      const updated = await repairService.updateStatus(req.params.id, status, {
        diagnosis,
        finalCost,
        technicianId,
        notes,
      });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/repairs/:id/parts', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { productId, quantity, chosenImei } = req.body;
      const updated = await repairService.addPart(req.params.id, productId, Number(quantity) || 1, chosenImei);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/warranty/lookup', async (req: Request, res: Response) => {
    try {
      const query = (req.query.q as string) || '';
      if (!query.trim()) {
        return res.json({ warranties: [], repairs: [], imeiRecords: [] });
      }
      const results = await repairService.lookupWarrantyAndHistory(query);
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 3. INVENTORY & IMEI MODULE API
  // ==========================================
  app.get('/api/products', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const role = req.user?.role;
      const products = await inventoryService.getProducts(role);
      res.json(products);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/products', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const product = await inventoryService.createProduct(req.body);
      res.status(201).json(product);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/products/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await inventoryService.updateProduct(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/imeis', async (req: Request, res: Response) => {
    try {
      const { productId, status } = req.query;
      const imeis = await inventoryService.getImeis(productId as string, status as string);
      res.json(imeis);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API tra cứu chi tiết số Serial/IMEI phục vụ Máy quét mã vạch Barcode Scanner & POS
  app.get(['/api/inventory/imei/:imei', '/api/imeis/lookup/:imei'], async (req: AuthenticatedRequest, res: Response) => {
    try {
      const role = req.user?.role;
      const result = await inventoryService.getImeiDetails(req.params.imei, role);
      if (!result.found) {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message, found: false, inStock: false });
    }
  });

  app.post('/api/imeis', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { productId, imei, note, supplierId } = req.body;
      const record = await inventoryService.addImei(productId, imei, note, supplierId);
      res.status(201).json(record);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/imeis/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await inventoryService.updateImei(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy số IMEI/Serial' });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/imeis/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const success = await inventoryService.deleteImei(req.params.id);
      if (!success) return res.status(404).json({ error: 'Không tìm thấy số IMEI/Serial' });
      res.json({ success: true, message: 'Đã xóa số IMEI và cập nhật tồn kho thành công' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/categories', async (req: Request, res: Response) => {
    try {
      const categories = await inventoryService.getCategories();
      res.json(categories);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/categories', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const newCategory = await inventoryService.createCategory(req.body);
      res.status(201).json(newCategory);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/categories/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await inventoryService.updateCategory(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy danh mục' });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/categories/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      await inventoryService.deleteCategory(req.params.id);
      res.json({ success: true, message: 'Đã xóa danh mục thành công' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/suppliers', async (req: Request, res: Response) => {
    try {
      const suppliers = await inventoryService.getSuppliers();
      res.json(suppliers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/suppliers', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplier = await inventoryService.createSupplier(req.body);
      res.status(201).json(supplier);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/suppliers/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await inventoryService.updateSupplier(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy nhà cung cấp' });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/suppliers/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const success = await inventoryService.deleteSupplier(req.params.id);
      if (!success) return res.status(404).json({ error: 'Không tìm thấy nhà cung cấp' });
      res.json({ success: true, message: 'Đã xóa nhà cung cấp thành công' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/suppliers/:id/profile', async (req: Request, res: Response) => {
    try {
      const profile = await inventoryService.getSupplierProfile(req.params.id);
      res.json(profile);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  });

  // ==========================================
  // NHẬP HÀNG KHO (PURCHASING / GOODS RECEIPT)
  // ==========================================
  app.get('/api/purchases', async (req: Request, res: Response) => {
    try {
      const receipts = await purchaseService.getPurchaseReceipts();
      res.json(receipts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/purchases/:id', async (req: Request, res: Response) => {
    try {
      const receipt = await purchaseService.getPurchaseReceiptById(req.params.id);
      if (!receipt) return res.status(404).json({ error: 'Không tìm thấy phiếu nhập kho' });
      res.json(receipt);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/purchases', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const createdBy = req.user?.id || 'USR-001';
      const createdByName = req.user?.fullName || 'Quản trị viên';
      const receipt = await purchaseService.createPurchaseReceipt({
        ...req.body,
        createdBy,
        createdByName,
      });
      res.status(201).json(receipt);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // 4. SALES, INVOICES & DEBTS API
  // ==========================================
  app.get('/api/invoices', async (req: Request, res: Response) => {
    try {
      const invoices = await invoiceService.getInvoices();
      res.json(invoices);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/invoices', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const salesId = req.user?.id || 'USR-003';
      const salesName = req.user?.fullName || 'Nhân viên bán hàng';
      const invoice = await invoiceService.createInvoice({
        ...req.body,
        salesId,
        salesName,
      });
      res.status(201).json(invoice);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/customers', async (req: Request, res: Response) => {
    try {
      const customers = await invoiceService.getCustomers();
      res.json(customers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/customers', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const newCustomer = await invoiceService.createCustomer(req.body);
      res.status(201).json(newCustomer);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/customers/:id/profile', async (req: Request, res: Response) => {
    try {
      const profile = await invoiceService.getCustomerProfile(req.params.id);
      if (!profile) return res.status(404).json({ error: 'Không tìm thấy hồ sơ khách hàng' });
      res.json(profile);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/debts', async (req: Request, res: Response) => {
    try {
      const type = req.query.type as 'customer' | 'supplier' | undefined;
      const debts = await invoiceService.getDebts(type);
      res.json(debts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/debts/:id/pay', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { amount, note } = req.body;
      const updated = await invoiceService.payDebt(req.params.id, Number(amount) || 0, note);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // 5. SYSTEM SETTINGS & DATASOFT BACKUP
  // ==========================================
  app.get('/api/system/stats', async (req: Request, res: Response) => {
    try {
      const stats = await db.getStorageStats();
      res.json({
        baseDir: db.getBaseDir(),
        platform: process.platform,
        nodeVersion: process.version,
        files: stats,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/system/backup', async (req: Request, res: Response) => {
    try {
      const backupName = await db.createBackup(req.body.label || 'manual');
      res.json({ success: true, backupName, message: `Bản sao lưu ${backupName} đã được tạo thành công!` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/system/settings', async (req: Request, res: Response) => {
    try {
      const settings = await db.read<StoreSettings>('settings.json');
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/system/settings', async (req: Request, res: Response) => {
    try {
      await db.writeAtomic('settings.json', req.body);
      res.json({ success: true, settings: req.body });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // 6. PC BUILDER MODULE API (YÊU CẦU 4.1)
  // ==========================================
  app.get('/api/pc-builds', async (req: Request, res: Response) => {
    try {
      const builds = await pcBuildService.getBuilds();
      res.json(builds);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/pc-builds/:id', async (req: Request, res: Response) => {
    try {
      const build = await pcBuildService.getBuildById(req.params.id);
      if (!build) return res.status(404).json({ error: 'Không tìm thấy cấu hình PC' });
      res.json(build);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/pc-builds', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const creatorId = req.user?.id || 'USR-003';
      const creatorName = req.user?.fullName || 'Nhân viên kinh doanh';
      const newBuild = await pcBuildService.createBuild({
        ...req.body,
        creatorId,
        creatorName,
      });
      res.status(201).json(newBuild);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/pc-builds/:id', async (req: Request, res: Response) => {
    try {
      const updated = await pcBuildService.updateBuild(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Không tìm thấy cấu hình PC' });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/pc-builds/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await pcBuildService.deleteBuild(req.params.id);
      res.json({ success: deleted });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/pc-builds/:id/convert-to-invoice', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const salesId = req.user?.id || 'USR-003';
      const salesName = req.user?.fullName || 'Nhân viên kinh doanh';
      const result = await pcBuildService.convertToInvoice(req.params.id, {
        paymentMethod: req.body.paymentMethod || 'transfer',
        paidAmount: req.body.paidAmount || 0,
        salesId,
        salesName,
        note: req.body.note,
      });
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // 7. PRINT TEMPLATE ENGINE API (YÊU CẦU 4.2)
  // ==========================================
  app.get('/api/print-templates', async (req: Request, res: Response) => {
    try {
      const type = req.query.type as any;
      const templates = await templateEngine.getTemplates(type);
      res.json(templates);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/print-templates/:id', async (req: Request, res: Response) => {
    try {
      const template = await templateEngine.getTemplateById(req.params.id);
      if (!template) return res.status(404).json({ error: 'Không tìm thấy mẫu in' });
      res.json(template);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/print-templates', async (req: Request, res: Response) => {
    try {
      const saved = await templateEngine.saveTemplate(req.body);
      res.status(201).json(saved);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/print-templates/render', async (req: Request, res: Response) => {
    try {
      const { templateIdOrType, data } = req.body;
      const rendered = await templateEngine.render(templateIdOrType, data);
      res.json(rendered);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/print-history', async (req: Request, res: Response) => {
    try {
      const docId = req.query.documentId as string | undefined;
      const history = await templateEngine.getPrintHistory(docId);
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/print-history', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const printedBy = req.user?.id || 'USR-001';
      const printedByName = req.user?.fullName || 'Hệ thống';
      const historyItem = await templateEngine.recordPrintHistory({
        ...req.body,
        printedBy,
        printedByName,
      });
      res.status(201).json(historyItem);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  return app;
}

export async function startServer() {
  const app = await createApp();
  const PORT = process.env.PORT || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // ==========================================
  // 8. VITE MIDDLEWARE (DEV) & STATIC FILES (PROD)
  // ==========================================
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(appDir, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Khởi động server lắng nghe trên 0.0.0.0 để máy trong mạng LAN có thể truy cập
  return app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[DATASOFT LAN SERVER] Đang chạy tại http://0.0.0.0:${PORT}`);
    console.log(`[LAN ACCESS] Các máy trong mạng nội bộ truy cập: http://<IP_UBUNTU_SERVER>:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('[DATASOFT] Lỗi khởi động máy chủ:', err);
    process.exit(1);
  });
}
