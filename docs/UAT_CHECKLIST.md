# 📋 BẢNG KIỂM NGHIỆM THU TOÀN DIỆN HỆ THỐNG STORE-MANAGE (UAT CHECKLIST)
> **Dự án:** Phần Mềm Quản Lý Bán Hàng & Dịch Vụ Máy Tính DATASOFT POS  
> **Phiên bản:** Release Candidate v1.0.0 (Production Ready)  
> **Kiến trúc:** React 19 + TypeScript + Node.js Express + JSON Database Engine (Atomic Mutex Queue)  
> **Ngày lập kịch bản:** Tháng 10/2026  
> **Người thực hiện nghiệm thu:** _________________________ | **Chức vụ:** _________________________

---

## 🎯 MỤC TIÊU & QUY ƯỚC NGHIỆM THU
- **Mục tiêu:** Kiểm tra toàn diện mọi nghiệp vụ thực tế tại cửa hàng máy tính, đảm bảo **không có lỗ hổng rò rỉ giá vốn**, **không mất mát dữ liệu khi ghi đồng thời**, và **dòng tiền công nợ - bảo hành - kho vận ăn khớp 100%**.
- **Quy ước đánh giá:**
  - `[ ]` Chưa kiểm tra
  - `[x]` Đã đạt (Pass)
  - `[!]` Thất bại (Fail) / Cần lưu ý xử lý

---

