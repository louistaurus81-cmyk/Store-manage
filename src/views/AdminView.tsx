import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Users,
  Terminal,
  Shield,
  Copy,
  Check,
  RefreshCw,
  Archive,
  Server,
  Network,
  Cpu,
  Layers,
  FileCode,
} from 'lucide-react';
import type { User, UserRole } from '../types/datasoft';
import { apiFetch, formatDate } from '../utils/api';

export const AdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'storage' | 'users' | 'ubuntu' | 'architecture'>('storage');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  // New user form state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    passwordPlain: '',
    fullName: '',
    role: 'sales' as UserRole,
    phone: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [storageData, userList] = await Promise.all([
        apiFetch<any>('/api/system/stats'),
        apiFetch<User[]>('/api/users'),
      ]);
      setStats(storageData);
      setUsers(userList);
    } catch (err) {
      console.error('Lỗi nạp dữ liệu hệ thống:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackupNow = async () => {
    try {
      const res = await apiFetch<any>('/api/system/backup', {
        method: 'POST',
        body: JSON.stringify({ label: 'manual_snapshot' }),
      });
      setBackupMessage(res.message);
      setTimeout(() => setBackupMessage(null), 5000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi sao lưu DATASOFT');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch<User>('/api/users', {
        method: 'POST',
        body: JSON.stringify(newUserForm),
      });
      setShowAddUser(false);
      setNewUserForm({
        username: '',
        passwordPlain: '',
        fullName: '',
        role: 'sales',
        phone: '',
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi tạo tài khoản');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const systemdServiceCode = `[Unit]
Description=DATASOFT - He Thong Quan Ly Cua Hang May Tinh (LAN Server)
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/datasoft
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=datasoft-app
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target`;

  const bashSetupCommands = `# 1. Cập nhật hệ thống Ubuntu và cài đặt Node.js LTS
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git build-essential

# 2. Tạo thư mục ứng dụng và cấp quyền
sudo mkdir -p /var/www/datasoft
sudo chown -R $USER:$USER /var/www/datasoft
cd /var/www/datasoft

# 3. Clone mã nguồn hoặc copy thư mục dự án
# (Bao gồm thư mục DATASOFT chứa 11 file JSON)
npm install
npm run build

# 4. Cấu hình dịch vụ systemd chạy tự động cùng hệ thống
sudo nano /etc/systemd/system/datasoft.service
# (Dán nội dung unit file bên dưới vào)

# 5. Kích hoạt và khởi chạy service
sudo systemctl daemon-reload
sudo systemctl enable datasoft.service
sudo systemctl start datasoft.service

# 6. Kiểm tra trạng thái hoạt động của tiến trình
sudo systemctl status datasoft.service

# 7. Mở port 3000 trên tường lửa UFW cho mạng LAN
sudo ufw allow 3000/tcp
sudo ufw reload

# 8. Xem địa chỉ IP của server trong mạng nội bộ
ip addr show | grep 'inet ' | grep -v '127.0.0.1'`;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Quản trị Hệ thống DATASOFT & Triển khai Ubuntu Server
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Kiểm soát 11 file JSON cơ sở dữ liệu, quản lý tài khoản RBAC và hướng dẫn vận hành server LAN
          </p>
        </div>

        <button
          onClick={handleBackupNow}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs flex items-center gap-2"
        >
          <Archive className="w-4 h-4" />
          Sao lưu toàn bộ DATASOFT ngay
        </button>
      </div>

      {backupMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg animate-in fade-in flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          {backupMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-lg max-w-2xl text-xs font-semibold">
        <button
          onClick={() => setActiveTab('storage')}
          className={`flex-1 py-2 text-center rounded-md transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'storage' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          11 File DATASOFT
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2 text-center rounded-md transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'users' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Tài khoản & Phân quyền RBAC
        </button>
        <button
          onClick={() => setActiveTab('ubuntu')}
          className={`flex-1 py-2 text-center rounded-md transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'ubuntu' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          Cài đặt Ubuntu & Systemd (Bước 4)
        </button>
        <button
          onClick={() => setActiveTab('architecture')}
          className={`flex-1 py-2 text-center rounded-md transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'architecture' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          Kiến trúc & Đọc/Ghi An toàn (Bước 1-3)
        </button>
      </div>

      {/* TAB 1: 11 JSON FILES IN DATASOFT */}
      {activeTab === 'storage' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
            <div className="text-xs text-slate-600">
              Thư mục lưu trữ thực tế:{' '}
              <span className="font-mono font-bold text-slate-900">{stats?.baseDir || 'DATASOFT'}</span>
            </div>
            <div className="text-xs text-slate-500">
              Nền tảng: <span className="font-mono font-semibold">{stats?.platform || 'linux'}</span> · Node:{' '}
              <span className="font-mono font-semibold">{stats?.nodeVersion || 'v20.x'}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <th className="p-3 w-10">#</th>
                  <th className="p-3">Tên File CSDL</th>
                  <th className="p-3">Số lượng bản ghi</th>
                  <th className="p-3 text-right">Dung lượng</th>
                  <th className="p-3">Thời gian cập nhật cuối</th>
                  <th className="p-3 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.files?.map((f: any, idx: number) => (
                  <tr key={f.fileName} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-mono font-bold text-slate-900">{f.fileName}</td>
                    <td className="p-3 font-mono font-semibold text-emerald-700">
                      {f.recordCount} bản ghi
                    </td>
                    <td className="p-3 text-right font-mono text-slate-600">
                      {(f.sizeBytes / 1024).toFixed(2)} KB
                    </td>
                    <td className="p-3 font-mono text-slate-500">{formatDate(f.lastModified)}</td>
                    <td className="p-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        HOẠT ĐỘNG
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: RBAC USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-900">Danh sách tài khoản nhân viên & Phân quyền</h3>
            <button
              onClick={() => setShowAddUser(true)}
              className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
            >
              + Tạo tài khoản mới
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <th className="p-3">Họ tên nhân viên</th>
                  <th className="p-3">Tên đăng nhập</th>
                  <th className="p-3">Vai trò (Role)</th>
                  <th className="p-3">Số điện thoại</th>
                  <th className="p-3">Quyền hạn đặc thù</th>
                  <th className="p-3 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const roleBadges: Record<UserRole, string> = {
                    admin: 'bg-rose-50 text-rose-700 border-rose-200',
                    manager: 'bg-purple-50 text-purple-700 border-purple-200',
                    sales: 'bg-blue-50 text-blue-700 border-blue-200',
                    technician: 'bg-amber-50 text-amber-700 border-amber-200',
                  };
                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{u.fullName}</td>
                      <td className="p-3 font-mono font-semibold text-slate-700">{u.username}</td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            roleBadges[u.role]
                          }`}
                        >
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600">{u.phone || '-'}</td>
                      <td className="p-3 text-[11px] text-slate-600 max-w-xs">
                        {u.role === 'admin' && 'Toàn quyền cấu hình, backup, phân quyền'}
                        {u.role === 'manager' && 'Báo cáo doanh thu, công nợ, quản lý kho tổng'}
                        {u.role === 'sales' && 'Bán hàng, xem tồn kho (ẨN GIÁ VỐN NHẬP)'}
                        {u.role === 'technician' && 'Tiếp nhận ca sửa, đề xuất linh kiện, tra bảo hành'}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Đang hoạt động
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Modal Add User */}
          {showAddUser && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
                <h3 className="font-bold text-sm text-slate-900">Tạo tài khoản nhân viên mới</h3>
                <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Họ tên nhân viên *</label>
                    <input
                      type="text"
                      required
                      value={newUserForm.fullName}
                      onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                      placeholder="Ví dụ: Hoàng Minh Trí"
                      className="w-full px-3 py-1.5 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Tên đăng nhập *</label>
                    <input
                      type="text"
                      required
                      value={newUserForm.username}
                      onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                      placeholder="Ví dụ: minhtri"
                      className="w-full px-3 py-1.5 border rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Mật khẩu khởi tạo *</label>
                    <input
                      type="password"
                      required
                      value={newUserForm.passwordPlain}
                      onChange={(e) => setNewUserForm({ ...newUserForm, passwordPlain: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Số điện thoại</label>
                    <input
                      type="tel"
                      value={newUserForm.phone}
                      onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Phân quyền vai trò (Role)</label>
                    <select
                      value={newUserForm.role}
                      onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })}
                      className="w-full px-3 py-1.5 border rounded-lg font-medium"
                    >
                      <option value="sales">Bán hàng (Sales) - Ẩn giá vốn</option>
                      <option value="technician">Kỹ thuật viên (Technician) - Ca sửa chữa</option>
                      <option value="manager">Chủ cửa hàng (Manager) - Báo cáo & Kho</option>
                      <option value="admin">Quản trị viên (Admin) - Toàn quyền</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setShowAddUser(false)}
                      className="px-4 py-2 border rounded-lg text-slate-600"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 shadow-xs"
                    >
                      Lưu vào users.json
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: UBUNTU SERVER & SYSTEMD GUIDE (BƯỚC 4) */}
      {activeTab === 'ubuntu' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-600" />
              Bước 4: Hướng dẫn Thiết lập Ubuntu Server chạy dịch vụ Systemd
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dưới đây là các câu lệnh bash hoàn chỉnh để cấu hình dự án chạy dưới dạng tiến trình nền daemon
              qua <code>systemd</code> trên Ubuntu Server, tự động khởi động cùng hệ điều hành khi máy chủ bật
              lên hoặc khi khởi động lại, và mở cổng tường lửa UFW cho các máy tính khác trong mạng LAN truy cập.
            </p>
          </div>

          {/* Bash Commands Box */}
          <div className="bg-slate-900 text-slate-200 rounded-xl p-5 shadow-sm space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-emerald-400 font-bold flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                Lệnh Bash thiết lập trên Ubuntu Server
              </span>
              <button
                onClick={() => copyToClipboard(bashSetupCommands, 'bash')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center gap-1 transition-colors"
              >
                {copiedCode === 'bash' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode === 'bash' ? 'Đã sao chép' : 'Sao chép lệnh'}
              </button>
            </div>
            <pre className="overflow-x-auto p-2 text-slate-300 whitespace-pre leading-relaxed">
              {bashSetupCommands}
            </pre>
          </div>

          {/* Systemd Service Unit File Box */}
          <div className="bg-slate-900 text-slate-200 rounded-xl p-5 shadow-sm space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-blue-400 font-bold flex items-center gap-2">
                <FileCode className="w-4 h-4" />
                Tệp cấu hình Systemd: /etc/systemd/system/datasoft.service
              </span>
              <button
                onClick={() => copyToClipboard(systemdServiceCode, 'systemd')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center gap-1 transition-colors"
              >
                {copiedCode === 'systemd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode === 'systemd' ? 'Đã sao chép' : 'Sao chép file'}
              </button>
            </div>
            <pre className="overflow-x-auto p-2 text-slate-300 whitespace-pre leading-relaxed">
              {systemdServiceCode}
            </pre>
          </div>

          {/* LAN Connection Instructions */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-xs text-emerald-900 space-y-2">
            <div className="font-bold flex items-center gap-2">
              <Network className="w-4 h-4 text-emerald-700" />
              Cách truy cập từ các máy tính Windows/Mac/Tablet khác trong mạng LAN:
            </div>
            <p>
              1. Tìm địa chỉ IP LAN của máy chủ Ubuntu (ví dụ: <code>192.168.1.150</code>).
            </p>
            <p>
              2. Trên các máy bán hàng và bàn kỹ thuật, mở trình duyệt Chrome hoặc Edge và gõ:{' '}
              <strong className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-300">
                http://192.168.1.150:3000
              </strong>
            </p>
            <p>
              3. Hệ thống sẽ kết nối trực tiếp đến backend Node.js Express đang đọc ghi vào thư mục{' '}
              <code>DATASOFT</code> với cơ chế Atomic Concurrency Lock.
            </p>
          </div>
        </div>
      )}

      {/* TAB 4: SYSTEM ARCHITECTURE & REPOSITORY PATTERN (BƯỚC 1-3) */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          {/* Step 1 Review */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3 text-xs leading-relaxed">
            <h3 className="font-bold text-sm text-slate-900">
              Bước 1: Đề xuất Công nghệ Backend & Frontend
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                <div className="font-bold text-slate-800">Backend: Node.js (Express + TypeScript)</div>
                <p className="text-slate-600">
                  - <strong>Non-blocking I/O</strong>: Vô cùng tối ưu cho các thao tác đọc/ghi file JSON bất đồng bộ (fs.promises) trên Linux ext4.
                </p>
                <p className="text-slate-600">
                  - <strong>Shared Types</strong>: Dùng chung 100% định nghĩa kiểu dữ liệu TypeScript (User, RepairTicket, Product, IMEI...) giữa server và client.
                </p>
                <p className="text-slate-600">
                  - <strong>Zero External DB Driver</strong>: Không cần cài đặt Postgres/MySQL phức tạp, dung lượng cài đặt nhẹ chỉ vài chục MB.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                <div className="font-bold text-slate-800">Frontend: React SPA + Vite + Tailwind CSS</div>
                <p className="text-slate-600">
                  - <strong>Giao diện cực nhẹ</strong>: Tốc độ render tức thì trên trình duyệt mạng LAN, đáp ứng thao tác nhanh của nhân viên bán hàng.
                </p>
                <p className="text-slate-600">
                  - <strong>Hỗ trợ in ấn hoàn hảo</strong>: Tích hợp sẵn CSS Media Print cho máy in hóa đơn nhiệt K80 và in phiếu tiếp nhận A4/A5.
                </p>
              </div>
            </div>
          </div>

          {/* Step 2 Review */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3 text-xs leading-relaxed">
            <h3 className="font-bold text-sm text-slate-900">
              Bước 2: Giải pháp Repository Xử lý Đọc/Ghi An Toàn (Tránh Data Corruption)
            </h3>
            <p className="text-slate-600">
              Khi nhiều nhân viên bán hàng và kỹ thuật viên cùng bấm Lưu dữ liệu đồng thời qua mạng LAN, việc ghi file JSON thông thường (fs.writeFile đè trực tiếp) dễ gây ra tình trạng <strong>Race Condition</strong>, dẫn đến file bị rỗng (0 bytes) hoặc hỏng định dạng cú pháp JSON.
            </p>
            <div className="p-4 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] leading-relaxed">
              <div className="text-emerald-400 font-bold mb-1">// Nguyên lý Atomic Write Replacement của JsonDatabaseEngine:</div>
              <div>1. Mỗi file JSON (ví dụ repairs.json) có một Promise Queue độc quyền (In-memory Mutex).</div>
              <div>2. Tác vụ ghi mới tuần tự xếp hàng sau tác vụ trước đó: queue.then(...)</div>
              <div>3. Dữ liệu mới được ghi vào một file tạm: DATASOFT/repairs.json.tmp.&lt;timestamp&gt;.&lt;pid&gt;</div>
              <div>4. Gọi lệnh nguyên tử POSIX: await fs.promises.rename(tempPath, targetPath)</div>
              <div>5. Rename trên hệ thống file Linux là Atomic: Hoặc là file cũ nguyên vẹn, hoặc là file mới hoàn tất, không bao giờ có trạng thái lửng lơ!</div>
            </div>
          </div>

          {/* Step 3 Review */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3 text-xs leading-relaxed">
            <h3 className="font-bold text-sm text-slate-900">
              Bước 3: Mã nguồn Module Authentication & Tiếp nhận Sửa chữa
            </h3>
            <p className="text-slate-600">
              Hệ thống đã triển khai đầy đủ mã nguồn backend trong:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li><code>/server/services/authService.ts</code>: Băm mật khẩu PBKDF2 với salt riêng biệt, sinh token HMAC-SHA256, middleware kiểm tra quyền hạn 4 cấp độ (Admin, Manager, Sales, Technician).</li>
              <li><code>/server/services/repairService.ts</code>: Quản lý trọn vẹn luồng tiếp nhận máy, sinh mã phiếu tự động, phân công kỹ thuật, xuất kho linh kiện tự động trừ tồn kho, và kích hoạt sổ bảo hành khi giao máy.</li>
              <li><code>/server.ts</code>: Điểm khởi chạy máy chủ Express kết hợp Vite dev middleware, cung cấp đầy đủ các cổng API RESTful.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
