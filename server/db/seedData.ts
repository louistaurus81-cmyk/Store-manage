import crypto from 'crypto';
import type {
  Category,
  Customer,
  Debt,
  ImeiRecord,
  Invoice,
  PcBuild,
  PrintHistoryItem,
  PrintTemplate,
  Product,
  RepairTicket,
  StoreSettings,
  Supplier,
  User,
  Warranty,
} from '../../src/types/datasoft';

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

export function createInitialUsers(): User[] {
  const salt1 = 'salt_admin_datasoft_2026';
  const salt2 = 'salt_manager_datasoft_2026';
  const salt3 = 'salt_sales_datasoft_2026';
  const salt4 = 'salt_tech_datasoft_2026';

  return [
    {
      id: 'USR-001',
      username: 'admin',
      passwordHash: hashPassword('admin123', salt1),
      salt: salt1,
      fullName: 'Nguyễn Thành Nam (Quản trị viên)',
      role: 'admin',
      phone: '0988123456',
      active: true,
      createdAt: '2026-01-10T08:00:00.000Z',
      permissions: ['all'],
    },
    {
      id: 'USR-002',
      username: 'chu_shop',
      passwordHash: hashPassword('shop123', salt2),
      salt: salt2,
      fullName: 'Trần Văn Mạnh (Chủ cửa hàng)',
      role: 'manager',
      phone: '0912345678',
      active: true,
      createdAt: '2026-01-10T08:30:00.000Z',
      permissions: ['reports', 'inventory_manage', 'debts_manage', 'orders_manage'],
    },
    {
      id: 'USR-003',
      username: 'ban_hang',
      passwordHash: hashPassword('sales123', salt3),
      salt: salt3,
      fullName: 'Lê Thị Thu Thảo (Kinh doanh)',
      role: 'sales',
      phone: '0977889900',
      active: true,
      createdAt: '2026-01-15T09:00:00.000Z',
      permissions: ['create_invoice', 'view_stock_public', 'manage_customers'],
    },
    {
      id: 'USR-004',
      username: 'ky_thuat',
      passwordHash: hashPassword('tech123', salt4),
      salt: salt4,
      fullName: 'Đặng Tuấn Anh (Trưởng nhóm Kỹ thuật)',
      role: 'technician',
      phone: '0903112233',
      active: true,
      createdAt: '2026-01-15T09:15:00.000Z',
      permissions: ['repair_intake', 'repair_update', 'warranty_check', 'request_parts'],
    },
  ];
}

export function createInitialCategories(): Category[] {
  return [
    { id: 'CAT-ALL', name: 'Tất cả danh mục', slug: 'all', type: 'product', description: 'Toàn bộ danh mục linh kiện & máy tính' },
    { id: 'CAT-CPU', name: 'CPU - Bộ Vi Xử Lý', slug: 'cpu', type: 'product', description: 'Intel Core i3, i5, i7, i9, AMD Ryzen' },
    { id: 'CAT-MAIN', name: 'Mainboard - Bo Mạch Chủ', slug: 'mainboard', type: 'product', description: 'Mainboard H610, B760, Z790, B650' },
    { id: 'CAT-RAM', name: 'RAM - Bộ Nhớ Trong', slug: 'ram', type: 'product', description: 'RAM DDR4, DDR5 Kingston, Corsair, G.Skill' },
    { id: 'CAT-SSD', name: 'SSD & Ổ Cứng Lưu Trữ', slug: 'ssd', type: 'product', description: 'SSD M.2 NVMe, SATA 2.5", HDD Seagate' },
    { id: 'CAT-VGA', name: 'VGA - Card Màn Hình', slug: 'vga', type: 'product', description: 'Nvidia RTX 3050, 4060, 4070, AMD Radeon' },
    { id: 'CAT-PSU', name: 'Nguồn Máy Tính (PSU)', slug: 'nguon', type: 'product', description: 'Nguồn công suất thực 550W, 650W, 750W 80 Plus' },
    { id: 'CAT-CASE', name: 'Vỏ Case Máy Tính', slug: 'case', type: 'product', description: 'Case văn phòng, gaming LED RGB kính cường lực' },
    { id: 'CAT-COOL', name: 'Tản Nhiệt Khí & Nước', slug: 'tan-nhiet', type: 'product', description: 'Tản tháp khí, tản nhiệt nước AIO 240/360' },
    { id: 'CAT-MON', name: 'Màn Hình Hiển Thị', slug: 'man-hinh', type: 'product', description: 'Màn hình văn phòng, đồ họa, gaming 144Hz - 240Hz' },
    { id: 'CAT-LAP', name: 'Laptop & Máy Tính Bảng', slug: 'laptop', type: 'product', description: 'Laptop Dell, Asus, Lenovo, HP' },
    { id: 'CAT-SRV', name: 'Dịch Vụ Sửa Chữa & Cài Đặt', slug: 'dich-vu', type: 'service', description: 'Sửa nguồn, đóng chip, vệ sinh tra keo, cài Windows' },
  ];
}