## 📌 THÔNG TIN TÀI KHOẢN MẪU ĐỂ TEST
| Vai trò (Role) | Tên đăng nhập | Mật khẩu mặc định | Quyền hạn kiểm tra |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin` | `123456` | Toàn quyền cấu hình, xem giá vốn, báo cáo lợi nhuận, sao lưu database |
| **Nhân viên Bán hàng (Sales)** | `sales01` | `123456` | POS, Tạo hóa đơn, CRM Khách hàng, Tiếp nhận sửa chữa (Ẩn giá vốn) |
| **Kỹ thuật viên (Technician)** | `tech01` | `123456` | Xử lý phiếu sửa chữa, xuất linh kiện kho, tra cứu bảo hành (Ẩn giá vốn) |

---

# 🚀 KỊCH BẢN 1: BÁN HÀNG & GHI NỢ (E2E SALES, DISCOUNT, PARTIAL PAYMENT & DEBT RECOVERY)
*Luồng nghiệp vụ sinh tử: Nhập kho linh kiện có Serial/IMEI -> Bán lẻ có chiết khấu -> Khách trả 1 nửa, nợ 1 nửa -> In hóa đơn VietQR tiền nợ -> Thu hồi dứt điểm công nợ.*

### BƯỚC 1: NHẬP KHO 5 MAINBOARD (CÓ QUÉT SỐ SERIAL/IMEI)
- [ ] **1.1.** Đăng nhập với tài khoản `admin` (hoặc tài khoản có quyền Quản lý kho).
- [ ] **1.2.** Truy cập tab **Nhập Hàng** (Purchasing) -> Bấm nút **"Tạo Phiếu Nhập Kho"**.
- [ ] **1.3.** Chọn Nhà cung cấp: **Công ty Cổ phần Công nghệ Asus Việt Nam** (hoặc tạo NCC mới).
- [ ] **1.4.** Chọn sản phẩm: **Mainboard ASUS ROG Strix B760-A Gaming WiFi D4** (Số lượng: **5** chiếc, Đơn giá nhập: **6.200.000 đ**).
- [ ] **1.5.** Nhập danh sách 5 số Serial/IMEI tương ứng (hoặc dùng máy quét mã vạch bắn 5 lần):
  - IMEI 1: `MB-B760-UAT-001`
  - IMEI 2: `MB-B760-UAT-002`
  - IMEI 3: `MB-B760-UAT-003`
  - IMEI 4: `MB-B760-UAT-004`
  - IMEI 5: `MB-B760-UAT-005`
- [ ] **1.6.** Bấm **"Lưu & Xác Nhận Nhập Kho"**.
- [ ] **1.7. Kiểm tra kết quả:**
  - Phiếu nhập kho được tạo với mã dạng `PNK-YYYYMM-XXX`.
  - Vào tab **Kho Hàng** (Inventory): Tồn kho của Mainboard B760 tăng thêm đúng 5 chiếc.
  - Xem tab **Quản lý Serial/IMEI**: 5 số Serial trên đều ở trạng thái `in_stock` (Trong kho), màu xanh lá.

---

### BƯỚC 2: MỞ POS BÁN HÀNG & TEST VALIDATION CHẶN LỖI (GIỎ HÀNG POS)
- [ ] **2.1.** Chuyển sang tài khoản `sales01` (để test đúng góc nhìn nhân viên thu ngân).
- [ ] **2.2.** Mở tab **Bán Hàng POS**:
  - Nhập thông tin khách hàng: Tên: **Trần Văn Khang** | SĐT: **0988.555.777**.
- [ ] **2.3.** Chọn sản phẩm Mainboard ASUS B760 vào giỏ hàng.
- [ ] **2.4.** Hệ thống bật popup yêu cầu chọn số Serial/IMEI xuất kho -> Chọn mã: `MB-B760-UAT-001`.
- [ ] **2.5.** Kiểm tra giỏ hàng: Hiển thị 1 Mainboard, đơn giá niêm yết: **7.500.000 đ**.
- [ ] **2.6. TEST CHẶN LỖI Ô INPUT "Chiết khấu (%)":**
  - [ ] Thử gõ ký tự chữ cái (`abc`, `test`): **Không hiển thị, bị chặn 100%**.
  - [ ] Thử gõ dấu âm (`-10`, `-`): **Bị chặn tuyệt đối, không nhận dấu trừ**.
  - [ ] Gõ chiết khấu: **`10`** (tức 10%).
  - [ ] Quan sát: Tiền chiết khấu tự động tính bằng: **`750.000 đ`**.
  - [ ] Tổng thanh toán sau giảm trừ: **`6.750.000 đ`**.
- [ ] **2.7. TEST CHẶN LỖI Ô INPUT "Khách Thanh Toán":**
  - [ ] Thử gõ ký tự chữ cái hoặc ký hiệu (`@#$`, `xyz`): **Bị chặn hoàn toàn**.
  - [ ] Thử gõ số âm (`-500000`): **Không nhận dấu âm**.
  - [ ] Khách chỉ trả một nửa tiền: Nhập vào ô "Khách thanh toán": **`3.375.000`**.
  - [ ] Quan sát huy hiệu thông báo bên dưới: Hiển thị chữ đỏ cảnh báo: **`Ghi nợ: 3.375.000 đ`**.

---

### BƯỚC 3: XUẤT HÓA ĐƠN & KIỂM TRA MÃ VIETQR TIỀN NỢ
- [ ] **3.1.** Phương thức thanh toán: Chọn **Chuyển khoản QR** (hoặc Tiền mặt).
- [ ] **3.2.** Bấm nút: **"THANH TOÁN & IN HÓA ĐƠN"**.
- [ ] **3.3. Kiểm tra Modal In Hóa Đơn xuất hiện:**
  - Tiền hàng: `7.500.000 đ`
  - Chiết khấu: `-750.000 đ` (10%)
  - Tổng thanh toán: `6.750.000 đ`
  - Đã thanh toán: `3.375.000 đ`
  - **Còn nợ lại:** `3.375.000 đ` (màu đỏ in đậm rõ ràng).
  - Serial/IMEI trên hóa đơn: `MB-B760-UAT-001`.
- [ ] **3.4. KIỂM TRA MÃ VIETQR ĐỘNG:**
  - Dưới phần thông tin ngân hàng hiển thị ảnh mã VietQR.
  - Dòng chữ phụ đề mã QR: **`QR Tiền nợ: 3.375.000 đ`**.
  - Lấy camera điện thoại quét thử mã QR: Ứng dụng ngân hàng tự động điền đúng số tiền `3.375.000 đ` và nội dung chuyển khoản là mã hóa đơn.

