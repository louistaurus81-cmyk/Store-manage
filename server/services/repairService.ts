import { JsonDatabaseEngine } from '../db/jsonEngine';
import type {
  Customer,
  ImeiRecord,
  Product,
  RepairPartUsed,
  RepairStatus,
  RepairTicket,
  User,
  Warranty,
} from '../../src/types/datasoft';

export class RepairService {
  private db: JsonDatabaseEngine;

  constructor() {
    this.db = JsonDatabaseEngine.getInstance();
  }

  /**
   * Lấy danh sách phiếu sửa chữa với bộ lọc linh hoạt
   */
  public async getTickets(filters?: {
    status?: RepairStatus | 'all';
    technicianId?: string;
    searchQuery?: string;
  }): Promise<RepairTicket[]> {
    let tickets = await this.db.getList<RepairTicket>('repairs.json');

    if (!filters) return tickets;

    if (filters.status && filters.status !== 'all') {
      tickets = tickets.filter((t) => t.status === filters.status);
    }

    if (filters.technicianId) {
      tickets = tickets.filter((t) => t.technicianId === filters.technicianId);
    }

    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      tickets = tickets.filter(
        (t) =>
          t.ticketCode.toLowerCase().includes(q) ||
          t.customerName.toLowerCase().includes(q) ||
          t.customerPhone.includes(q) ||
          t.deviceName.toLowerCase().includes(q) ||
          t.deviceSerialImei.toLowerCase().includes(q)
      );
    }

