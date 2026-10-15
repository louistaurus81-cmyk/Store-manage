import { JsonDatabaseEngine } from '../db/jsonEngine';
import type { Category, ImeiRecord, Product, Supplier, UserRole } from '../../src/types/datasoft';

export class InventoryService {
  private db: JsonDatabaseEngine;

  constructor() {
    this.db = JsonDatabaseEngine.getInstance();
  }

  /**
   * Helper tự động tạo SKU thông minh dựa trên tên sản phẩm
   * Ví dụ: "Bàn phím cơ không dây" -> "BPC-001"
   */
  public generateAutoSku(productName: string, existingSkus: string[]): string {
    const normalized = productName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim();

    const words = normalized.split(/\s+/).filter(Boolean);
    let prefix = '';
    if (words.length >= 2) {
      prefix = words.map((w) => w[0].toUpperCase()).slice(0, 4).join('');
    } else if (words.length === 1) {
      prefix = words[0].slice(0, 3).toUpperCase();
    } else {
      prefix = 'PRD';
    }

    if (prefix.length < 2) prefix = 'SP';

    let counter = 1;
    let candidate = `${prefix}-${String(counter).padStart(3, '0')}`;
    while (existingSkus.includes(candidate)) {
      counter++;
      candidate = `${prefix}-${String(counter).padStart(3, '0')}`;
    }
    return candidate;
  }

  /**
   * Lấy danh sách sản phẩm, tự động ẩn giá vốn (importPrice) với nhân viên Bán hàng & Kỹ thuật viên
   */
  public async getProducts(role?: UserRole): Promise<Product[]> {
    const products = await this.db.getList<Product>('products.json');
    const hideImportPrice = role === 'sales' || role === 'technician';

    return products.map((p) => {
      if (hideImportPrice) {
        return {
          ...p,
          importPrice: 0,
        };
      }
      return p;
    });
  }

  public async getProductById(id: string, role?: UserRole): Promise<Product | null> {
    const product = await this.db.findById<Product>('products.json', id);
    if (!product) return null;

    if (role === 'sales' || role === 'technician') {
      return { ...product, importPrice: 0 };
    }
    return product;
  }

  /**
   * Thêm mới sản phẩm, tự động sinh SKU nếu người dùng để trống
   */
  public async createProduct(data: Omit<Product, 'id'>): Promise<Product> {
    const products = await this.db.getList<Product>('products.json');
    const existingSkus = products.map((p) => p.sku.toUpperCase());

    let sku = data.sku ? data.sku.trim().toUpperCase() : '';
    if (!sku) {
      sku = this.generateAutoSku(data.name, existingSkus);
    }

    const newProduct: Product = {
      ...data,
      id: `PRD-${String(products.length + 1).padStart(3, '0')}`,
      sku,
      stockQuantity: Number(data.stockQuantity) || 0,
      minStockAlert: Number(data.minStockAlert) || 2,
      importPrice: Number(data.importPrice) || 0,
      retailPrice: Number(data.retailPrice) || 0,
      wholesalePrice: Number(data.wholesalePrice) || 0,
    };

    await this.db.insert<Product>('products.json', newProduct);
    return newProduct;
  }

