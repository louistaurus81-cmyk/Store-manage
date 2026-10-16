import React from 'react';
import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ElementType;
  title?: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = PackageOpen,
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center select-none ${className}`}
    >
      {/* Icon Frame với phong cách nét mảnh nhẹ nhàng (macOS Minimalist) */}
      <div className="w-16 h-16 rounded-2xl bg-zinc-100/80 border border-zinc-200/60 flex items-center justify-center mb-3 shadow-2xs transition-transform duration-200 hover:scale-105">
        <Icon className="w-8 h-8 text-zinc-400 stroke-[1.25]" />
      </div>

      {title && (
        <h4 className="text-xs font-bold text-zinc-800 tracking-tight mb-1">
          {title}
        </h4>
      )}

      <p className="text-[11px] text-zinc-500 max-w-sm leading-relaxed">
        {description}
      </p>

      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-xs active:scale-95 transition-transform duration-150 cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
