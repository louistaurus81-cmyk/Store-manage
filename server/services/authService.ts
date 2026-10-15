import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { JsonDatabaseEngine } from '../db/jsonEngine';
import { hashPassword } from '../db/seedData';
import type { User, UserRole } from '../../src/types/datasoft';

const JWT_SECRET = process.env.APP_SECRET || 'datasoft_lan_secret_key_2026_secured';

export interface TokenPayload {
  userId: string;
  username: string;
  role: UserRole;
  fullName: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export class AuthService {
  private db: JsonDatabaseEngine;

  constructor() {
    this.db = JsonDatabaseEngine.getInstance();
  }

  /**
   * Tạo token ký điện tử đơn giản, không cần phụ thuộc thư viện ngoài
   */
  public generateToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600, // 7 ngày
    };

    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    return `${header}.${body}.${signature}`;
  }

  /**
   * Xác thực và giải mã Token
   */
  public verifyToken(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [header, body, signature] = parts;
      const expectedSignature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${header}.${body}`)
        .digest('base64url');

      if (signature !== expectedSignature) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as TokenPayload;
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return null; // Đã hết hạn
      }

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Đăng nhập người dùng bằng users.json
   */
  public async login(username: string, passwordPlain: string): Promise<{ user: User; token: string }> {
    const users = await this.db.getList<User>('users.json');
    const user = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());

    if (!user) {
      throw new Error('Tài khoản hoặc mật khẩu không chính xác');
    }

    if (!user.active) {
      throw new Error('Tài khoản này đã bị khóa hoặc tạm dừng hoạt động');
    }

    const salt = user.salt || 'datasoft_default_salt';
    const computedHash = hashPassword(passwordPlain, salt);

    if (computedHash !== user.passwordHash) {
      throw new Error('Tài khoản hoặc mật khẩu không chính xác');
    }

    const token = this.generateToken(user);

    // Trả về user không kèm passwordHash và salt
    const safeUser: User = {
      ...user,
      passwordHash: undefined,
      salt: undefined,
    };

    return { user: safeUser, token };
  }

  /**
   * Lấy danh sách tất cả tài khoản (Chỉ Admin)
   */
  public async getAllUsers(): Promise<User[]> {
    const users = await this.db.getList<User>('users.json');
    return users.map((u) => ({
      ...u,
      passwordHash: undefined,
      salt: undefined,
    }));
  }

  /**
   * Tạo tài khoản mới (Chỉ Admin)
   */
  public async createUser(data: {
    username: string;
    passwordPlain: string;
    fullName: string;
    role: UserRole;
    phone: string;
  }): Promise<User> {
    const users = await this.db.getList<User>('users.json');
    if (users.some((u) => u.username.toLowerCase() === data.username.toLowerCase())) {
      throw new Error(`Tên đăng nhập "${data.username}" đã tồn tại trên hệ thống`);
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(data.passwordPlain, salt);

    const newUser: User = {
      id: `USR-${String(users.length + 1).padStart(3, '0')}`,
      username: data.username.trim(),
      passwordHash,
      salt,
      fullName: data.fullName.trim(),
      role: data.role,
      phone: data.phone.trim(),
      active: true,
      createdAt: new Date().toISOString(),
      permissions: this.getDefaultPermissionsForRole(data.role),
    };

    await this.db.insert<User>('users.json', newUser);

    return {
      ...newUser,
      passwordHash: undefined,
      salt: undefined,
    };
  }

  /**
   * Cập nhật trạng thái hoặc đổi quyền nhân viên
   */
  public async updateUser(
    id: string,
    updates: Partial<Omit<User, 'passwordHash' | 'salt'>> & { newPassword?: string }
  ): Promise<User | null> {
    const users = await this.db.getList<User>('users.json');
    const userIndex = users.findIndex((u) => u.id === id);
    if (userIndex === -1) return null;

    const current = users[userIndex];
    let newHash = current.passwordHash;
    let newSalt = current.salt;

    if (updates.newPassword && updates.newPassword.trim()) {
      newSalt = crypto.randomBytes(16).toString('hex');
      newHash = hashPassword(updates.newPassword.trim(), newSalt);
    }

    const updatedUser: User = {
      ...current,
      fullName: updates.fullName !== undefined ? updates.fullName : current.fullName,
      phone: updates.phone !== undefined ? updates.phone : current.phone,
      role: updates.role !== undefined ? updates.role : current.role,
      active: updates.active !== undefined ? updates.active : current.active,
      passwordHash: newHash,
      salt: newSalt,
      permissions: updates.role ? this.getDefaultPermissionsForRole(updates.role) : current.permissions,
    };

    users[userIndex] = updatedUser;
    await this.db.writeAtomic('users.json', users);

    return {
      ...updatedUser,
      passwordHash: undefined,
      salt: undefined,
    };
  }

  /**
   * Trả về bảng quyền hạn mặc định theo RBAC
   */
  public getDefaultPermissionsForRole(role: UserRole): string[] {
    switch (role) {
      case 'admin':
        return ['*'];
      case 'manager':
        return [
          'reports.view',
          'inventory.view_cost',
          'inventory.manage',
          'debts.manage',
          'repairs.view_all',
          'invoices.view_all',
          'customers.manage',
        ];
      case 'sales':
        return [
          'invoices.create',
          'invoices.view_own',
          'inventory.view_public', // KHÔNG có quyền inventory.view_cost
          'customers.manage',
          'repairs.create_intake',
        ];
      case 'technician':
        return [
          'repairs.view_assigned',
          'repairs.update_status',
          'repairs.propose_parts',
          'warranty.lookup',
          'inventory.view_public',
        ];
      default:
        return [];
    }
  }

  /**
   * Express Middleware xác thực Token
   */
  public authenticateMiddleware = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Cho phép một số route công khai hoặc mock chuyển vai trò tiện lợi trong app
      res.status(401).json({ error: 'Yêu cầu đăng nhập để truy cập tài nguyên này' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = this.verifyToken(token);

    if (!payload) {
      res.status(401).json({ error: 'Phiên làm việc đã hết hạn hoặc token không hợp lệ' });
      return;
    }

    const user = await this.db.findById<User>('users.json', payload.userId);
    if (!user || !user.active) {
      res.status(403).json({ error: 'Tài khoản không tồn tại hoặc đã bị khóa' });
      return;
    }

    req.user = {
      ...user,
      passwordHash: undefined,
      salt: undefined,
    };
    next();
  };

  /**
   * Express Middleware kiểm tra vai trò (RBAC)
   */
  public requireRoles = (allowedRoles: UserRole[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ error: 'Yêu cầu xác thực tài khoản' });
        return;
      }

      // Admin luôn có mọi quyền
      if (req.user.role === 'admin') {
        next();
        return;
      }

      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({
          error: `Bạn không có quyền thực hiện hành động này. Vai trò hiện tại: [${req.user.role}]. Cần: [${allowedRoles.join(', ')}]`,
        });
        return;
      }

      next();
    };
  };
}