export function createInitialProducts(): Product[] {
  return [
    {
      id: 'PRD-001',
      sku: 'LT-DELL-5420',
      name: 'Laptop Dell Latitude 5420 (i5-1145G7, 16GB, SSD 256GB, 14" FHD IPS)',
      categoryId: 'CAT-01',
      categoryName: 'Laptop & Máy tính xách tay',
      importPrice: 8500000,
      retailPrice: 11200000,
      wholesalePrice: 10500000,
      stockQuantity: 4,
      minStockAlert: 2,
      unit: 'Chiếc',
      hasSerialImei: true,
      warrantyMonths: 12,
      description: 'Máy lướt tuyển chọn 99%, pin sạc zin theo máy.',
    },
    {
      id: 'PRD-002',
      sku: 'LT-ASUS-F15',
      name: 'Laptop Gaming Asus TUF F15 FX506HC (i5-11400H, RTX 3050, 16GB, 512GB)',
      categoryId: 'CAT-01',
      categoryName: 'Laptop & Máy tính xách tay',
      importPrice: 13200000,
      retailPrice: 16800000,
      wholesalePrice: 15900000,
      stockQuantity: 3,
      minStockAlert: 2,
      unit: 'Chiếc',
      hasSerialImei: true,
      warrantyMonths: 12,
      description: 'Bản chính hãng FPT, màn hình 144Hz chuyên game.',
    },
    {
      id: 'PRD-003',
      sku: 'SSD-KS-NV2-500G',
      name: 'Ổ cứng SSD Kingston NV2 500GB PCIe 4.0 x4 M.2 NVMe (SNV2S/500G)',
      categoryId: 'CAT-02',
      categoryName: 'Linh kiện PC & Nâng cấp',
      importPrice: 820000,
      retailPrice: 1150000,
      wholesalePrice: 1020000,
      stockQuantity: 18,
      minStockAlert: 5,
      unit: 'Chiếc',
      hasSerialImei: true,
      warrantyMonths: 36,
      description: 'Tốc độ đọc 3500MB/s, ghi 2100MB/s. Chính hãng SPC phân phối.',
    },
    {
      id: 'PRD-004',
      sku: 'RAM-FURY-16G-3200',
      name: 'RAM Kingston Fury Beast 16GB DDR4 Bus 3200MHz',
      categoryId: 'CAT-02',
      categoryName: 'Linh kiện PC & Nâng cấp',
      importPrice: 680000,
      retailPrice: 950000,
      wholesalePrice: 860000,
      stockQuantity: 14,
      minStockAlert: 4,
      unit: 'Thanh',
      hasSerialImei: true,
      warrantyMonths: 36,
      description: 'Có tản nhiệt nhôm đen cao cấp, tự động ép xung XMP.',
    },
    {
      id: 'PRD-005',
      sku: 'VGA-ASUS-4060',
      name: 'Card màn hình Asus Dual GeForce RTX 4060 OC Edition 8GB GDDR6',
      categoryId: 'CAT-02',
      categoryName: 'Linh kiện PC & Nâng cấp',
      importPrice: 7400000,
      retailPrice: 8900000,
      wholesalePrice: 8400000,
      stockQuantity: 2,
      minStockAlert: 2,
      unit: 'Chiếc',
      hasSerialImei: true,
      warrantyMonths: 36,
      description: '2 quạt Axial-tech làm mát tối ưu, hỗ trợ DLSS 3 và Ray Tracing.',
    },
    {
      id: 'PRD-006',
      sku: 'PSU-CORSAIR-650',
      name: 'Nguồn máy tính Corsair CV650 650W 80 Plus Bronze',
      categoryId: 'CAT-02',
      categoryName: 'Linh kiện PC & Nâng cấp',
      importPrice: 1050000,
      retailPrice: 1390000,
      wholesalePrice: 1250000,
      stockQuantity: 7,
      minStockAlert: 3,
      unit: 'Bộ',
      hasSerialImei: true,
      warrantyMonths: 36,
      description: 'Công suất thực 650W, quạt êm 120mm.',
    },
    {
      id: 'PRD-007',
      sku: 'SRV-VS-TRA-KEO',
      name: 'Dịch vụ Vệ sinh Laptop & Tra keo tản nhiệt Arctic MX-4 cao cấp',
      categoryId: 'CAT-06',
      categoryName: 'Dịch vụ Cài đặt & Vệ sinh',
      importPrice: 30000,
      retailPrice: 150000,
      wholesalePrice: 120000,
      stockQuantity: 999,
      minStockAlert: 0,
      unit: 'Lần',
      hasSerialImei: false,
      warrantyMonths: 1,
      description: 'Vệ sinh cánh quạt, ống đồng, bôi keo MX-4 xịn giúp giảm 10-15 độ C.',
    },
    {
      id: 'PRD-008',
      sku: 'SRV-SUA-NGUON-MAIN',
      name: 'Dịch vụ Sửa chữa Mainboard (chập IC nguồn, mất áp 3V/5V)',
      categoryId: 'CAT-05',
      categoryName: 'Dịch vụ Sửa chữa Phần cứng',
      importPrice: 120000,
      retailPrice: 450000,
      wholesalePrice: 380000,
      stockQuantity: 999,
      minStockAlert: 0,
      unit: 'Lần',
      hasSerialImei: false,
      warrantyMonths: 3,
      description: 'Đo đạc thay thế Mosfet, IC nguồn xung cấp trước cho bo mạch.',
    },
    {
      id: 'PRD-009',
      sku: 'CPU-INTEL-I5-13400F',
      name: 'CPU Intel Core i5-13400F (Up to 4.6GHz, 10 Cores 16 Threads, LGA 1700)',
      categoryId: 'CAT-CPU',
      categoryName: 'CPU - Bộ Vi Xử Lý',
      importPrice: 4200000,
      retailPrice: 4950000,
      wholesalePrice: 4600000,
      stockQuantity: 8,
      minStockAlert: 2,
      unit: 'Chiếc',
      hasSerialImei: true,
      warrantyMonths: 36,
      description: 'CPU thế hệ 13 Raptor Lake cân tốt mọi tác vụ game và đồ họa 2D/3D.',
    },
    {
      id: 'PRD-010',
      sku: 'CPU-INTEL-I3-12100F',
      name: 'CPU Intel Core i3-12100F (Up to 4.3GHz, 4 Cores 8 Threads, LGA 1700)',
      categoryId: 'CAT-CPU',
      categoryName: 'CPU - Bộ Vi Xử Lý',
      importPrice: 1800000,
      retailPrice: 2250000,
      wholesalePrice: 2050000,
      stockQuantity: 12,
      minStockAlert: 3,
      unit: 'Chiếc',
      hasSerialImei: true,
      warrantyMonths: 36,
      description: 'CPU quốc dân phân khúc phổ thông gaming mượt mà PUBG, Valorant, Fo4.',
    },
    {
      id: 'PRD-011',
      sku: 'MB-ASUS-B760M-K',
      name: 'Bo Mạch Chủ Asus PRIME B760M-K D4 (Socket LGA1700, mATX, 2 khe RAM DDR4)',
      categoryId: 'CAT-MAIN',
      categoryName: 'Mainboard - Bo Mạch Chủ',
      importPrice: 2150000,
      retailPrice: 2650000,
      wholesalePrice: 2450000,
      stockQuantity: 6,
      minStockAlert: 2,
      unit: 'Chiếc',
      hasSerialImei: true,
      warrantyMonths: 36,
      description: 'Hỗ trợ PCIe 4.0, dual M.2 NVMe, Realtek 2.5Gb Ethernet.',
    },
    {
      id: 'PRD-012',
      sku: 'MB-MSI-H610M-E',
      name: 'Bo Mạch Chủ MSI PRO H610M-E DDR4 (LGA1700, mATX, HDMI, VGA)',
      categoryId: 'CAT-MAIN',
      categoryName: 'Mainboard - Bo Mạch Chủ',
      importPrice: 1550000,
      retailPrice: 1890000,
      wholesalePrice: 1750000,
      stockQuantity: 10,
      minStockAlert: 3,
      unit: 'Chiếc',
      hasSerialImei: true,
      warrantyMonths: 36,
      description: 'Lựa chọn tối ưu ngân sách cho CPU i3 12100F và i5 12400F.',
    },
    {
      id: 'PRD-013',
      sku: 'CASE-XIGMATEK-NYX',
      name: 'Vỏ Case Xigmatek NYX 3F (Kèm sẵn 3 Fan RGB, Mặt hông kính cường lực)',
      categoryId: 'CAT-CASE',
      categoryName: 'Vỏ Case Máy Tính',
      importPrice: 480000,
      retailPrice: 650000,
      wholesalePrice: 580000,
      stockQuantity: 9,
      minStockAlert: 2,
      unit: 'Chiếc',
      hasSerialImei: false,
      warrantyMonths: 12,
      description: 'Thiết kế luồng gió tối ưu, hỗ trợ main mATX, tản tháp 160mm.',
    },
    {
      id: 'PRD-014',
      sku: 'COOL-TR-AX120-ARGB',
      name: 'Tản nhiệt khí Thermalright Assassin X 120 Refined SE ARGB',
      categoryId: 'CAT-COOL',
      categoryName: 'Tản Nhiệt Khí & Nước',
      importPrice: 280000,
      retailPrice: 390000,
      wholesalePrice: 340000,
      stockQuantity: 15,
      minStockAlert: 3,
      unit: 'Bộ',
      hasSerialImei: false,
      warrantyMonths: 12,
      description: '4 ống đồng dẫn nhiệt trực tiếp, quạt PWM 120mm LED ARGB sync mainboard.',
    },
    {
      id: 'PRD-015',
      sku: 'MON-LG-24GN65R',
      name: 'Màn hình Gaming LG UltraGear 24GN65R-B 24" IPS 144Hz 1ms sRGB 99%',
      categoryId: 'CAT-MON',
      categoryName: 'Màn Hình Hiển Thị',
      importPrice: 2650000,
      retailPrice: 3250000,
      wholesalePrice: 2980000,
      stockQuantity: 5,
      minStockAlert: 2,
      unit: 'Chiếc',
      hasSerialImei: true,
      warrantyMonths: 24,
      description: 'Tần số quét 144Hz, FreeSync Premium, chân đế nâng hạ xoay dọc chuyên nghiệp.',
    },
  ];
}

