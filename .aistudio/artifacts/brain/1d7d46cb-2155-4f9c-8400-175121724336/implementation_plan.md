# Hệ thống Quản lý Cửa hàng Buôn bán & Sửa chữa Máy tính (DATASOFT Engine)

Hệ thống quản lý bán hàng, tồn kho theo IMEI/Serial, tiếp nhận sửa chữa, bảo hành và quản lý công nợ chạy trên mạng nội bộ (LAN) Ubuntu Server, sử dụng cơ sở dữ liệu file-based tương thích ngược với thư mục `DATASOFT`.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Dưới đây là các quyết định kỹ thuật đã được thống nhất và các khuyến nghị triển khai:

- **Confirmed Decision 1 (Backend Stack)**: Sử dụng **Node.js & Express với TypeScript**. Kiến trúc này cho phép đồng bộ kiểu dữ liệu (Shared TypeScript Types) giữa backend và frontend, hiệu năng I/O bất đồng bộ vượt trội khi xử lý đọc/ghi file JSON.
- **Confirmed Decision 2 (Concurrency Control)**: Xử lý ghi đồng thời (Concurrency Safety) bằng cơ chế **Async Write Queue + Atomic File Replacement** (Ghi ra file `.tmp` tạm thời rồi thực hiện atomic rename `fs.promises.rename`). Cơ chế này ngăn chặn tuyệt đối tình trạng race condition, file rỗng hoặc file hỏng (file corruption) khi nhiều máy client trong mạng LAN cùng bấm Lưu.
- **Confirmed Decision 3 (Sample Data)**: Tự động khởi tạo dữ liệu mẫu thực tế chuẩn tiếng Việt (linh kiện PC, laptop Dell/Asus, đơn sửa chữa, IMEI, khách hàng, cấu hình shop) cho toàn bộ 11 file trong thư mục `DATASOFT`.
- **System Service Strategy**: Đóng gói backend chạy qua tiến trình `systemd` tiêu chuẩn của Ubuntu Linux với `Restart=always`, tự động khởi động cùng hệ điều hành và lắng nghe trên `0.0.0.0:3000`.

---

## 1. Tổng quan Kiến trúc Hệ thống & Luồng Nghiệp vụ

### Mục tiêu & Đối tượng Phục vụ
Hệ thống giải quyết trọn vẹn vòng đời nghiệp vụ của một trung tâm dịch vụ máy tính:
1. **Khách hàng mang máy đến sửa**: Kỹ thuật viên tiếp nhận, ghi nhận tình trạng máy, số IMEI/Serial, mật khẩu máy, phụ kiện đi kèm -> In phiếu biên nhận có mã vạch/mã số phiếu.
2. **Quy trình Kỹ thuật**: Tiếp nhận -> Chờ kiểm tra -> Đang kiểm tra/báo giá -> Chờ khách xác nhận -> Chờ linh kiện (tạo phiếu đề xuất xuất kho linh kiện) -> Đang sửa -> Kiểm thử (QA/QC) -> Đã hoàn thành / Báo khách nhận máy -> Đã giao máy & kích hoạt bảo hành.
3. **Bán hàng & Kho**: Bán laptop/linh kiện chọn trực tiếp theo mã IMEI/Serial. Tự động trừ tồn kho, tạo hóa đơn bán lẻ, quản lý thanh toán tiền mặt/chuyển khoản/công nợ.
4. **Phân quyền Động (RBAC)**:
   - **Admin**: Toàn quyền cấu hình, phân quyền, sao lưu dữ liệu `DATASOFT`.
   - **Chủ cửa hàng (Manager)**: Báo cáo tài chính, doanh thu, lợi nhuận, công nợ, quản lý kho nhưng không can thiệp cài đặt kỹ thuật hệ thống.
   - **Bán hàng (Sales)**: Lên đơn hàng, báo giá, xem tồn kho & số serial (ẩn hoàn toàn giá vốn nhập kho), quản lý khách hàng.
   - **Kỹ thuật viên (Technician)**: Tiếp nhận ca sửa, cập nhật tiến độ sửa chữa, tra cứu lịch sử bảo hành theo IMEI/SĐT, đề xuất xuất linh kiện thay thế.

---

## 2. Thiết kế Giao diện Người dùng & Trải nghiệm (UI/UX)