---

### BƯỚC 4: XÁC THỰC DỮ LIỆU TỒN KHO & BẢO HÀNH SAU KHI BÁN
- [ ] **4.1. Kiểm tra tồn kho:** Vào tab **Kho Hàng** -> Tồn kho của Mainboard B760 giảm đúng 1 (từ 5 xuống còn **4** chiếc).
- [ ] **4.2. Kiểm tra Serial/IMEI:** Vào tab **Serial/IMEI** -> Mã `MB-B760-UAT-001` đã chuyển sang màu đỏ với trạng thái: **`sold` (Đã xuất bán)** và gắn kèm mã Hóa đơn vừa tạo.
- [ ] **4.3. Kiểm tra Sổ Bảo Hành (Warranty):**
  - Vào tab **Tra cứu Bảo hành**: Nhập SĐT `0988.555.777` hoặc Serial `MB-B760-UAT-001`.
  - Xuất hiện hợp đồng bảo hành điện tử 36 tháng kích hoạt từ ngày hôm nay.

---

### BƯỚC 5: SANG TAB CÔNG NỢ & THU HỒI DỨT ĐIỂM KHOẢN NỢ
- [ ] **5.1.** Vào tab **Công Nợ** (Debts) -> Xem danh sách nợ khách hàng.
- [ ] **5.2.** Tìm thấy khách hàng **Trần Văn Khang** (`0988.555.777`):
  - Tổng nợ hóa đơn: `6.750.000 đ`
  - Đã trả ban đầu: `3.375.000 đ`
  - Còn nợ lại: **`3.375.000 đ`**
  - Trạng thái: **`pending` (Chờ thu)**
- [ ] **5.3.** Bấm nút **"Thu tiền nợ"** (Thanh toán nợ):
  - Nhập số tiền thu: **`3.375.000`** (thu hết toàn bộ phần nợ còn lại).
  - Ghi chú: *"Khách chuyển khoản nốt tiền nợ qua Vietcombank"*.
  - Bấm **"Xác Nhận Thu Nợ"**.
- [ ] **5.4. Kiểm tra kết quả thu nợ:**
  - Trạng thái bản ghi nợ chuyển sang màu xanh lá: **`completed` (Hoàn tất)**.
  - Số nợ còn lại về: **`0 đ`**.
  - Vào tab **Khách Hàng** (CRM) -> Mở hồ sơ anh Trần Văn Khang: Công nợ hiện tại bằng **`0 đ`**, Tổng chi tiêu tích lũy: **`6.750.000 đ`**.

---

# 🔧 KỊCH BẢN 2: TIẾP NHẬN SỬA CHỮA & BẢO HÀNH (E2E REPAIR, WARRANTY & CRM AUTO-FILL)
*Luồng nghiệp vụ chuyên sâu: Khách mang máy cũ đến -> Quét Serial tự load thông tin khách cũ -> Đang sửa & xuất linh kiện từ kho -> Hoàn tất & In phiếu Báo giá kiêm Bảo hành.*

### BƯỚC 1: LẬP PHIẾU TIẾP NHẬN BẰNG CÁCH QUÉT SERIAL MÁY CŨ
- [ ] **1.1.** Đăng nhập tài khoản `sales01` hoặc `tech01`.
- [ ] **1.2.** Mở tab **Sửa Chữa** (Repairs) -> Bấm nút **"Tiếp Nhận Máy Mới"**.
- [ ] **1.3. TEST TỰ ĐỘNG ĐIỀN THÔNG TIN (CRM AUTO-FILL QUA SERIAL):**
  - Tại ô "Số Serial / IMEI / Service Tag", nhập (hoặc quét mã): **`MB-B760-UAT-001`** (máy đã bán ở Kịch bản 1).
  - [ ] **Xác nhận:** Hệ thống tự động nhận diện thiết bị cũ, tự động điền Tên khách hàng: **Trần Văn Khang** và SĐT: **0988.555.777** mà nhân viên không cần gõ lại.
