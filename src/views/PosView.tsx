import React, { useState, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  Barcode,
  Trash2,
  Printer,
  Plus,
  Minus,
  Check,
  AlertCircle,
  CreditCard,
  Banknote,
  Scale,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  X,
  Scan,
  User,
} from 'lucide-react';
import type { Customer, Invoice, InvoiceItem, Product, StoreSettings, UserRole } from '../types/datasoft';
import { apiFetch, formatVND, formatDate } from '../utils/api';
import { InvoicePrintModal } from '../components/InvoicePrintModal';
import { useAuth } from '../context/AuthContext';
import {
  useBarcodeScanner,
  playScannerSuccessBeep,
  playScannerErrorBeep,
  sanitizeVietnameseBarcode,
} from '../hooks/useBarcodeScanner';
import { MacToastContainer, ToastMessage } from '../components/MacToast';
import { SkeletonCard } from '../components/common/SkeletonCard';
import { EmptyState } from '../components/common/EmptyState';

interface PosViewProps {
  onNavigateToTab?: (tab: string) => void;
}

export const PosView: React.FC<PosViewProps> = ({ onNavigateToTab }) => {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'pos' | 'invoices' | 'inventory' | 'categories'>('pos');

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Barcode scanner modal & test state
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [manualBarcodeText, setManualBarcodeText] = useState('');

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Cart states
  const [cartItems, setCartItems] = useState<InvoiceItem[]>([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerSearchText, setCustomerSearchText] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [discount, setDiscount] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash' | 'debt'>('transfer');
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // IMEI selection modal state
  const [selectedProductForImei, setSelectedProductForImei] = useState<Product | null>(null);
  const [availableImeis, setAvailableImeis] = useState<string[]>([]);
  const [chosenImei, setChosenImei] = useState<string>('');
  const [loadingImeis, setLoadingImeis] = useState(false);

  // Invoice Print Modal state
  const [invoiceForPrint, setInvoiceForPrint] = useState<Invoice | null>(null);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState<Invoice | null>(null);

  // ==========================================
  // XỬ LÝ SỰ KIỆN MÁY QUÉT MÃ VẠCH / SERIAL (POS)
  // ==========================================
  const handleBarcodeScanned = async (barcode: string) => {
    const cleanBarcode = sanitizeVietnameseBarcode(barcode);
    if (!cleanBarcode) return;

    try {
      // 1. Kiểm tra nếu IMEI này đã có trong giỏ hàng
      const isAlreadyInCart = cartItems.some(
        (item) => item.imei && item.imei.toUpperCase() === cleanBarcode.toUpperCase()
      );
      if (isAlreadyInCart) {
        playScannerErrorBeep();
        addToast('warning', `Mã Serial/IMEI [${cleanBarcode}] đã có trong giỏ hàng rồi!`, 'Trùng Lặp Serial');
        return;
      }

      // 2. Gọi API tra cứu chi tiết số Serial/IMEI
      const res = await apiFetch<{
        found: boolean;
        inStock: boolean;
        imeiRecord?: any;
        product?: Product;
        status?: string;
        message?: string;
      }>(`/api/inventory/imei/${encodeURIComponent(cleanBarcode)}`);

      if (res && res.found && res.inStock && res.product) {
        // Tự động thêm sản phẩm vào giỏ hàng với số lượng 1 kèm IMEI
        addItemToCart(res.product, res.imeiRecord?.imei || cleanBarcode);
        playScannerSuccessBeep();
        addToast(
          'success',
          `Đã thêm [${res.product.name}] - IMEI: ${res.imeiRecord?.imei || cleanBarcode}`,
          'Quét Thành Công'
        );
      } else {
        // Không hợp lệ hoặc đã bán
        playScannerErrorBeep();
        addToast(
          'error',
          res?.message || `Mã Serial/IMEI [${cleanBarcode}] không hợp lệ hoặc đã bán!`,
          'Lỗi Quét Mã'
        );
      }
    } catch (err: any) {
      playScannerErrorBeep();
      addToast(
        'error',
        err.message || `Không thể tra cứu mã Serial [${cleanBarcode}]`,
        'Lỗi Máy Quét'
      );
    }
  };

  // Kích hoạt Custom Hook máy quét
  const { isScanning, lastBarcode, simulateScan } = useBarcodeScanner({
    onScan: handleBarcodeScanned,
    enabled: true,
    playFeedbackSound: false, // Âm thanh được gọi chính xác theo logic thành công/thất bại của API
  });

  useEffect(() => {
    loadPosData();
  }, []);

  const loadPosData = async () => {
    setLoading(true);
    try {
      const [prods, invs, custs, storeSet] = await Promise.all([
        apiFetch<Product[]>('/api/products'),
        apiFetch<Invoice[]>('/api/invoices'),
        apiFetch<Customer[]>('/api/customers'),
        apiFetch<StoreSettings>('/api/system/settings'),
      ]);
      setProducts(prods);
      setInvoices(invs);
      setCustomers(custs);
      setSettings(storeSet);
    } catch (err) {
      console.error('Lỗi tải dữ liệu POS:', err);
    } finally {
      setLoading(false);
    }
  };

  // Categories list
  const categoryChips = [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'CAT-MAIN', label: 'Mainboard' },
    { id: 'CAT-CPU', label: 'CPU' },
    { id: 'CAT-RAM', label: 'RAM' },
    { id: 'CAT-SSD', label: 'SSD' },
    { id: 'CAT-VGA', label: 'VGA' },
    { id: 'CAT-PSU', label: 'Nguồn' },
    { id: 'CAT-CASE', label: 'Vỏ Case' },
    { id: 'CAT-COOL', label: 'Tản Nhiệt' },
    { id: 'CAT-MON', label: 'Màn Hình' },
    { id: 'CAT-LAP', label: 'Laptop' },
    { id: 'CAT-SRV', label: 'Dịch Vụ' },
  ];

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchCategory =
      selectedCategory === 'ALL' ||
      p.categoryId === selectedCategory ||
      (selectedCategory === 'CAT-MAIN' && (p.name.includes('Mainboard') || p.name.includes('Bo Mạch'))) ||
      (selectedCategory === 'CAT-CPU' && (p.name.includes('CPU') || p.name.includes('Core') || p.name.includes('Ryzen'))) ||
      (selectedCategory === 'CAT-RAM' && p.name.includes('RAM')) ||
      (selectedCategory === 'CAT-SSD' && (p.name.includes('SSD') || p.name.includes('Ổ cứng'))) ||
      (selectedCategory === 'CAT-VGA' && (p.name.includes('VGA') || p.name.includes('Card') || p.name.includes('GeForce'))) ||
      (selectedCategory === 'CAT-PSU' && (p.name.includes('Nguồn') || p.name.includes('PSU'))) ||
      (selectedCategory === 'CAT-CASE' && (p.name.includes('Case') || p.name.includes('Vỏ'))) ||
      (selectedCategory === 'CAT-COOL' && (p.name.includes('Tản') || p.name.includes('Cooler'))) ||
      (selectedCategory === 'CAT-MON' && p.name.includes('Màn hình')) ||
      (selectedCategory === 'CAT-LAP' && p.name.includes('Laptop'));

    if (!matchCategory) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  // Open IMEI Modal or add non-IMEI directly
  const handleProductCardClick = async (product: Product) => {
    if (product.stockQuantity <= 0 && product.stockQuantity < 900) {
      return; // Out of stock
    }

    if (product.hasSerialImei) {
      setSelectedProductForImei(product);
      setLoadingImeis(true);
      try {
        const imeis = await apiFetch<any[]>(`/api/imeis?productId=${product.id}&status=in_stock`);
        const list = imeis.map((i) => i.imei);
        setAvailableImeis(list);
        setChosenImei(list[0] || '');
      } catch {
        setAvailableImeis([]);
        setChosenImei('');
      } finally {
        setLoadingImeis(false);
      }
    } else {
      // Non-serialized item: Add or increment quantity
      addItemToCart(product);
    }
  };

  const addItemToCart = (product: Product, imei?: string) => {
    const existingIndex = cartItems.findIndex(
      (item) => item.productId === product.id && (!product.hasSerialImei || item.imei === imei)
    );

    let updatedCart: InvoiceItem[];
    if (existingIndex > -1 && !product.hasSerialImei) {
      updatedCart = [...cartItems];
      updatedCart[existingIndex].quantity += 1;
      updatedCart[existingIndex].total = updatedCart[existingIndex].quantity * updatedCart[existingIndex].unitPrice;
    } else {
      const newItem: InvoiceItem = {
        productId: product.id,
        productName: product.name,
        imei,
        quantity: 1,
        unitPrice: product.retailPrice,
        discount: 0,
        total: product.retailPrice,
        warrantyMonths: product.warrantyMonths || 12,
      };
      updatedCart = [...cartItems, newItem];
    }

    setCartItems(updatedCart);
    updatePaidAmount(updatedCart, discount, paymentMethod);
    setSelectedProductForImei(null);
  };

  const updateQuantity = (index: number, delta: number) => {
    const updated = [...cartItems];
    const newQty = updated[index].quantity + delta;
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    updated[index].quantity = newQty;
    updated[index].total = newQty * updated[index].unitPrice;
    setCartItems(updated);
    updatePaidAmount(updated, discount, paymentMethod);
  };

  const removeFromCart = (index: number) => {
    const updated = cartItems.filter((_, i) => i !== index);
    setCartItems(updated);
    updatePaidAmount(updated, discount, paymentMethod);
  };

  const updatePaidAmount = (
    cart: InvoiceItem[],
    currDiscount: number,
    method: 'transfer' | 'cash' | 'debt'
  ) => {
    const sub = cart.reduce((s, i) => s + i.total, 0);
    const final = Math.max(0, sub - currDiscount);
    if (method !== 'debt') {
      setPaidAmount(final);
    } else {
      setPaidAmount(0);
    }
  };

  const handleDiscountPercentChange = (valStr: string) => {
    // Chặn tuyệt đối ký tự chữ cái, dấu âm, ký tự đặc biệt
    const cleanStr = valStr.replace(/[^\d]/g, '');
    let pct = cleanStr === '' ? 0 : parseInt(cleanStr, 10);
    if (isNaN(pct) || pct < 0) pct = 0;
    if (pct > 100) pct = 100;

    setDiscountPercent(pct);
    const calculatedDiscount = Math.round((cartSubTotal * pct) / 100);
    setDiscount(calculatedDiscount);
    const newFinal = Math.max(0, cartSubTotal - calculatedDiscount);
    if (paymentMethod !== 'debt') {
      setPaidAmount(newFinal);
    }
  };

  const handlePaidAmountChange = (valStr: string) => {
    // Chặn tuyệt đối ký tự chữ cái, dấu âm, ký tự đặc biệt
    const cleanStr = valStr.replace(/[^\d]/g, '');
    let amount = cleanStr === '' ? 0 : parseInt(cleanStr, 10);
    if (isNaN(amount) || amount < 0) amount = 0;
    setPaidAmount(amount);
  };

  const preventNegativeAndCharKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Chặn phím âm (-), phím cộng (+), số mũ (e, E), dấu chấm (.), phẩy (,)
    if (['-', '+', 'e', 'E', '.', ','].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleCustomerPhoneChange = (phone: string) => {
    setCustomerPhone(phone);
    const found = customers.find((c) => c.phone.trim() === phone.trim());
    if (found) {
      setCustomerName(found.name);
    }
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      alert('Giỏ hàng đang trống!');
      return;
    }
    if (!customerPhone.trim() || !customerName.trim()) {
      alert('Vui lòng nhập Tên và Số điện thoại khách hàng.');
      return;
    }

    const validatedDiscount = Math.max(0, Number(discount) || 0);
    const validatedPaidAmount = Math.max(0, Number(paidAmount) || 0);

    try {
      const newInvoice = await apiFetch<Invoice>('/api/invoices', {
        method: 'POST',
        body: JSON.stringify({
          customerId: '',
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          items: cartItems,
          discount: validatedDiscount,
          paidAmount: validatedPaidAmount,
          paymentMethod,
          salesId: user?.id || 'USR-003',
          salesName: user?.fullName || 'Nhân viên bán hàng',
        }),
      });

      // Clear cart
      setCartItems([]);
      setCustomerPhone('');
      setCustomerName('');
      setCustomerSearchText('');
      setSelectedCustomer(null);
      setDiscount(0);
      setDiscountPercent(0);
      setPaidAmount(0);

      // Open print preview
      setInvoiceForPrint(newInvoice);
      setInvoices([newInvoice, ...invoices]);

      // Reload products to update stock
      loadPosData();
    } catch (err: any) {
      alert(err.message || 'Lỗi lập hóa đơn bán hàng.');
    }
  };

  const filteredCustomerSuggestions = customers.filter((c) => {
    if (!customerSearchText.trim()) return false;
    const q = customerSearchText.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  }).slice(0, 6);

  const cartSubTotal = cartItems.reduce((s, i) => s + i.total, 0);
  const cartFinalTotal = Math.max(0, cartSubTotal - discount);

  return (
    <div className="min-h-full bg-[#f5f5f7] flex flex-col font-sans">
      {/* 1. Header Bar: Tiêu đề & Trạng thái kết nối Máy chủ */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between shrink-0 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Giao Dịch Bán Hàng & Quản Lý Kho
          </h2>
          <p className="text-[11px] text-slate-500">
            Hệ thống Quầy thu ngân thông minh · Tự động xuất IMEI & Trừ kho thời gian thực
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-emerald-800 tracking-wide font-mono">
              MÁY CHỦ TRUNG TÂM · ONLINE
            </span>
          </div>
        </div>
      </div>

      {/* 2. macOS Style Segmented Navigation Tabs */}
      <div className="px-6 pt-3 pb-2 bg-white/50 border-b border-slate-200/60 flex items-center gap-1.5 shrink-0 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('pos')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSubTab === 'pos'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          Quầy Thu Ngân (POS)
        </button>

        <button
          onClick={() => setActiveSubTab('invoices')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSubTab === 'invoices'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          Hóa Đơn Đã Bán ({invoices.length})
        </button>

        <button
          onClick={() => {
            if (onNavigateToTab) onNavigateToTab('inventory');
            else setActiveSubTab('inventory');
          }}
          className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-all cursor-pointer"
        >
          Kho & Kho Hàng
        </button>

        <button
          onClick={() => setActiveSubTab('categories')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSubTab === 'categories'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          Danh Mục Linh Kiện
        </button>
      </div>

      {/* 3. Main Content: POS View (70% - 30% Sticky Split) */}
      {activeSubTab === 'pos' && (
        <div className="flex-1 p-6 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden max-w-[1600px] w-full mx-auto">
          {/* CỘT TRÁI (70%): Tìm kiếm, Filter Chips & Lưới Sản Phẩm */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden space-y-4">
            {/* Search Bar & Barcode Scanner Trigger Button */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 stroke-[1.75]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm sản phẩm theo tên, SKU, model..."
                  className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Nút Quét IMEI / Barcode có hiệu ứng Radar sóng âm */}
              <button
                type="button"
                onClick={() => {
                  setManualBarcodeText('');
                  setShowBarcodeModal(true);
                }}
                className={`px-3.5 py-2.5 rounded-2xl border text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer ${
                  isScanning
                    ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-500/30'
                    : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200/80 hover:border-emerald-400'
                }`}
                title="Hệ thống đang tự động lắng nghe máy quét mã vạch USB/Bluetooth. Nhấp để quét hoặc nhập thủ công."
              >
                <div className="relative flex items-center justify-center">
                  <Barcode className={`w-4 h-4 ${isScanning ? 'text-white' : 'text-emerald-600'}`} />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
                </div>
                <span className="hidden sm:inline">Quét IMEI</span>
                {isScanning ? (
                  <span className="text-[10px] bg-white/20 text-white font-bold px-1.5 py-0.5 rounded-md animate-pulse">
                    Đang đọc...
                  </span>
                ) : (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded-md border border-emerald-100">
                    Sẵn sàng
                  </span>
                )}
              </button>
            </div>

            {/* Horizontally Scrollable Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-none">
              {categoryChips.map((chip) => {
                const isActive = selectedCategory === chip.id;
                return (
                  <button
                    key={chip.id}
                    onClick={() => setSelectedCategory(chip.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200/70 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* Product Card Grid (Cuộn danh sách) */}
            <div className="flex-1 overflow-y-auto pr-1">
              {loading ? (
                <SkeletonCard count={6} type="pos-grid" />
              ) : filteredProducts.length === 0 ? (
                <EmptyState
                  title="Không tìm thấy linh kiện"
                  description="Không có sản phẩm nào khớp với từ khóa tìm kiếm hoặc bộ lọc danh mục hiện tại."
                  className="py-12"
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {filteredProducts.map((p) => {
                    const isOutOfStock = p.stockQuantity <= 0 && p.stockQuantity < 900;
                    // Tag category mapping (VGA, RAM, CPU...)
                    let categoryTag = 'LINH KIỆN';
                    if (p.categoryId === 'CAT-VGA' || p.name.includes('VGA') || p.name.includes('GeForce')) categoryTag = 'VGA';
                    else if (p.categoryId === 'CAT-RAM' || p.name.includes('RAM')) categoryTag = 'RAM';
                    else if (p.categoryId === 'CAT-CPU' || p.name.includes('CPU')) categoryTag = 'CPU';
                    else if (p.categoryId === 'CAT-MAIN' || p.name.includes('Main')) categoryTag = 'MAIN';
                    else if (p.categoryId === 'CAT-SSD' || p.name.includes('SSD')) categoryTag = 'SSD';
                    else if (p.categoryId === 'CAT-PSU' || p.name.includes('Nguồn')) categoryTag = 'NGUỒN';
                    else if (p.categoryId === 'CAT-CASE' || p.name.includes('Case')) categoryTag = 'CASE';
                    else if (p.categoryId === 'CAT-COOL' || p.name.includes('Tản')) categoryTag = 'TẢN';
                    else if (p.categoryId === 'CAT-MON' || p.name.includes('Màn hình')) categoryTag = 'MÀN HÌNH';
                    else if (p.categoryId === 'CAT-LAP' || p.name.includes('Laptop')) categoryTag = 'LAPTOP';

                    return (
                      <div
                        key={p.id}
                        onClick={() => handleProductCardClick(p)}
                        className={`bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between transition-all group ${
                          isOutOfStock
                            ? 'opacity-60 cursor-not-allowed'
                            : 'hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 cursor-pointer'
                        }`}
                      >
                        {/* Top: Category Tag & SKU */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 tracking-wider font-mono">
                            {categoryTag}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 font-medium">
                            {p.sku}
                          </span>
                        </div>

                        {/* Title */}
                        <div className="mb-3">
                          <h4 className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-relaxed">
                            {p.name}
                          </h4>
                        </div>

                        {/* Middle Badges: IMEI, Bảo hành, Tồn kho */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-4 text-[11px]">
                          {p.hasSerialImei && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/70 font-medium flex items-center gap-1">
                              <Barcode className="w-3 h-3 stroke-[2]" />
                              Quản lý IMEI
                            </span>
                          )}

                          <span className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200/60 font-medium">
                            BH: {p.warrantyMonths}T
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-md font-mono font-medium ${
                              isOutOfStock
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-50 text-slate-600 border border-slate-200/60'
                            }`}
                          >
                            Tồn: {p.stockQuantity >= 900 ? 'Sẵn sàng' : `${p.stockQuantity} ${p.unit}`}
                          </span>
                        </div>

                        {/* Bottom Action: Price & Button */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div className="text-sm font-bold font-mono text-emerald-700">
                            {formatVND(p.retailPrice)}
                          </div>

                          {isOutOfStock ? (
                            <span className="text-xs font-bold text-rose-600">Cháy hàng</span>
                          ) : p.hasSerialImei ? (
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 text-xs font-semibold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <Barcode className="w-3.5 h-3.5" />
                              Quét IMEI
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white text-xs font-semibold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Thêm
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI (30% - Sticky): Panel "Giỏ Hàng" */}
          <div className="w-full lg:w-[380px] shrink-0 h-full flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 overflow-hidden">
            {/* Header Giỏ Hàng */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <ShoppingCart className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Giỏ Hàng</h3>
                  <p className="text-[10px] text-slate-400">
                    {cartItems.length} sản phẩm đang chờ xuất
                  </p>
                </div>
              </div>

              {cartItems.length > 0 && (
                <button
                  onClick={() => setCartItems([])}
                  className="text-xs text-rose-500 hover:text-rose-700 hover:underline cursor-pointer"
                >
                  Xóa giỏ
                </button>
              )}
            </div>

            {/* Thông tin Khách hàng - Autocomplete / Combobox (Yêu Cầu 2) */}
            <div className="py-3 border-b border-slate-200/60 space-y-2 shrink-0 relative">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  Khách Hàng
                </span>
                {selectedCustomer ? (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                    Khách quen ({selectedCustomer.code})
                  </span>
                ) : customerPhone.trim() ? (
                  <span className="text-[10px] bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                    Khách mới
                  </span>
                ) : null}
              </div>

              {/* Ô Searchable Select / Combobox */}
              <div className="relative">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Tìm khách cũ (Tên, SĐT, Mã)..."
                    value={customerSearchText}
                    onFocus={() => setIsCustomerDropdownOpen(true)}
                    onChange={(e) => {
                      const text = e.target.value;
                      setCustomerSearchText(text);
                      setIsCustomerDropdownOpen(true);
                      if (/^[0-9+]+$/.test(text.trim())) {
                        setCustomerPhone(text.trim());
                      }
                      if (selectedCustomer && text !== selectedCustomer.name && text !== selectedCustomer.phone) {
                        setSelectedCustomer(null);
                      }
                    }}
                    className="w-full pl-8 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                  {customerSearchText && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerSearchText('');
                        setCustomerName('');
                        setCustomerPhone('');
                        setSelectedCustomer(null);
                      }}
                      className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Dropdown danh sách gợi ý khách hàng từ customers.json */}
                {isCustomerDropdownOpen && customerSearchText.trim() && (
                  <div
                    className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200/90 rounded-xl shadow-xl max-h-52 overflow-y-auto z-40 divide-y divide-slate-100"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {filteredCustomerSuggestions.length > 0 ? (
                      filteredCustomerSuggestions.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedCustomer(c);
                            setCustomerName(c.name);
                            setCustomerPhone(c.phone);
                            setCustomerSearchText(`${c.name} - ${c.phone}`);
                            setIsCustomerDropdownOpen(false);
                          }}
                          className="p-2.5 hover:bg-slate-50 cursor-pointer text-xs transition-colors flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-slate-900">{c.name}</div>
                            <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>SĐT: {c.phone}</span>
                              <span>·</span>
                              <span className="text-slate-400">{c.code}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {c.currentDebt > 0 ? (
                              <span className="text-[10px] text-rose-600 font-bold block">
                                Nợ: {formatVND(c.currentDebt)}
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-600 font-semibold block">
                                Đã chi: {formatVND(c.totalSpent)}
                              </span>
                            )}
                            <span className="text-[10px] text-blue-600 font-medium">Chọn</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-500">
                        <span>Không tìm thấy khách hàng cũ.</span>
                        <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                          Sẽ tự động tạo Khách mới khi thanh toán!
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Chi tiết Tên và SĐT khách (cho phép chỉnh sửa trực tiếp) */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div>
                  <input
                    type="tel"
                    placeholder="SĐT khách *"
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      if (!customerSearchText) setCustomerSearchText(e.target.value);
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Tên khách *"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (!customerSearchText) setCustomerSearchText(e.target.value);
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Danh sách Sản phẩm trong Giỏ (Cuộn) */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
              {cartItems.length === 0 ? (
                <EmptyState
                  icon={ShoppingCart}
                  title="Giỏ hàng đang trống"
                  description="Chưa có sản phẩm nào trong giỏ. Quét mã IMEI hoặc tìm kiếm linh kiện để bắt đầu đơn hàng mới tại Thịnh Phát Technology."
                  className="py-10"
                />
              ) : (
                cartItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200/60 flex items-start justify-between gap-2 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 truncate leading-snug">
                        {item.productName}
                      </div>
                      {item.imei && (
                        <div className="text-[10px] font-mono font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                          <Barcode className="w-3 h-3 shrink-0" />
                          Serial: {item.imei}
                        </div>
                      )}
                      <div className="text-[11px] font-mono text-slate-500 mt-1">
                        {formatVND(item.unitPrice)}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="font-mono font-bold text-slate-900 text-xs">
                        {formatVND(item.total)}
                      </div>

                      {/* Quantity Controls (Chỉ cho phép tăng giảm nếu không phải serialized) */}
                      {!item.imei ? (
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(idx, -1)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-600"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center font-mono font-semibold text-xs">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(idx, 1)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-600"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeFromCart(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Tổng Tiền & Phương thức Thanh toán */}
            <div className="pt-3 border-t border-slate-200/80 space-y-3 shrink-0 text-xs">
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Tiền hàng:</span>
                  <span className="font-mono font-semibold">{formatVND(cartSubTotal)}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <div className="flex items-center gap-1">
                    <span>Chiết khấu (%):</span>
                    {discount > 0 && (
                      <span className="text-[10px] text-rose-600 font-mono">
                        (-{formatVND(discount)})
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={discountPercent}
                      onKeyDown={preventNegativeAndCharKeys}
                      onChange={(e) => handleDiscountPercentChange(e.target.value)}
                      placeholder="0"
                      className="w-20 px-2 py-0.5 pr-5 text-right border border-slate-200 rounded-lg font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                    />
                    <span className="absolute right-2 text-slate-400 pointer-events-none text-[10px]">%</span>
                  </div>
                </div>

                <div className="flex justify-between font-bold text-sm text-slate-900 pt-1.5 border-t border-slate-100">
                  <span>TỔNG THANH TOÁN:</span>
                  <span className="font-mono text-emerald-700 text-base">{formatVND(cartFinalTotal)}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600 pt-1">
                  <span>Khách thanh toán:</span>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={paidAmount}
                      onKeyDown={preventNegativeAndCharKeys}
                      onChange={(e) => handlePaidAmountChange(e.target.value)}
                      className="w-28 px-2 py-0.5 pr-5 text-right border border-slate-200 rounded-lg font-mono text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <span className="absolute right-2 text-slate-400 pointer-events-none text-[10px]">đ</span>
                  </div>
                </div>

                {/* Tình trạng thanh toán: Trả đủ / Còn nợ / Thối lại */}
                {cartFinalTotal > 0 && (
                  <div className="flex justify-between items-center text-[11px] px-2 py-1 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-500">Tình trạng thu:</span>
                    {paidAmount < cartFinalTotal ? (
                      <span className="font-semibold text-rose-600 font-mono">
                        Ghi nợ: {formatVND(cartFinalTotal - paidAmount)}
                      </span>
                    ) : paidAmount > cartFinalTotal ? (
                      <span className="font-semibold text-emerald-600 font-mono">
                        Tiền thừa: {formatVND(paidAmount - cartFinalTotal)}
                      </span>
                    ) : (
                      <span className="font-semibold text-emerald-700">Đã thanh toán đủ</span>
                    )}
                  </div>
                )}

                {/* Phím chọn nhanh tỷ lệ trả */}
                {cartFinalTotal > 0 && (
                  <div className="flex gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setPaidAmount(cartFinalTotal)}
                      className="flex-1 py-1 px-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-semibold text-slate-700 cursor-pointer text-center transition-colors"
                    >
                      Trả đủ 100%
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaidAmount(Math.round(cartFinalTotal / 2))}
                      className="flex-1 py-1 px-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-semibold text-amber-700 cursor-pointer text-center transition-colors"
                    >
                      Trả 50% (Nợ 50%)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('debt');
                        setPaidAmount(0);
                      }}
                      className="flex-1 py-1 px-1 rounded-lg border border-rose-200 bg-rose-50/50 hover:bg-rose-100/50 text-[10px] font-semibold text-rose-700 cursor-pointer text-center transition-colors"
                    >
                      Ghi nợ toàn bộ
                    </button>
                  </div>
                )}
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                  PHƯƠNG THỨC THANH TOÁN
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('transfer');
                      updatePaidAmount(cartItems, discount, 'transfer');
                    }}
                    className={`py-2 px-1 rounded-xl border text-center text-[11px] font-semibold transition-all cursor-pointer ${
                      paymentMethod === 'transfer'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Chuyển khoản QR
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('cash');
                      updatePaidAmount(cartItems, discount, 'cash');
                    }}
                    className={`py-2 px-1 rounded-xl border text-center text-[11px] font-semibold transition-all cursor-pointer ${
                      paymentMethod === 'cash'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Tiền mặt
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('debt');
                      updatePaidAmount(cartItems, discount, 'debt');
                    }}
                    className={`py-2 px-1 rounded-xl border text-center text-[11px] font-semibold transition-all cursor-pointer ${
                      paymentMethod === 'debt'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Ghi nợ
                  </button>
                </div>
              </div>

              {/* Nút bấm Hoàn tất & In Hóa đơn */}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={cartItems.length === 0}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                THANH TOÁN & IN HÓA ĐƠN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtab: Hóa đơn đã bán */}
      {activeSubTab === 'invoices' && (
        <div className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-sm text-slate-900">Danh sách Hóa đơn Bán lẻ</h3>
              <span className="text-xs text-slate-500 font-mono">{invoices.length} hóa đơn đã lưu</span>
            </div>
            <table className="w-full text-left text-xs border-collapse select-text">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b font-semibold">
                  <th className="p-3">Mã Hóa đơn</th>
                  <th className="p-3">Khách hàng & SĐT</th>
                  <th className="p-3">Sản phẩm & IMEI</th>
                  <th className="p-3">Ngày xuất</th>
                  <th className="p-3 text-right">Tổng tiền</th>
                  <th className="p-3 text-center w-24">In lại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => setSelectedInvoiceDetail(inv)}
                        className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left inline-flex items-center gap-1"
                        title="Nhấp để xem chi tiết hóa đơn & danh sách linh kiện"
                      >
                        {inv.invoiceCode}
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{inv.customerName}</div>
                      <div className="text-[11px] font-mono text-slate-500">{inv.customerPhone}</div>
                    </td>
                    <td className="p-3">
                      <div className="line-clamp-1 text-slate-700">
                        {inv.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-slate-500">{formatDate(inv.createdAt)}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {formatVND(inv.finalAmount)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setInvoiceForPrint(inv)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" /> In
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab: Danh mục linh kiện */}
      {activeSubTab === 'categories' && (
        <div className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto w-full">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-900">Danh mục Linh kiện & Thiết bị</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {categoryChips.filter((c) => c.id !== 'ALL').map((c) => (
                <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="font-bold text-slate-900 text-xs">{c.label}</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">{c.id}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHỌN SỐ SERIAL / IMEI CHO SẢN PHẨM */}
      {selectedProductForImei && (
        <div className="fixed inset-0 z-50 bg-zinc-900/20 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-zinc-200/60 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-200/60 pb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-emerald-600" />
                  Chọn Số Serial / IMEI Tồn Kho
                </h4>
                <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                  {selectedProductForImei.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedProductForImei(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingImeis ? (
              <div className="py-8 text-center text-xs text-slate-400">Đang nạp danh sách IMEI...</div>
            ) : availableImeis.length === 0 ? (
              <div className="py-6 text-center text-xs text-rose-600 space-y-1">
                <AlertCircle className="w-6 h-6 mx-auto mb-1 text-rose-500" />
                <p>Không có số IMEI nào ở trạng thái "Trong kho"!</p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <label className="block text-slate-700 font-medium">
                  Chọn số Serial/IMEI gắn cho sản phẩm này:
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 border border-zinc-200/60 rounded-xl p-2 bg-slate-50/50">
                  {availableImeis.map((imei) => (
                    <button
                      key={imei}
                      type="button"
                      onClick={() => setChosenImei(imei)}
                      className={`w-full p-2.5 rounded-lg text-left font-mono font-semibold text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        chosenImei === imei
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : 'bg-white hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <span>{imei}</span>
                      {chosenImei === imei && <Check className="w-4 h-4 text-emerald-600" />}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200/60">
                  <button
                    type="button"
                    onClick={() => setSelectedProductForImei(null)}
                    className="px-4 py-2 border border-zinc-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-semibold active:scale-95 transition-transform duration-150 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={!chosenImei}
                    onClick={() => addItemToCart(selectedProductForImei, chosenImei)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs disabled:opacity-50 active:scale-95 transition-transform duration-150 cursor-pointer shadow-xs"
                  >
                    Xác nhận thêm vào giỏ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SLIDE-OVER PANEL XEM CHI TIẾT HÓA ĐƠN ĐÃ BÁN (YÊU CẦU 4) */}
      {selectedInvoiceDetail && (
        <div className="fixed inset-0 z-50 bg-zinc-900/20 backdrop-blur-sm flex justify-end animate-in fade-in duration-150">
          <div className="bg-white/95 backdrop-blur-md w-full max-w-xl h-full shadow-2xl border-l border-zinc-200/60 flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-slate-900 font-mono">
                    {selectedInvoiceDetail.invoiceCode}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      selectedInvoiceDetail.status === 'paid'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {selectedInvoiceDetail.status === 'paid' ? 'Đã thu đủ' : `Còn nợ: ${formatVND(selectedInvoiceDetail.debtAmount)}`}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Ngày xuất: {formatDate(selectedInvoiceDetail.createdAt)} · NV: {selectedInvoiceDetail.salesName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoiceDetail(null)}
                className="w-8 h-8 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* Thông tin khách hàng */}
              <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/60 space-y-1">
                <span className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider">
                  Khách hàng
                </span>
                <div className="text-sm font-bold text-slate-900">{selectedInvoiceDetail.customerName}</div>
                <div className="text-slate-500 font-mono text-xs">
                  SĐT: {selectedInvoiceDetail.customerPhone}
                </div>
              </div>

              {/* Bảng linh kiện */}
              <div className="space-y-2">
                <span className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider">
                  Linh kiện trong hóa đơn
                </span>
                <div className="border border-slate-200/70 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                        <th className="p-2.5">Sản phẩm</th>
                        <th className="p-2.5 text-center">SL</th>
                        <th className="p-2.5 text-right">Đơn giá</th>
                        <th className="p-2.5 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedInvoiceDetail.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2.5">
                            <div className="font-semibold text-slate-900">{it.productName}</div>
                            {it.imei && (
                              <div className="text-[11px] font-mono font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                                <Barcode className="w-3 h-3" />
                                Serial/IMEI: {it.imei}
                              </div>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold">{it.quantity}</td>
                          <td className="p-2.5 text-right font-mono">{formatVND(it.unitPrice)}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                            {formatVND(it.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tổng kết tài chính */}
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/60 space-y-2 text-xs font-medium">
                <div className="flex justify-between text-slate-600">
                  <span>Tạm tính tiền hàng:</span>
                  <span className="font-mono">{formatVND(selectedInvoiceDetail.subTotal)}</span>
                </div>
                {selectedInvoiceDetail.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Chiết khấu giảm giá:</span>
                    <span className="font-mono">-{formatVND(selectedInvoiceDetail.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-200">
                  <span>Tổng thanh toán:</span>
                  <span className="font-mono">{formatVND(selectedInvoiceDetail.finalAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Đã thanh toán:</span>
                  <span className="font-mono font-semibold text-emerald-700">
                    {formatVND(selectedInvoiceDetail.paidAmount)}
                  </span>
                </div>
                {selectedInvoiceDetail.debtAmount > 0 && (
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>Công nợ còn lại:</span>
                    <span className="font-mono">{formatVND(selectedInvoiceDetail.debtAmount)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 text-slate-500">
                  <span>Phương thức: </span>
                  <strong className="text-slate-800">
                    {selectedInvoiceDetail.paymentMethod === 'transfer'
                      ? 'Chuyển khoản'
                      : selectedInvoiceDetail.paymentMethod === 'debt'
                      ? 'Ghi nợ'
                      : 'Tiền mặt'}
                  </strong>
                </div>
                {selectedInvoiceDetail.note && (
                  <div className="text-slate-500">Ghi chú: {selectedInvoiceDetail.note}</div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedInvoiceDetail(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl font-semibold text-slate-700 text-xs"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setInvoiceForPrint(selectedInvoiceDetail);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 active:scale-95"
              >
                <Printer className="w-4 h-4" />
                In Hóa Đơn Này
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Print Modal */}
      {invoiceForPrint && (
        <InvoicePrintModal
          invoice={invoiceForPrint}
          settings={settings}
          onClose={() => setInvoiceForPrint(null)}
        />
      )}

      {/* Barcode Scanner Modal (Quét & Giả lập quét phần cứng) */}
      {showBarcodeModal && (
        <div className="fixed inset-0 bg-zinc-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-zinc-200/60 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Barcode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Máy Quét Mã Vạch / Serial (IMEI)</h3>
                  <p className="text-[11px] text-slate-500">Tự động chống lỗi bộ gõ tiếng Việt Unikey / EVKey</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBarcodeModal(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Visual Radar Scanning Animation */}
              <div className="p-4 bg-slate-900 text-white rounded-xl text-center relative overflow-hidden space-y-2">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent animate-pulse" />
                <div className="flex justify-center">
                  <div className="relative">
                    <Scan className="w-12 h-12 text-emerald-400 animate-pulse stroke-[1.5]" />
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-bounce" />
                  </div>
                </div>
                <div className="text-xs font-semibold text-emerald-400">
                  {isScanning ? 'Đang nhận diện tín hiệu máy quét...' : 'Sẵn sàng bắn tia quét từ máy cầm tay'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Bấm cò quét mã bất kỳ lúc nào trên máy tính, hệ thống tự động lọc dấu và thêm vào giỏ.
                </div>
              </div>

              {/* Manual Input or Hardware Simulation */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-700">
                  Hoặc dán / gõ mã Serial thử nghiệm:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={manualBarcodeText}
                    onChange={(e) => setManualBarcodeText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && manualBarcodeText.trim()) {
                        e.preventDefault();
                        handleBarcodeScanned(manualBarcodeText.trim());
                        setManualBarcodeText('');
                      }
                    }}
                    placeholder="Ví dụ: KF-RAM-839201, KST-500G-001..."
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (manualBarcodeText.trim()) {
                        handleBarcodeScanned(manualBarcodeText.trim());
                        setManualBarcodeText('');
                      }
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs active:scale-95"
                  >
                    Kiểm Tra
                  </button>
                </div>
              </div>

              {/* Sample test barcodes for quick one-click testing */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1.5">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Mã IMEI mẫu trong kho để test nhanh:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { code: 'DL5420-SN-8291824', label: 'Dell 5420 (Còn hàng)' },
                    { code: 'ASUS-TUF-M9N0CV01', label: 'Asus TUF (Còn hàng)' },
                    { code: 'KS-NV2-882910402', label: 'SSD NV2 500G (Còn hàng)' },
                    { code: 'KFURY-32-094812', label: 'RAM Fury 16G (Còn hàng)' },
                    { code: 'RTX4060-DUAL-9921', label: 'RTX 4060 (Còn hàng)' },
                    { code: 'DL5420-SN-8291823', label: 'Dell 5420 (Đã bán - Test Lỗi)' },
                  ].map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => {
                        handleBarcodeScanned(item.code);
                      }}
                      className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg text-[10px] font-mono text-slate-700 hover:text-emerald-700 transition-colors cursor-pointer shadow-2xs"
                    >
                      <span className="font-bold">{item.code}</span>
                      <span className="text-[9px] text-slate-400 block font-sans">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/70 flex justify-end">
              <button
                type="button"
                onClick={() => setShowBarcodeModal(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors"
              >
                Đóng Cửa Sổ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* macOS Translucent Toast Notifications */}
      <MacToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