  public async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    return this.db.update<Product>('products.json', id, updates);
  }

  // ==========================================
  // QUẢN LÝ SERIAL / IMEI (CRUD & LINK SUPPLIER)
  // ==========================================
  public async getImeis(productId?: string, status?: string): Promise<ImeiRecord[]> {
    let imeis = await this.db.getList<ImeiRecord>('imeis.json');
    if (productId) {
      imeis = imeis.filter((i) => i.productId === productId);
    }
    if (status && status !== 'all') {
      imeis = imeis.filter((i) => i.status === status);
    }
    return imeis;
  }

  public async addImei(
    productId: string,
    imeiCode: string,
    note?: string,
    supplierId?: string
  ): Promise<ImeiRecord> {
    const imeis = await this.db.getList<ImeiRecord>('imeis.json');
    const products = await this.db.getList<Product>('products.json');
    const product = products.find((p) => p.id === productId);

    if (!product) throw new Error('Sản phẩm không tồn tại');

    const cleanImei = imeiCode.trim().toUpperCase();
    if (imeis.some((i) => i.imei === cleanImei)) {
      throw new Error(`Số IMEI/Serial [${cleanImei}] đã tồn tại trong hệ thống!`);
    }

    const newImei: ImeiRecord = {
      id: `IMEI-${Date.now().toString(36).toUpperCase()}`,
      imei: cleanImei,
      productId: product.id,
      productName: product.name,
      status: 'in_stock',
      purchaseDate: new Date().toISOString(),
      supplierId,
      note,
    };

    imeis.unshift(newImei);
    await this.db.writeAtomic('imeis.json', imeis);

    // Tăng tồn kho sản phẩm
    product.stockQuantity += 1;
    await this.db.writeAtomic('products.json', products);

    return newImei;
  }

  /**
   * Tra cứu chi tiết số Serial/IMEI phục vụ máy quét Barcode và POS / Tra cứu bảo hành
   */
  public async getImeiDetails(imeiCode: string, userRole?: UserRole): Promise<{
    found: boolean;
    imeiRecord?: ImeiRecord;
    product?: Product;
    supplier?: Supplier;
    inStock: boolean;
    status?: string;
    message?: string;
  }> {
    const cleanImei = (imeiCode || '').trim().toUpperCase();
    if (!cleanImei) {
      return { found: false, inStock: false, message: 'Chưa cung cấp mã Serial/IMEI' };
    }

    const imeis = await this.db.getList<ImeiRecord>('imeis.json');
    const record = imeis.find((i) => i.imei.toUpperCase() === cleanImei);

    if (!record) {
      return {
        found: false,
        inStock: false,
        message: `Không tìm thấy mã Serial/IMEI [${cleanImei}] trong hệ thống`,
      };
    }

    const products = await this.db.getList<Product>('products.json');
    let product = products.find((p) => p.id === record.productId);
    if (product && (userRole === 'sales' || userRole === 'technician')) {
      product = { ...product, importPrice: 0 };
    }

    let supplier: Supplier | undefined;
    if (record.supplierId) {
      const suppliers = await this.db.getList<Supplier>('suppliers.json');
      supplier = suppliers.find((s) => s.id === record.supplierId);
    }

    const inStock = record.status === 'in_stock';
    let message = 'Sản phẩm hợp lệ trong kho';
    if (record.status === 'sold') {
      message = `Sản phẩm đã bán (Mã HĐ: ${record.invoiceId || 'N/A'})`;
    } else if (record.status === 'faulty') {
      message = 'Sản phẩm đang được đánh dấu lỗi / hỏng';
    } else if (record.status === 'repairing') {
      message = `Sản phẩm đang nằm trong phiếu sửa chữa (${record.repairTicketId || 'N/A'})`;
    }

    return {
      found: true,
      imeiRecord: record,
      product,
      supplier,
      inStock,
      status: record.status,
      message,
    };
  }

  /**
   * Chỉnh sửa số IMEI hoặc cập nhật nhà cung cấp / ghi chú
   */
  public async updateImei(id: string, updates: Partial<ImeiRecord>): Promise<ImeiRecord | null> {
    const imeis = await this.db.getList<ImeiRecord>('imeis.json');
    const index = imeis.findIndex((i) => i.id === id);
    if (index === -1) return null;

    if (updates.imei) {
      const cleanImei = updates.imei.trim().toUpperCase();
      if (imeis.some((i) => i.id !== id && i.imei === cleanImei)) {
        throw new Error(`Số IMEI/Serial [${cleanImei}] đã tồn tại cho một sản phẩm khác!`);
      }
      updates.imei = cleanImei;
    }

    const updated = {
      ...imeis[index],
      ...updates,
    };

    imeis[index] = updated;
    await this.db.writeAtomic('imeis.json', imeis);
    return updated;
  }

  /**
   * Xóa số IMEI bị nhập sai và tự động trừ 1 tồn kho nếu đang in_stock
   */
  public async deleteImei(id: string): Promise<boolean> {
    const imeis = await this.db.getList<ImeiRecord>('imeis.json');
    const targetImei = imeis.find((i) => i.id === id);
    if (!targetImei) return false;

    const remaining = imeis.filter((i) => i.id !== id);
    await this.db.writeAtomic('imeis.json', remaining);

    // Nếu IMEI bị xóa đang ở trạng thái 'in_stock', đồng bộ giảm 1 tồn kho trong products.json
    if (targetImei.status === 'in_stock') {
      const products = await this.db.getList<Product>('products.json');
      const prod = products.find((p) => p.id === targetImei.productId);
      if (prod && prod.stockQuantity > 0) {
        prod.stockQuantity -= 1;
        await this.db.writeAtomic('products.json', products);
      }
    }

    return true;
  }

  // ==========================================
  // QUẢN LÝ DANH MỤC (CRUD CATEGORIES)
  // ==========================================
  public async getCategories(): Promise<Category[]> {
    return this.db.getList<Category>('categories.json');
  }

  public async createCategory(data: { name: string; type: 'product' | 'service'; description?: string }): Promise<Category> {
    const categories = await this.db.getList<Category>('categories.json');

    const slug = data.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .trim();

    const newCategory: Category = {
      id: `CAT-${Date.now().toString(36).toUpperCase()}`,
      name: data.name.trim(),
      slug: slug || 'danh-muc-moi',
      type: data.type || 'product',
      description: data.description || '',
    };

    await this.db.insert<Category>('categories.json', newCategory);
    return newCategory;
  }

  public async updateCategory(id: string, updates: Partial<Category>): Promise<Category | null> {
    return this.db.update<Category>('categories.json', id, updates);
  }

  public async deleteCategory(id: string): Promise<boolean> {
    const categories = await this.db.getList<Category>('categories.json');
    const exists = categories.some((c) => c.id === id);
    if (!exists) return false;

    // Kiểm tra xem danh mục có đang được sử dụng không
    const products = await this.db.getList<Product>('products.json');
    if (products.some((p) => p.categoryId === id)) {
      throw new Error('Không thể xóa danh mục này vì đang có sản phẩm thuộc danh mục trong kho!');
    }

    const filtered = categories.filter((c) => c.id !== id);
    await this.db.writeAtomic('categories.json', filtered);
    return true;
  }

  // ==========================================
  // QUẢN LÝ NHÀ CUNG CẤP (SUPPLIER CRUD & PROFILE)
  // ==========================================
  public async getSuppliers(): Promise<Supplier[]> {
    return this.db.getList<Supplier>('suppliers.json');
  }

  public async getSupplierById(id: string): Promise<Supplier | null> {
    const suppliers = await this.db.getList<Supplier>('suppliers.json');
    return suppliers.find((s) => s.id === id || s.code === id) || null;
  }

  public async createSupplier(data: {
    name: string;
    contactPerson?: string;
    phone: string;
    email?: string;
    address?: string;
  }): Promise<Supplier> {
    const suppliers = await this.db.getList<Supplier>('suppliers.json');
    const code = `NCC-${String(suppliers.length + 1).padStart(2, '0')}`;

    const newSupplier: Supplier = {
      id: `SUPP-${String(suppliers.length + 1).padStart(3, '0')}`,
      code,
      name: data.name.trim(),
      contactPerson: data.contactPerson?.trim() || '',
      phone: data.phone.trim(),
      email: data.email?.trim() || '',
      address: data.address?.trim() || '',
      currentDebt: 0,
    };

    await this.db.insert<Supplier>('suppliers.json', newSupplier);
    return newSupplier;
  }

  public async updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier | null> {
    return this.db.update<Supplier>('suppliers.json', id, updates);
  }

  public async deleteSupplier(id: string): Promise<boolean> {
    const suppliers = await this.db.getList<Supplier>('suppliers.json');
    const target = suppliers.find((s) => s.id === id);
    if (!target) return false;

    // Kiểm tra ràng buộc phiếu nhập kho
    const receipts = await this.db.getList<any>('purchase_receipts.json');
    if (receipts.some((r) => r.supplierId === id)) {
      throw new Error('Không thể xóa nhà cung cấp này vì đã có phiếu nhập kho liên kết!');
    }

    const filtered = suppliers.filter((s) => s.id !== id);
    await this.db.writeAtomic('suppliers.json', filtered);
    return true;
  }

  public async getSupplierProfile(id: string): Promise<any> {
    const suppliers = await this.db.getList<Supplier>('suppliers.json');
    const supplier = suppliers.find((s) => s.id === id || s.code === id);
    if (!supplier) {
      throw new Error('Không tìm thấy nhà cung cấp');
    }

    const receipts = await this.db.getList<any>('purchase_receipts.json');
    const debts = await this.db.getList<any>('debts.json');

    // Lọc các phiếu nhập từ nhà cung cấp này
    const supplierReceipts = receipts.filter(
      (r) => r.supplierId === supplier.id || r.supplierName.toLowerCase() === supplier.name.toLowerCase()
    );

    // Lọc công nợ của nhà cung cấp
    const supplierDebts = debts.filter(
      (d) =>
        d.type === 'supplier' &&
        (d.entityId === supplier.id || d.entityName.toLowerCase() === supplier.name.toLowerCase())
    );

    const totalImported = supplierReceipts.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
    const totalPaidInReceipts = supplierReceipts.reduce((sum, r) => sum + (Number(r.paidAmount) || 0), 0);
    const currentDebt = supplierDebts.reduce((sum, d) => sum + (Number(d.remainingDebt) || 0), 0);
    const totalDebtPaid = supplierDebts.reduce((sum, d) => sum + (Number(d.paidAmount) || 0), 0);

    return {
      supplier: {
        ...supplier,
        currentDebt,
      },
      stats: {
        totalImported,
        totalReceipts: supplierReceipts.length,
        currentDebt,
        totalPaid: totalPaidInReceipts + totalDebtPaid,
      },
      receipts: supplierReceipts,
      debts: supplierDebts,
    };
  }
}
