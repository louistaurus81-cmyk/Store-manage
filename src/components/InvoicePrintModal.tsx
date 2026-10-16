import React from 'react';
import { Printer, X, QrCode } from 'lucide-react';
import type { Invoice, StoreSettings } from '../types/datasoft';
import { formatVND, formatDate } from '../utils/api';

interface InvoicePrintModalProps {
  invoice: Invoice;
  settings: StoreSettings | null;
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  invoice,
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
    bankName: 'Vietcombank - Chi nhánh Thăng Long',
    bankAccount: '998812345678',
    bankOwner: 'NGUYEN THANH NAM',
    invoiceFooterNote:
      'Cảm ơn Quý khách đã mua sắm tại DATASOFT! Quý khách vui lòng giữ hóa đơn để được hỗ trợ bảo hành chính hãng.',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 no-print">
          <span className="font-semibold text-slate-800 text-sm">
            Hóa đơn Bán hàng: {invoice.invoiceCode}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              In Hóa Đơn
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Paper Canvas */}
        <div className="p-8 overflow-y-auto text-slate-900 text-xs font-sans print:p-0 print:m-0">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-base font-bold text-slate-950 uppercase tracking-tight">
                  {store.storeName}
                </h1>
                <p className="text-[11px] text-slate-700 mt-0.5">{store.address}</p>
                <p className="text-[11px] text-slate-700">Điện thoại: {store.phone} | Email: {store.email}</p>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono font-bold text-slate-900">{invoice.invoiceCode}</div>
                <div className="text-[11px] text-slate-600">Ngày: {formatDate(invoice.createdAt)}</div>
                <div className="text-[11px] text-slate-600">NV Bán hàng: {invoice.salesName}</div>
              </div>
            </div>
          </div>

          <div className="text-center my-4">
            <h2 className="text-lg font-bold uppercase tracking-wider text-slate-900">
              HÓA ĐƠN BÁN HÀNG & BẢO HÀNH
            </h2>
          </div>

          {/* Customer */}
          <div className="my-3 p-3 border border-slate-200 rounded-lg bg-slate-50 print:bg-white print:border-slate-400 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>Khách hàng: <strong className="font-semibold">{invoice.customerName}</strong></div>
              <div>Số điện thoại: <strong className="font-mono">{invoice.customerPhone}</strong></div>
            </div>
          </div>

          {/* Item Table */}
          <table className="w-full text-left border-collapse border border-slate-200 text-xs my-4">
            <thead>
              <tr className="bg-slate-100 print:bg-slate-200">
                <th className="border border-slate-200 p-2 text-center w-8">#</th>
                <th className="border border-slate-200 p-2">Tên sản phẩm / Linh kiện & IMEI</th>
                <th className="border border-slate-200 p-2 text-center w-14">BH</th>
                <th className="border border-slate-200 p-2 text-center w-12">SL</th>
                <th className="border border-slate-200 p-2 text-right">Đơn giá</th>
                <th className="border border-slate-200 p-2 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="border border-slate-200 p-2 text-center font-mono">{idx + 1}</td>
                  <td className="border border-slate-200 p-2">
                    <div className="font-semibold text-slate-900">{item.productName}</div>
                    {item.imei && (
                      <div className="text-[11px] font-mono text-emerald-800 mt-0.5">
                        Serial/IMEI: {item.imei}
                      </div>
                    )}
                  </td>
                  <td className="border border-slate-200 p-2 text-center font-mono">{item.warrantyMonths}T</td>
                  <td className="border border-slate-200 p-2 text-center font-mono">{item.quantity}</td>
                  <td className="border border-slate-200 p-2 text-right font-mono">{formatVND(item.unitPrice)}</td>
                  <td className="border border-slate-200 p-2 text-right font-mono font-semibold">
                    {formatVND(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total & Payment details */}
          <div className="flex justify-between items-start my-4">
            <div className="flex items-start gap-3">
              <div className="text-[11px] max-w-xs space-y-1">
                <div className="font-bold text-slate-800">Thông tin chuyển khoản (VietQR):</div>
                <div>Ngân hàng: <strong>{store.bankName}</strong></div>
                <div>Số TK: <strong className="font-mono text-slate-900">{store.bankAccount}</strong></div>
                <div>Chủ TK: <strong>{store.bankOwner}</strong></div>
                <div className="text-slate-500 mt-1">Nội dung CK: <span className="font-mono">{invoice.invoiceCode}</span></div>
              </div>
              <div className="flex flex-col items-center border border-slate-200 rounded-lg p-1.5 bg-white text-center shadow-2xs">
                <img
                  src={`https://img.vietqr.io/image/970436-${store.bankAccount || '998812345678'}-compact2.png?amount=${
                    invoice.debtAmount > 0 ? invoice.debtAmount : invoice.finalAmount
                  }&addInfo=${encodeURIComponent(invoice.invoiceCode)}&accountName=${encodeURIComponent(store.bankOwner || 'NGUYEN THANH NAM')}`}
                  alt="VietQR"
                  className="w-22 h-22 object-contain"
                />
                <span className="text-[9px] font-mono font-semibold text-slate-700 mt-1">
                  {invoice.debtAmount > 0
                    ? `QR Tiền nợ: ${formatVND(invoice.debtAmount)}`
                    : `QR Thanh toán: ${formatVND(invoice.finalAmount)}`}
                </span>
              </div>
            </div>

            <div className="w-64 space-y-1 text-right text-xs">
              <div className="flex justify-between">
                <span>Tổng tiền hàng:</span>
                <span className="font-mono">{formatVND(invoice.subTotal)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Chiết khấu / Giảm giá:</span>
                  <span className="font-mono">-{formatVND(invoice.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-300 pt-1.5">
                <span>Tổng thanh toán:</span>
                <span className="font-mono text-emerald-700">{formatVND(invoice.finalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Đã thanh toán:</span>
                <span className="font-mono">{formatVND(invoice.paidAmount)}</span>
              </div>
              {invoice.debtAmount > 0 && (
                <div className="flex justify-between font-bold text-rose-700">
                  <span>Còn nợ lại:</span>
                  <span className="font-mono">{formatVND(invoice.debtAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Notes */}
          <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-600 mb-8">
            <p>{store.invoiceFooterNote}</p>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 text-center text-xs gap-8">
            <div>
              <div className="font-bold uppercase text-slate-800">Khách hàng nhận hàng</div>
              <p className="text-[10px] text-slate-500 italic mb-12">(Ký và ghi rõ họ tên)</p>
              <div className="font-semibold text-slate-800">{invoice.customerName}</div>
            </div>
            <div>
              <div className="font-bold uppercase text-slate-800">Người lập hóa đơn</div>
              <p className="text-[10px] text-slate-500 italic mb-12">(Ký và ghi rõ họ tên)</p>
              <div className="font-semibold text-slate-800">{invoice.salesName}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