    return tickets;
  }

  /**
   * Lấy chi tiết phiếu sửa chữa
   */
  public async getTicketById(id: string): Promise<RepairTicket | null> {
    return this.db.findById<RepairTicket>('repairs.json', id);
  }

  /**
   * Tạo phiếu tiếp nhận máy mới
   */
  public async createTicket(data: {
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    deviceName: string;
    model: string;
    deviceSerialImei: string;
    passCode?: string;
    issueDescription: string;
    accessories?: string;
    deviceCondition?: string;
    estimatedCost?: number;
    depositAmount?: number;
    estimatedCompletionDate?: string;
    technicianId?: string;
    warrantyPeriodMonths?: number;
    notes?: string;
  }): Promise<RepairTicket> {
    const tickets = await this.db.getList<RepairTicket>('repairs.json');
    const customers = await this.db.getList<Customer>('customers.json');

    // 1. Tự động kiểm tra hoặc tạo khách hàng mới
    let customer = customers.find((c) => c.phone.trim() === data.customerPhone.trim());
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
      await this.db.insert<Customer>('customers.json', customer);
    }

    // 2. Lấy tên KTV nếu có gán
    let technicianName = undefined;
    if (data.technicianId) {
      const users = await this.db.getList<User>('users.json');
      const tech = users.find((u) => u.id === data.technicianId);
      if (tech) technicianName = tech.fullName;
    }

    // 3. Sinh mã phiếu tiếp nhận SC-YYYYMM-XXX
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const countThisMonth = tickets.filter((t) => t.ticketCode.startsWith(`SC-${yearMonth}`)).length;
    const ticketCode = `SC-${yearMonth}-${String(countThisMonth + 1).padStart(3, '0')}`;

    const newTicket: RepairTicket = {
      id: `REP-${Date.now().toString(36).toUpperCase()}`,
      ticketCode,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      deviceName: data.deviceName.trim(),
      model: data.model.trim(),
      deviceSerialImei: data.deviceSerialImei.trim().toUpperCase(),
      passCode: data.passCode || 'Không có',
      issueDescription: data.issueDescription.trim(),
      accessories: data.accessories || 'Thân máy',
      deviceCondition: data.deviceCondition || 'Bình thường, không biến dạng',
      status: 'received',
      technicianId: data.technicianId,
      technicianName,
      estimatedCost: Number(data.estimatedCost) || 0,
      finalCost: Number(data.estimatedCost) || 0,
      depositAmount: Number(data.depositAmount) || 0,
      partsUsed: [],
      receivedDate: new Date().toISOString(),
      estimatedCompletionDate: data.estimatedCompletionDate,
      warrantyPeriodMonths: Number(data.warrantyPeriodMonths) || 3,
      notes: data.notes || '',
    };

    await this.db.insert<RepairTicket>('repairs.json', newTicket);
    return newTicket;
  }

  /**
   * Cập nhật tiến độ & trạng thái sửa chữa
   */
  public async updateStatus(
    id: string,
    newStatus: RepairStatus,
    options?: {
      diagnosis?: string;
      finalCost?: number;
      technicianId?: string;
      notes?: string;
    }
  ): Promise<RepairTicket> {
    const ticket = await this.db.findById<RepairTicket>('repairs.json', id);
    if (!ticket) {
      throw new Error(`Không tìm thấy phiếu sửa chữa với ID: ${id}`);
    }

    const updates: Partial<RepairTicket> = {
      status: newStatus,
    };

    if (options?.diagnosis !== undefined) {
      updates.technicalDiagnosis = options.diagnosis;
    }

    if (options?.finalCost !== undefined) {
      updates.finalCost = Number(options.finalCost);
    }

    if (options?.notes !== undefined) {
      updates.notes = options.notes;
    }

    if (options?.technicianId) {
      const users = await this.db.getList<User>('users.json');
      const tech = users.find((u) => u.id === options.technicianId);
      if (tech) {
        updates.technicianId = tech.id;
        updates.technicianName = tech.fullName;
      }
    }

    // Xử lý các mốc thời gian hoàn tất
    if (newStatus === 'completed' && !ticket.completedDate) {
      updates.completedDate = new Date().toISOString();
    }

    if (newStatus === 'delivered') {
      updates.deliveredDate = new Date().toISOString();

      // Tự động tạo bản ghi bảo hành trong warranties.json
      await this.generateRepairWarranty(ticket, updates.finalCost ?? ticket.finalCost);
    }

    const updated = await this.db.update<RepairTicket>('repairs.json', id, updates);
    if (!updated) {
      throw new Error('Lỗi cập nhật phiếu sửa chữa');
    }

    return updated;
  }

  /**
   * Đề xuất & Xuất linh kiện thay thế từ Kho vào máy sửa chữa
   */
  public async addPart(
    ticketId: string,
    productId: string,
    quantity: number,
    chosenImei?: string
  ): Promise<RepairTicket> {
    const ticket = await this.db.findById<RepairTicket>('repairs.json', ticketId);
    if (!ticket) throw new Error('Không tìm thấy phiếu sửa chữa');

    const products = await this.db.getList<Product>('products.json');
    const product = products.find((p) => p.id === productId);
    if (!product) throw new Error('Sản phẩm / linh kiện không tồn tại trong kho');

    if (product.stockQuantity < quantity && product.stockQuantity < 900) {
      throw new Error(`Số lượng tồn kho không đủ (Hiện còn: ${product.stockQuantity})`);
    }

    // 1. Nếu có IMEI, kiểm tra trạng thái IMEI
    if (product.hasSerialImei && chosenImei) {
      const imeis = await this.db.getList<ImeiRecord>('imeis.json');
      const imeiRecord = imeis.find((i) => i.imei === chosenImei);
      if (!imeiRecord || imeiRecord.status !== 'in_stock') {
        throw new Error(`Serial/IMEI [${chosenImei}] không ở trạng thái sẵn sàng trong kho`);
      }

      // Đánh dấu IMEI đang được gắn vào ca sửa
      imeiRecord.status = 'repairing';
      imeiRecord.repairTicketId = ticket.ticketCode;
      await this.db.writeAtomic('imeis.json', imeis);
    }

    // 2. Trừ tồn kho sản phẩm nếu là linh kiện vật lý
    if (product.stockQuantity < 900) {
      product.stockQuantity -= quantity;
      await this.db.writeAtomic('products.json', products);
    }

    // 3. Thêm linh kiện vào phiếu sửa chữa
    const unitPrice = product.retailPrice;
    const total = unitPrice * quantity;

    const newPart: RepairPartUsed = {
      productId: product.id,
      productName: product.name,
      imei: chosenImei,
      quantity,
      unitPrice,
      total,
      addedAt: new Date().toISOString(),
    };

    const updatedParts = [...(ticket.partsUsed || []), newPart];
    const totalPartsCost = updatedParts.reduce((sum, p) => sum + p.total, 0);

    // Tính lại chi phí cuối cùng (Giá công sửa + giá linh kiện)
    const baseServiceCost = Math.max(0, ticket.estimatedCost || 0);
    const newFinalCost = baseServiceCost + totalPartsCost;

    const updated = await this.db.update<RepairTicket>('repairs.json', ticketId, {
      partsUsed: updatedParts,
      finalCost: newFinalCost,
    });

    if (!updated) throw new Error('Không thể cập nhật danh sách linh kiện');
    return updated;
  }

  /**
   * Tự động tạo bản ghi bảo hành khi giao máy sửa chữa
   */
  private async generateRepairWarranty(ticket: RepairTicket, finalAmount: number): Promise<void> {
    const warranties = await this.db.getList<Warranty>('warranties.json');

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (ticket.warrantyPeriodMonths || 3));

    const warrantyCode = `BH-SC-${ticket.ticketCode.replace('SC-', '')}`;

    // Kiểm tra xem đã có mã bảo hành này chưa
    if (warranties.some((w) => w.warrantyCode === warrantyCode)) return;

    const warranty: Warranty = {
      id: `WAR-${Date.now().toString(36).toUpperCase()}`,
      warrantyCode,
      repairTicketId: ticket.ticketCode,
      productName: `Dịch vụ sửa chữa: ${ticket.deviceName} (${ticket.issueDescription})`,
      imei: ticket.deviceSerialImei,
      customerId: ticket.customerId,
      customerName: ticket.customerName,
      customerPhone: ticket.customerPhone,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      status: 'active',
      claims: [],
    };

    warranties.unshift(warranty);
    await this.db.writeAtomic('warranties.json', warranties);

    // Cập nhật tổng chi tiêu của khách hàng
    const customers = await this.db.getList<Customer>('customers.json');
    const custIndex = customers.findIndex((c) => c.id === ticket.customerId);
    if (custIndex !== -1) {
      customers[custIndex].totalSpent = (customers[custIndex].totalSpent || 0) + finalAmount;
      await this.db.writeAtomic('customers.json', customers);
    }
  }

  /**
   * Tra cứu bảo hành và lịch sử máy theo Serial/IMEI hoặc SĐT
   */
  public async lookupWarrantyAndHistory(query: string): Promise<{
    warranties: Warranty[];
    repairs: RepairTicket[];
    imeiRecords: ImeiRecord[];
  }> {
    const q = query.trim().toLowerCase();
    const warranties = await this.db.getList<Warranty>('warranties.json');
    const repairs = await this.db.getList<RepairTicket>('repairs.json');
    const imeis = await this.db.getList<ImeiRecord>('imeis.json');

    const matchedWarranties = warranties.filter(
      (w) =>
        w.imei.toLowerCase().includes(q) ||
        w.customerPhone.includes(q) ||
        w.customerName.toLowerCase().includes(q) ||
        w.warrantyCode.toLowerCase().includes(q)
    );

    const matchedRepairs = repairs.filter(
      (r) =>
        r.deviceSerialImei.toLowerCase().includes(q) ||
        r.customerPhone.includes(q) ||
        r.ticketCode.toLowerCase().includes(q)
    );

    const matchedImeis = imeis.filter((i) => i.imei.toLowerCase().includes(q));

    return {
      warranties: matchedWarranties,
      repairs: matchedRepairs,
      imeiRecords: matchedImeis,
    };
  }
}
