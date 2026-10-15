import React from 'react';
import { Printer, X, ShieldAlert, Cpu } from 'lucide-react';
import type { RepairTicket, StoreSettings } from '../types/datasoft';
import { formatVND, formatDate } from '../utils/api';

interface RepairPrintModalProps {
  ticket: RepairTicket;
  settings: StoreSettings | null;
  onClose: () => void;
}

export const RepairPrintModal: React.FC<RepairPrintModalProps> = ({
  ticket,
  settings,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const store = settings || {
    storeName: 'TRUNG TÂM MÁY TÍNH & DỊCH VỤ CÔNG NGHỆ DATASOFT',
    address: 'Số 168 Cầu Giấy, Hà Nội',
    phone: '0988.123.456',
    email: 'hotro@datasoft-pc.vn',
    repairTicketFooterNote:
      'Quý khách vui lòng kiểm tra kỹ phụ kiện và tình trạng máy khi nhận lại. Phiếu có giá trị trong vòng 30 ngày.',
    warrantyPolicy: 'Bảo hành phần cứng 3 tháng đối với các linh kiện thay thế.',
    bankName: 'Vietcombank',
    bankAccount: '998812345678',
    bankOwner: 'NGUYEN THANH NAM',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      {/* Dialog Container */}
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Controls Toolbar (Hidden when printing) */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 no-print">
          <span className="font-semibold text-slate-800 text-sm">
            Xem trước & In Phiếu Tiếp Nhận: {ticket.ticketCode}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              In Phiếu (A4 / K80)
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="p-8 overflow-y-auto text-slate-900 text-xs font-sans print:p-0 print:m-0">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-base font-bold text-slate-950 uppercase tracking-tight">
                  {store.storeName}
                </h1>
                <p className="text-[11px] text-slate-700 mt-0.5">{store.address}</p>
                <p className="text-[11px] text-slate-700">Hotline: {store.phone} | Email: {store.email}</p>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono font-bold text-slate-900">{ticket.ticketCode}</div>
                <div className="text-[11px] text-slate-600">Ngày: {formatDate(ticket.receivedDate)}</div>
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center my-4">
            <h2 className="text-lg font-bold uppercase tracking-wider text-slate-900">
              PHIẾU TIẾP NHẬN SỬA CHỮA MÁY TÍNH
            </h2>
            <p className="text-[11px] text-slate-600 italic">
              (Liên 1: Cửa hàng lưu - Liên 2: Giao khách hàng khi nhận máy)
            </p>
          </div>

          {/* Customer & Device Information */}
          <div className="grid grid-cols-2 gap-4 my-4 p-3 border border-slate-200 rounded-lg bg-slate-50/50 print:bg-white print:border-slate-800">
            <div>
              <div className="font-semibold text-slate-900 uppercase text-[11px] mb-1">
                Thông tin Khách hàng
              </div>
              <div>Họ tên: <strong className="font-semibold">{ticket.customerName}</strong></div>
              <div>Điện thoại: <strong className="font-mono">{ticket.customerPhone}</strong></div>
              <div>Kỹ thuật viên phụ trách: <strong>{ticket.technicianName || 'Đang phân công'}</strong></div>
            </div>
            <div>
              <div className="font-semibold text-slate-900 uppercase text-[11px] mb-1">
                Thông tin Thiết bị tiếp nhận
              </div>
              <div>Thiết bị: <strong className="font-semibold">{ticket.deviceName}</strong></div>
              <div>Model: {ticket.model}</div>
              <div>Số Serial / IMEI: <span className="font-mono font-bold">{ticket.deviceSerialImei}</span></div>
              <div>Mật khẩu mở máy: <span className="font-mono">{ticket.passCode || 'Không'}</span></div>
            </div>
          </div>

          {/* Issue & Condition Details */}
          <div className="space-y-2 mb-4">
            <div className="p-2.5 border border-slate-200 rounded bg-white">
              <div className="font-semibold text-slate-800 text-[11px]">Tình trạng lỗi do khách hàng mô tả:</div>
              <div className="text-slate-700 mt-0.5">{ticket.issueDescription}</div>
            </div>

            {ticket.technicalDiagnosis && (
              <div className="p-2.5 border border-slate-200 rounded bg-white">
                <div className="font-semibold text-slate-800 text-[11px]">Chuẩn đoán của kỹ thuật viên:</div>
                <div className="text-slate-700 mt-0.5">{ticket.technicalDiagnosis}</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div><strong>Phụ kiện kèm theo:</strong> {ticket.accessories || 'Thân máy'}</div>
              <div><strong>Ngoại quan máy:</strong> {ticket.deviceCondition || 'Bình thường'}</div>
            </div>
          </div>

          {/* Parts Used if any */}
          {ticket.partsUsed && ticket.partsUsed.length > 0 && (
            <div className="mb-4">
              <div className="font-semibold text-slate-900 uppercase text-[11px] mb-1.5">
                Linh kiện thay thế / Dịch vụ
              </div>
              <table className="w-full text-left border-collapse border border-slate-200 text-[11px]">
                <thead>
                  <tr className="bg-slate-100 print:bg-slate-200">
                    <th className="border border-slate-200 p-1.5">Tên linh kiện / dịch vụ</th>
                    <th className="border border-slate-200 p-1.5 text-center">SL</th>
                    <th className="border border-slate-200 p-1.5 text-right">Đơn giá</th>
                    <th className="border border-slate-200 p-1.5 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {ticket.partsUsed.map((p, idx) => (
                    <tr key={idx}>
                      <td className="border border-slate-200 p-1.5">
                        {p.productName}
                        {p.imei && <span className="block text-[10px] text-slate-500 font-mono">Serial: {p.imei}</span>}
                      </td>
                      <td className="border border-slate-200 p-1.5 text-center font-mono">{p.quantity}</td>
                      <td className="border border-slate-200 p-1.5 text-right font-mono">{formatVND(p.unitPrice)}</td>
                      <td className="border border-slate-200 p-1.5 text-right font-mono">{formatVND(p.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Financial Summary */}
          <div className="flex justify-end mb-6">
            <div className="w-64 space-y-1 text-right text-[11px]">
              <div className="flex justify-between">
                <span>Dự toán ban đầu:</span>
                <span className="font-mono">{formatVND(ticket.estimatedCost)}</span>
              </div>
              <div className="flex justify-between">
                <span>Khách đã đặt cọc:</span>
                <span className="font-mono text-emerald-700 font-semibold">{formatVND(ticket.depositAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 text-xs border-t border-slate-300 pt-1">
                <span>Tổng chi phí sửa chữa:</span>
                <span className="font-mono text-slate-900">{formatVND(ticket.finalCost)}</span>
              </div>
              <div className="flex justify-between font-semibold text-rose-700">
                <span>Còn phải thanh toán:</span>
                <span className="font-mono">{formatVND(Math.max(0, ticket.finalCost - ticket.depositAmount))}</span>
              </div>
            </div>
          </div>

          {/* Policy & Notes */}
          <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-600 leading-relaxed mb-8">
            <p className="font-semibold text-slate-800">Quy định tiếp nhận & bảo hành:</p>
            <p>{store.repairTicketFooterNote}</p>
            <p>Bảo hành dịch vụ: <strong>{ticket.warrantyPeriodMonths} tháng</strong> kể từ ngày bàn giao máy hoàn tất.</p>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 text-center text-[11px] gap-8">
            <div>
              <div className="font-bold uppercase text-slate-800">Khách hàng ký nhận</div>
              <p className="text-[10px] text-slate-500 italic mb-12">(Ký và ghi rõ họ tên)</p>
              <div className="font-semibold text-slate-800">{ticket.customerName}</div>
            </div>
            <div>
              <div className="font-bold uppercase text-slate-800">Đại diện Cửa hàng DATASOFT</div>
              <p className="text-[10px] text-slate-500 italic mb-12">(Kỹ thuật viên tiếp nhận)</p>
              <div className="font-semibold text-slate-800">{ticket.technicianName || 'Nguyễn Thành Nam'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
