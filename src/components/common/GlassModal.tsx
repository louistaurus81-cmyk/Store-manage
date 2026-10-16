import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string; // Default: 'max-w-xl'
}

export const GlassModal: React.FC<GlassModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-xl',
}) => {
  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Translucent Backdrop Overlay (macOS blur overlay) */}
      <div
        className="fixed inset-0 bg-zinc-900/20 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Glassmorphism Dialog Panel */}
      <div
        className={`relative w-full ${maxWidth} bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-zinc-200/60 overflow-hidden z-10 transition-all animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-zinc-200/50 flex items-center justify-between shrink-0 bg-white/60">
          <div>
            <h3 className="font-bold text-sm text-zinc-900 tracking-tight">{title}</h3>
            {subtitle && <p className="text-[11px] text-zinc-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer active:scale-95 transition-transform duration-150"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 font-sans text-xs text-zinc-700">
          {children}
        </div>
      </div>
    </div>
  );
};