export function createInitialImeis(): ImeiRecord[] {
  return [
    { id: 'IMEI-001', imei: 'DL5420-SN-8291823', productId: 'PRD-001', productName: 'Laptop Dell Latitude 5420', status: 'in_stock', purchaseDate: '2026-01-10T10:00:00.000Z' },
    { id: 'IMEI-002', imei: 'DL5420-SN-8291824', productId: 'PRD-001', productName: 'Laptop Dell Latitude 5420', status: 'in_stock', purchaseDate: '2026-01-10T10:00:00.000Z' },
    { id: 'IMEI-003', imei: 'ASUS-TUF-M9N0CV01', productId: 'PRD-002', productName: 'Laptop Gaming Asus TUF F15', status: 'in_stock', purchaseDate: '2026-02-01T14:00:00.000Z' },
    { id: 'IMEI-004', imei: 'KS-NV2-882910401', productId: 'PRD-003', productName: 'SSD Kingston NV2 500GB', status: 'in_stock', purchaseDate: '2026-02-15T08:00:00.000Z' },
    { id: 'IMEI-005', imei: 'KS-NV2-882910402', productId: 'PRD-003', productName: 'SSD Kingston NV2 500GB', status: 'in_stock', purchaseDate: '2026-02-15T08:00:00.000Z' },
    { id: 'IMEI-006', imei: 'KFURY-32-094812', productId: 'PRD-004', productName: 'RAM Kingston Fury Beast 16GB', status: 'in_stock', purchaseDate: '2026-02-20T11:00:00.000Z' },
    { id: 'IMEI-007', imei: 'RTX4060-DUAL-9921', productId: 'PRD-005', productName: 'Card màn hình Asus RTX 4060', status: 'in_stock', purchaseDate: '2026-03-01T09:00:00.000Z' },
  ];
}

