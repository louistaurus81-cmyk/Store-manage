import React, { useState, useEffect } from 'react';
import { Scale, CheckCircle2, DollarSign, Calendar, Clock, AlertCircle } from 'lucide-react';
import type { Debt } from '../types/datasoft';
import { apiFetch, formatVND, formatDateOnly } from '../utils/api';

export const DebtsView: React.FC = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabType, setTabType] = useState<'customer' | 'supplier'>('customer');
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentNote, setPaymentNote] = useState('');

  useEffect(() => {
    loadDebts();
  }, [tabType]);

  const loadDebts = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Debt[]>(`/api/debts?type=${tabType}`);
      setDebts(data);
    } catch (err) {
      console.error('Lỗi nạp công nợ:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayDebtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebt || paymentAmount <= 0) return;

    try {
      await apiFetch<Debt>(`/api/debts/${payingDebt.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          amount: paymentAmount,
          note: paymentNote,
        }),
      });

      setPayingDebt(null);
      setPaymentAmount(0);
      setPaymentNote('');
      loadDebts();
    } catch (err: any) {
      alert(err.message || 'Lỗi thanh toán công nợ');
    }
  };

  const totalRemaining = debts.reduce((sum, d) => sum + d.remainingDebt, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Sổ Theo dõi & Quản lý Công nợ (DATASOFT Ledger)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi chi tiết công nợ phải thu của khách hàng và công nợ phải trả cho nhà cung cấp
          </p>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg text-right border border-slate-200">
          <div className="text-[11px] text-slate-500">
            {tabType === 'customer' ? 'Tổng nợ phải thu (Khách nợ):' : 'Tổng nợ phải trả (Nợ NCC):'}
          </div>
          <div className="text-lg font-bold font-mono text-rose-600">{formatVND(totalRemaining)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-lg max-w-md text-xs font-semibold">
        <button
          onClick={() => setTabType('customer')}
          className={`flex-1 py-2 text-center rounded-md transition-colors ${
            tabType === 'customer' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Công nợ Khách hàng (Phải thu)
        </button>
        <button
          onClick={() => setTabType('supplier')}
          className={`flex-1 py-2 text-center rounded-md transition-colors ${
            tabType === 'supplier' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Công nợ Nhà cung cấp (Phải trả)
        </button>
      </div>

      {/* Debt Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="p-3">Đối tượng</th>
                <th className="p-3">Tham chiếu</th>
                <th className="p-3">Hạn thanh toán</th>
                <th className="p-3">Ghi chú</th>
                <th className="p-3 text-right">Tổng nợ ban đầu</th>
                <th className="p-3 text-right">Đã thanh toán</th>
                <th className="p-3 text-right font-bold text-rose-600">Còn nợ lại</th>
                <th className="p-3 text-center w-28">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Đang nạp dữ liệu từ DATASOFT/debts.json...
                  </td>
                </tr>
              ) : debts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Không có bản ghi công nợ nào.
                  </td>
                </tr>
              ) : (
                debts.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{d.entityName}</div>
                      {d.entityPhone && (
                        <div className="text-[11px] font-mono text-slate-500">{d.entityPhone}</div>
                      )}
                    </td>
                    <td className="p-3 font-mono font-semibold text-slate-700">{d.referenceCode}</td>
                    <td className="p-3 font-mono text-slate-600">{formatDateOnly(d.dueDate)}</td>
                    <td className="p-3 text-slate-600 max-w-xs">{d.notes || '-'}</td>
                    <td className="p-3 text-right font-mono text-slate-600">{formatVND(d.totalDebt)}</td>
                    <td className="p-3 text-right font-mono text-emerald-700">{formatVND(d.paidAmount)}</td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600">
                      {formatVND(d.remainingDebt)}
                    </td>
                    <td className="p-3 text-center">
                      {d.remainingDebt > 0 ? (
                        <button
                          onClick={() => {
                            setPayingDebt(d);
                            setPaymentAmount(d.remainingDebt);
                          }}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[11px] font-medium hover:bg-emerald-700 transition-colors shadow-xs"
                        >
                          {tabType === 'customer' ? 'Thu nợ' : 'Trả nợ'}
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-700 font-semibold flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đã trả hết
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Repay Modal */}
      {payingDebt && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-900">
              {tabType === 'customer' ? 'Thu nợ từ Khách hàng' : 'Thanh toán nợ Nhà cung cấp'}
            </h3>
            <p className="text-xs text-slate-600">
              Đối tượng: <strong>{payingDebt.entityName}</strong> · Nợ còn lại:{' '}
              <strong className="font-mono text-rose-600">{formatVND(payingDebt.remainingDebt)}</strong>
            </p>

            <form onSubmit={handlePayDebtSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Số tiền thanh toán (VNĐ) *</label>
                <input
                  type="number"
                  step={10000}
                  max={payingDebt.remainingDebt}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg font-mono focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Ghi chú thanh toán</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Chuyển khoản Vietcombank đợt 2..."
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setPayingDebt(null)}
                  className="px-4 py-2 border rounded-lg text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 shadow-xs"
                >
                  Xác nhận hạch toán
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
