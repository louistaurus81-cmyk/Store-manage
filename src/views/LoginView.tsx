import React, { useState } from 'react';
import { Lock, User, ShieldCheck, ArrowRight, Server, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/datasoft';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg('Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Đăng nhập không thành công.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role: UserRole) => {
    const demos: Record<UserRole, { u: string; p: string }> = {
      admin: { u: 'admin', p: 'admin123' },
      manager: { u: 'chu_shop', p: 'shop123' },
      sales: { u: 'ban_hang', p: 'sales123' },
      technician: { u: 'ky_thuat', p: 'tech123' },
    };
    const c = demos[role];
    setUsername(c.u);
    setPassword(c.p);
    setLoading(true);
    setErrorMsg(null);
    try {
      await login(c.u, c.p);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi đăng nhập nhanh.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#f5f5f7] relative overflow-hidden select-none font-sans">
      {/* Background Soft Atmospheric Glow (macOS Wallpaper Style) */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-200/40 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-emerald-200/40 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-100/30 blur-3xl pointer-events-none" />

      {/* Main Glass Window Card */}
      <div className="relative z-10 w-full max-w-[440px] bg-white/80 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.07)] p-8 flex flex-col transition-all">
        {/* macOS Window Controls (Traffic Lights) */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]/40 shadow-xs" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]/40 shadow-xs" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]/40 shadow-xs" />
          <span className="ml-auto text-[11px] font-medium text-slate-400 font-mono tracking-tight flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            MÁY CHỦ TRUNG TÂM · LAN 3000
          </span>
        </div>

        {/* Brand Lockup */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-md shadow-emerald-500/20 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4 tracking-tight">
            TP
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">PHẦN MỀM THỊNH PHÁT</h1>
          <p className="text-xs text-slate-500 mt-1">Hệ thống Quản lý Bán hàng & Sửa chữa Máy tính</p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Tên đăng nhập</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 stroke-[1.75]" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin, chu_shop, ban_hang..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/90 border border-slate-200/80 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono shadow-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Mật khẩu</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 stroke-[1.75]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-white/90 border border-slate-200/80 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono shadow-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-medium text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Đăng nhập hệ thống</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Selector Chips (macOS style) */}
        <div className="mt-8 pt-6 border-t border-slate-200/60">
          <div className="flex items-center justify-between mb-3 text-[11px] font-semibold text-slate-500">
            <span>ĐĂNG NHẬP NHANH THEO VAI TRÒ (RBAC)</span>
            <span className="text-[10px] text-emerald-600 font-mono">1-CLICK</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('admin')}
              className="p-2.5 bg-white/70 hover:bg-white border border-slate-200/70 hover:border-slate-300 rounded-xl text-left text-xs transition-all hover:shadow-xs group cursor-pointer"
            >
              <div className="font-semibold text-slate-900 text-[11px] flex items-center justify-between">
                <span>Quản trị viên (Admin)</span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">admin / admin123</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('manager')}
              className="p-2.5 bg-white/70 hover:bg-white border border-slate-200/70 hover:border-slate-300 rounded-xl text-left text-xs transition-all hover:shadow-xs group cursor-pointer"
            >
              <div className="font-semibold text-slate-900 text-[11px] flex items-center justify-between">
                <span>Chủ cửa hàng</span>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">chu_shop / shop123</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('sales')}
              className="p-2.5 bg-white/70 hover:bg-white border border-slate-200/70 hover:border-slate-300 rounded-xl text-left text-xs transition-all hover:shadow-xs group cursor-pointer"
            >
              <div className="font-semibold text-slate-900 text-[11px] flex items-center justify-between">
                <span>Bán hàng (Sales)</span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">ban_hang / sales123</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('technician')}
              className="p-2.5 bg-white/70 hover:bg-white border border-slate-200/70 hover:border-slate-300 rounded-xl text-left text-xs transition-all hover:shadow-xs group cursor-pointer"
            >
              <div className="font-semibold text-slate-900 text-[11px] flex items-center justify-between">
                <span>Kỹ thuật viên</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">ky_thuat / tech123</div>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-[10px] text-slate-400">
          Cơ sở dữ liệu an toàn <code className="font-mono text-slate-600">DATASOFT/users.json</code>
        </div>
      </div>
    </div>
  );
};