export function createInitialCustomers(): Customer[] {
  return [
    {
      id: 'CUST-001',
      code: 'KH-0001',
      name: 'Nguyễn Hoàng Long',
      phone: '0915234888',
      email: 'hoanglong.tech@gmail.com',
      address: 'Số 45 Ngõ 102 Khuất Duy Tiến, Thanh Xuân, Hà Nội',
      totalSpent: 12500000,
      currentDebt: 0,
      createdAt: '2026-01-20T10:00:00.000Z',
    },
    {
      id: 'CUST-002',
      code: 'KH-0002',
      name: 'Chị Mai Lan Anh',
      phone: '0983567112',
      email: 'lananh.design@yahoo.com',
      address: 'Tòa Landmark 72, Keangnam, Cầu Giấy, Hà Nội',
      totalSpent: 4800000,
      currentDebt: 1200000,
      createdAt: '2026-02-05T14:30:00.000Z',
    },
    {
      id: 'CUST-003',
      code: 'KH-0003',
      name: 'Công ty TNHH Phần Mềm AlphaSoft',
      phone: '02438889999',
      email: 'contact@alphasoft.vn',
      address: 'Tầng 5, Tòa nhà Detech, Số 8 Tôn Thất Thuyết, Cầu Giấy',
      totalSpent: 35600000,
      currentDebt: 5000000,
      createdAt: '2026-01-12T08:15:00.000Z',
    },
  ];
}

export function createInitialRepairs(): RepairTicket[] {
  return [
    {
      id: 'REP-001',
      ticketCode: 'SC-202610-001',
      customerId: 'CUST-001',
      customerName: 'Nguyễn Hoàng Long',
      customerPhone: '0915234888',
      deviceName: 'Laptop Dell XPS 15 9570',
      model: 'XPS 15 9570 (Core i7-8750H / GTX 1050Ti)',
      deviceSerialImei: 'ST-9B7C1Y2',
      passCode: '1905',
      issueDescription: 'Bật nguồn quạt quay vèo vèo rồi tắt, đèn phím sáng nhưng không lên hình. Máy rất nóng khi sử dụng.',
      technicalDiagnosis: 'Chập tụ đường nguồn Vcore và khô keo tản nhiệt CPU/GPU dẫn đến ngắt bảo vệ nhiệt.',
      accessories: 'Thân máy, sạc ô-van zin 130W Dell, túi chống sốc',
      deviceCondition: 'Vỏ nhôm xước dăm nhẹ mặt A, cao su đáy còn nguyên vẹn',
      status: 'repairing',
      technicianId: 'USR-004',
      technicianName: 'Đặng Tuấn Anh',
      estimatedCost: 650000,
      finalCost: 600000,
      depositAmount: 200000,
      partsUsed: [
        {
          productId: 'PRD-007',
          productName: 'Dịch vụ Vệ sinh Laptop & Tra keo tản nhiệt Arctic MX-4',
          quantity: 1,
          unitPrice: 150000,
          total: 150000,
          addedAt: '2026-10-14T09:30:00.000Z',
        },
        {
          productId: 'PRD-008',
          productName: 'Dịch vụ Sửa chữa Mainboard (chập IC nguồn)',
          quantity: 1,
          unitPrice: 450000,
          total: 450000,
          addedAt: '2026-10-14T10:15:00.000Z',
        },
      ],
      receivedDate: '2026-10-13T08:45:00.000Z',
      estimatedCompletionDate: '2026-10-16T17:00:00.000Z',
      warrantyPeriodMonths: 3,
      notes: 'Khách dặn giữ lại dữ liệu ổ SSD vì có bài tập tốt nghiệp quan trọng.',
    },
    {
      id: 'REP-002',
      ticketCode: 'SC-202610-002',
      customerId: 'CUST-002',
      customerName: 'Chị Mai Lan Anh',
      customerPhone: '0983567112',
      deviceName: 'MacBook Pro 13 inch 2020 (M1)',
      model: 'A2338 M1 Space Gray',
      deviceSerialImei: 'C02DP0XXQ05D',
      passCode: 'lananh2020',
      issueDescription: 'Máy đang dùng thì màn hình bị sọc ngang, nhấp nháy liên tục khi gập mở bản lề.',
      technicalDiagnosis: 'Lỗi cáp màn hình (flexgate), cần thay cáp tín hiệu màn hình mới.',
      accessories: 'Thân máy, không kèm củ sạc',
      deviceCondition: 'Góc phải cấn nhẹ, màn hình không vỡ ngoài',
      status: 'waiting_parts',
      technicianId: 'USR-004',
      technicianName: 'Đặng Tuấn Anh',
      estimatedCost: 1200000,
      finalCost: 1200000,
      depositAmount: 500000,
      partsUsed: [],
      receivedDate: '2026-10-14T14:10:00.000Z',
      estimatedCompletionDate: '2026-10-17T12:00:00.000Z',
      warrantyPeriodMonths: 3,
      notes: 'Đã gọi báo khách giá 1.200.000đ, khách đã duyệt. Chờ nhà cung cấp giao cáp về chiều nay.',
    },
    {
      id: 'REP-003',
      ticketCode: 'SC-202610-003',
      customerId: 'CUST-003',
      customerName: 'Công ty TNHH Phần Mềm AlphaSoft',
      customerPhone: '02438889999',
      deviceName: 'Case PC Văn phòng Core i5',
      model: 'Main Asus H510M-K / i5-10400 / 8GB',
      deviceSerialImei: 'PC-ALPHASOFT-08',
      passCode: 'Không có mật khẩu',
      issueDescription: 'Khởi động vào Windows rất chậm (mất 5 phút), hay bị đơ chuột, ổ HDD 100% full load liên tục.',
      technicalDiagnosis: 'Ổ cứng HDD cơ khí cũ bị bad sector. Cần nâng cấp lên SSD NVMe Kingston 500GB và cài lại Win 11 Pro.',
      accessories: 'Thân cây PC, dây nguồn',
      deviceCondition: 'Vỏ case văn phòng bình thường',
      status: 'completed',
      technicianId: 'USR-004',
      technicianName: 'Đặng Tuấn Anh',
      estimatedCost: 1300000,
      finalCost: 1300000,
      depositAmount: 0,
      partsUsed: [
        {
          productId: 'PRD-003',
          productName: 'Ổ cứng SSD Kingston NV2 500GB PCIe NVMe',
          imei: 'KS-NV2-882910401',
          quantity: 1,
          unitPrice: 1150000,
          total: 1150000,
          addedAt: '2026-10-14T16:00:00.000Z',
        },
      ],
      receivedDate: '2026-10-14T09:00:00.000Z',
      completedDate: '2026-10-14T17:30:00.000Z',
      warrantyPeriodMonths: 36,
      notes: 'Đã ghost Windows 11 và clone dữ liệu cũ sang ổ mới. Đã test chạy mượt mà, máy sẵn sàng chờ công ty tới nhận.',
    },
  ];
}

