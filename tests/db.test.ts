import fs from 'fs';
import path from 'path';
import { JsonDatabaseEngine } from '../server/db/jsonEngine';
import type { Invoice } from '../src/types/datasoft';

describe('1. Critical Path: DB Concurrency & Mutex Lock (db.test.ts)', () => {
  let db: JsonDatabaseEngine;
  let invoicesFilePath: string;
  let originalInvoicesContent: string = '[]';

  beforeAll(async () => {
    db = JsonDatabaseEngine.getInstance();
    await db.initializeDatabase();
    invoicesFilePath = path.join(db.getBaseDir(), 'invoices.json');

    if (fs.existsSync(invoicesFilePath)) {
      originalInvoicesContent = await fs.promises.readFile(invoicesFilePath, 'utf-8');
    }
  });

  afterAll(async () => {
    // Phục hồi lại dữ liệu file ban đầu sau khi test kết thúc
    if (invoicesFilePath && originalInvoicesContent) {
      await fs.promises.writeFile(invoicesFilePath, originalInvoicesContent, 'utf-8');
    }
  });

  test('Bắn 20 requests bất đồng bộ (Promise.all) ghi dữ liệu vào invoices.json cùng lúc: Không rách file, không mất bản ghi', async () => {
    const CONCURRENT_REQUESTS = 20;
    const testBatchId = `UAT_CONCURRENCY_${Date.now()}`;

    // 1. Đọc số lượng hóa đơn ban đầu
    const initialInvoices = await db.getList<Invoice>('invoices.json');
    const initialCount = initialInvoices.length;

    // 2. Chuẩn bị mảng 20 hóa đơn độc lập
    const testInvoices: Invoice[] = Array.from({ length: CONCURRENT_REQUESTS }, (_, index) => {
      const i = index + 1;
      return {
        id: `INV-CONCUR-${testBatchId}-${String(i).padStart(3, '0')}`,
        invoiceCode: `HD-CONCUR-${String(i).padStart(3, '0')}`,
        customerId: `CUST-TEST-${i}`,
        customerName: `Khách Hàng Concurrency #${i}`,
        customerPhone: `0988000${String(i).padStart(3, '0')}`,
        salesId: 'USR-UAT-SALES01',
        salesName: 'Nguyễn Thu Trang',
        items: [
          {
            productId: 'PRD-MAIN-B760-UAT',
            productName: `Mainboard B760 Luồng #${i}`,
            quantity: 1,
            unitPrice: 7500000,
            discount: 0,
            total: 7500000,
            warrantyMonths: 36,
          },
        ],
        subTotal: 7500000,
        discount: 0,
        finalAmount: 7500000,
        paidAmount: 7500000,
        debtAmount: 0,
        paymentMethod: 'transfer',
        status: 'paid',
        createdAt: new Date().toISOString(),
        note: `Test concurrency record #${i} in batch ${testBatchId}`,
      };
    });

    // 3. Loop bắn 20 requests bất đồng bộ đồng thời qua Promise.all
    // Tương tác trực tiếp qua db.insert() sử dụng Async Mutex Queue và Atomic Rename
    const writePromises = testInvoices.map((invoice) => {
      return db.insert<Invoice>('invoices.json', invoice);
    });

    const results = await Promise.all(writePromises);

    // Xác nhận 1: Toàn bộ 20 promises đều resolve thành công
    expect(results).toHaveLength(CONCURRENT_REQUESTS);

    // Xác nhận 2: Đọc trực tiếp từ file vật lý trên đĩa cứng (Raw Disk Read)
    // Đảm bảo file JSON hoàn toàn nguyên vẹn, không bị rách, parse thành công 100%
    const rawContent = await fs.promises.readFile(invoicesFilePath, 'utf-8');
    expect(rawContent.length).toBeGreaterThan(0);

    let parsedInvoices: Invoice[] = [];
    expect(() => {
      parsedInvoices = JSON.parse(rawContent);
    }).not.toThrow();

    expect(Array.isArray(parsedInvoices)).toBe(true);

    // Xác nhận 3: KHÔNG THẤT THOÁT BẢN GHI NÀO (Zero Data Loss)
    // Tổng số bản ghi trong file phải tăng đúng 20 đơn vị
    expect(parsedInvoices.length).toBe(initialCount + CONCURRENT_REQUESTS);

    // Xác nhận từng bản ghi trong 20 bản ghi test đều tồn tại đầy đủ trong file
    for (const testInv of testInvoices) {
      const found = parsedInvoices.find((inv) => inv.id === testInv.id);
      expect(found).toBeDefined();
      expect(found?.invoiceCode).toBe(testInv.invoiceCode);
      expect(found?.finalAmount).toBe(7500000);
    }

    // Xác nhận 4: Cơ chế Atomic Rename đã dọn dẹp sạch sẽ, không kẹt file tạm (.tmp.*)
    const filesInDir = await fs.promises.readdir(db.getBaseDir());
    const orphanTmpFiles = filesInDir.filter((f) => f.startsWith('invoices.json.tmp.'));
    expect(orphanTmpFiles).toHaveLength(0);
  });
});
