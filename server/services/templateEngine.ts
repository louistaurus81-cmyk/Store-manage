import { JsonDatabaseEngine } from '../db/jsonEngine';
import type { PrintHistoryItem, PrintTemplate, StoreSettings } from '../../src/types/datasoft';

export class TemplateEngine {
  private static instance: TemplateEngine;
  private db: JsonDatabaseEngine;

  private constructor() {
    this.db = JsonDatabaseEngine.getInstance();
  }

  public static getInstance(): TemplateEngine {
    if (!TemplateEngine.instance) {
      TemplateEngine.instance = new TemplateEngine();
    }
    return TemplateEngine.instance;
  }

  /**
   * Lấy danh sách mẫu in
   */
  public async getTemplates(type?: 'invoice' | 'repair_ticket' | 'quote'): Promise<PrintTemplate[]> {
    const templates = await this.db.getList<PrintTemplate>('print_templates.json');
    if (type) {
      return templates.filter((t) => t.type === type);
    }
    return templates;
  }

  public async getTemplateById(id: string): Promise<PrintTemplate | null> {
    return this.db.findById<PrintTemplate>('print_templates.json', id);
  }

  public async getDefaultTemplate(type: 'invoice' | 'repair_ticket' | 'quote'): Promise<PrintTemplate | null> {
    const templates = await this.getTemplates(type);
    return templates.find((t) => t.isDefault) || templates[0] || null;
  }

  public async saveTemplate(template: Omit<PrintTemplate, 'id' | 'createdAt'> & { id?: string }): Promise<PrintTemplate> {
    if (template.id) {
      const updated = await this.db.update<PrintTemplate>('print_templates.json', template.id, {
        ...template,
        updatedAt: new Date().toISOString(),
      });
      if (!updated) throw new Error('Không tìm thấy mẫu in để cập nhật');
      return updated;
    }

    const newTemplate: PrintTemplate = {
      ...template,
      id: `TMPL-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.db.insert<PrintTemplate>('print_templates.json', newTemplate);
    return newTemplate;
  }

  /**
   * Render Template: Thay thế các biến {{variable_name}} bằng dữ liệu thực tế
   */
  public async render(
    templateIdOrType: string,
    data: Record<string, any>
  ): Promise<{ html: string; template: PrintTemplate }> {
    let template = await this.getTemplateById(templateIdOrType);
    if (!template) {
      // Thử tìm theo type mặc định
      template = await this.getDefaultTemplate(templateIdOrType as any);
    }

    if (!template) {
      throw new Error(`Không tìm thấy mẫu in phù hợp cho: ${templateIdOrType}`);
    }

    // Nạp settings mặc định của shop nếu chưa truyền vào
    const settings = await this.db.read<StoreSettings>('settings.json');
    const mergedData = {
      store_name: settings?.storeName || 'TRUNG TÂM MÁY TÍNH & DỊCH VỤ CÔNG NGHỆ DATASOFT',
      store_address: settings?.address || 'Số 168 Cầu Giấy, Hà Nội',
      store_phone: settings?.phone || '0988.123.456',
      bank_info: `${settings?.bankName || 'Vietcombank'} - STK: ${settings?.bankAccount || '998812345678'} (${settings?.bankOwner || 'NGUYEN THANH NAM'})`,
      footer_note: settings?.invoiceFooterNote || '',
      date: new Date().toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      ...data,
    };

    // Replace các placeholder dạng {{variable}}
    let rendered = template.htmlContent;
    for (const [key, value] of Object.entries(mergedData)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, String(value ?? ''));
    }

    return { html: rendered, template };
  }

  /**
   * Ghi nhận lịch sử in để chống gian lận
   */
  public async recordPrintHistory(params: {
    documentId: string;
    documentCode: string;
    documentType: 'invoice' | 'repair_ticket' | 'pc_build';
    templateId?: string;
    printedBy: string;
    printedByName: string;
  }): Promise<PrintHistoryItem> {
    const historyItem: PrintHistoryItem = {
      id: `PRN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5)}`,
      documentId: params.documentId,
      documentCode: params.documentCode,
      documentType: params.documentType,
      templateId: params.templateId,
      printedBy: params.printedBy,
      printedByName: params.printedByName,
      printedAt: new Date().toISOString(),
    };

    await this.db.insert<PrintHistoryItem>('print_history.json', historyItem);
    return historyItem;
  }

  /**
   * Xem lịch sử in ấn
   */
  public async getPrintHistory(documentId?: string): Promise<PrintHistoryItem[]> {
    const history = await this.db.getList<PrintHistoryItem>('print_history.json');
    if (documentId) {
      return history.filter((h) => h.documentId === documentId);
    }
    return history;
  }
}