- **Bố cục Không gian Làm việc (Workspace Canvas)**:
  - Sidebar cố định $250\text{px}$ với phân mục rõ ràng: Dashboard, Tiếp nhận & Sửa chữa, Kho hàng & Serial/IMEI, Bán hàng & Hóa đơn, Bảo hành & Khách hàng, Công nợ, Quản trị hệ thống.
  - Topbar tiêu chuẩn: Breadcrumbs vị trí hiện tại, ô tìm kiếm nhanh (IMEI / Số điện thoại khách / Mã phiếu), bộ chuyển đổi tài khoản/vai trò (Role Switcher tiện lợi để kiểm thử RBAC) và thông tin nhân viên đăng nhập.
  - Vùng nội dung chính: Tối ưu cho màn hình $1440\text{px}$, bảng dữ liệu mật độ cao (High-density Table) với chiều cao hàng $38\text{px} - 42\text{px}$, căn lề số tiền và số lượng rõ ràng với `tabular-nums`.
- **Nguyên tắc Anti-Slop & Bảng dữ liệu**:
  - Không sử dụng pill lồng nhau hoặc thẻ màu sắc lòe loẹt. Metadata sử dụng chữ trần kèm dấu phân cách typographic (`·`).
  - Màu sắc ngữ thái: Xanh lá (`#16A34A`) cho trạng thái Hoàn thành / Đã thanh toán; Vàng cam (`#D97706`) cho Chờ linh kiện / Chờ khách duyệt; Đỏ (`#DC2626`) cho Quá hạn / Báo hủy.
  - Hỗ trợ in phiếu sửa chữa và in hóa đơn bán hàng tiêu chuẩn khổ A4 / A5 hoặc máy in nhiệt K80.

---

## 3. Quyết định Kỹ thuật Cốt lõi & Cơ chế An toàn Dữ liệu

### A. Cơ chế Atomic Write + Mutex Queue cho `DATASOFT`
Xử lý đọc ghi file JSON trên hệ điều hành Ubuntu trong môi trường mạng LAN nhiều người dùng:
1. **File Locking / Queue**: Sử dụng một hàng đợi ghi bất đồng bộ (Per-file Write Queue). Mỗi file JSON (ví dụ `repairs.json`) có một chuỗi Promise độc quyền đảm bảo tại một thời điểm chỉ có 1 tác vụ ghi được thực thi.
2. **Atomic Write Replacement**:
   - Ghi dữ liệu mới vào một file tạm: `DATASOFT/repairs.json.tmp.<timestamp>.<pid>`.
   - Gọi `fs.promises.rename(tempFile, targetFile)`. Trên hệ thống file POSIX (Linux Ubuntu ext4), thao tác `rename` là **atomic** (nguyên tử) ở cấp độ kernel. Nếu mất điện hoặc crash giữa chừng, file gốc không bao giờ bị corrupt hay rỗng nửa chừng.
3. **Auto Snapshot & Backup**: Tự động tạo bản sao lưu snapshot vào thư mục `DATASOFT/backups/` định kỳ hoặc trước các thao tác quan trọng.

---

## 4. Kiến trúc Kỹ thuật & Cấu trúc Dữ liệu

### A. Sơ đồ Kiến trúc Hệ thống

```
┌────────────────────────────────────────────────────────────────────────┐
│                   LAN Clients (Trình duyệt Web PC/Tablet)              │
│       Chrome / Firefox / Edge truy cập http://192.168.1.xxx:3000       │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTP / REST API + Single Page App
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Ubuntu Server (Port 3000 - Node.js Express App)          │
│                                                                        │
│  ┌───────────────────────┐             ┌────────────────────────────┐  │
│  │   Vite Frontend SPA   │             │   Express API Controllers  │  │
│  │  - Dashboard & Charts │             │  - Auth & RBAC Middleware  │  │
│  │  - Repair Intake/Flow │ ◄─────────► │  - Repair Service          │  │
│  │  - Inventory & IMEI   │             │  - Inventory & Invoice Svc │  │
│  │  - Invoicing & Debts  │             │  - Warranty & Customer Svc │  │
│  └───────────────────────┘             └─────────────┬──────────────┘  │
│                                                      │                 │
│                                                      ▼                 │
│                                        ┌────────────────────────────┐  │
│                                        │   JSON File Repository     │  │
│                                        │  - Async Write Mutex Queue │  │
│                                        │  - Atomic .tmp -> rename   │  │
│                                        │  - Read Cache & Invalidation│ │
│                                        └─────────────┬──────────────┘  │
└──────────────────────────────────────────────────────┼─────────────────┘
                                                       │ fs.promises
                                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        DATASOFT Data Directory                         │
│  ├── categories.json     ├── customers.json    ├── debts.json          │
│  ├── imeis.json          ├── invoices.json     ├── products.json       │
│  ├── repairs.json        ├── settings.json     ├── suppliers.json      │
│  ├── users.json          └── warranties.json   └── backups/            │
└────────────────────────────────────────────────────────────────────────┘
```

