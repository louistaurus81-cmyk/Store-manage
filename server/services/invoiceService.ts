import { JsonDatabaseEngine } from '../db/jsonEngine';
import type {
  Customer,
  CustomerProfileData,
  CustomerPurchasedItem,
  Debt,
  ImeiRecord,
  Invoice,
  InvoiceItem,
  Product,
  RepairTicket,
  Warranty,
} from '../../src/types/datasoft';

export class InvoiceService {
  private db: JsonDatabaseEngine;

  constructor() {
    this.db = JsonDatabaseEngine.getInstance();
  }

  public async getInvoices(): Promise<Invoice[]> {
    return this.db.getList<Invoice>('invoices.json');
  }

  public async getCustomers(): Promise<Customer[]> {
    return this.db.getList<Customer>('customers.json');
  }

  public async getDebts(type?: 'customer' | 'supplier'): Promise<Debt[]> {
    const debts = await this.db.getList<Debt>('debts.json');
    if (type) {
      return debts.filter((d) => d.type === type);
    }
    return debts;
  }

  /**
   * Tạo hóa đơn bán hàng, cập nhật tồn kho, xuất IMEI và ghi công nợ/bảo hành
   */
  public async createInvoice(data: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    salesId: string;
    salesName: string;
    items: InvoiceItem[];
    discount: number;
    paidAmount: number;
    paymentMethod: 'cash' | 'transfer' | 'debt';
    note?: string;
  }): Promise<Invoice> {
    const invoices = await this.db.getList<Invoice>('invoices.json');
    const customers = await this.db.getList<Customer>('customers.json');
    const products = await this.db.getList<Product>('products.json');
    const imeis = await this.db.getList<ImeiRecord>('imeis.json');
    const warranties = await this.db.getList<Warranty>('warranties.json');

    // 1. Kiểm tra hoặc tạo khách hàng
    let customer = customers.find((c) => c.id === data.customerId || c.phone === data.customerPhone);
    if (!customer) {
      customer = {
        id: `CUST-${String(customers.length + 1).padStart(3, '0')}`,
        code: `KH-${String(customers.length + 1).padStart(4, '0')}`,
        name: data.customerName.trim(),
        phone: data.customerPhone.trim(),
        address: data.customerAddress || '',
        totalSpent: 0,
        currentDebt: 0,
        createdAt: new Date().toISOString(),
      };
      customers.unshift(customer);
    }

    // 2. Tính toán tổng tiền
    const subTotal = data.items.reduce((sum, item) => sum + item.total, 0);
    const discount = Number(data.discount) || 0;
    const finalAmount = Math.max(0, subTotal - discount);
    const paidAmount = Number(data.paidAmount) || 0;
    const debtAmount = Math.max(0, finalAmount - paidAmount);

    let status: 'paid' | 'partial' | 'debt' = 'paid';
    if (debtAmount > 0 && paidAmount > 0) status = 'partial';
    else if (debtAmount > 0 && paidAmount === 0) status = 'debt';

    // 3. Sinh mã hóa đơn HD-YYYYMM-XXX
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const countThisMonth = invoices.filter((i) => i.invoiceCode.startsWith(`HD-${yearMonth}`)).length;
    const invoiceCode = `HD-${yearMonth}-${String(countThisMonth + 1).padStart(3, '0')}`;

    const newInvoice: Invoice = {
      id: `INV-${Date.now().toString(36).toUpperCase()}`,
      invoiceCode,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      salesId: data.salesId,
      salesName: data.salesName,
      items: data.items,
      subTotal,
      discount,
      finalAmount,
      paidAmount,
      debtAmount,
      paymentMethod: data.paymentMethod,
      status,
      createdAt: now.toISOString(),
      note: data.note,
    };

    invoices.unshift(newInvoice);
    await this.db.writeAtomic('invoices.json', invoices);

    // 4. Trừ tồn kho & xuất IMEI
    for (const item of data.items) {
      const prodIndex = products.findIndex((p) => p.id === item.productId);
      if (prodIndex !== -1 && products[prodIndex].stockQuantity < 900) {
        products[prodIndex].stockQuantity = Math.max(0, products[prodIndex].stockQuantity - item.quantity);
      }

      if (item.imei) {
        const imeiIndex = imeis.findIndex((i) => i.imei === item.imei);
        if (imeiIndex !== -1) {
          imeis[imeiIndex].status = 'sold';
          imeis[imeiIndex].invoiceId = invoiceCode;
          imeis[imeiIndex].exportDate = now.toISOString();
        }

        // Tự động kích hoạt sổ bảo hành cho sản phẩm có IMEI
        if (item.warrantyMonths > 0) {
          const startDate = new Date();
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + item.warrantyMonths);

          const warrantyRecord: Warranty = {
            id: `WAR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5)}`,
            warrantyCode: `BH-${invoiceCode.replace('HD-', '')}-${item.imei.slice(-4)}`,
            invoiceId: invoiceCode,
            productId: item.productId,
            productName: item.productName,
            imei: item.imei,
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phone,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            status: 'active',
            claims: [],
          };
          warranties.unshift(warrantyRecord);
        }
      }
    }

    await this.db.writeAtomic('products.json', products);
    await this.db.writeAtomic('imeis.json', imeis);
    await this.db.writeAtomic('warranties.json', warranties);

    // 5. Cập nhật công nợ nếu khách nợ
    if (debtAmount > 0) {
      const debts = await this.db.getList<Debt>('debts.json');
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // Mặc định hạn nợ 30 ngày

      const newDebt: Debt = {
        id: `DEBT-${Date.now().toString(36).toUpperCase()}`,
        type: 'customer',
        entityId: customer.id,
        entityName: customer.name,
        entityPhone: customer.phone,
        referenceCode: invoiceCode,
        totalDebt: finalAmount,
        paidAmount,
        remainingDebt: debtAmount,
        dueDate: dueDate.toISOString().split('T')[0],
        status: 'pending',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        notes: `Ghi nợ hóa đơn ${invoiceCode}`,
      };
      debts.unshift(newDebt);
      await this.db.writeAtomic('debts.json', debts);

      customer.currentDebt = (customer.currentDebt || 0) + debtAmount;
    }

    // 6. Cập nhật tổng chi tiêu của khách
    customer.totalSpent = (customer.totalSpent || 0) + finalAmount;
    await this.db.writeAtomic('customers.json', customers);

    return newInvoice;
  }

  /**
   * Thanh toán nợ (khách trả nợ hoặc shop trả nợ NCC)
   */
  public async payDebt(debtId: string, amount: number, note?: string): Promise<Debt> {
    const debts = await this.db.getList<Debt>('debts.json');
    const debtIndex = debts.findIndex((d) => d.id === debtId);
    if (debtIndex === -1) throw new Error('Không tìm thấy bản ghi công nợ');

    const debt = debts[debtIndex];
    const payValue = Math.min(debt.remainingDebt, Math.max(0, amount));

    debt.paidAmount += payValue;
    debt.remainingDebt -= payValue;
    debt.updatedAt = new Date().toISOString();
    debt.status = debt.remainingDebt === 0 ? 'completed' : 'partially_paid';

    if (note) {
      debt.notes = `${debt.notes ? debt.notes + ' | ' : ''}Trả ${payValue.toLocaleString('vi-VN')}đ: ${note}`;
    }

    await this.db.writeAtomic('debts.json', debts);

    // Cập nhật công nợ trong bảng khách hàng
    if (debt.type === 'customer') {
      const customers = await this.db.getList<Customer>('customers.json');
      const custIndex = customers.findIndex((c) => c.id === debt.entityId);
      if (custIndex !== -1) {
        customers[custIndex].currentDebt = Math.max(0, customers[custIndex].currentDebt - payValue);
        await this.db.writeAtomic('customers.json', customers);
      }
    }

    return debt;
  }

  /**
   * API Hồ sơ khách hàng chuyên sâu (CRM):
   * Kết hợp dữ liệu từ customers.json, invoices.json, repairs.json và debts.json
   */
  public async getCustomerProfile(customerIdOrPhone: string): Promise<CustomerProfileData | null> {
    const customers = await this.db.getList<Customer>('customers.json');
    const customer = customers.find(
      (c) => c.id === customerIdOrPhone || c.phone === customerIdOrPhone || c.code === customerIdOrPhone
    );

    if (!customer) return null;

    const [invoices, repairs, debts, products] = await Promise.all([
      this.db.getList<Invoice>('invoices.json'),
      this.db.getList<RepairTicket>('repairs.json'),
      this.db.getList<Debt>('debts.json'),
      this.db.getList<Product>('products.json'),
    ]);

    const productMap = new Map<string, Product>();
    for (const p of products) {
      productMap.set(p.id, p);
    }

    // 1. Lọc toàn bộ hóa đơn của khách này
    const customerInvoices = invoices.filter(
      (inv) => inv.customerId === customer.id || inv.customerPhone === customer.phone
    );

    // 2. Chi tiết các linh kiện & máy tính khách đã từng mua
    const purchasedItems: CustomerPurchasedItem[] = [];
    for (const inv of customerInvoices) {
      if (Array.isArray(inv.items)) {
        for (const item of inv.items) {
          const prod = productMap.get(item.productId);
          purchasedItems.push({
            productId: item.productId,
            productName: item.productName || prod?.name || 'Sản phẩm',
            sku: prod?.sku,
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            total: Number(item.total) || 0,
            imei: item.imei,
            invoiceCode: inv.invoiceCode,
            invoiceId: inv.id,
            purchaseDate: inv.createdAt,
            warrantyMonths: item.warrantyMonths || prod?.warrantyMonths || 12,
          });
        }
      }
    }

    // 3. Lọc lịch sử tiếp nhận sửa chữa của khách
    const customerRepairs = repairs.filter(
      (r) => r.customerId === customer.id || r.customerPhone === customer.phone
    );

    // 4. Lọc lịch sử công nợ
    const customerDebts = debts.filter(
      (d) =>
        d.type === 'customer' &&
        (d.entityId === customer.id ||
          d.entityPhone === customer.phone ||
          d.entityName.toLowerCase() === customer.name.toLowerCase())
    );

    const totalSpent = customerInvoices.reduce((sum, inv) => sum + (Number(inv.finalAmount) || 0), 0);
    const currentDebt = customerDebts.reduce((sum, d) => sum + (Number(d.remainingDebt) || 0), 0);
    const totalPaidDebt = customerDebts.reduce((sum, d) => sum + (Number(d.paidAmount) || 0), 0);

    return {
      customer,
      stats: {
        totalSpent,
        totalOrders: customerInvoices.length,
        totalRepairs: customerRepairs.length,
        currentDebt,
        totalPaidDebt,
      },
      invoices: customerInvoices.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      repairs: customerRepairs.sort(
        (a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime()
      ),
      debts: customerDebts.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      purchasedItems: purchasedItems.sort(
        (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
      ),
    };
  }

  public async createCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'totalSpent' | 'currentDebt'>): Promise<Customer> {
    const customers = await this.db.getList<Customer>('customers.json');
    if (customers.some((c) => c.phone === data.phone.trim())) {
      throw new Error(`Số điện thoại [${data.phone}] đã tồn tại trong hệ thống!`);
    }

    const newCustomer: Customer = {
      id: `CUST-${String(customers.length + 1).padStart(3, '0')}`,
      code: `KH-${String(customers.length + 1).padStart(4, '0')}`,
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim(),
      address: data.address?.trim(),
      totalSpent: 0,
      currentDebt: 0,
      createdAt: new Date().toISOString(),
    };

    await this.db.insert<Customer>('customers.json', newCustomer);
    return newCustomer;
  }
}