export function createInitialInvoices(): Invoice[] {
  return [
    {
      id: 'INV-001',
      invoiceCode: 'HD-202610-001',
      customerId: 'CUST-001',
      customerName: 'Nguyễn Hoàng Long',
      customerPhone: '0915234888',
      salesId: 'USR-003',
      salesName: 'Lê Thị Thu Thảo',
      items: [
        {
          productId: 'PRD-001',
          productName: 'Laptop Dell Latitude 5420 (i5-1145G7, 16GB, 256GB)',
          imei: 'DL5420-SN-8291823',
          quantity: 1,
          unitPrice: 11200000,
          discount: 200000,
          total: 11000000,
          warrantyMonths: 12,
        },
      ],
      subTotal: 11200000,
      discount: 200000,
      finalAmount: 11000000,
      paidAmount: 11000000,
      debtAmount: 0,
      paymentMethod: 'transfer',
      status: 'paid',
      createdAt: '2026-10-10T14:30:00.000Z',
      note: 'Khách chuyển khoản Vietcombank đủ.',
    },
  ];
}

export function createInitialDebts(): Debt[] {
  return [
    {
      id: 'DEBT-001',
      type: 'customer',
      entityId: 'CUST-002',
      entityName: 'Chị Mai Lan Anh',
      entityPhone: '0983567112',
      referenceCode: 'HD-202610-002',
      totalDebt: 3200000,
      paidAmount: 2000000,
      remainingDebt: 1200000,
      dueDate: '2026-10-25',
      status: 'pending',
      createdAt: '2026-10-05T10:00:00.000Z',
      updatedAt: '2026-10-05T10:00:00.000Z',
      notes: 'Khách mua Ram + SSD nâng cấp, hẹn thanh toán nốt vào ngày 25.',
    },
    {
      id: 'DEBT-002',
      type: 'customer',
      entityId: 'CUST-003',
      entityName: 'Công ty TNHH Phần Mềm AlphaSoft',
      entityPhone: '02438889999',
      referenceCode: 'HD-202610-003',
      totalDebt: 15000000,
      paidAmount: 10000000,
      remainingDebt: 5000000,
      dueDate: '2026-10-30',
      status: 'pending',
      createdAt: '2026-10-08T16:00:00.000Z',
      updatedAt: '2026-10-08T16:00:00.000Z',
      notes: 'Mua 2 case máy tính văn phòng, hợp đồng thanh toán cuối tháng.',
    },
    {
      id: 'DEBT-003',
      type: 'supplier',
      entityId: 'SUPP-001',
      entityName: 'Công ty Cổ phần Máy tính Vĩnh Xuân (SPC)',
      entityPhone: '02439765415',
      referenceCode: 'PN-202610-01',
      totalDebt: 28500000,
      paidAmount: 15000000,
      remainingDebt: 13500000,
      dueDate: '2026-10-28',
      status: 'pending',
      createdAt: '2026-10-02T09:00:00.000Z',
      updatedAt: '2026-10-02T09:00:00.000Z',
      notes: 'Nhập lô SSD Kingston và RAM Fury. Hạn gối đầu 30 ngày.',
    },
  ];
}

export function createInitialWarranties(): Warranty[] {
  return [
    {
      id: 'WAR-001',
      warrantyCode: 'BH-202610-001',
      invoiceId: 'INV-001',
      productId: 'PRD-001',
      productName: 'Laptop Dell Latitude 5420',
      imei: 'DL5420-SN-8291823',
      customerId: 'CUST-001',
      customerName: 'Nguyễn Hoàng Long',
      customerPhone: '0915234888',
      startDate: '2026-10-10',
      endDate: '2027-10-10',
      status: 'active',
      claims: [],
    },
  ];
}

