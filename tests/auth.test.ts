import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../server';
import { AuthService } from '../server/services/authService';
import { JsonDatabaseEngine } from '../server/db/jsonEngine';
import type { Product, User } from '../src/types/datasoft';

describe('3. Critical Path: Bảo mật Phân Quyền RBAC & Ẩn Giá Vốn (auth.test.ts)', () => {
  let app: Express;
  let authService: AuthService;
  let db: JsonDatabaseEngine;

  let salesToken: string;
  let adminToken: string;
  let technicianToken: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = await createApp();
    authService = new AuthService();
    db = JsonDatabaseEngine.getInstance();
    await db.initializeDatabase();

    // 1. Khởi tạo tài khoản Sales giả lập
    const salesUser: User = {
      id: 'USR-TEST-SALES-01',
      username: 'sales_test',
      fullName: 'Nhân Viên Bán Hàng QA',
      role: 'sales',
      phone: '0911000111',
      active: true,
      createdAt: new Date().toISOString(),
      permissions: authService.getDefaultPermissionsForRole('sales'),
    };
    salesToken = authService.generateToken(salesUser);

    // 2. Khởi tạo tài khoản Admin giả lập
    const adminUser: User = {
      id: 'USR-TEST-ADMIN-01',
      username: 'admin_test',
      fullName: 'Quản Trị Viên QA',
      role: 'admin',
      phone: '0988000888',
      active: true,
      createdAt: new Date().toISOString(),
      permissions: ['*'],
    };
    adminToken = authService.generateToken(adminUser);

    // 3. Khởi tạo tài khoản Technician giả lập
    const techUser: User = {
      id: 'USR-TEST-TECH-01',
      username: 'tech_test',
      fullName: 'Kỹ Thuật Viên QA',
      role: 'technician',
      phone: '0933000333',
      active: true,
      createdAt: new Date().toISOString(),
      permissions: authService.getDefaultPermissionsForRole('technician'),
    };
    technicianToken = authService.generateToken(techUser);
  });

  test('GET /api/products dưới danh nghĩa Role "sales": Trường costPrice & importPrice của TẤT CẢ sản phẩm phải bằng 0', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${salesToken}`)
      .expect(200);

    const products: Product[] = res.body;

    // Đảm bảo danh sách sản phẩm không rỗng
    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBeGreaterThan(0);

    // ASSERTION CỐT LÕI:
    // Kiểm tra từng sản phẩm trong danh sách trả về cho nhân viên Sales
    products.forEach((product) => {
      // 1. Trường costPrice (Giá vốn) phải hoàn toàn bằng 0
      expect(product.costPrice).toBe(0);

      // 2. Trường importPrice cũng phải hoàn toàn bằng 0
      expect(product.importPrice).toBe(0);

      // 3. Các thông tin công khai như giá bán lẻ (retailPrice), tên hàng vẫn hiển thị bình thường
      expect(product.retailPrice).toBeGreaterThanOrEqual(0);
      expect(product.name).toBeDefined();
    });
  });

  test('GET /api/products dưới danh nghĩa Role "technician": Giá vốn cũng phải bị ẩn (bằng 0)', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${technicianToken}`)
      .expect(200);

    const products: Product[] = res.body;
    expect(products.length).toBeGreaterThan(0);

    products.forEach((product) => {
      expect(product.costPrice).toBe(0);
      expect(product.importPrice).toBe(0);
    });
  });

  test('GET /api/products dưới danh nghĩa Role "admin": Giá vốn (costPrice / importPrice) PHẢI hiển thị chính xác (> 0)', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const products: Product[] = res.body;
    expect(products.length).toBeGreaterThan(0);

    // Tìm ít nhất 1 sản phẩm có giá vốn thực tế trong database
    const productsWithCost = products.filter((p) => (p.costPrice || 0) > 0 || p.importPrice > 0);
    expect(productsWithCost.length).toBeGreaterThan(0);

    const sample = productsWithCost[0];
    expect(sample.costPrice).toBeGreaterThan(0);
    expect(sample.importPrice).toBeGreaterThan(0);
  });

  test('Bảo mật Phân quyền: Role "sales" không có permission "inventory.view_cost"', () => {
    const permissions = authService.getDefaultPermissionsForRole('sales');
    expect(permissions).not.toContain('inventory.view_cost');
    expect(permissions).toContain('inventory.view_public');
    expect(permissions).toContain('invoices.create');
  });
});