### B. Cấu trúc Mô hình Dữ liệu 11 File trong `DATASOFT`

1. **`users.json`**:
   `{ id, username, passwordHash, salt, fullName, role: 'admin'|'manager'|'sales'|'technician', active, phone, permissions: string[] }`
2. **`repairs.json`**:
   `{ id, ticketCode, customerId, deviceName, deviceSerialImei, model, issueDescription, accessories, passCode, status: 'received'|'diagnosing'|'waiting_approval'|'waiting_parts'|'repairing'|'completed'|'delivered'|'cancelled', technicianId, estimatedCost, finalCost, depositAmount, partsUsed: [{ productId, imei, quantity, unitPrice }], receivedDate, estimatedCompletionDate, completedDate, notes }`
3. **`products.json`**:
   `{ id, sku, name, categoryId, importPrice, retailPrice, wholesalePrice, stockQuantity, minStockAlert, unit, hasSerialImei, warrantyMonths, description }`
4. **`imeis.json`**:
   `{ id, imei, productId, status: 'in_stock'|'sold'|'faulty'|'repairing', invoiceId, supplierId, purchaseDate, exportDate }`
5. **`customers.json`**:
   `{ id, code, name, phone, email, address, totalSpent, currentDebt, createdAt }`
6. **`invoices.json`**:
   `{ id, invoiceCode, customerId, salesId, items: [{ productId, imei, quantity, unitPrice, discount, total }], subTotal, discount, tax, finalAmount, paidAmount, paymentMethod, status, createdAt }`
7. **`debts.json`**:
   `{ id, type: 'customer'|'supplier', entityId, referenceInvoiceId, totalDebt, paidAmount, remainingDebt, dueDate, status, history: [] }`
8. **`warranties.json`**:
   `{ id, warrantyCode, invoiceId, productId, imei, customerId, startDate, endDate, status, claimHistory: [] }`
9. **`categories.json`**:
   `{ id, name, slug, description, type: 'product'|'service' }`
10. **`suppliers.json`**:
    `{ id, code, name, contactPerson, phone, email, address, currentDebt }`
11. **`settings.json`**:
    `{ storeName, address, phone, email, taxId, bankAccount, qrBankInfo, invoiceFooter, repairTicketFooter, backupAutoHour }`

### C. Kế hoạch Hiện thực hóa (Implementation Steps)
- **Bước 1**: Xây dựng cấu trúc thư mục backend & module `DATASOFT/` với đầy đủ 11 file JSON và bộ generator dữ liệu mẫu ban đầu.
- **Bước 2**: Viết lớp `JsonDatabaseEngine` với cơ chế Promise Queue + Atomic Temporary File Rename + Đảm bảo thread-safe/process-safe.
- **Bước 3**: Viết Module Authentication & RBAC (đăng nhập an toàn, middleware kiểm tra quyền hạn) và Module Tiếp nhận Sửa chữa (quản lý trọn vẹn luồng tiếp nhận, sửa chữa, báo giá, xuất linh kiện, hoàn thành).
- **Bước 4**: Tích hợp các module giao diện người dùng tương ứng (Dashboard, Sửa chữa, Bán hàng, Kho IMEI, Tra cứu bảo hành, Quản trị) với khả năng đổi role trực tiếp để test RBAC.
- **Bước 5**: Viết tài liệu hướng dẫn cấu hình chi tiết cho Ubuntu Server: tệp service systemd, cấu hình mạng LAN, tường lửa ufw, tự động chạy khi khởi động máy.

---

## 5. Xác nhận Kế hoạch

Kế hoạch trên đã tổng hợp đầy đủ các yêu cầu nghiệp vụ, tính an toàn cho file JSON trên Ubuntu, và trải nghiệm người dùng thực tế. Xin hãy phê duyệt để bắt đầu triển khai mã nguồn.
