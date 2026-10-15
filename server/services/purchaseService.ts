import { JsonDatabaseEngine } from '../db/jsonEngine';
import type { Debt, ImeiRecord, Product, PurchaseReceipt, Supplier } from '../../src/types/datasoft';

export class PurchaseService {
  private db: JsonDatabaseEngine;

  constructor() {
    this.db = JsonDatabaseEngine.getInstance();
  }

  public async getPurchaseReceipts(): Promise<PurchaseReceipt[]> {
    const receipts = await this.db.getList<PurchaseReceipt>('purchase_receipts.json');
    return receipts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getPurchaseReceiptById(id: string): Promise<PurchaseReceipt | null> {
    const receipts = await this.db.getList<PurchaseReceipt>('purchase_receipts.json');
    return receipts.find((r) => r.id === id || r.receiptCode === id) || null;
  }

  /**
   * Tạo phiếu nhập kho hàng (Transaction đồng thời an toàn):
   * 1. Lưu phiếu nhập vào purchase_receipts.json
   * 2. Cộng dồn stockQuantity vào products.json
   * 3. Thêm danh sách số Serial/IMEI mới vào imeis.json (kèm supplierId)
   * 4. Tự động ghi nhận công nợ vào debts.json nếu paidAmount < totalAmount
   */
  public async createPurchaseReceipt(data: {
    sourceType: 'supplier' | 'customer';
    supplierId?: string;
    supplierName: string;
    supplierPhone?: string;
    items: Array<{
      productId: string;
      productName: string;
      sku?: string;
      quantity: number;
      importPrice: number;
      imeis?: string[];
    }>;
    paidAmount: number;
    paymentMethod: 'cash' | 'transfer' | 'debt';
    dueDate?: string;
    note?: string;
    createdBy: string;
    createdByName?: string;
  }): Promise<PurchaseReceipt> {
    if (!data.items || data.items.length === 0) {
      throw new Error('Phiếu nhập kho phải có ít nhất 1 sản phẩm');
    }

    const receipts = await this.db.getList<PurchaseReceipt>('purchase_receipts.json');
    const products = await this.db.getList<Product>('products.json');
    const imeis = await this.db.getList<ImeiRecord>('imeis.json');
    const debts = await this.db.getList<Debt>('debts.json');

    // 1. Tính toán tổng tiền
    let totalAmount = 0;
    const processedItems = data.items.map((item) => {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const price = Math.max(0, Number(item.importPrice) || 0);
      const itemTotal = qty * price;
      totalAmount += itemTotal;

      return {
        ...item,
        quantity: qty,
        importPrice: price,
        total: itemTotal,
        imeis: Array.isArray(item.imeis)
          ? item.imeis.map((s) => s.trim().toUpperCase()).filter(Boolean)
          : [],
      };
    });

    const paid = Math.min(totalAmount, Math.max(0, Number(data.paidAmount) || 0));
    const debt = Math.max(0, totalAmount - paid);
    let status: 'paid' | 'partial' | 'debt' = 'paid';
    if (paid === 0) status = 'debt';
    else if (paid < totalAmount) status = 'partial';

    // 2. Tạo mã phiếu nhập: PN-YYYYMM-XXX
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const seq = String(receipts.length + 1).padStart(3, '0');
    const receiptCode = `PN-${yearMonth}-${seq}`;

    const newReceipt: PurchaseReceipt = {
      id: `PR-${Date.now().toString(36).toUpperCase()}`,
      receiptCode,
      sourceType: data.sourceType || 'supplier',
      supplierId: data.supplierId,
      supplierName: data.supplierName.trim(),
      supplierPhone: data.supplierPhone?.trim(),
      items: processedItems,
      totalAmount,
      paidAmount: paid,
      debtAmount: debt,
      paymentMethod: data.paymentMethod || (debt > 0 ? 'debt' : 'transfer'),
      status,
      note: data.note?.trim(),
      createdAt: now.toISOString(),
      createdBy: data.createdBy || 'USR-001',
      createdByName: data.createdByName || 'Quản trị viên',
    };

    // 3. Cập nhật tồn kho và giá vốn trong products.json
    for (const item of processedItems) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stockQuantity += item.quantity;
        if (item.importPrice > 0) {
          prod.importPrice = item.importPrice; // Cập nhật giá vốn mới nhất
        }
      }
    }

    // 4. Thêm danh sách số Serial/IMEI mới vào imeis.json
    for (const item of processedItems) {
      if (item.imeis && item.imeis.length > 0) {
        for (const serial of item.imeis) {
          if (!imeis.some((i) => i.imei === serial)) {
            imeis.unshift({
              id: `IMEI-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6)}`,
              imei: serial,
              productId: item.productId,
              productName: item.productName,
              status: 'in_stock',
              supplierId: data.supplierId,
              purchaseDate: now.toISOString(),
              note: `Nhập kho theo phiếu ${receiptCode}`,
            });
          }
        }
      }
    }

    // 5. Nếu còn nợ, tự động ghi nhận công nợ vào debts.json
    if (debt > 0) {
      const dueDate = data.dueDate
        ? data.dueDate
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const newDebt: Debt = {
        id: `DEBT-${Date.now().toString(36).toUpperCase()}`,
        type: data.sourceType === 'customer' ? 'customer' : 'supplier',
        entityId: data.supplierId || 'SUPP-RETAIL',
        entityName: data.supplierName.trim(),
        entityPhone: data.supplierPhone?.trim(),
        referenceCode: receiptCode,
        totalDebt: debt,
        paidAmount: 0,
        remainingDebt: debt,
        dueDate,
        status: 'pending',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        notes: `Công nợ tiền hàng nhập theo phiếu ${receiptCode} (Tổng: ${totalAmount.toLocaleString()}đ, đã trả: ${paid.toLocaleString()}đ)`,
      };
      debts.unshift(newDebt);
    }

    // 6. Ghi tuần tự nguyên tử an toàn vào các file JSON
    receipts.unshift(newReceipt);
    await this.db.writeAtomic('purchase_receipts.json', receipts);
    await this.db.writeAtomic('products.json', products);
    await this.db.writeAtomic('imeis.json', imeis);
    if (debt > 0) {
      await this.db.writeAtomic('debts.json', debts);
    }

    return newReceipt;
  }
}
