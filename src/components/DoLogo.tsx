import React from 'react';

interface DoLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'tile' | 'text' | 'ghost';
}

const sizeMap = {
  xs: { box: 'w-6 h-6 rounded-md text-xs', text: 'text-xs' },
  sm: { box: 'w-8 h-8 rounded-lg text-sm', text: 'text-sm' },
  md: { box: 'w-10 h-10 rounded-xl text-base', text: 'text-lg' },
  lg: { box: 'w-12 h-12 rounded-2xl text-lg', text: 'text-2xl' },
  xl: { box: 'w-16 h-16 rounded-[20px] text-2xl', text: 'text-4xl' },
};

export function DoLogo({ className = '', size = 'md', variant = 'tile' }: DoLogoProps) {
  const { box, text } = sizeMap[size];

  if (variant === 'text') {
    return (
      <span
        className={`font-black tracking-[-0.06em] text-white select-none ${text} ${className}`}
        style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
      >
        do
      </span>
    );
  }

  if (variant === 'ghost') {
    return (
      <div
        className={`inline-flex items-center justify-center font-black tracking-[-0.06em] border border-white/20 text-white select-none ${box} ${className}`}
        style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
      >
        <span>do</span>
      </div>
    );
  }

  // Default 'tile' variant: clean minimalist white background with deep black lowercase 'do'
  return (
    <div
      className={`inline-flex items-center justify-center font-black tracking-[-0.06em] bg-white text-zinc-950 shadow-md select-none ${box} ${className}`}
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
      aria-label="do logo"
    >
      <span className="leading-none pb-[1px]">do</span>
    </div>
  );
}
