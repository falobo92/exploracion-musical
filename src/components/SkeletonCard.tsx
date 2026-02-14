import React from 'react';

export const SkeletonCard: React.FC = () => (
  <div className="rounded-xl p-5 pl-6 bg-zinc-900/50 border border-zinc-800/30 relative overflow-hidden">
    {/* Accent strip */}
    <div className="absolute top-0 left-0 w-[3px] h-full skeleton rounded-l" />

    <div className="flex items-center gap-2 mb-3">
      <div className="skeleton w-2 h-2 rounded-full" />
      <div className="skeleton h-3 w-16 rounded-full" />
      <div className="skeleton h-3 w-20 rounded-full" />
    </div>

    <div className="skeleton h-6 w-44 rounded mb-2" />
    <div className="skeleton h-3 w-28 rounded mb-3" />

    <div className="space-y-1.5">
      <div className="skeleton h-3 w-full rounded" />
      <div className="skeleton h-3 w-4/5 rounded" />
    </div>

    <div className="mt-4 pt-3 border-t border-zinc-800/30">
      <div className="skeleton h-10 w-full rounded-lg" />
    </div>
  </div>
);

export const SkeletonGrid: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);