export function createInitialSuppliers(): Supplier[] {
  return [
    {
      id: 'SUPP-001',
      code: 'NCC-01',
      name: 'Công ty Cổ phần Máy tính Vĩnh Xuân (SPC Distribution)',
      contactPerson: 'Anh Trần Hùng',
      phone: '02439765415',
      email: 'sales@spc.com.vn',
      address: 'Số 9 ngõ 117 Thái Hà, Đống Đa, Hà Nội',
      currentDebt: 13500000,
    },
    {
      id: 'SUPP-002',
      code: 'NCC-02',
      name: 'Công ty TNHH Tin học Viết Sơn',
      contactPerson: 'Chị Bích Ngọc',
      phone: '02838444378',
      email: 'order@vietson.com',
      address: '150 Trần Quang Khải, P. Tân Định, Quận 1, TP.HCM',
      currentDebt: 0,
    },
  ];
}

export function createInitialSettings(): StoreSettings {
  return {
    storeName: 'TRUNG TÂM MÁY TÍNH & DỊCH VỤ CÔNG NGHỆ DATASOFT',
    address: 'Số 168 Đường Cầu Giấy, Phường Dịch Vọng, Cầu Giấy, Hà Nội',
    phone: '0988.123.456 - 024.3799.8888',
    email: 'hotro@datasoft-pc.vn',
    website: 'https://datasoft-pc.vn',
    taxId: '0108928374',
    bankName: 'Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank)',
    bankAccount: '998812345678',
    bankOwner: 'NGUYEN THANH NAM',
    invoiceFooterNote: 'Cảm ơn Quý khách đã tin tưởng và sử dụng dịch vụ tại DATASOFT! Quý khách vui lòng giữ hóa đơn để được hỗ trợ bảo hành chính hãng.',
    repairTicketFooterNote: 'Quý khách vui lòng kiểm tra kỹ phụ kiện và tình trạng máy khi nhận lại. Phiếu tiếp nhận có giá trị trong vòng 30 ngày kể từ ngày thông báo hoàn thành.',
    warrantyPolicy: '1 đổi 1 trong 30 ngày đầu với linh kiện lỗi phần cứng do nhà sản xuất. Không bảo hành các trường hợp rơi vỡ, vào nước, cháy nổ, tem bảo hành bị rách.',
    lastBackupDate: new Date().toISOString(),
  };
}

export function createInitialPcBuilds(): PcBuild[] {
  return [
    {
      id: 'BUILD-001',
      buildCode: 'PC-202610-001',
      buildName: 'Cấu hình Gaming Esports Core i5 13400F / RTX 4060 8GB OC',
      customerId: 'CUST-001',
      customerName: 'Nguyễn Hoàng Long',
      customerPhone: '0915234888',
      creatorId: 'USR-003',
      creatorName: 'Lê Thị Thu Thảo (Kinh doanh)',
      items: [
        {
          categoryId: 'CAT-CPU',
          categoryName: 'CPU - Bộ Vi Xử Lý',
          productId: 'PRD-009',
          productName: 'CPU Intel Core i5-13400F (Up to 4.6GHz, 10 Cores 16 Threads)',
          sku: 'CPU-INTEL-I5-13400F',
          quantity: 1,
          unitPrice: 4950000,
          discount: 0,
          total: 4950000,
          warrantyMonths: 36,
        },
        {
          categoryId: 'CAT-MAIN',
          categoryName: 'Mainboard - Bo Mạch Chủ',
          productId: 'PRD-011',
          productName: 'Bo Mạch Chủ Asus PRIME B760M-K D4',
          sku: 'MB-ASUS-B760M-K',
          quantity: 1,
          unitPrice: 2650000,
          discount: 0,
          total: 2650000,
          warrantyMonths: 36,
        },
        {
          categoryId: 'CAT-RAM',
          categoryName: 'RAM - Bộ Nhớ Trong',
          productId: 'PRD-004',
          productName: 'RAM Kingston Fury Beast 16GB DDR4 Bus 3200MHz',
          sku: 'RAM-FURY-16G-3200',
          quantity: 2,
          unitPrice: 950000,
          discount: 0,
          total: 1900000,
          warrantyMonths: 36,
        },
        {
          categoryId: 'CAT-SSD',
          categoryName: 'SSD & Ổ Cứng Lưu Trữ',
          productId: 'PRD-003',
          productName: 'Ổ cứng SSD Kingston NV2 500GB PCIe 4.0 x4 M.2 NVMe',
          sku: 'SSD-KS-NV2-500G',
          quantity: 1,
          unitPrice: 1150000,
          discount: 0,
          total: 1150000,
          warrantyMonths: 36,
        },
        {
          categoryId: 'CAT-VGA',
          categoryName: 'VGA - Card Màn Hình',
          productId: 'PRD-005',
          productName: 'Card màn hình Asus Dual GeForce RTX 4060 OC Edition 8GB GDDR6',
          sku: 'VGA-ASUS-4060',
          quantity: 1,
          unitPrice: 8900000,
          discount: 0,
          total: 8900000,
          warrantyMonths: 36,
        },
        {
          categoryId: 'CAT-PSU',
          categoryName: 'Nguồn Máy Tính (PSU)',
          productId: 'PRD-006',
          productName: 'Nguồn máy tính Corsair CV650 650W 80 Plus Bronze',
          sku: 'PSU-CORSAIR-650',
          quantity: 1,
          unitPrice: 1390000,
          discount: 0,
          total: 1390000,
          warrantyMonths: 36,
        },
        {
          categoryId: 'CAT-CASE',
          categoryName: 'Vỏ Case Máy Tính',
          productId: 'PRD-013',
          productName: 'Vỏ Case Xigmatek NYX 3F (Kèm sẵn 3 Fan RGB, Kính cường lực)',
          sku: 'CASE-XIGMATEK-NYX',
          quantity: 1,
          unitPrice: 650000,
          discount: 0,
          total: 650000,
          warrantyMonths: 12,
        },
        {
          categoryId: 'CAT-COOL',
          categoryName: 'Tản Nhiệt Khí & Nước',
          productId: 'PRD-014',
          productName: 'Tản nhiệt khí Thermalright Assassin X 120 Refined SE ARGB',
          sku: 'COOL-TR-AX120-ARGB',
          quantity: 1,
          unitPrice: 390000,
          discount: 0,
          total: 390000,
          warrantyMonths: 12,
        },
      ],
      totalPrice: 22980000,
      discount: 480000,
      finalPrice: 22500000,
      note: 'Khách yêu cầu lắp đặt tản khí ARGB và cài sẵn Windows 11 bản quyền.',
      createdAt: '2026-10-14T11:00:00.000Z',
      status: 'draft',
    },
  ];
}

