import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * BẢNG MÃ ÁNH XẠ KÝ TỰ BỘ GÕ TIẾNG VIỆT (TELEX / VNI) VỀ CHUẨN ALPHANUMERIC
 * Giải quyết triệt để lỗi khi máy quét mã vạch nhập ký tự cực nhanh nhưng OS bật Unikey/EVKey
 */
const VIETNAMESE_CHAR_MAP: Record<string, string> = {
  // A & các biến thể
  'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
  'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
  'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
  'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
  'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
  'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',

  // E & các biến thể
  'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
  'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
  'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
  'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',

  // I
  'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
  'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',

  // O & các biến thể
  'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
  'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
  'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
  'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
  'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
  'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',

  // U & các biến thể
  'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
  'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
  'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
  'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',

  // Y
  'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
  'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y',

  // D / Đ
  'đ': 'd', 'Đ': 'D',
};

/**
 * Hàm làm sạch và chuyển đổi chuỗi mã vạch bị lỗi do Unikey/EVKey
 */
export function sanitizeVietnameseBarcode(raw: string): string {
  if (!raw) return '';

  // 1. Thay thế từng ký tự có dấu theo bảng map chính xác
  let result = '';
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    result += VIETNAMESE_CHAR_MAP[ch] || ch;
  }

  // 2. Chuẩn hóa NFD để bóc tách triệt để các dấu phụ còn sót lại
  result = result
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

  // 3. Giữ lại các ký tự chuẩn mã vạch / Serial: A-Z, 0-9, dấu gạch ngang, gạch dưới, chấm, chéo
  result = result.replace(/[^a-zA-Z0-9\-_./]/g, '').toUpperCase().trim();

  return result;
}

/**
 * Âm thanh bíp thành công (Web Audio API - Không cần file ngoài)
 * Giả lập tiếng kêu bíp ngắn sắc nét 1200Hz của máy quét mã vạch Honeywell / Datalogic
 */
export function playScannerSuccessBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Âm bíp 2 tầng nhanh: 1050Hz -> 1320Hz
    osc.frequency.setValueAtTime(1050, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (err) {
    // Trình duyệt có thể chặn autoplay âm thanh nếu chưa tương tác
  }
}

/**
 * Âm thanh cảnh báo lỗi khi quét mã không hợp lệ hoặc đã bán
 * Giả lập tiếng tít tít trầm 320Hz cảnh báo
 */
export function playScannerErrorBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const playTone = (timeOffset: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, ctx.currentTime + timeOffset);

      gain.gain.setValueAtTime(0.25, ctx.currentTime + timeOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + timeOffset + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + timeOffset);
      osc.stop(ctx.currentTime + timeOffset + 0.13);
    };

    // 2 tiếng bíp trầm liên tiếp
    playTone(0);
    playTone(0.16);
  } catch (err) {
    // Trình duyệt có thể chặn
  }
}

/**
 * Ánh xạ phím vật lý từ event.code bỏ qua bộ gõ của hệ điều hành
 */
function getCharFromPhysicalCode(code: string, shiftKey: boolean): string | null {
  if (code.startsWith('Key')) {
    const letter = code.slice(3).toUpperCase();
    return letter;
  }
  if (code.startsWith('Digit')) {
    return code.slice(5);
  }
  if (code.startsWith('Numpad')) {
    const rest = code.slice(6);
    if (/^[0-9]$/.test(rest)) return rest;
    if (rest === 'Subtract') return '-';
    if (rest === 'Decimal') return '.';
    if (rest === 'Divide') return '/';
    if (rest === 'Add') return '+';
  }
  if (code === 'Minus') return shiftKey ? '_' : '-';
  if (code === 'Period') return '.';
  if (code === 'Slash') return '/';
  if (code === 'Backslash') return '/';
  if (code === 'Space') return ' ';
  return null;
}

export interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  maxIntervalMs?: number; // Ngưỡng nhận diện máy quét (thường 20-40ms giữa 2 phím)
  minChars?: number; // Độ dài tối thiểu của mã vạch
  playFeedbackSound?: boolean; // Tự động phát âm thanh
}

/**
 * Custom Hook lắng nghe sự kiện máy quét mã vạch phần cứng
 */
export function useBarcodeScanner({
  onScan,
  enabled = true,
  maxIntervalMs = 45,
  minChars = 3,
  playFeedbackSound = true,
}: UseBarcodeScannerOptions) {
  const [isScanning, setIsScanning] = useState(false);
  const [lastBarcode, setLastBarcode] = useState<string>('');

  // Refs lưu trữ bộ đệm giữa các lần render
  const bufferRef = useRef<string[]>([]);
  const lastKeyTimeRef = useRef<number>(0);
  const isHardwareBurstRef = useRef<boolean>(false);
  const scanTimeoutRef = useRef<number | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const now = Date.now();
      const interval = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Phím kết thúc máy quét mã vạch (thường là Enter hoặc Tab)
      if (event.key === 'Enter' || event.key === 'Tab') {
        // Kiểm tra nếu bộ đệm có nội dung và là chuỗi quét tốc độ cao
        if (bufferRef.current.length >= minChars && isHardwareBurstRef.current) {
          event.preventDefault();
          event.stopPropagation();

          const rawCode = bufferRef.current.join('');
          const cleanedCode = sanitizeVietnameseBarcode(rawCode);

          if (cleanedCode.length >= minChars) {
            setLastBarcode(cleanedCode);
            setIsScanning(true);

            if (playFeedbackSound) {
              playScannerSuccessBeep();
            }

            onScan(cleanedCode);

            if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
            scanTimeoutRef.current = window.setTimeout(() => {
              setIsScanning(false);
            }, 800);
          }
        }

        // Reset bộ đệm sau khi Enter
        bufferRef.current = [];
        isHardwareBurstRef.current = false;
        return;
      }

      // Xử lý các phím thông thường
      // Lấy ký tự từ mã phím vật lý trước (để bỏ qua hoàn toàn Unikey/EVKey)
      const physicalChar = getCharFromPhysicalCode(event.code, event.shiftKey);
      const effectiveChar = physicalChar || sanitizeVietnameseBarcode(event.key);

      if (!effectiveChar || effectiveChar.length !== 1) {
        // Phím chức năng (Shift, Ctrl, Alt, CapsLock...) -> bỏ qua
        return;
      }

      // Nếu khoảng cách giữa 2 ký tự liên tiếp nhỏ hơn ngưỡng (máy quét nhập cực nhanh)
      if (interval < maxIntervalMs) {
        isHardwareBurstRef.current = true;
        bufferRef.current.push(effectiveChar);
      } else {
        // Nếu khoảng cách gõ phím quá chậm (người dùng gõ bàn phím bình thường)
        // Bắt đầu một chuỗi mới
        bufferRef.current = [effectiveChar];
        isHardwareBurstRef.current = false;
      }
    },
    [enabled, maxIntervalMs, minChars, onScan, playFeedbackSound]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    };
  }, [enabled, handleKeyDown]);

  /**
   * Cho phép giả lập quét mã từ UI cho việc test hoặc nhập nhanh
   */
  const simulateScan = useCallback(
    (barcode: string) => {
      const clean = sanitizeVietnameseBarcode(barcode);
      if (!clean) return;

      setLastBarcode(clean);
      setIsScanning(true);
      if (playFeedbackSound) {
        playScannerSuccessBeep();
      }
      onScan(clean);

      setTimeout(() => {
        setIsScanning(false);
      }, 800);
    },
    [onScan, playFeedbackSound]
  );

  return {
    lastBarcode,
    isScanning,
    simulateScan,
    playSuccessSound: playScannerSuccessBeep,
    playErrorSound: playScannerErrorBeep,
  };
}
