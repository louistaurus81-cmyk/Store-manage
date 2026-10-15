import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  Calendar,
  HardDrive,
  Phone,
  User,
  CheckCircle2,
  XCircle,
  Barcode,
  Scan,
  Receipt,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { ImeiRecord, RepairTicket, Warranty } from '../types/datasoft';
import { apiFetch, formatDateOnly, formatVND } from '../utils/api';
import {
  useBarcodeScanner,
  playScannerSuccessBeep,
  playScannerErrorBeep,
  sanitizeVietnameseBarcode,
} from '../hooks/useBarcodeScanner';
import { MacToastContainer, ToastMessage } from '../components/MacToast';

export const WarrantyView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<{
    warranties: Warranty[];
    repairs: RepairTicket[];
    imeiRecords: ImeiRecord[];
  }>({ warranties: [], repairs: [], imeiRecords: [] });

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const executeLookup = async (searchStr: string) => {
    const cleanStr = sanitizeVietnameseBarcode(searchStr);
    if (!cleanStr) return;

    setQuery(cleanStr);
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await apiFetch<{
        warranties: Warranty[];
        repairs: RepairTicket[];
        imeiRecords: ImeiRecord[];
      }>(`/api/warranty/lookup?q=${encodeURIComponent(cleanStr)}`);
      setResults(data);

      const totalMatches = (data.warranties?.length || 0) + (data.repairs?.length || 0);
      if (totalMatches > 0) {
        playScannerSuccessBeep();
        addToast(
          'success',
          `Tìm thấy ${data.warranties.length} sổ bảo hành & ${data.repairs.length} lịch sử sửa chữa cho [${cleanStr}]`,
          'Tra Cứu Thành Công'
        );
      } else {
        playScannerErrorBeep();
        addToast(
          'warning',
          `Không tìm thấy dữ liệu bảo hành nào cho mã [${cleanStr}]`,
          'Chưa Có Hồ Sơ'
        );
      }
    } catch (err: any) {
      playScannerErrorBeep();
      addToast('error', err.message || 'Lỗi kết nối khi tra cứu bảo hành', 'Lỗi Tra Cứu');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    executeLookup(query.trim());
  };

  // Tích hợp máy quét mã vạch / Serial
  const { isScanning } = useBarcodeScanner({
    onScan: (barcode) => {
      executeLookup(barcode);
    },
    enabled: true,
    playFeedbackSound: false,
  });

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto font-sans">
      {/* Header & Search Bar macOS Style */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-6 shadow-xs text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Barcode className="w-3.5 h-3.5 text-emerald-600" />
            {isScanning ? 'Đang đọc tín hiệu máy quét...' : 'Máy Quét Serial Tự Động: Sẵn sàng'}
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Tra cứu Sổ Bảo hành & Lịch sử Kỹ thuật Máy tính
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Bắn tia máy quét trực tiếp vào tem mã vạch hoặc nhập số Serial/IMEI, số điện thoại để tra cứu hạn bảo hành và lịch sử sửa chữa.
          </p>
        </div>

        <form onSubmit={handleSearch} className="max-w-lg mx-auto flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              required
              placeholder="Quét mã vạch hoặc nhập DL5420-SN-8291823, 0915234888..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all shadow-xs"
            />
            {isScanning && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-[10px] text-emerald-600 font-bold font-mono animate-pulse">
                SCANNING
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs shrink-0 cursor-pointer active:scale-95"
          >
            {loading ? 'Đang tra cứu...' : 'Tra Cứu'}
          </button>
        </form>

        {/* Quick Test Chips for Barcodes */}
        <div className="pt-2 flex items-center justify-center gap-1.5 flex-wrap text-[11px] text-slate-500">
          <span className="text-[10px] text-slate-400">Mã mẫu thử nghiệm:</span>
          {['DL5420-SN-8291823', 'ACER-NITRO-2026-001', 'KF-RAM-839201', '0915234888'].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => executeLookup(sample)}
              className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-lg font-mono text-[10px] transition-colors cursor-pointer"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {hasSearched && (
        <div className="space-y-6">
          {/* Warranty Records */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Sổ bảo hành hợp lệ ({results.warranties.length})
            </h3>

            {results.warranties.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                Không tìm thấy sổ bảo hành linh kiện nào với từ khóa này.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.warranties.map((w) => {
                  const today = new Date().toISOString().split('T')[0];
                  const isValid = w.endDate >= today && w.status === 'active';

                  return (
                    <div
                      key={w.id}
                      className={`p-4 border rounded-xl space-y-2 text-xs transition-all ${
                        isValid
                          ? 'border-emerald-200 bg-emerald-50/20'
                          : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-emerald-700">{w.warrantyCode}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isValid
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {isValid ? 'Còn bảo hành' : 'Đã hết hạn'}
                        </span>
                      </div>

                      <div className="font-semibold text-slate-900">{w.productName}</div>
                      <div className="font-mono text-slate-600 flex items-center gap-1.5">
                        <Barcode className="w-3.5 h-3.5 text-slate-400" />
                        <span>Serial/IMEI: {w.imei}</span>
                      </div>

                      <div className="pt-2 border-t border-slate-200/70 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                        <div>
                          Khách: <strong>{w.customerName}</strong>
                        </div>
                        <div>
                          SĐT: <span className="font-mono">{w.customerPhone}</span>
                        </div>
                        <div>
                          Bắt đầu: {formatDateOnly(w.startDate)}
                        </div>
                        <div>
                          Hết hạn: <strong className="font-mono">{formatDateOnly(w.endDate)}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Repair History Records */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-600" />
              Lịch sử tiếp nhận & sửa chữa ({results.repairs.length})
            </h3>

            {results.repairs.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                Chưa có lịch sử sửa chữa nào được ghi nhận cho thiết bị này.
              </div>
            ) : (
              <div className="space-y-3">
                {results.repairs.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 border border-slate-200/80 rounded-xl hover:border-slate-300 transition-colors text-xs space-y-1.5 bg-slate-50/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-800">{r.ticketCode}</span>
                      <span className="font-mono text-slate-500">{formatDateOnly(r.receivedDate)}</span>
                    </div>

                    <div className="font-semibold text-slate-900">
                      {r.deviceName} · Serial: <span className="font-mono">{r.deviceSerialImei}</span>
                    </div>
                    <div className="text-slate-600">Lỗi: {r.issueDescription}</div>
                    {r.technicalDiagnosis && (
                      <div className="text-slate-500 italic">Chuẩn đoán kỹ thuật: {r.technicalDiagnosis}</div>
                    )}
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      <span>KTV phụ trách: {r.technicianName || 'Đang xử lý'}</span>
                      <span className="font-mono font-bold text-slate-800">
                        Tổng phí: {formatVND(r.finalCost)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* macOS Translucent Toast Notifications */}
      <MacToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
