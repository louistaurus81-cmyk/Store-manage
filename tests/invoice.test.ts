import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../server';
import { JsonDatabaseEngine } from '../server/db/jsonEngine';
import type { Debt, ImeiRecord, Invoice, Product, Customer } from '../src/types/datasoft';

describe('2. Critical Path: Transaction Thanh Toán & Tự Động Ghi Nợ (invoice.test.ts)', () => {
  let app: Express;
  let db: JsonDatabaseEngine;

  const TEST_PRODUCT_ID = 'PRD-TEST-TX-MB01';
  const TEST_IMEI = 'MB-ROG-TEST-889922';
  const TEST_CUSTOMER_PHONE = '0988776655';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = await createApp();
    db = JsonDatabaseEngine.getInstance();
    await db.initializeDatabase();

    // 1. Chuẩn bị sản phẩm test có tồn kho ban đầu = 5
    const products = await db.getList<Product>('products.json');
    const existingProdIdx = products.findIndex((p) => p.id === TEST_PRODUCT_ID);
    const testProduct: Product = {
      id: TEST_PRODUCT_ID,
      sku: 'MAIN-ASUS-B760',
      name: 'Mainboard ASUS ROG Strix B760-A Gaming WiFi D4',
      categoryId: 'CAT-MAIN',
      categoryName: 'Bo Mạch Chủ',
      importPrice: 7500000,
      costPrice: 7500000,
      retailPrice: 10000000,
      wholesalePrice: 9000000,
      stockQuantity: 5, // Tồn kho ban đầu
      minStockAlert: 2,
      unit: 'Chiếc',
      hasSerialImei: true,
      warrantyMonths: 36,
    };

    if (existingProdIdx !== -1) {
      products[existingProdIdx] = testProduct;
    } else {
      products.unshift(testProduct);
    }
    await db.writeAtomic('products.json', products);

    // 2. Chuẩn bị số IMEI tương ứng ở trạng thái 'in_stock'
    const imeis = await db.getList<ImeiRecord>('imeis.json');
    const existingImeiIdx = imeis.findIndex((i) => i.imei === TEST_IMEI);
    const testImeiRecord: ImeiRecord = {
      id: `IMEI-TEST-${Date.now()}`,
      imei: TEST_IMEI,
      productId: TEST_PRODUCT_ID,
      productName: testProduct.name,
      status: 'in_stock', // Trạng thái sẵn sàng trong kho
      purchaseDate: new Date().toISOString(),
      note: 'IMEI dùng cho test tự động hóa đơn',
    };

    if (existingImeiIdx !== -1) {
      imeis[existingImeiIdx] = testImeiRecord;
    } else {
      imeis.unshift(testImeiRecord);
    }
    await db.writeAtomic('imeis.json', imeis);

    // Dọn dẹp bản ghi khách hàng test nếu còn sót từ lần chạy trước
    const customers = await db.getList<Customer>('customers.json');
    await db.writeAtomic('customers.json', customers.filter((c) => c.phone !== TEST_CUSTOMER_PHONE));
  });

  afterAll(async () => {
    // Dọn dẹp dữ liệu test
    const products = await db.getList<Product>('products.json');
    await db.writeAtomic('products.json', products.filter((p) => p.id !== TEST_PRODUCT_ID));

    const imeis = await db.getList<ImeiRecord>('imeis.json');
    await db.writeAtomic('imeis.json', imeis.filter((i) => i.imei !== TEST_IMEI));

    const debts = await db.getList<Debt>('debts.json');
    await db.writeAtomic('debts.json', debts.filter((d) => d.entityPhone !== TEST_CUSTOMER_PHONE));

    const invoices = await db.getList<Invoice>('invoices.json');
    await db.writeAtomic('invoices.json', invoices.filter((i) => i.customerPhone !== TEST_CUSTOMER_PHONE));

    const customers = await db.getList<Customer>('customers.json');
    await db.writeAtomic('customers.json', customers.filter((c) => c.phone !== TEST_CUSTOMER_PHONE));
  });

  test('Tạo hóa đơn tổng 10 triệu, trả trước 4 triệu -> Trừ 1 kho, đổi IMEI sold, tự sinh khoản nợ 6 triệu', async () => {
    const invoicePayload = {
      customerId: '',
      customerName: 'Trần Anh Dũng QA',
      customerPhone: TEST_CUSTOMER_PHONE,
      customerAddress: 'Số 99 Phố Vọng, Hà Nội',
      salesId: 'USR-003',
      salesName: 'Nhân viên Sales QA',
      items: [
        {
          productId: TEST_PRODUCT_ID,
          productName: 'Mainboard ASUS ROG Strix B760-A Gaming WiFi D4',
          quantity: 1,
          unitPrice: 10000000,
          discount: 0,
          total: 10000000,
          imei: TEST_IMEI,
          warrantyMonths: 36,
        },
      ],
      discount: 0,
      paidAmount: 4000000, // Khách chỉ trả 4 triệu
      paymentMethod: 'transfer',
      note: 'Giao dịch test: Khách trả trước 4 triệu, ghi nợ 6 triệu',
    };

    // Thực hiện gọi API tạo hóa đơn
    const res = await request(app)
      .post('/api/invoices')
      .send(invoicePayload)
      .expect(201);

    const createdInvoice: Invoice = res.body;

    // Kiểm tra cấu trúc hóa đơn phản hồi từ API
    expect(createdInvoice).toBeDefined();
    expect(createdInvoice.invoiceCode).toMatch(/^HD-\d{6}-\d{3}$/);
    expect(createdInvoice.subTotal).toBe(10000000);
    expect(createdInvoice.finalAmount).toBe(10000000);
    expect(createdInvoice.paidAmount).toBe(4000000);
    expect(createdInvoice.debtAmount).toBe(6000000);
    expect(createdInvoice.status).toBe('partial'); // Trạng thái thanh toán 1 phần

    // =========================================================================
    // ASSERTION 1: TRỪ CHÍNH XÁC 1 TỒN KHO TRONG products.json (5 -> 4)
    // =========================================================================
    const productsAfter = await db.getList<Product>('products.json');
    const updatedProduct = productsAfter.find((p) => p.id === TEST_PRODUCT_ID);
    expect(updatedProduct).toBeDefined();
    expect(updatedProduct?.stockQuantity).toBe(4);

    // =========================================================================
    // ASSERTION 2: ĐỔI TRẠNG THÁI IMEI TƯƠNG ỨNG SANG 'sold' TRONG imeis.json
    // =========================================================================
    const imeisAfter = await db.getList<ImeiRecord>('imeis.json');
    const updatedImei = imeisAfter.find((i) => i.imei === TEST_IMEI);
    expect(updatedImei).toBeDefined();
    expect(updatedImei?.status).toBe('sold');
    expect(updatedImei?.invoiceId).toBe(createdInvoice.invoiceCode);
    expect(updatedImei?.exportDate).toBeDefined();

    // =========================================================================
    // ASSERTION 3: TỰ ĐỘNG SINH KHOẢN NỢ 6 TRIỆU TRONG debts.json
    // =========================================================================
    const debtsAfter = await db.getList<Debt>('debts.json');
    const generatedDebt = debtsAfter.find((d) => d.referenceCode === createdInvoice.invoiceCode);

    expect(generatedDebt).toBeDefined();
    expect(generatedDebt?.type).toBe('customer');
    expect(generatedDebt?.entityPhone).toBe(TEST_CUSTOMER_PHONE);
    expect(generatedDebt?.totalDebt).toBe(10000000);
    expect(generatedDebt?.paidAmount).toBe(4000000);
    expect(generatedDebt?.remainingDebt).toBe(6000000); // Nợ đúng 6 triệu
    expect(generatedDebt?.status).toBe('pending');

    // Kiểm tra đồng bộ công nợ trên hồ sơ khách hàng
    const customersAfter = await db.getList<Customer>('customers.json');
    const updatedCustomer = customersAfter.find((c) => c.phone === TEST_CUSTOMER_PHONE);
    expect(updatedCustomer).toBeDefined();
    expect(updatedCustomer?.currentDebt).toBe(6000000);
    expect(updatedCustomer?.totalSpent).toBe(10000000);
  });
});
