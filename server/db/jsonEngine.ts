import fs from 'fs';
import path from 'path';
import {
  createInitialCategories,
  createInitialCustomers,
  createInitialDebts,
  createInitialImeis,
  createInitialInvoices,
  createInitialPcBuilds,
  createInitialPrintHistory,
  createInitialPrintTemplates,
  createInitialProducts,
  createInitialRepairs,
  createInitialSettings,
  createInitialSuppliers,
  createInitialUsers,
  createInitialWarranties,
} from './seedData';

export class JsonDatabaseEngine {
  private static instance: JsonDatabaseEngine;
  private baseDir: string;
  private backupDir: string;
  // Per-file write mutex queues to prevent race conditions on Ubuntu server
  private writeQueues: Map<string, Promise<unknown>> = new Map();

  private constructor() {
    this.baseDir = path.resolve(process.cwd(), 'DATASOFT');
    this.backupDir = path.join(this.baseDir, 'backups');
    this.ensureDirectories();
  }

  public static getInstance(): JsonDatabaseEngine {
    if (!JsonDatabaseEngine.instance) {
      JsonDatabaseEngine.instance = new JsonDatabaseEngine();
    }
    return JsonDatabaseEngine.instance;
  }

  public getBaseDir(): string {
    return this.baseDir;
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Khởi tạo và kiểm tra 11 file cơ sở dữ liệu cốt lõi
   */
  public async initializeDatabase(): Promise<void> {
    this.ensureDirectories();

    const seeds: Record<string, () => unknown> = {
      'users.json': createInitialUsers,
      'categories.json': createInitialCategories,
      'products.json': createInitialProducts,
      'imeis.json': createInitialImeis,
      'customers.json': createInitialCustomers,
      'repairs.json': createInitialRepairs,
      'invoices.json': createInitialInvoices,
      'debts.json': createInitialDebts,
      'warranties.json': createInitialWarranties,
      'suppliers.json': createInitialSuppliers,
      'settings.json': createInitialSettings,
      'pc_builds.json': createInitialPcBuilds,
      'print_templates.json': createInitialPrintTemplates,
      'print_history.json': createInitialPrintHistory,
    };

    for (const [filename, seedFn] of Object.entries(seeds)) {
      const filePath = path.join(this.baseDir, filename);
      let needsSeed = false;

      if (!fs.existsSync(filePath)) {
        needsSeed = true;
      } else {
        try {
          const stats = await fs.promises.stat(filePath);
          if (stats.size === 0) {
            needsSeed = true;
          }
        } catch {
          needsSeed = true;
        }
      }

      if (needsSeed) {
        const initialData = seedFn();
        await this.writeAtomic(filename, initialData);
      }
    }
  }

  /**
   * Đọc dữ liệu từ file JSON an toàn
   */
  public async read<T>(fileName: string): Promise<T> {
    const filePath = path.join(this.baseDir, fileName);

    if (!fs.existsSync(filePath)) {
      await this.initializeDatabase();
    }

    try {
      const raw = await fs.promises.readFile(filePath, 'utf-8');
      if (!raw || raw.trim().length === 0) {
        throw new Error(`File ${fileName} is empty`);
      }
      return JSON.parse(raw) as T;
    } catch (err) {
      console.error(`[DATASOFT] Lỗi đọc file ${fileName}:`, err);
      // Thử phục hồi từ file backup gần nhất nếu có
      throw err;
    }
  }

  /**
   * Ghi dữ liệu Atomic + Mutex Queue
   * Ngăn chặn hoàn toàn hiện tượng race condition & hỏng file khi nhiều client LAN ghi đồng thời
   */
  /**
   * Điều phối hàng đợi Mutex bất đồng bộ cho từng file
   */
  public async enqueue<T>(fileName: string, taskFn: () => Promise<T>): Promise<T> {
    const queue = this.writeQueues.get(fileName) || Promise.resolve();
    let result: T;
    const queuedTask = queue.then(async () => {
      result = await taskFn();
      return result;
    });
    this.writeQueues.set(fileName, queuedTask.catch(() => {}));
    return queuedTask;
  }

  /**
   * Ghi dữ liệu Atomic + Mutex Queue
   * Ngăn chặn hoàn toàn hiện tượng race condition & hỏng file khi nhiều client LAN ghi đồng thời
   */
  public async writeAtomic<T>(fileName: string, data: T): Promise<void> {
    return this.enqueue(fileName, async () => {
      const targetPath = path.join(this.baseDir, fileName);
      const tempPath = path.join(
        this.baseDir,
        `${fileName}.tmp.${Date.now()}_${process.pid}_${Math.random().toString(36).substring(2, 8)}`
      );

      const jsonString = JSON.stringify(data, null, 2);

      try {
        // 1. Ghi dữ liệu hoàn chỉnh ra file tạm thời
        await fs.promises.writeFile(tempPath, jsonString, { encoding: 'utf-8', flag: 'w' });

        // 2. Thực hiện rename nguyên tử (atomic rename của hệ thống file Linux POSIX / NTFS)
        await fs.promises.rename(tempPath, targetPath);
      } catch (err) {
        console.error(`[DATASOFT] Lỗi ghi atomic cho ${fileName}:`, err);
        // Dọn dẹp file tạm nếu xảy ra sự cố
        if (fs.existsSync(tempPath)) {
          try {
            await fs.promises.unlink(tempPath);
          } catch {
            // ignore
          }
        }
        throw err;
      }
    });
  }

  /**
   * Các helper thông dụng cho mảng thực thể
   */
  public async getList<T>(fileName: string): Promise<T[]> {
    const data = await this.read<T[]>(fileName);
    return Array.isArray(data) ? data : [];
  }

  public async findById<T extends { id: string }>(fileName: string, id: string): Promise<T | null> {
    const list = await this.getList<T>(fileName);
    return list.find((item) => item.id === id) || null;
  }

  public async insert<T extends { id: string }>(fileName: string, item: T): Promise<T> {
    return this.enqueue(fileName, async () => {
      const list = await this.getList<T>(fileName);
      list.unshift(item);
      const targetPath = path.join(this.baseDir, fileName);
      const tempPath = path.join(
        this.baseDir,
        `${fileName}.tmp.${Date.now()}_${process.pid}_${Math.random().toString(36).substring(2, 8)}`
      );
      const jsonString = JSON.stringify(list, null, 2);
      try {
        await fs.promises.writeFile(tempPath, jsonString, { encoding: 'utf-8', flag: 'w' });
        await fs.promises.rename(tempPath, targetPath);
      } catch (err) {
        if (fs.existsSync(tempPath)) {
          try {
            await fs.promises.unlink(tempPath);
          } catch {}
        }
        throw err;
      }
      return item;
    });
  }

  public async update<T extends { id: string }>(
    fileName: string,
    id: string,
    updates: Partial<T>
  ): Promise<T | null> {
    return this.enqueue(fileName, async () => {
      const list = await this.getList<T>(fileName);
      const index = list.findIndex((item) => item.id === id);
      if (index === -1) return null;

      list[index] = { ...list[index], ...updates };
      const targetPath = path.join(this.baseDir, fileName);
      const tempPath = path.join(
        this.baseDir,
        `${fileName}.tmp.${Date.now()}_${process.pid}_${Math.random().toString(36).substring(2, 8)}`
      );
      const jsonString = JSON.stringify(list, null, 2);
      try {
        await fs.promises.writeFile(tempPath, jsonString, { encoding: 'utf-8', flag: 'w' });
        await fs.promises.rename(tempPath, targetPath);
      } catch (err) {
        if (fs.existsSync(tempPath)) {
          try {
            await fs.promises.unlink(tempPath);
          } catch {}
        }
        throw err;
      }
      return list[index];
    });
  }

  public async delete<T extends { id: string }>(fileName: string, id: string): Promise<boolean> {
    return this.enqueue(fileName, async () => {
      const list = await this.getList<T>(fileName);
      const filtered = list.filter((item) => item.id !== id);
      if (filtered.length === list.length) return false;

      const targetPath = path.join(this.baseDir, fileName);
      const tempPath = path.join(
        this.baseDir,
        `${fileName}.tmp.${Date.now()}_${process.pid}_${Math.random().toString(36).substring(2, 8)}`
      );
      const jsonString = JSON.stringify(filtered, null, 2);
      try {
        await fs.promises.writeFile(tempPath, jsonString, { encoding: 'utf-8', flag: 'w' });
        await fs.promises.rename(tempPath, targetPath);
      } catch (err) {
        if (fs.existsSync(tempPath)) {
          try {
            await fs.promises.unlink(tempPath);
          } catch {}
        }
        throw err;
      }
      return true;
    });
  }

  /**
   * Tạo bản sao lưu Snapshot toàn bộ 11 file
   */
  public async createBackup(label = 'manual'): Promise<string> {
    this.ensureDirectories();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupSubDir = path.join(this.backupDir, `backup_${timestamp}_${label}`);
    await fs.promises.mkdir(backupSubDir, { recursive: true });

    const files = [
      'categories.json',
      'customers.json',
      'debts.json',
      'imeis.json',
      'invoices.json',
      'products.json',
      'repairs.json',
      'settings.json',
      'suppliers.json',
      'users.json',
      'warranties.json',
      'pc_builds.json',
      'print_templates.json',
      'print_history.json',
    ];

    for (const file of files) {
      const src = path.join(this.baseDir, file);
      const dest = path.join(backupSubDir, file);
      if (fs.existsSync(src)) {
        await fs.promises.copyFile(src, dest);
      }
    }

    return path.basename(backupSubDir);
  }

  /**
   * Lấy thống kê trạng thái các file trong DATASOFT
   */
  public async getStorageStats(): Promise<Array<{
    fileName: string;
    recordCount: number;
    sizeBytes: number;
    lastModified: string;
    status: 'ok' | 'missing' | 'corrupted';
  }>> {
    const files = [
      'categories.json',
      'customers.json',
      'debts.json',
      'imeis.json',
      'invoices.json',
      'products.json',
      'repairs.json',
      'settings.json',
      'suppliers.json',
      'users.json',
      'warranties.json',
      'pc_builds.json',
      'print_templates.json',
      'print_history.json',
    ];

    const stats = [];

    for (const fileName of files) {
      const filePath = path.join(this.baseDir, fileName);
      if (!fs.existsSync(filePath)) {
        stats.push({
          fileName,
          recordCount: 0,
          sizeBytes: 0,
          lastModified: '-',
          status: 'missing' as const,
        });
        continue;
      }

      try {
        const fileStat = await fs.promises.stat(filePath);
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        const count = Array.isArray(parsed) ? parsed.length : 1;

        stats.push({
          fileName,
          recordCount: count,
          sizeBytes: fileStat.size,
          lastModified: fileStat.mtime.toISOString(),
          status: 'ok' as const,
        });
      } catch {
        stats.push({
          fileName,
          recordCount: 0,
          sizeBytes: 0,
          lastModified: '-',
          status: 'corrupted' as const,
        });
      }
    }

    return stats;
  }
}
