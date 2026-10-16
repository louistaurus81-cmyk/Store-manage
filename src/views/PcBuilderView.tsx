import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Layers,
  HardDrive,
  Tv,
  CheckCircle2,
  Trash2,
  Plus,
  Printer,
  Receipt,
  Sparkles,
  Zap,
  Info,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  User,
  Phone,
  Gamepad2,
  Search,
  X,
  FileText,
  Building,
  RotateCcw,
} from 'lucide-react';
import type { PcBuild, PcBuildItem, Product } from '../types/datasoft';
import { apiFetch, formatVND, formatDate } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export const PcBuilderView: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [savedBuilds, setSavedBuilds] = useState<PcBuild[]>([]);
  const [loading, setLoading] = useState(true);

  // Active builder fields
  const [buildName, setBuildName] = useState('Dàn PC Gaming / Đồ Họa Cao Cấp');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState<number>(0);
  const [note, setNote] = useState('');

  // 10 Fixed Component Slots
  const [selectedItems, setSelectedItems] = useState<Record<string, PcBuildItem | null>>({
    'CAT-CPU': null,
    'CAT-MAIN': null,
    'CAT-RAM': null,
    'CAT-VGA': null,
    'CAT-SSD': null,
    'CAT-PSU': null,
    'CAT-CASE': null,
    'CAT-COOL': null,
    'CAT-MON': null,
    'CAT-GEAR': null,
  });

  // Slot picker modal
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [slotSearchQuery, setSlotSearchQuery] = useState('');

  // Modal In Báo Giá (Quote Print Modal)
  const [showPrintQuoteModal, setShowPrintQuoteModal] = useState(false);

  // Conversion / Success notification
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const componentSlots = [
    { id: 'CAT-CPU', name: 'CPU - Bộ Vi Xử Lý', icon: Cpu, required: true },
    { id: 'CAT-MAIN', name: 'Mainboard - Bo Mạch Chủ', icon: Layers, required: true },
    { id: 'CAT-RAM', name: 'RAM - Bộ Nhớ Trong', icon: Layers, required: true },
    { id: 'CAT-VGA', name: 'VGA - Card Màn Hình', icon: Zap, required: false },
    { id: 'CAT-SSD', name: 'SSD / HDD - Ổ Cứng Lưu Trữ', icon: HardDrive, required: true },
    { id: 'CAT-PSU', name: 'Nguồn Máy Tính (PSU)', icon: Zap, required: true },
    { id: 'CAT-CASE', name: 'Vỏ Case Máy Tính', icon: Layers, required: true },
    { id: 'CAT-COOL', name: 'Tản Nhiệt Khí & Nước', icon: Sparkles, required: false },
    { id: 'CAT-MON', name: 'Màn Hình Hiển Thị', icon: Tv, required: false },
    { id: 'CAT-GEAR', name: 'Gaming Gear (Phím / Chuột / Tai Nghe)', icon: Gamepad2, required: false },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, builds] = await Promise.all([
        apiFetch<Product[]>('/api/products'),
        apiFetch<PcBuild[]>('/api/pc-builds'),
      ]);
      setProducts(prods);
      setSavedBuilds(builds);
    } catch (err) {
      console.error('Lỗi nạp PC Builder:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProductForSlot = (slotId: string, product: Product) => {
    const slot = componentSlots.find((s) => s.id === slotId);
    const item: PcBuildItem = {
      categoryId: slotId,
      categoryName: slot?.name,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity: 1,
      unitPrice: product.retailPrice,
      discount: 0,
      total: product.retailPrice,
      warrantyMonths: product.warrantyMonths || 36,
    };

    setSelectedItems({ ...selectedItems, [slotId]: item });
    setActiveSlotId(null);
    setSlotSearchQuery('');
  };

  const handleRemoveSlotItem = (slotId: string) => {
    setSelectedItems({ ...selectedItems, [slotId]: null });
  };

  const handleUpdateItemQuantity = (slotId: string, qty: number) => {
    const item = selectedItems[slotId];
    if (!item) return;
    const newQty = Math.max(1, qty);
    setSelectedItems({
      ...selectedItems,
      [slotId]: {
        ...item,
        quantity: newQty,
        total: newQty * item.unitPrice,
      },
    });
  };

  const handleResetBuilder = () => {
    if (confirm('Bạn có chắc chắn muốn làm mới toàn bộ cấu hình đang chọn?')) {
      setSelectedItems({
        'CAT-CPU': null,
        'CAT-MAIN': null,
        'CAT-RAM': null,
        'CAT-VGA': null,
        'CAT-SSD': null,
        'CAT-PSU': null,
        'CAT-CASE': null,
        'CAT-COOL': null,
        'CAT-MON': null,
        'CAT-GEAR': null,
      });
      setDiscount(0);
      setNote('');
    }
  };

  // Tính toán tổng tiền & công suất ước tính
  const currentItems = Object.values(selectedItems).filter((i): i is PcBuildItem => i !== null);
  const totalPrice = currentItems.reduce((s, i) => s + i.total, 0);
  const finalPrice = Math.max(0, totalPrice - discount);

  // Kiểm tra linh kiện bắt buộc (Core Parts) để chốt cấu hình
  const hasCpu = Boolean(selectedItems['CAT-CPU']);
  const hasMainboard = Boolean(selectedItems['CAT-MAIN']);
  const hasRequiredCoreParts = hasCpu && hasMainboard;

  // Ước tính công suất nguồn yêu cầu (Wattage)
  let estimatedWattage = 150; // Mainboard, fans, SSD base
  if (selectedItems['CAT-CPU']) {
    const cpuName = selectedItems['CAT-CPU'].productName;
    if (cpuName.includes('i5') || cpuName.includes('Ryzen 5')) estimatedWattage += 120;
    else if (cpuName.includes('i7') || cpuName.includes('Ryzen 7')) estimatedWattage += 200;
    else if (cpuName.includes('i9') || cpuName.includes('Ryzen 9')) estimatedWattage += 260;
    else estimatedWattage += 80;
  }
  if (selectedItems['CAT-VGA']) {
    const vgaName = selectedItems['CAT-VGA'].productName;
    if (vgaName.includes('4060')) estimatedWattage += 160;
    else if (vgaName.includes('4070')) estimatedWattage += 220;
    else if (vgaName.includes('4080') || vgaName.includes('4090')) estimatedWattage += 350;
    else if (vgaName.includes('3050') || vgaName.includes('1660')) estimatedWattage += 130;
    else estimatedWattage += 100;
  }
  if (selectedItems['CAT-RAM']) {
    estimatedWattage += (selectedItems['CAT-RAM'].quantity || 1) * 8;
  }

  const recommendedPsu = Math.ceil((estimatedWattage * 1.4) / 50) * 50;

  const handleSaveBuild = async () => {
    if (currentItems.length === 0) {
      alert('Vui lòng chọn ít nhất một linh kiện cho bộ máy!');
      return;
    }

    try {
      const created = await apiFetch<PcBuild>('/api/pc-builds', {
        method: 'POST',
        body: JSON.stringify({
          buildName,
          customerName: customerName || 'Khách vãng lai',
          customerPhone: customerPhone || '0900000000',
          items: currentItems,
          discount,
          note,
        }),
      });

      setSavedBuilds([created, ...savedBuilds]);
      setSuccessMessage(`Đã lưu cấu hình PC: [${created.buildCode}] thành công!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Lỗi lưu cấu hình PC');
    }
  };

  const handleConvertToInvoice = async (buildId: string) => {
    const targetBuild = savedBuilds.find((b) => b.id === buildId);
    if (targetBuild) {
      const hasCpuInBuild = targetBuild.items.some(
        (i) => i.categoryId === 'CAT-CPU' || i.productName.toUpperCase().includes('CPU')
      );
      const hasMainInBuild = targetBuild.items.some(
        (i) =>
          i.categoryId === 'CAT-MAIN' ||
          i.productName.toUpperCase().includes('MAIN') ||
          i.productName.toUpperCase().includes('BO MẠCH')
      );

      if (!hasCpuInBuild || !hasMainInBuild) {
        alert('Cấu hình này chưa có đủ CPU hoặc Bo Mạch Chủ (Mainboard), không đủ điều kiện xuất hóa đơn bán lẻ!');
        return;
      }
    }

    if (!confirm('Bạn có chắc chắn muốn chuyển cấu hình này sang Hóa đơn bán lẻ và tự động trừ kho?')) {
      return;
    }

    try {
      const res = await apiFetch<any>(`/api/pc-builds/${buildId}/convert-to-invoice`, {
        method: 'POST',
        body: JSON.stringify({
          paymentMethod: 'transfer',
          paidAmount: finalPrice,
          note: `Xuất bán bộ PC lắp ráp: ${buildName}`,
        }),
      });

      setSuccessMessage(`Đã xuất thành công hóa đơn [${res.invoice.invoiceCode}] và trừ tồn kho linh kiện!`);
      setTimeout(() => setSuccessMessage(null), 5000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi chuyển đổi sang hóa đơn');
    }
  };

  const handleLoadBuildIntoForm = (b: PcBuild) => {
    setBuildName(b.buildName);
    setCustomerName(b.customerName || '');
    setCustomerPhone(b.customerPhone || '');
    setDiscount(b.discount || 0);
    setNote(b.note || '');

    const newMap: Record<string, PcBuildItem | null> = {
      'CAT-CPU': null,
      'CAT-MAIN': null,
      'CAT-RAM': null,
      'CAT-VGA': null,
      'CAT-SSD': null,
      'CAT-PSU': null,
      'CAT-CASE': null,
      'CAT-COOL': null,
      'CAT-MON': null,
      'CAT-GEAR': null,
    };

    b.items.forEach((item) => {
      newMap[item.categoryId] = item;
    });

    setSelectedItems(newMap);
    setSuccessMessage(`Đã nạp cấu hình [${b.buildCode}] vào khung làm việc!`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans text-slate-800">
      {/* Header macOS Bar */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-600" />
              Xây Dựng Cấu Hình PC (PC Builder Wizard)
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              10 SLOTS LINH KIỆN
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Chọn linh kiện chuẩn theo từng danh mục, tính toán công suất nguồn (Wattage) và 1-click xuất hóa đơn bán lẻ hoặc in báo giá.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetBuilder}
            className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Làm mới cấu hình"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Làm mới
          </button>

          <button
            type="button"
            onClick={() => setShowPrintQuoteModal(true)}
            disabled={currentItems.length === 0}
            className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            In Báo Giá Cấu Hình
          </button>

          <button
            type="button"
            onClick={handleSaveBuild}
            disabled={currentItems.length === 0}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            Lưu Cấu Hình (Draft)
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Grid: Slots Builder (Left 65%) vs Summary & Power (Right 35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Component Slots (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          {/* Build Info Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Tên cấu hình:
              </label>
              <input
                type="text"
                value={buildName}
                onChange={(e) => setBuildName(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Tên khách hàng:
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Anh Nam"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Số điện thoại:
              </label>
              <input
                type="tel"
                placeholder="Ví dụ: 0915..."
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Slots List (10 fixed slots) */}
          <div className="space-y-2.5">
            {componentSlots.map((slot) => {
              const selected = selectedItems[slot.id];
              const Icon = slot.icon;

              return (
                <div
                  key={slot.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between gap-4 transition-all hover:border-slate-300"
                >
                  {/* Slot Icon & Title */}
                  <div className="w-48 shrink-0 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 stroke-[1.75]" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{slot.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {slot.required ? (
                          <span className="text-amber-600 font-semibold">Bắt buộc</span>
                        ) : (
                          'Tùy chọn'
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Selected Item Content OR Empty Slot Button */}
                  <div className="flex-1 min-w-0">
                    {selected ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 truncate">
                            {selected.productName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>SKU: {selected.sku}</span>
                            <span>·</span>
                            <span>BH: {selected.warrantyMonths}T</span>
                            <span>·</span>
                            <span className="font-bold text-emerald-700">
                              {formatVND(selected.unitPrice)}
                            </span>
                          </div>
                        </div>

                        {/* Quantity and Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 text-xs font-mono">
                            <span className="text-[10px] text-slate-500 px-1">SL:</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQuantity(slot.id, selected.quantity - 1)}
                              className="px-1.5 py-0.5 bg-white rounded shadow-2xs font-bold hover:bg-slate-50 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="px-1.5 font-bold">{selected.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQuantity(slot.id, selected.quantity + 1)}
                              className="px-1.5 py-0.5 bg-white rounded shadow-2xs font-bold hover:bg-slate-50 cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveSlotItem(slot.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Xóa linh kiện này khỏi cấu hình"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSlotId(slot.id);
                          setSlotSearchQuery('');
                        }}
                        className="w-full py-2 px-3 border border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/40 text-slate-500 hover:text-indigo-700 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Chọn {slot.name}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Pricing Summary, Wattage, Actions (1 col) */}
        <div className="space-y-4">
          {/* Pricing & Checkout Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Tổng Giá Trị Bộ Máy</span>
              <span className="text-[11px] font-mono text-slate-400">{currentItems.length} món</span>
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Tổng tiền linh kiện:</span>
                <span className="font-mono font-semibold">{formatVND(totalPrice)}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Chiết khấu / Giảm giá:</span>
                <input
                  type="number"
                  step={50000}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  className="w-28 px-2 py-1 text-right border border-slate-200 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-sm text-slate-900">
                <span>TỔNG THANH TOÁN:</span>
                <span className="font-mono text-emerald-700 text-base">{formatVND(finalPrice)}</span>
              </div>
            </div>

            {/* Wattage Calculator */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  Công suất tiêu thụ dự kiến:
                </span>
                <span className="font-mono font-bold">~{estimatedWattage} Watt</span>
              </div>
              <p className="text-[10px] text-amber-700 leading-relaxed">
                Khuyến nghị chọn nguồn (PSU) tối thiểu{' '}
                <strong className="underline">{recommendedPsu}W</strong> chuẩn 80 Plus để máy vận hành mát mẻ và ổn định.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleSaveBuild}
                disabled={currentItems.length === 0}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Lưu Báo Giá / Cấu Hình Draft
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!hasRequiredCoreParts) {
                    alert('Chưa thể chốt hóa đơn: Vui lòng chọn cả CPU và Bo Mạch Chủ (Mainboard) cho cấu hình máy!');
                    return;
                  }
                  if (currentItems.length === 0) {
                    alert('Vui lòng chọn linh kiện trước khi xuất hóa đơn!');
                    return;
                  }
                  try {
                    const created = await apiFetch<PcBuild>('/api/pc-builds', {
                      method: 'POST',
                      body: JSON.stringify({
                        buildName,
                        customerName: customerName || 'Khách vãng lai',
                        customerPhone: customerPhone || '0900000000',
                        items: currentItems,
                        discount,
                        note,
                      }),
                    });
                    handleConvertToInvoice(created.id);
                  } catch (err: any) {
                    alert(err.message || 'Lỗi xuất hóa đơn');
                  }
                }}
                disabled={!hasRequiredCoreParts || currentItems.length === 0}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl font-bold text-xs shadow-sm shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                <Receipt className="w-4 h-4" />
                CHỐT CẤU HÌNH & LƯU HOÁ ĐƠN
              </button>

              {/* Cảnh báo thiếu linh kiện cốt lõi (CPU/Mainboard) */}
              {!hasRequiredCoreParts && currentItems.length > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2 animate-in fade-in">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Chưa thể chốt hóa đơn:</span> Bắt buộc phải có{' '}
                    <strong>{[!hasCpu && 'CPU', !hasMainboard && 'Mainboard'].filter(Boolean).join(' và ')}</strong>{' '}
                    để đảm bảo cấu hình máy hoàn chỉnh.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Saved Builds List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3 text-xs">
            <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Cấu Hình Đã Lưu</span>
              <span className="font-mono text-slate-400">{savedBuilds.length} bản</span>
            </h3>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {savedBuilds.length === 0 ? (
                <div className="py-6 text-center text-slate-400">Chưa có cấu hình PC nào được lưu.</div>
              ) : (
                savedBuilds.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200/70 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo-700">{b.buildCode}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.status === 'converted_to_invoice'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {b.status === 'converted_to_invoice' ? `Đã xuất ${b.convertedInvoiceCode}` : 'Bản nháp'}
                      </span>
                    </div>

                    <div className="font-semibold text-slate-900 truncate">{b.buildName}</div>
                    <div className="text-[11px] text-slate-500">Khách: {b.customerName || 'Vãng lai'}</div>
                    <div className="font-mono font-bold text-slate-900">{formatVND(b.finalPrice)}</div>

                    <div className="pt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleLoadBuildIntoForm(b)}
                        className="text-[11px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                      >
                        Nạp vào khung
                      </button>
                      {b.status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => handleConvertToInvoice(b.id)}
                          className="text-[11px] text-emerald-600 hover:underline font-semibold ml-auto cursor-pointer"
                        >
                          Xuất hóa đơn & trừ kho
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SLOT COMPONENT PICKER MODAL */}
      {activeSlotId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span>Chọn {componentSlots.find((s) => s.id === activeSlotId)?.name}</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Lọc danh sách linh kiện tương thích từ kho hàng DATASOFT
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveSlotId(null);
                  setSlotSearchQuery('');
                }}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ô tìm kiếm linh kiện trong modal */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo tên linh kiện, mã SKU..."
                value={slotSearchQuery}
                onChange={(e) => setSlotSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white"
              />
            </div>

            {/* Danh sách linh kiện lọc theo slot */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {products
                .filter((p) => {
                  // Yêu cầu 4: Chỉ hiển thị sản phẩm còn hàng (stockQuantity > 0)
                  if (p.stockQuantity <= 0) return false;

                  // Lọc theo slot category
                  let matchCategory = false;
                  if (activeSlotId === 'CAT-CPU') matchCategory = p.categoryId === 'CAT-CPU' || p.name.includes('CPU') || p.name.includes('Core') || p.name.includes('Ryzen');
                  else if (activeSlotId === 'CAT-MAIN') matchCategory = p.categoryId === 'CAT-MAIN' || p.name.includes('Mainboard') || p.name.includes('Bo Mạch') || p.name.includes('B760') || p.name.includes('Z790') || p.name.includes('B650');
                  else if (activeSlotId === 'CAT-RAM') matchCategory = p.categoryId === 'CAT-RAM' || p.name.includes('RAM') || p.name.includes('Fury') || p.name.includes('DDR');
                  else if (activeSlotId === 'CAT-SSD') matchCategory = p.categoryId === 'CAT-SSD' || p.name.includes('SSD') || p.name.includes('HDD') || p.name.includes('NV2') || p.name.includes('NVMe') || p.name.includes('Ổ cứng');
                  else if (activeSlotId === 'CAT-VGA') matchCategory = p.categoryId === 'CAT-VGA' || p.name.includes('RTX') || p.name.includes('Card') || p.name.includes('VGA') || p.name.includes('GeForce') || p.name.includes('Radeon');
                  else if (activeSlotId === 'CAT-PSU') matchCategory = p.categoryId === 'CAT-PSU' || p.name.includes('Nguồn') || p.name.includes('PSU') || p.name.includes('Corsair') || p.name.includes('Bronze') || p.name.includes('Gold');
                  else if (activeSlotId === 'CAT-CASE') matchCategory = p.categoryId === 'CAT-CASE' || p.name.includes('Case') || p.name.includes('Vỏ') || p.name.includes('Thùng máy');
                  else if (activeSlotId === 'CAT-COOL') matchCategory = p.categoryId === 'CAT-COOL' || p.name.includes('Tản') || p.name.includes('Assassin') || p.name.includes('AIO') || p.name.includes('Cooler') || p.name.includes('Fan');
                  else if (activeSlotId === 'CAT-MON') matchCategory = p.categoryId === 'CAT-MON' || p.name.includes('Màn hình') || p.name.includes('Monitor') || p.categoryId === 'CAT-03';
                  else if (activeSlotId === 'CAT-GEAR') matchCategory = p.categoryId === 'CAT-04' || p.categoryId === 'CAT-GEAR' || p.name.includes('Phím') || p.name.includes('Chuột') || p.name.includes('Tai nghe') || p.name.includes('AKKO') || p.name.includes('DareU') || p.name.includes('Gear');
                  else matchCategory = true;

                  if (!matchCategory) return false;

                  // Lọc theo search query nếu có
                  if (slotSearchQuery.trim()) {
                    const q = slotSearchQuery.toLowerCase();
                    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
                  }

                  return true;
                })
                .map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleSelectProductForSlot(activeSlotId, product)}
                    className="p-3 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all flex items-center justify-between cursor-pointer text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{product.name}</div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        SKU: {product.sku} · Tồn kho: {product.stockQuantity} {product.unit} · BH: {product.warrantyMonths} Tháng
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-emerald-700 text-sm">
                        {formatVND(product.retailPrice)}
                      </div>
                      <span className="text-[10px] text-indigo-600 font-medium">Nhấn để chọn</span>
                    </div>
                  </div>
                ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setActiveSlotId(null);
                  setSlotSearchQuery('');
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 text-xs hover:bg-slate-50 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IN BÁO GIÁ CẤU HÌNH (QUOTATION PRINT) */}
      {showPrintQuoteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 no-print">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Printer className="w-4 h-4 text-indigo-600" />
                Phiếu Báo Giá Cấu Hình Máy Tính PC
              </h3>
              <button
                type="button"
                onClick={() => setShowPrintQuoteModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nội dung báo giá chuẩn in */}
            <div className="flex-1 overflow-y-auto p-4 border border-slate-200 rounded-xl space-y-4 text-xs font-sans bg-white print:p-0 print:border-none">
              {/* Header cửa hàng */}
              <div className="text-center border-b pb-3 space-y-1">
                <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-900">
                  HỆ THỐNG MÁY TÍNH THỊNH PHÁT (DATASOFT)
                </h2>
                <p className="text-[11px] text-slate-500">
                  Địa chỉ: Số 9 Ngõ 117 Thái Hà, Đống Đa, Hà Nội · Hotline: 0915.654.321
                </p>
                <h3 className="text-sm font-bold text-indigo-800 pt-2 uppercase">
                  BẢNG BÁO GIÁ CẤU HÌNH PC LẮP RÁP
                </h3>
              </div>

              {/* Thông tin khách hàng & Báo giá */}
              <div className="grid grid-cols-2 gap-4 text-slate-700 text-xs">
                <div>
                  <p>Khách hàng: <strong>{customerName || 'Khách hàng vãng lai'}</strong></p>
                  <p>Số điện thoại: <strong>{customerPhone || 'Chưa cập nhật'}</strong></p>
                </div>
                <div className="text-right">
                  <p>Tên cấu hình: <strong>{buildName}</strong></p>
                  <p>Ngày lập: <strong>{formatDate(new Date().toISOString())}</strong></p>
                </div>
              </div>

              {/* Bảng linh kiện 10 slots */}
              <table className="w-full text-left text-xs border border-slate-200 border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b font-bold">
                    <th className="p-2 border-r w-8 text-center">STT</th>
                    <th className="p-2 border-r">Danh mục & Linh kiện</th>
                    <th className="p-2 border-r text-center w-16">BH</th>
                    <th className="p-2 border-r text-center w-12">SL</th>
                    <th className="p-2 border-r text-right w-24">Đơn giá</th>
                    <th className="p-2 text-right w-28">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {currentItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 border-r text-center font-mono">{idx + 1}</td>
                      <td className="p-2 border-r">
                        <div className="font-bold text-slate-900">{item.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.categoryName} · SKU: {item.sku}
                        </div>
                      </td>
                      <td className="p-2 border-r text-center font-mono">{item.warrantyMonths || 36}T</td>
                      <td className="p-2 border-r text-center font-mono font-bold">{item.quantity}</td>
                      <td className="p-2 border-r text-right font-mono">{formatVND(item.unitPrice)}</td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900">
                        {formatVND(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tổng kết tài chính & Khuyến nghị */}
              <div className="space-y-1.5 text-right text-xs pt-2">
                <div className="flex justify-between text-slate-600">
                  <span>Tổng tiền linh kiện ({currentItems.length} món):</span>
                  <span className="font-mono font-semibold">{formatVND(totalPrice)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Chiết khấu / Giảm giá:</span>
                    <span className="font-mono font-bold">-{formatVND(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t">
                  <span>TỔNG THANH TOÁN DỰ KIẾN:</span>
                  <span className="font-mono text-emerald-700 text-base">{formatVND(finalPrice)}</span>
                </div>
                <div className="text-[11px] text-amber-700 text-left pt-2 font-medium">
                  * Công suất ước tính: ~{estimatedWattage}W. Đề xuất nguồn máy tính tối thiểu {recommendedPsu}W 80 Plus.
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 no-print">
              <button
                type="button"
                onClick={() => setShowPrintQuoteModal(false)}
                className="px-4 py-2 border rounded-xl text-slate-600 text-xs hover:bg-slate-50 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                In Báo Giá Ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
