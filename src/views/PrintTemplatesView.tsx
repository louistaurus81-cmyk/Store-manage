import React, { useState, useEffect } from 'react';
import {
  Printer,
  FileCode,
  History,
  Check,
  Eye,
  Save,
  Plus,
  RefreshCw,
  Sparkles,
  Shield,
  Layers,
} from 'lucide-react';
import type { PrintHistoryItem, PrintTemplate } from '../types/datasoft';
import { apiFetch, formatDate } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export const PrintTemplatesView: React.FC = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [history, setHistory] = useState<PrintHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'templates' | 'history'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<PrintTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tmpls, hist] = await Promise.all([
        apiFetch<PrintTemplate[]>('/api/print-templates'),
        apiFetch<PrintHistoryItem[]>('/api/print-history'),
      ]);
      setTemplates(tmpls);
      setHistory(hist);
      if (tmpls.length > 0 && !selectedTemplate) {
        setSelectedTemplate(tmpls[0]);
        renderPreview(tmpls[0]);
      }
    } catch (err) {
      console.error('Lỗi tải mẫu in:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderPreview = async (tmpl: PrintTemplate) => {
    try {
      const sampleData: Record<string, any> = {
        invoice_code: 'HD-202610-SAMPLE',
        ticket_code: 'SC-202610-SAMPLE',
        customer_name: 'Nguyễn Văn Hoàng',
        customer_phone: '0988.888.999',
        customer_address: 'Số 88 Cầu Giấy, Hà Nội',
        date: new Date().toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        sales_name: user?.fullName || 'Lê Thị Thu Thảo',
        subtotal: '22.500.000 đ',
        discount: '500.000 đ',
        final_amount: '22.000.000 đ',
        paid_amount: '22.000.000 đ',
        debt_amount: '0 đ',
        items_table: `
          <tr>
            <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">1</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">
              <strong>Laptop Gaming Asus TUF F15</strong>
              <div style="font-size: 11px; color: #059669; font-family: monospace;">Serial: ASUS-TUF-M9N0CV01</div>
            </td>
            <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">12T</td>
            <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">1</td>
            <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">16.800.000 đ</td>
            <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">16.800.000 đ</td>
          </tr>
          <tr>
            <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">2</td>
            <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">
              <strong>Màn hình Gaming LG UltraGear 24" 144Hz</strong>
              <div style="font-size: 11px; color: #059669; font-family: monospace;">Serial: LG-24GN-882910</div>
            </td>
            <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">24T</td>
            <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">1</td>
            <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">3.250.000 đ</td>
            <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">3.250.000 đ</td>
          </tr>
        `,
        device_name: 'Laptop Dell XPS 15 9570 (i7/16G/GTX1050Ti)',
        model: 'XPS 15 9570',
        device_serial: 'ST-9B7C1Y2',
        passcode: '1905',
        accessories: 'Thân máy, sạc zin 130W, túi chống sốc',
        condition: 'Vỏ xước nhẹ, bản lề nguyên vẹn',
        issue_description: 'Bật nguồn quạt quay rồi tắt, không lên hình, máy rất nóng.',
        diagnosis: 'Chập tụ VCore và khô keo tản nhiệt CPU/GPU dẫn đến ngắt nhiệt.',
        estimated_cost: '650.000 đ',
        deposit_amount: '200.000 đ',
        remaining_cost: '450.000 đ',
        technician_name: 'Đặng Tuấn Anh',
        warranty_period: '3 tháng bảo hành phần cứng',
      };

      const res = await apiFetch<{ html: string }>('/api/print-templates/render', {
        method: 'POST',
        body: JSON.stringify({
          templateIdOrType: tmpl.id,
          data: sampleData,
        }),
      });

      setPreviewHtml(res.html);
    } catch (err: any) {
      console.error('Lỗi render mẫu in:', err);
    }
  };

  const handleSelectTemplate = (tmpl: PrintTemplate) => {
    setSelectedTemplate(tmpl);
    renderPreview(tmpl);
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      const saved = await apiFetch<PrintTemplate>('/api/print-templates', {
        method: 'POST',
        body: JSON.stringify(selectedTemplate),
      });

      setTemplates(templates.map((t) => (t.id === saved.id ? saved : t)));
      setSaveMessage('Đã lưu mẫu in thành công vào DATASOFT/print_templates.json!');
      setTimeout(() => setSaveMessage(null), 3000);
      renderPreview(saved);
    } catch (err: any) {
      alert(err.message || 'Lỗi lưu mẫu in');
    }
  };

  const handlePrintTest = async () => {
    if (!previewHtml || !selectedTemplate) return;

    // Ghi nhận log in ấn
    try {
      await apiFetch<PrintHistoryItem>('/api/print-history', {
        method: 'POST',
        body: JSON.stringify({
          documentId: 'TEST-PREVIEW-001',
          documentCode: 'IN-THU-NGHIEM',
          documentType: selectedTemplate.type,
          templateId: selectedTemplate.id,
        }),
      });
      // Tải lại lịch sử in
      const hist = await apiFetch<PrintHistoryItem[]>('/api/print-history');
      setHistory(hist);
    } catch {
      // ignore
    }

    // In trực tiếp
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Bản In Thử Nghiệm - ${selectedTemplate.templateName}</title>
            <style>
              @page { size: auto; margin: 10mm; }
              body { margin: 0; padding: 0; }
            </style>
          </head>
          <body>
            ${previewHtml}
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() { window.close(); }
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans select-none">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileCode className="w-5 h-5 text-emerald-600" />
            Quản Lý Mẫu In & Bản In (Print Template Engine)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tùy biến mẫu hóa đơn, phiếu tiếp nhận sửa chữa với các biến biến động dạng <code>{'{{variable}}'}</code> và theo dõi lịch sử in chống gian lận
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintTest}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            In Thử Nghiệm (Preview)
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl max-w-md text-xs font-semibold">
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-2 text-center rounded-lg transition-all cursor-pointer ${
            activeTab === 'templates' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Mẫu In HTML/CSS ({templates.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-center rounded-lg transition-all cursor-pointer ${
            activeTab === 'history' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Lịch Sử Bản In ({history.length})
        </button>
      </div>

      {/* TAB 1: TEMPLATE EDITOR & LIVE PREVIEW */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Template Selector & HTML Editor */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 flex flex-col text-xs">
            <div className="flex items-center justify-between pb-3 border-b">
              <span className="font-bold text-slate-900 text-sm">Chỉnh Sửa Mã Nguồn HTML/CSS</span>
              <button
                onClick={handleSaveTemplate}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Lưu Thay Đổi
              </button>
            </div>

            {/* Template Selector Buttons */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {templates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => handleSelectTemplate(tmpl)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedTemplate?.id === tmpl.id
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {tmpl.templateName}
                </button>
              ))}
            </div>

            {selectedTemplate && (
              <div className="space-y-3 flex-1 flex flex-col">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Tên Mẫu In:
                  </label>
                  <input
                    type="text"
                    value={selectedTemplate.templateName}
                    onChange={(e) =>
                      setSelectedTemplate({ ...selectedTemplate, templateName: e.target.value })
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                {/* Variable chips */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    CÁC BIẾN HỢP LỆ (Nhấn để chèn):
                  </label>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {selectedTemplate.variables?.map((v) => (
                      <span
                        key={v}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]"
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Code editor */}
                <div className="flex-1 min-h-[360px] flex flex-col">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Mã HTML Mẫu In:
                  </label>
                  <textarea
                    value={selectedTemplate.htmlContent}
                    onChange={(e) => {
                      const updated = { ...selectedTemplate, htmlContent: e.target.value };
                      setSelectedTemplate(updated);
                      renderPreview(updated);
                    }}
                    className="flex-1 w-full p-3 font-mono text-[11px] leading-relaxed bg-slate-900 text-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 overflow-y-auto"
                    rows={16}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right: Real-time Live Print Canvas Preview */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b mb-3">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-emerald-600" />
                Xem Trước Thực Tế (Live Preview A4/A5)
              </span>
              <span className="text-[11px] text-slate-400">Dữ liệu mẫu thực tế</span>
            </div>

            <div className="flex-1 border border-slate-200 rounded-xl p-4 bg-white overflow-y-auto shadow-inner min-h-[480px]">
              <div
                dangerouslySetInnerHTML={{ __html: previewHtml }}
                className="prose prose-xs max-w-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRINT HISTORY LOGS (Chống gian lận) */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center text-xs">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Nhật Ký Lịch Sử Bản In (Print Audit Log)</h3>
              <p className="text-slate-500">
                Ghi nhận tự động mọi lượt in hóa đơn, phiếu sửa chữa để phòng ngừa gian lận in khống
              </p>
            </div>
            <span className="font-mono text-slate-500">{history.length} lượt in đã ghi nhận</span>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b font-semibold">
                <th className="p-3">Mã Nhật Ký</th>
                <th className="p-3">Mã Tài Liệu</th>
                <th className="p-3">Loại Tài Liệu</th>
                <th className="p-3">Người Thực Hiện In</th>
                <th className="p-3">Thời Điểm In</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-semibold text-slate-600">{item.id}</td>
                  <td className="p-3 font-mono font-bold text-emerald-700">{item.documentCode}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800 uppercase font-mono">
                      {item.documentType}
                    </span>
                  </td>
                  <td className="p-3 font-medium text-slate-900">{item.printedByName}</td>
                  <td className="p-3 font-mono text-slate-500">{formatDate(item.printedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