- [ ] **1.4.** Điền thông tin tiếp nhận sửa chữa:
  - Tên thiết bị: **PC Gaming Asus B760 i5**
  - Hiện trạng lỗi khách báo: *"Máy không lên nguồn, quạt CPU quay nhẹ rồi tắt"*.
  - Ngoại quan: *"Vỏ case xước nhẹ mặt kính bên hông"*.
  - Phụ kiện kèm: *"Chỉ thân máy, không kèm dây nguồn"*.
  - Dự toán chi phí ban đầu: **`300.000 đ`** | Tiền đặt cọc: **`0 đ`**.
- [ ] **1.5.** Bấm **"Tạo Phiếu Tiếp Nhận"**.
- [ ] **1.6.** Phiếu sửa chữa được khởi tạo với mã dạng `SC-YYYYMM-XXX`, trạng thái ban đầu: `received` (Tiếp nhận mới).

---

### BƯỚC 2: PHÂN CÔNG KỸ THUẬT & CHUYỂN SANG "ĐANG SỬA CHỮA"
- [ ] **2.1.** Mở chi tiết phiếu sửa chữa vừa tạo.
- [ ] **2.2.** Phân công Kỹ thuật viên phụ trách: Chọn **Kỹ thuật viên QA (tech01)**.
- [ ] **2.3.** Chuyển trạng thái phiếu sang: **`repairing` (Đang tiến hành sửa chữa)**.
- [ ] **2.4.** Nhập chẩn đoán sơ bộ của kỹ thuật: *"Lỗi chết thanh RAM 8GB DDR4, cần thay RAM mới và vệ sinh tra keo tản nhiệt"*.
- [ ] **2.5.** Bấm **"Cập Nhật Trạng Thái"**.

---

### BƯỚC 3: XUẤT LINH KIỆN TỪ KHO GẮN VÀO PHIẾU SỬA CHỮA
- [ ] **3.1.** Tại chi tiết phiếu sửa chữa, tìm mục **"Linh Kiện & Dịch Vụ Sử Dụng"** -> Bấm **"Thêm Linh Kiện / Xuất Kho"**.
- [ ] **3.2.** Chọn linh kiện từ danh mục kho:
  - Chọn sản phẩm: **RAM Kingston Fury Beast 8GB DDR4** (hoặc sản phẩm có sẵn trong kho).
  - Số lượng: **1**.
  - Đơn giá linh kiện thay thế: **`650.000 đ`**.
- [ ] **3.3.** Bấm **"Xác Nhận Xuất Linh Kiện"**.
- [ ] **3.4. Kiểm tra trừ kho tự động:**
  - Linh kiện RAM Kingston hiển thị ngay trong bảng chi phí của phiếu sửa chữa.
  - Mở tab **Kho Hàng** trong cửa sổ mới: Tồn kho của RAM Kingston đã **bị trừ chính xác 1 đơn vị**.

---

### BƯỚC 4: HOÀN THÀNH SỬA CHỮA & CẬP NHẬT CHI PHÍ
- [ ] **4.1.** Kỹ thuật viên nhập tổng chi phí thanh toán cuối cùng:
  - Tiền linh kiện (RAM): `650.000 đ`
  - Tiền công dịch vụ & tra keo tản nhiệt: `150.000 đ`
  - **Tổng chi phí hoàn tất:** **`800.000 đ`**.
- [ ] **4.2.** Cập nhật trạng thái phiếu sửa chữa sang: **`completed` (Đã sửa xong / Chờ giao khách)**.
- [ ] **4.3.** Khi khách đến nhận máy, chuyển trạng thái sang: **`delivered` (Đã bàn giao & Thu tiền)**.

---

