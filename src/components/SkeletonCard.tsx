import React from 'react';

export const SkeletonCard: React.FC = () => (
  <div className="rounded-2xl p-6 pl-8 bg-background-dark/40 border border-white/5 relative overflow-hidden glass-card">
    {/* Accent strip */}
    <div className="absolute top-0 left-0 w-[3px] h-full skeleton rounded-l" />

    <div className="flex items-center gap-3 mb-4">
      <div className="skeleton w-2 h-2 rounded-full" />
      <div className="skeleton h-3 w-20 rounded-full" />
      <div className="skeleton h-3 w-24 rounded-full" />
    </div>

    <div className="skeleton h-7 w-48 rounded-lg mb-2" />
    <div className="skeleton h-3 w-32 rounded-full mb-4" />

    <div className="space-y-2">
      <div className="skeleton h-3 w-full rounded-full" />
      <div className="skeleton h-3 w-4/5 rounded-full" />
    </div>

    <div className="mt-6 pt-5 border-t border-white/5">
      <div className="skeleton h-12 w-full rounded-xl" />
    </div>
  </div>
);

export const SkeletonGrid: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);
