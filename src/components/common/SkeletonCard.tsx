import React from 'react';

interface SkeletonCardProps {
  count?: number;
  type?: 'pos-grid' | 'table-row' | 'summary-card';
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  count = 6,
  type = 'pos-grid',
}) => {
  const items = Array.from({ length: count });

  if (type === 'table-row') {
    return (
      <>
        {items.map((_, idx) => (
          <tr key={idx} className="animate-pulse border-b border-zinc-100">
            <td className="p-3">
              <div className="h-3 w-16 bg-zinc-200/80 rounded" />
            </td>
            <td className="p-3">
              <div className="space-y-1.5">
                <div className="h-3.5 w-48 bg-zinc-200/80 rounded" />
                <div className="h-2.5 w-24 bg-zinc-100 rounded" />
              </div>
            </td>
            <td className="p-3">
              <div className="h-3 w-20 bg-zinc-200/80 rounded" />
            </td>
            <td className="p-3 text-right">
              <div className="h-3.5 w-20 bg-zinc-200/80 rounded ml-auto" />
            </td>
            <td className="p-3 text-right">
              <div className="h-3.5 w-16 bg-zinc-200/80 rounded ml-auto" />
            </td>
            <td className="p-3 text-center">
              <div className="h-5 w-14 bg-zinc-200/80 rounded-full mx-auto" />
            </td>
          </tr>
        ))}
      </>
    );
  }

  if (type === 'summary-card') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((_, idx) => (
          <div
            key={idx}
            className="animate-pulse bg-white/70 backdrop-blur-md rounded-2xl p-4 border border-zinc-200/60 shadow-2xs space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="h-3 w-24 bg-zinc-200/80 rounded" />
              <div className="w-8 h-8 rounded-xl bg-zinc-200/80" />
            </div>
            <div className="h-6 w-32 bg-zinc-200/80 rounded" />
            <div className="h-2.5 w-20 bg-zinc-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Default: 'pos-grid' (Lưới sản phẩm POS)
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
      {items.map((_, idx) => (
        <div
          key={idx}
          className="animate-pulse bg-white/70 backdrop-blur-md rounded-2xl border border-zinc-200/60 p-3.5 space-y-2.5 shadow-2xs"
        >
          {/* Header Placeholder: Category tag & Stock */}
          <div className="flex justify-between items-center">
            <div className="h-4 w-16 bg-zinc-200/80 rounded-md" />
            <div className="h-4 w-12 bg-zinc-200/80 rounded-full" />
          </div>

          {/* Product Name Placeholder */}
          <div className="space-y-1.5 pt-1">
            <div className="h-3.5 w-full bg-zinc-200/80 rounded" />
            <div className="h-3.5 w-3/4 bg-zinc-200/80 rounded" />
          </div>

          {/* SKU & Warranty line */}
          <div className="flex items-center gap-2 pt-1">
            <div className="h-2.5 w-16 bg-zinc-100 rounded" />
            <div className="h-2.5 w-10 bg-zinc-100 rounded" />
          </div>

          {/* Price & Action Button Placeholder */}
          <div className="flex justify-between items-center pt-2 border-t border-zinc-100">
            <div className="h-4 w-20 bg-zinc-200/80 rounded" />
            <div className="w-7 h-7 rounded-xl bg-zinc-200/80" />
          </div>
        </div>
      ))}
    </div>
  );
};
