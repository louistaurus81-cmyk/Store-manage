import { JsonDatabaseEngine } from '../db/jsonEngine';
import type { Customer, Invoice, InvoiceItem, PcBuild, Product } from '../../src/types/datasoft';

export class PcBuildService {
  private db: JsonDatabaseEngine;

  constructor() {
    this.db = JsonDatabaseEngine.getInstance();
  }

  public async getBuilds(): Promise<PcBuild[]> {
    return this.db.getList<PcBuild>('pc_builds.json');
  }

  public async getBuildById(id: string): Promise<PcBuild | null> {
    return this.db.findById<PcBuild>('pc_builds.json', id);
  }

  public async createBuild(data: Omit<PcBuild, 'id' | 'buildCode' | 'createdAt' | 'status'>): Promise<PcBuild> {
    const builds = await this.db.getList<PcBuild>('pc_builds.json');

    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = builds.filter((b) => b.buildCode?.startsWith(`PC-${yearMonth}`)).length;
    const buildCode = `PC-${yearMonth}-${String(count + 1).padStart(3, '0')}`;

    const totalPrice = data.items.reduce((sum, item) => sum + item.total, 0);
    const discount = Number(data.discount) || 0;
    const finalPrice = Math.max(0, totalPrice - discount);

    const newBuild: PcBuild = {
      id: `BUILD-${Date.now().toString(36).toUpperCase()}`,
      buildCode,
      buildName: data.buildName.trim(),
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      creatorId: data.creatorId,
      creatorName: data.creatorName,
      items: data.items,
      totalPrice,
      discount,
      finalPrice,
      note: data.note || '',
      createdAt: now.toISOString(),
      status: 'draft',
    };

    await this.db.insert<PcBuild>('pc_builds.json', newBuild);
    return newBuild;
  }

  public async updateBuild(id: string, updates: Partial<PcBuild>): Promise<PcBuild | null> {
    const build = await this.db.findById<PcBuild>('pc_builds.json', id);
    if (!build) return null;

    if (updates.items) {
      updates.totalPrice = updates.items.reduce((sum, item) => sum + item.total, 0);
      const discount = updates.discount !== undefined ? updates.discount : build.discount;
      updates.finalPrice = Math.max(0, updates.totalPrice - discount);
    }

    return this.db.update<PcBuild>('pc_builds.json', id, updates);
  }

  public async deleteBuild(id: string): Promise<boolean> {
    return this.db.delete<PcBuild>('pc_builds.json', id);
  }

  /**
   * Chuyển đổi cấu hình PC sang Hóa đơn bán lẻ & tự động trừ kho
   */
  public async convertToInvoice(
    buildId: string,
    params: {
      paymentMethod: 'cash' | 'transfer' | 'debt';
      paidAmount: number;
      salesId: string;
      salesName: string;
      note?: string;
    }
  ): Promise<{ invoice: Invoice; pcBuild: PcBuild }> {
    const build = await this.db.findById<PcBuild>('pc_builds.json', buildId);
    if (!build) {
      throw new Error('Không tìm thấy cấu hình PC');
    }
    if (build.status === 'converted_to_invoice') {
      throw new Error(`Cấu hình này đã được xuất thành hóa đơn ${build.convertedInvoiceCode}`);
    }

    const invoices = await this.db.getList<Invoice>('invoices.json');
    const products = await this.db.getList<Product>('products.json');
    const customers = await this.db.getList<Customer>('customers.json');

    // 1. Kiểm tra hoặc tạo khách hàng
    let customer = customers.find((c) => c.phone === build.customerPhone);
    if (!customer) {
      customer = {
        id: `CUST-${String(customers.length + 1).padStart(3, '0')}`,
        code: `KH-${String(customers.length + 1).padStart(4, '0')}`,
        name: build.customerName || 'Khách vãng lai',
        phone: build.customerPhone || '0900000000',
        totalSpent: 0,
        currentDebt: 0,
        createdAt: new Date().toISOString(),
      };
      customers.unshift(customer);
    }

    // 2. Chuyển items sang InvoiceItem
    const invoiceItems: InvoiceItem[] = build.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      imei: item.imei,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      total: item.total,
      warrantyMonths: item.warrantyMonths || 36,
    }));

    // 3. Trừ tồn kho trong products.json
    for (const item of build.items) {
      const prodIndex = products.findIndex((p) => p.id === item.productId);
      if (prodIndex !== -1 && products[prodIndex].stockQuantity < 900) {
        products[prodIndex].stockQuantity = Math.max(0, products[prodIndex].stockQuantity - item.quantity);
      }
    }
    await this.db.writeAtomic('products.json', products);

    // 4. Tạo hóa đơn bán lẻ
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = invoices.filter((i) => i.invoiceCode.startsWith(`HD-${yearMonth}`)).length;
    const invoiceCode = `HD-${yearMonth}-${String(count + 1).padStart(3, '0')}`;

    const paidAmount = Number(params.paidAmount) || 0;
    const debtAmount = Math.max(0, build.finalPrice - paidAmount);

    let invoiceStatus: 'paid' | 'partial' | 'debt' = 'paid';
    if (debtAmount > 0 && paidAmount > 0) invoiceStatus = 'partial';
    else if (debtAmount > 0 && paidAmount === 0) invoiceStatus = 'debt';

    const newInvoice: Invoice = {
      id: `INV-${Date.now().toString(36).toUpperCase()}`,
      invoiceCode,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      salesId: params.salesId,
      salesName: params.salesName,
      items: invoiceItems,
      subTotal: build.totalPrice,
      discount: build.discount,
      finalAmount: build.finalPrice,
      paidAmount,
      debtAmount,
      paymentMethod: params.paymentMethod,
      status: invoiceStatus,
      createdAt: now.toISOString(),
      note: `Xuất từ bộ PC: ${build.buildName} (${build.buildCode}). ${params.note || ''}`,
    };

    invoices.unshift(newInvoice);
    await this.db.writeAtomic('invoices.json', invoices);

    // 5. Cập nhật chi tiêu và công nợ nếu có
    customer.totalSpent += build.finalPrice;
    if (debtAmount > 0) {
      customer.currentDebt += debtAmount;
    }
    await this.db.writeAtomic('customers.json', customers);

    // 6. Cập nhật trạng thái cấu hình PC
    build.status = 'converted_to_invoice';
    build.convertedInvoiceCode = invoiceCode;
    await this.db.update<PcBuild>('pc_builds.json', buildId, build);

    return { invoice: newInvoice, pcBuild: build };
  }
}