### BƯỚC 5: XEM TRƯỚC VÀ IN PHIẾU BÁO GIÁ KIÊM BẢO HÀNH
- [ ] **5.1.** Bấm nút **"In Phiếu Sửa Chữa / Báo Giá"**.
- [ ] **5.2. Kiểm tra nội dung mẫu in:**
  - [ ] Hiển thị thông tin cửa hàng, hotline, địa chỉ chuẩn xác.
  - [ ] Thông tin khách hàng: Anh Trần Văn Khang - `0988.555.777`.
  - [ ] Serial/IMEI máy: `MB-B760-UAT-001`.
  - [ ] Danh mục linh kiện thay thế hiển thị rõ ràng: RAM Kingston Fury 8GB (`650.000 đ`).
  - [ ] Tiền công dịch vụ: `150.000 đ` -> Tổng thanh toán: `800.000 đ`.
  - [ ] Điều khoản bảo hành dịch vụ sửa chữa (cam kết bảo hành 03 tháng linh kiện thay thế).
  - [ ] Có đầy đủ phần chữ ký khách hàng và kỹ thuật viên phụ trách.

---

# 🖥️ KỊCH BẢN 3: KIỂM THỬ XÂY DỰNG CẤU HÌNH PC (PC BUILDER WIZARD)
*Kiểm tra quy tắc logic nghiệp vụ: Chặn chốt hóa đơn nếu thiếu linh kiện sống còn (CPU / Mainboard).*

- [ ] **3.1.** Mở tab **PC Builder** (Xây Dựng Cấu Hình PC).
- [ ] **3.2.** Bấm **"Tạo cấu hình mới"** (Reset toàn bộ slot về trống).
- [ ] **3.3. TEST CHẶN LỖI THIẾU CPU VÀ MAINBOARD:**
  - [ ] Chỉ chọn slot **RAM** (1 thanh 16GB) và slot **SSD** (1 ổ Kingston 500GB). Chưa chọn CPU, chưa chọn Mainboard.
  - [ ] Quan sát nút màu xanh lá **"CHỐT CẤU HÌNH & LƯU HOÁ ĐƠN"**:
    - **Nút bị vô hiệu hóa (Disabled), màu xám mờ, con trỏ chuột hiển thị icon cấm (not-allowed)**.
  - [ ] Bên dưới nút xuất hiện hộp cảnh báo màu vàng:
    - *"Chưa thể chốt hóa đơn: Bắt buộc phải có CPU và Mainboard để đảm bảo cấu hình máy hoàn chỉnh."*
- [ ] **3.4. TEST CHỌN ĐỦ CPU NHƯNG THIẾU MAINBOARD:**
  - [ ] Thêm linh kiện vào slot **CPU** (ví dụ: Intel Core i5-13400F). Vẫn để trống Mainboard.
  - [ ] Nút **"CHỐT CẤU HÌNH & LƯU HOÁ ĐƠN"** vẫn tiếp tục bị **Disabled**.
  - [ ] Cảnh báo cập nhật thành: *"Chưa thể chốt hóa đơn: Bắt buộc phải có Mainboard..."*.
- [ ] **3.5. TEST KHI CHỌN ĐỦ CẢ CPU VÀ MAINBOARD:**
  - [ ] Thêm linh kiện vào slot **Mainboard** (ví dụ: Main ASUS B760).
  - [ ] Quan sát: Cảnh báo màu vàng biến mất, nút **"CHỐT CẤU HÌNH & LƯU HOÁ ĐƠN"** lập tức sáng xanh và **được kích hoạt (Enabled)**.
  - [ ] Công suất nguồn ước tính (Wattage) và khuyến nghị nguồn (PSU) tự động nhảy số thông minh.
- [ ] **3.6. CHUYỂN THÀNH HÓA ĐƠN BÁN LẺ THÀNH CÔNG:**
  - [ ] Bấm nút **"CHỐT CẤU HÌNH & LƯU HOÁ ĐƠN"**.
  - [ ] Hệ thống tự động tạo 1 hóa đơn bán lẻ hoàn chỉnh gồm tất cả các linh kiện trên và tự động trừ kho toàn bộ các mã hàng tương ứng.

---

# 🛡️ KỊCH BẢN 4: KIỂM THỬ BẢO MẬT PHÂN QUYỀN RBAC (ẨN GIÁ VỐN)
*Đảm bảo nhân viên Sales và Kỹ thuật viên không thể nhìn thấy Giá Vốn (costPrice / importPrice).*

