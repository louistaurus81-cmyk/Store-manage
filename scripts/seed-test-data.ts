import crypto from 'crypto';
import path from 'path';
import { JsonDatabaseEngine } from '../server/db/jsonEngine';
import { hashPassword } from '../server/db/seedData';
import { AuthService } from '../server/services/authService';
import type { Customer, ImeiRecord, Product, User } from '../src/types/datasoft';

export async function seedTestData(): Promise<void> {
  console.log('\n======================================================');
  console.log('🚀 [DATASOFT] KHỞI CHẠY SCRIPT TẠO DỮ LIỆU TEST (UAT SEED)');
  console.log('======================================================\n');

  const db = JsonDatabaseEngine.getInstance();
  await db.initializeDatabase();
  console.log(`📁 Thư mục DATASOFT đích: ${db.getBaseDir()}`);

  const authService = new AuthService();

  // =========================================================================
  // 1. KHỞI TẠO 2 USERS: sales01 (role: sales) & tech01 (role: technician)
  // Mật khẩu mặc định: 123456
  // =========================================================================
  console.log('\n👤 1. Khởi tạo tài khoản kiểm thử (Users)...');
  const users = await db.getList<User>('users.json');

  const testUsersData: Array<{
    id: string;
    username: string;
    fullName: string;
    role: 'sales' | 'technician';
    phone: string;
  }> = [
    {
      id: 'USR-UAT-SALES01',
      username: 'sales01',
      fullName: 'Nguyễn Thu Trang (Sales UAT)',
      role: 'sales',
      phone: '0911555666',
    },
    {
      id: 'USR-UAT-TECH01',
      username: 'tech01',
      fullName: 'Phạm Minh Đức (Kỹ Thuật UAT)',
      role: 'technician',
      phone: '0933777888',
    },
  ];

  for (const uData of testUsersData) {
    const salt = `salt_${uData.username}_uat_2026`;
    const passwordHash = hashPassword('123456', salt);
    const permissions = authService.getDefaultPermissionsForRole(uData.role);

    const existingIdx = users.findIndex(
      (u) => u.username.toLowerCase() === uData.username.toLowerCase()
    );

    const userRecord: User = {
      id: existingIdx !== -1 ? users[existingIdx].id : uData.id,
      username: uData.username,
      passwordHash,
      salt,
      fullName: uData.fullName,
      role: uData.role,
      phone: uData.phone,
      active: true,
      createdAt: new Date().toISOString(),
      permissions,
    };

    if (existingIdx !== -1) {
      users[existingIdx] = userRecord;
      console.log(`   🔄 Đã cập nhật tài khoản: [${uData.username}] (Mật khẩu: 123456)`);
    } else {
      users.push(userRecord);
      console.log(`   ✅ Đã tạo mới tài khoản: [${uData.username}] - Role: ${uData.role} (Mật khẩu: 123456)`);
    }
  }

  await db.writeAtomic('users.json', users);

  // =========================================================================
  // 2. KHỞI TẠO 1 KHÁCH HÀNG: Trần Văn Khang (SĐT: 0988.555.777)
  // =========================================================================
  console.log('\n👥 2. Khởi tạo khách hàng kiểm thử (Customer)...');
  const customers = await db.getList<Customer>('customers.json');
  const targetPhone = '0988.555.777';

  const existingCustIdx = customers.findIndex((c) => c.phone.trim() === targetPhone);
  const customerRecord: Customer = {
    id: existingCustIdx !== -1 ? customers[existingCustIdx].id : 'CUST-UAT-001',
    code: existingCustIdx !== -1 ? customers[existingCustIdx].code : 'KH-UAT-001',
    name: 'Trần Văn Khang',
    phone: targetPhone,
    email: 'khang.tran@gmail.com',
    address: 'Số 168 Cầu Giấy, Quan Hoa, Cầu Giấy, Hà Nội',
    totalSpent: existingCustIdx !== -1 ? customers[existingCustIdx].totalSpent : 0,
    currentDebt: existingCustIdx !== -1 ? customers[existingCustIdx].currentDebt : 0,
    createdAt: new Date().toISOString(),
  };

  if (existingCustIdx !== -1) {
    customers[existingCustIdx] = customerRecord;
    console.log(`   🔄 Đã cập nhật hồ sơ khách hàng: [${customerRecord.name}] - SĐT: ${targetPhone}`);
  } else {
    customers.unshift(customerRecord);
    console.log(`   ✅ Đã tạo mới hồ sơ khách hàng: [${customerRecord.name}] - SĐT: ${targetPhone}`);
  }

  await db.writeAtomic('customers.json', customers);

  // =========================================================================
  // 3. KHỞI TẠO 1 SẢN PHẨM: Mainboard ASUS ROG Strix B760-A
  // Giá nhập: 6.200.000đ, Giá bán lẻ: 7.500.000đ, hasSerialImei: true
  // =========================================================================
  console.log('\n📦 3. Khởi tạo sản phẩm kiểm thử (Product)...');
  const products = await db.getList<Product>('products.json');
  const PRODUCT_ID = 'PRD-MAIN-B760-UAT';

  const existingProdIdx = products.findIndex(
    (p) => p.id === PRODUCT_ID || p.sku.toUpperCase() === 'MB-ASUS-B760-A'
  );

  const productRecord: Product = {
    id: PRODUCT_ID,
    sku: 'MB-ASUS-B760-A',
    name: 'Mainboard ASUS ROG Strix B760-A Gaming WiFi D4',
    categoryId: 'CAT-MAIN',
    categoryName: 'Bo Mạch Chủ',
    importPrice: 6200000, // Giá vốn nhập kho: 6.200.000 đ
    costPrice: 6200000,
    retailPrice: 7500000, // Giá bán lẻ: 7.500.000 đ
    wholesalePrice: 7000000,
    stockQuantity: 5,     // Tồn kho: 5 chiếc
    minStockAlert: 2,
    unit: 'Chiếc',
    hasSerialImei: true,  // Quản lý theo số Serial/IMEI
    warrantyMonths: 36,
    description: 'Mainboard Intel LGA 1700 chuẩn DDR4, WiFi 6E, phục vụ test UAT bán hàng & bảo hành',
  };

  if (existingProdIdx !== -1) {
    products[existingProdIdx] = productRecord;
    console.log(`   🔄 Đã cập nhật sản phẩm: [${productRecord.name}] (Tồn kho: ${productRecord.stockQuantity})`);
  } else {
    products.unshift(productRecord);
    console.log(`   ✅ Đã tạo mới sản phẩm: [${productRecord.name}] (SKU: ${productRecord.sku})`);
  }

  await db.writeAtomic('products.json', products);

  // =========================================================================
  // 4. NẠP 5 MÃ IMEI: MB-B760-UAT-001 -> MB-B760-UAT-005 (Trạng thái: in_stock)
  // =========================================================================
  console.log('\n🏷️ 4. Nạp 5 mã Serial/IMEI vào kho (Status: in_stock)...');
  const imeis = await db.getList<ImeiRecord>('imeis.json');

  const imeiListToSeed = [
    'MB-B760-UAT-001',
    'MB-B760-UAT-002',
    'MB-B760-UAT-003',
    'MB-B760-UAT-004',
    'MB-B760-UAT-005',
  ];

  for (let i = 0; i < imeiListToSeed.length; i++) {
    const imeiCode = imeiListToSeed[i];
    const imeiIdx = imeis.findIndex((r) => r.imei.toUpperCase() === imeiCode.toUpperCase());

    const imeiRecord: ImeiRecord = {
      id: imeiIdx !== -1 ? imeis[imeiIdx].id : `IMEI-B760-UAT-${String(i + 1).padStart(3, '0')}`,
      imei: imeiCode,
      productId: PRODUCT_ID,
      productName: productRecord.name,
      status: 'in_stock', // Mặc định sẵn sàng trong kho
      purchaseDate: new Date().toISOString(),
      note: 'Lô hàng nhập mẫu phục vụ kiểm thử nghiệm thu UAT',
    };

    if (imeiIdx !== -1) {
      imeis[imeiIdx] = imeiRecord;
      console.log(`   🔄 Đã reset trạng thái IMEI: [${imeiCode}] -> in_stock`);
    } else {
      imeis.unshift(imeiRecord);
      console.log(`   ✅ Đã thêm mới số IMEI: [${imeiCode}] -> in_stock`);
    }
  }

  await db.writeAtomic('imeis.json', imeis);

  console.log('\n======================================================');
  console.log('🎉 TẤT CẢ DỮ LIỆU TEST ĐÃ ĐƯỢC NẠP THÀNH CÔNG VÀO DATASOFT!');
  console.log('======================================================');
  console.log('📌 Tóm tắt tài khoản test:');
  console.log('   - Sales:       username: sales01  | password: 123456');
  console.log('   - Kỹ thuật:    username: tech01   | password: 123456');
  console.log('📌 Tóm tắt sản phẩm test:');
  console.log('   - Tên SP:      Mainboard ASUS ROG Strix B760-A (5 chiếc)');
  console.log('   - Giá vốn:     6.200.000 đ | Giá bán: 7.500.000 đ');
  console.log('   - Serial/IMEI: MB-B760-UAT-001 đến MB-B760-UAT-005 (in_stock)');
  console.log('📌 Tóm tắt khách hàng:');
  console.log('   - Khách hàng:  Trần Văn Khang (0988.555.777)\n');
}

// Tự động chạy khi file được gọi trực tiếp bằng tsx/node
seedTestData().catch((err) => {
  console.error('\n❌ Lỗi khi nạp dữ liệu test:', err);
  process.exit(1);
});