export function createInitialPrintTemplates(): PrintTemplate[] {
  return [
    {
      id: 'TMPL-INV-01',
      templateName: 'Hóa Đơn Bán Hàng & Phiếu Xuất Kho Chuẩn A4/A5',
      type: 'invoice',
      isDefault: true,
      variables: [
        'store_name',
        'store_address',
        'store_phone',
        'invoice_code',
        'customer_name',
        'customer_phone',
        'customer_address',
        'items_table',
        'subtotal',
        'discount',
        'final_amount',
        'paid_amount',
        'debt_amount',
        'bank_info',
        'sales_name',
        'date',
        'footer_note',
      ],
      htmlContent: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.5;">
  <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px;">
    <div>
      <h1 style="margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.5px; color: #0f172a;">{{store_name}}</h1>
      <p style="margin: 4px 0 0; font-size: 13px; color: #475569;">{{store_address}}</p>
      <p style="margin: 2px 0 0; font-size: 13px; color: #475569;">Hotline: <strong>{{store_phone}}</strong></p>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 18px; font-weight: 800; font-family: monospace; color: #059669;">{{invoice_code}}</div>
      <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Ngày lập: {{date}}</div>
      <div style="font-size: 12px; color: #64748b;">Nhân viên: <strong>{{sales_name}}</strong></div>
    </div>
  </div>

  <div style="text-align: center; margin-bottom: 24px;">
    <h2 style="margin: 0; font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a;">HÓA ĐƠN BÁN HÀNG & BẢO HÀNH</h2>
  </div>

  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; font-size: 13px;">
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
      <div>Khách hàng: <strong style="color: #0f172a;">{{customer_name}}</strong></div>
      <div>Điện thoại: <strong style="font-family: monospace; color: #0f172a;">{{customer_phone}}</strong></div>
      <div style="grid-column: span 2;">Địa chỉ: {{customer_address}}</div>
    </div>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
    <thead>
      <tr style="background: #f1f5f9; border-top: 1px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; text-align: left;">
        <th style="padding: 10px; width: 40px; text-align: center;">#</th>
        <th style="padding: 10px;">Tên sản phẩm / Linh kiện & Số Serial IMEI</th>
        <th style="padding: 10px; width: 60px; text-align: center;">BH</th>
        <th style="padding: 10px; width: 50px; text-align: center;">SL</th>
        <th style="padding: 10px; width: 110px; text-align: right;">Đơn giá</th>
        <th style="padding: 10px; width: 120px; text-align: right;">Thành tiền</th>
      </tr>
    </thead>
    <tbody>
      {{items_table}}
    </tbody>
  </table>

  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; font-size: 13px;">
    <div style="max-width: 320px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;">
      <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">Thông tin thanh toán ngân hàng:</div>
      <div style="font-size: 12px; color: #475569;">{{bank_info}}</div>
    </div>
    <div style="width: 260px; text-align: right;">
      <div style="display: flex; justify-content: space-between; padding: 4px 0;">
        <span>Tổng tiền hàng:</span>
        <strong style="font-family: monospace;">{{subtotal}}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #dc2626;">
        <span>Chiết khấu / Giảm giá:</span>
        <strong style="font-family: monospace;">-{{discount}}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-top: 2px solid #cbd5e1; font-size: 15px; font-weight: 800; color: #059669;">
        <span>TỔNG THANH TOÁN:</span>
        <span style="font-family: monospace;">{{final_amount}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px;">
        <span>Khách đã trả:</span>
        <span style="font-family: monospace;">{{paid_amount}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: #e11d48; font-weight: 700;">
        <span>Còn nợ lại:</span>
        <span style="font-family: monospace;">{{debt_amount}}</span>
      </div>
    </div>
  </div>

  <div style="border-top: 1px dashed #cbd5e1; padding-top: 12px; font-size: 11px; color: #64748b; margin-bottom: 36px;">
    {{footer_note}}
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; text-align: center; font-size: 13px;">
    <div>
      <div style="font-weight: 700; text-transform: uppercase;">Khách hàng</div>
      <div style="font-size: 11px; color: #64748b; font-style: italic; margin-bottom: 60px;">(Ký và ghi rõ họ tên)</div>
      <div style="font-weight: 600;">{{customer_name}}</div>
    </div>
    <div>
      <div style="font-weight: 700; text-transform: uppercase;">Đại diện Cửa hàng</div>
      <div style="font-size: 11px; color: #64748b; font-style: italic; margin-bottom: 60px;">(Ký và ghi rõ họ tên)</div>
      <div style="font-weight: 600;">{{sales_name}}</div>
    </div>
  </div>
</div>`,
      createdAt: '2026-10-15T00:00:00.000Z',
    },
    {
      id: 'TMPL-REP-01',
      templateName: 'Phiếu Tiếp Nhận & Biên Lai Sửa Chữa Máy Tính',
      type: 'repair_ticket',
      isDefault: true,
      variables: [
        'store_name',
        'store_address',
        'store_phone',
        'ticket_code',
        'customer_name',
        'customer_phone',
        'device_name',
        'model',
        'device_serial',
        'passcode',
        'accessories',
        'condition',
        'issue_description',
        'diagnosis',
        'estimated_cost',
        'deposit_amount',
        'remaining_cost',
        'technician_name',
        'date',
        'warranty_period',
        'footer_note',
      ],
      htmlContent: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.5;">
  <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 18px;">
    <div>
      <h1 style="margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase; color: #0f172a;">{{store_name}}</h1>
      <p style="margin: 4px 0 0; font-size: 12px; color: #475569;">{{store_address}}</p>
      <p style="margin: 2px 0 0; font-size: 12px; color: #475569;">Hotline Kỹ thuật: <strong>{{store_phone}}</strong></p>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 18px; font-weight: 800; font-family: monospace; color: #2563eb;">{{ticket_code}}</div>
      <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Ngày nhận: {{date}}</div>
    </div>
  </div>

  <div style="text-align: center; margin-bottom: 20px;">
    <h2 style="margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; color: #0f172a;">PHIẾU TIẾP NHẬN SỬA CHỮA MÁY TÍNH</h2>
    <div style="font-size: 11px; color: #64748b; font-style: italic;">(Biên nhận kiêm phiếu bảo hành dịch vụ)</div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; font-size: 13px;">
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;">
      <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px; text-transform: uppercase; font-size: 11px;">Thông tin khách hàng</div>
      <div>Khách hàng: <strong>{{customer_name}}</strong></div>
      <div>Số điện thoại: <strong style="font-family: monospace;">{{customer_phone}}</strong></div>
      <div>Kỹ thuật viên tiếp nhận: <strong>{{technician_name}}</strong></div>
    </div>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;">
      <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px; text-transform: uppercase; font-size: 11px;">Thông tin thiết bị</div>
      <div>Thiết bị: <strong>{{device_name}}</strong></div>
      <div>Số Serial / IMEI: <strong style="font-family: monospace; color: #2563eb;">{{device_serial}}</strong></div>
      <div>Mật khẩu máy: <span style="font-family: monospace;">{{passcode}}</span></div>
    </div>
  </div>

  <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 16px; font-size: 13px;">
    <div style="margin-bottom: 8px;"><strong>Tình trạng lỗi do khách khai báo:</strong> {{issue_description}}</div>
    <div style="margin-bottom: 8px;"><strong>Phụ kiện kèm theo:</strong> {{accessories}} | <strong>Ngoại quan:</strong> {{condition}}</div>
    <div><strong>Chuẩn đoán kỹ thuật:</strong> {{diagnosis}}</div>
  </div>

  <div style="display: flex; justify-content: flex-end; margin-bottom: 24px; font-size: 13px;">
    <div style="width: 280px; text-align: right;">
      <div style="display: flex; justify-content: space-between; padding: 4px 0;">
        <span>Dự toán chi phí:</span>
        <strong style="font-family: monospace;">{{estimated_cost}}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #059669;">
        <span>Khách đã đặt cọc:</span>
        <strong style="font-family: monospace;">{{deposit_amount}}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0; border-top: 1px solid #cbd5e1; font-weight: 700; color: #e11d48;">
        <span>Còn lại khi nhận máy:</span>
        <strong style="font-family: monospace;">{{remaining_cost}}</strong>
      </div>
    </div>
  </div>

  <div style="border-top: 1px dashed #cbd5e1; padding-top: 10px; font-size: 11px; color: #64748b; margin-bottom: 30px;">
    {{footer_note}}
    <div>Thời hạn bảo hành dịch vụ: <strong>{{warranty_period}}</strong>.</div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; text-align: center; font-size: 13px;">
    <div>
      <div style="font-weight: 700; text-transform: uppercase;">Khách hàng gửi máy</div>
      <div style="font-size: 11px; color: #64748b; font-style: italic; margin-bottom: 50px;">(Ký và ghi rõ họ tên)</div>
      <div style="font-weight: 600;">{{customer_name}}</div>
    </div>
    <div>
      <div style="font-weight: 700; text-transform: uppercase;">Đại diện Cửa hàng</div>
      <div style="font-size: 11px; color: #64748b; font-style: italic; margin-bottom: 50px;">(Kỹ thuật viên)</div>
      <div style="font-weight: 600;">{{technician_name}}</div>
    </div>
  </div>
</div>`,
      createdAt: '2026-10-15T00:00:00.000Z',
    },
  ];
}

export function createInitialPrintHistory(): PrintHistoryItem[] {
  return [
    {
      id: 'PRN-HIST-001',
      documentId: 'INV-001',
      documentCode: 'HD-202610-001',
      documentType: 'invoice',
      templateId: 'TMPL-INV-01',
      printedBy: 'USR-003',
      printedByName: 'Lê Thị Thu Thảo',
      printedAt: '2026-10-10T14:35:00.000Z',
    },
  ];
}