- [ ] **4.1. Đăng nhập với tài khoản `sales01`:**
  - [ ] Vào tab **Kho Hàng** (Inventory): Cột "Giá vốn" hoàn toàn bị ẩn hoặc hiển thị `0 đ` / dấu gạch ngang `-`. Nhân viên chỉ nhìn thấy Giá Bán Lẻ và Giá Bán Buôn.
  - [ ] Mở F12 -> Network -> Xem API `GET /api/products`: Thuộc tính `costPrice` và `importPrice` của mọi sản phẩm đều trả về số `0`.
  - [ ] Thử truy cập menu **Quản trị hệ thống** (Admin) hoặc Báo cáo Lợi nhuận: Bị chặn hoặc không hiển thị trên Sidebar.
- [ ] **4.2. Đăng nhập với tài khoản `tech01` (Kỹ thuật viên):**
  - [ ] Xem danh sách sản phẩm và xuất kho sửa chữa: Giá vốn đều bị ẩn (`0 đ`).
- [ ] **4.3. Đăng nhập với tài khoản `admin` (Chủ cửa hàng):**
  - [ ] Vào tab **Kho Hàng**: Cột "Giá vốn" hiển thị đầy đủ con số chính xác (> 0 đ).
  - [ ] Xem trang **Dashboard / Báo cáo**: Hiển thị chính xác Doanh thu, Tổng vốn nhập hàng, và **Lợi nhuận gộp thực tế**.

---

# 💾 KỊCH BẢN 5: KIỂM THỬ ĐỘ BỀN CƠ SỞ DỮ LIỆU & SAO LƯU (DATABASE INTEGRITY)
*Kiểm tra tính an toàn của thư mục DATASOFT và cơ chế sao lưu Snapshot.*

- [ ] **5.1.** Đăng nhập tài khoản `admin` -> Vào mục **Cài Đặt Hệ Thống / Sao Lưu**.
- [ ] **5.2.** Xem bảng thống kê trạng thái 14 file JSON: Tất cả các file đều có trạng thái `ok` màu xanh, số lượng bản ghi hiển thị đầy đủ.
- [ ] **5.3.** Bấm nút **"Tạo Bản Sao Lưu Ngay (Create Snapshot)"**:
  - Hệ thống thông báo tạo bản sao lưu thành công trong vòng chưa đầy 1 giây.
  - Kiểm tra trên ổ cứng thư mục `DATASOFT/backups/`: Có thư mục con chứa đầy đủ bản snapshot độc lập.
- [ ] **5.4.** Chạy bộ automated test `npm test`:
  - `db.test.ts`: **PASS** (20 luồng ghi đồng thời không rách file).
  - `invoice.test.ts`: **PASS** (Ghi nợ 6 triệu, trừ 1 tồn kho, IMEI sang sold).
  - `auth.test.ts`: **PASS** (Sales role ẩn giá vốn hoàn toàn).

---

## ✍️ KẾT LUẬN & BIÊN BẢN NGHIỆM THU (SIGN-OFF)
Căn cứ vào kết quả kiểm thử thực tế theo các kịch bản nêu trên:

- [ ] **Toàn bộ 5 Kịch bản nghiệp vụ đều hoàn thành xuất sắc, không phát sinh lỗi dữ liệu.**
- [ ] **Hệ thống Store-manage đủ điều kiện đưa vào vận hành thực tế tại chuỗi cửa hàng.**

| ĐẠI DIỆN ĐỘI NGŨ PHÁT TRIỂN / QA | ĐẠI DIỆN CHỦ CỬA HÀNG / DOANH NGHIỆP |
| :---: | :---: |
| *(Ký và ghi rõ họ tên)* | *(Ký và ghi rõ họ tên)* |
| <br><br><br> | <br><br><br> |
| **Ngày:** ____ / ____ / 2026 | **Ngày:** ____ / ____ / 2026 |
