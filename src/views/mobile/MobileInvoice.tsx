import React from 'react';
import {
  X,
  Printer,
  Barcode,
  AlertCircle,
  CheckCircle2,
  Building2,
  User,
  Share2,
  Calendar,
  CreditCard,
  Phone,
  Clock,
} from 'lucide-react';
import type { Invoice, StoreSettings } from '../../types/datasoft';
import { formatVND, formatDate } from '../../utils/api';

interface MobileInvoiceProps {
  invoice: Invoice | null;
  settings?: StoreSettings | null;
  onClose: () => void;
  onPrint?: (invoice: Invoice) => void;
  onPayDebt?: (invoice: Invoice) => void;
}

export const MobileInvoice: React.FC<MobileInvoiceProps> = ({
  invoice,
  settings,
  onClose,
  onPrint,
  onPayDebt,
}) => {
  if (!invoice) return null;

  const isPending = invoice.debtAmount > 0 || invoice.status !== 'paid';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-zinc-200/80 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200 font-sans">
        {/* iOS Drag Handle */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-zinc-300" />
        </div>

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-zinc-900 font-mono tracking-tight">
                  {invoice.invoiceCode}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isPending
                      ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isPending ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  />
                  {isPending ? 'Pending' : 'Paid'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium">
                {formatDate(invoice.createdAt)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Card: 2 Cột Thông tin Cửa hàng và Khách hàng */}
          <div className="bg-zinc-50/80 border border-zinc-200/60 rounded-2xl p-3.5 grid grid-cols-2 gap-3 text-xs">
            {/* Cột 1: Thông tin Cửa hàng */}
            <div className="space-y-1 pr-2 border-r border-zinc-200/60">
              <div className="flex items-center gap-1 font-bold text-zinc-800 text-[11px] uppercase tracking-wider text-purple-700">
                <Building2 className="w-3.5 h-3.5" />
                <span>Cửa Hàng</span>
              </div>
              <div className="font-bold text-zinc-900 leading-tight">
                {settings?.storeName || 'Thịnh Phát Technology'}
              </div>
              <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                <Phone className="w-3 h-3 text-zinc-400 shrink-0" />
                <span>{settings?.phone || '0988.555.777'}</span>
              </div>
              <div className="text-[10px] text-zinc-400 line-clamp-2">
                {settings?.address || '123 Đường Công Nghệ, TP.HCM'}
              </div>
            </div>

            {/* Cột 2: Thông tin Khách hàng */}
            <div className="space-y-1 pl-1">
              <div className="flex items-center gap-1 font-bold text-zinc-800 text-[11px] uppercase tracking-wider text-blue-700">
                <User className="w-3.5 h-3.5" />
                <span>Khách Hàng</span>
              </div>
              <div className="font-bold text-zinc-900 truncate leading-tight">
                {invoice.customerName || 'Khách vãng lai'}
              </div>
              <div className="text-[11px] font-mono text-zinc-600 flex items-center gap-1">
                <Phone className="w-3 h-3 text-zinc-400 shrink-0" />
                <span>{invoice.customerPhone || 'N/A'}</span>
              </div>
              <div className="text-[10px] text-zinc-400 truncate">
                NV: {invoice.salesName || 'Nhân viên'}
              </div>
            </div>
          </div>

          {/* Danh sách linh kiện dạng dòng */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Danh Sách Linh Kiện ({invoice.items.length})
            </div>
            <div className="bg-white rounded-2xl border border-zinc-200/60 divide-y divide-zinc-100 overflow-hidden shadow-2xs">
              {invoice.items.map((it, idx) => (
                <div key={idx} className="p-3 flex items-start justify-between gap-3 text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-zinc-900 leading-snug">
                      {it.productName}
                    </div>
                    {it.imei && (
                      <div className="text-[10px] font-mono font-bold text-purple-700 flex items-center gap-1 mt-0.5">
                        <Barcode className="w-3 h-3" />
                        Serial: {it.imei}
                      </div>
                    )}
                    <div className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                      {formatVND(it.unitPrice)} × {it.quantity}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-zinc-900 text-xs shrink-0 text-right">
                    {formatVND(it.total)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Khối Tổng tiền (Subtotal, Discount, Total Due) canh phải */}
          <div className="bg-zinc-50/80 rounded-2xl p-4 border border-zinc-200/60 space-y-2 text-xs">
            <div className="flex justify-between items-center text-zinc-500">
              <span>Tạm tính (Subtotal):</span>
              <span className="font-mono font-semibold text-zinc-700">
                {formatVND(invoice.subTotal)}
              </span>
            </div>

            {invoice.discount > 0 && (
              <div className="flex justify-between items-center text-purple-700">
                <span>Chiết khấu (Discount):</span>
                <span className="font-mono font-bold">
                  -{formatVND(invoice.discount)}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-zinc-200/70 flex justify-between items-baseline">
              <span className="font-bold text-zinc-900 text-sm">
                Tổng cộng (Total Due):
              </span>
              <span className="font-mono font-extrabold text-base text-zinc-900">
                {formatVND(invoice.finalAmount)}
              </span>
            </div>

            <div className="flex justify-between items-center text-zinc-600 pt-1">
              <span>Đã thanh toán (Paid):</span>
              <span className="font-mono font-semibold text-emerald-700">
                {formatVND(invoice.paidAmount)}
              </span>
            </div>

            {invoice.debtAmount > 0 && (
              <div className="flex justify-between items-center text-rose-600 font-bold pt-1">
                <span>Còn nợ lại (Debt):</span>
                <span className="font-mono text-sm">
                  {formatVND(invoice.debtAmount)}
                </span>
              </div>
            )}
          </div>

          {/* Dưới cùng: Thẻ màu vàng nhạt cảnh báo "Payment Pending" theo yêu cầu */}
          {isPending ? (
            <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3 text-amber-900">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <div className="font-bold">Payment Pending (Đang Chờ Thanh Toán)</div>
                <div className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                  Đơn hàng còn nợ lại{' '}
                  <strong className="font-mono">{formatVND(invoice.debtAmount)}</strong>.
                  Khách hàng có thể quét mã VietQR trên hóa đơn hoặc thanh toán nợ tại mục Công nợ.
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-2xl p-3.5 flex items-start gap-3 text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <div className="font-bold">Payment Completed (Đã Thu Đủ Tiền)</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">
                  Đơn hàng đã được tất toán 100% qua phương thức {invoice.paymentMethod === 'transfer' ? 'Chuyển khoản QR' : 'Tiền mặt'}.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Action Buttons Footer (Touch-friendly 44px min height) */}
        <div className="p-4 border-t border-zinc-100 bg-white flex items-center gap-2.5">
          {onPrint && (
            <button
              type="button"
              onClick={() => onPrint(invoice)}
              className="flex-1 min-h-[44px] px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-xs active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              In Hóa Đơn
            </button>
          )}

          {isPending && onPayDebt && (
            <button
              type="button"
              onClick={() => onPayDebt(invoice)}
              className="min-h-[44px] px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-transform flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              Thu Nợ
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 border border-zinc-200 rounded-xl text-zinc-700 font-semibold text-xs hover:bg-zinc-50 active:scale-95 transition-transform cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
