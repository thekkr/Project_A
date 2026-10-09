'use client';
import React, { useState, useRef, useLayoutEffect, cloneElement } from 'react';

export type NavItem = {
  id: string | number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ReactElement<any>;
  label?: string;
  onClick?: () => void;
};

type LimelightNavProps = {
  items: NavItem[];
  activeIndex?: number;
  onTabChange?: (index: number) => void;
  /** 'icon-label' = icon + tiny label below (mobile)
   *  'icon-text'  = icon + full text side-by-side (desktop)
   *  'icon'       = icon only */
  variant?: 'icon' | 'icon-label' | 'icon-text';
  className?: string;
  limelightColor?: string;
};

export function LimelightNav({
  items,
  activeIndex = 0,
  onTabChange,
  variant = 'icon-label',
  className = '',
  limelightColor = 'var(--accent)',
}: LimelightNavProps) {
  const [isReady, setIsReady] = useState(false);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const barRef   = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!items.length) return;
    const bar  = barRef.current;
    const item = itemRefs.current[activeIndex];
    if (!bar || !item) return;

    // In icon-text / text mode bar matches item width; otherwise fixed 44 px
    if (variant === 'icon-text') {
      bar.style.width = item.offsetWidth + 'px';
    }
    bar.style.left = `${item.offsetLeft + item.offsetWidth / 2 - bar.offsetWidth / 2}px`;

    if (!isReady) setTimeout(() => setIsReady(true), 40);
  }, [activeIndex, isReady, items, variant]);

  if (!items.length) return null;

  const isTextVariant = variant === 'icon-text';

  return (
    <nav
      className={`relative inline-flex items-center ${className}`}
      style={{ overflow: 'visible' }}
    >
      {items.map(({ id, icon, label, onClick }, idx) => (
        <button
          key={id}
          ref={el => { itemRefs.current[idx] = el; }}
          onClick={() => { onTabChange?.(idx); onClick?.(); }}
          aria-label={label}
          className={`
            relative z-20 flex h-full cursor-pointer items-center justify-center
            bg-transparent border-0 outline-none
            ${isTextVariant ? 'flex-row gap-1.5 px-4' : 'flex-col gap-0.5 px-4'}
          `}
        >
          {cloneElement(icon, {
            className: [
              'transition-opacity duration-150',
              idx === activeIndex ? 'opacity-100' : 'opacity-35',
              icon.props?.className ?? '',
            ].join(' '),
          })}
          {(variant === 'icon-label') && label && (
            <span className={`transition-opacity duration-150 leading-none ${idx === activeIndex ? 'opacity-100' : 'opacity-35'}`}
              style={{ fontSize: 9, fontWeight: idx === activeIndex ? 600 : 400 }}>
              {label}
            </span>
          )}
          {(variant === 'icon-text') && label && (
            <span className={`text-xs font-semibold whitespace-nowrap transition-opacity duration-150 ${idx === activeIndex ? 'opacity-100' : 'opacity-35'}`}>
              {label}
            </span>
          )}
        </button>
      ))}

      {/* Limelight bar */}
      <div
        ref={barRef}
        className="absolute top-0 z-10 h-[5px] rounded-full pointer-events-none"
        style={{
          width: isTextVariant ? 'auto' : 44,
          left: -999,
          background: limelightColor,
          boxShadow: `0 40px 14px ${limelightColor}`,
          transition: isReady
            ? `left 300ms cubic-bezier(0.4,0,0.2,1), width 300ms cubic-bezier(0.4,0,0.2,1)`
            : 'none',
        }}
      >
        {/* Cone glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: '-30%', top: 5,
            width: '160%', height: 56,
            clipPath: 'polygon(5% 100%, 25% 0, 75% 0, 95% 100%)',
            background: `linear-gradient(to bottom, color-mix(in srgb, ${limelightColor} 28%, transparent), transparent)`,
          }}
        />
      </div>
    </nav>
  );
}
