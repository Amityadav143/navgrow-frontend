import React from 'react';
import { cn } from '@/lib/utils';

// Base skeleton pulse element
export const Skeleton = ({ className }) => (
  <div className={cn('animate-pulse rounded-xl bg-gray-200', className)} />
);

// Product card skeleton
export const ProductCardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
    <Skeleton className="aspect-[4/3] w-full rounded-none" />
    <div className="p-4 space-y-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-3 w-3 rounded-full" />)}
      </div>
      <div className="flex justify-between pt-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-20 rounded-xl" />
      </div>
    </div>
  </div>
);

// News card skeleton
export const NewsCardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
    <Skeleton className="h-2 w-full rounded-none" />
    <div className="p-5 space-y-3">
      <div className="flex gap-2">
        <Skeleton className="h-5 w-5 rounded-lg" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-4/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  </div>
);

// Job card skeleton
export const JobCardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
    <div className="flex gap-2">
      <Skeleton className="h-5 w-20 rounded-full" />
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
    <Skeleton className="h-6 w-3/4" />
    <div className="flex gap-4">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-4 w-24" />
    </div>
  </div>
);

// Stat card skeleton
export const StatCardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center space-y-3">
    <Skeleton className="h-12 w-12 rounded-2xl mx-auto" />
    <Skeleton className="h-8 w-24 mx-auto" />
    <Skeleton className="h-4 w-32 mx-auto" />
    <Skeleton className="h-3 w-40 mx-auto" />
  </div>
);

// Table row skeleton
export const TableRowSkeleton = ({ cols = 5 }) => (
  <tr>
    {[...Array(cols)].map((_, i) => (
      <td key={i} className="px-4 py-3">
        <Skeleton className="h-4 w-full" />
      </td>
    ))}
  </tr>
);

// Generic page loading fallback
export const PageSkeleton = () => (
  <div className="min-h-screen bg-gray-50">
    {/* Hero */}
    <div className="h-52 bg-blue-900/80 animate-pulse" />
    {/* Content */}
    <div className="container mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  </div>
);

export default Skeleton;
