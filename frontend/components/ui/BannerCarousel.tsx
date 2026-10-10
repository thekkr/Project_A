'use client';
import { useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

export type BannerSlide = {
  id: string | number;
  eyebrow: string;
  title: string;
  meta: string;
  cta: string;
  href?: string;
  bg: string; // CSS gradient or color
};

// Placeholder slides — replace with real data when backend has banners/events
const DEFAULT_SLIDES: BannerSlide[] = [
  {
    id: 1,
    eyebrow: 'Upcoming Event',
    title: "Aavarana Writers' Summit — Spring 2026",
    meta: 'March 15 · Bengaluru · Open to all contributors',
    cta: 'Learn more',
    href: '#',
    bg: 'linear-gradient(145deg,#0E1B2E 0%,#1e3a60 55%,#0a2240 100%)',
  },
  {
    id: 2,
    eyebrow: 'Call for Submissions',
    title: "We're accepting long-form essays on culture, science & society",
    meta: 'Deadline: February 28 · Up to 5,000 words',
    cta: 'Submit your pitch',
    href: '#',
    bg: 'linear-gradient(145deg,#1a0e2e 0%,#321a50 55%,#150b28 100%)',
  },
  {
    id: 3,
    eyebrow: 'New on Aavarana',
    title: 'Independent journalism, edited by the community, for everyone',
    meta: 'Join 2,400 readers and 180 contributors',
    cta: 'Start reading',
    href: '/articles',
    bg: 'linear-gradient(145deg,#0e2e1a 0%,#1a5232 55%,#0a2418 100%)',
  },
  {
    id: 4,
    eyebrow: 'Community Spotlight',
    title: "Meet the editors shaping Aavarana's voice in 2026",
    meta: '4 editors · 12 reviewers · 180 contributors',
    cta: 'Read more',
    href: '#',
    bg: 'linear-gradient(145deg,#2e1a0e 0%,#52301a 55%,#241208 100%)',
  },
];

// ─── State → CSS styles ───────────────────────────────────────
type StateName =
  | 'hidden-left' | 'prev2' | 'prev'
  | 'active'
  | 'next' | 'next2' | 'hidden-right';

interface CardStyle {
  transform: string;
  filter: string;
  opacity: string;
  zIndex: string;
  boxShadow: string;
}

const CARD_STYLES: Record<StateName, CardStyle> = {
  'hidden-left':  { transform: 'translateX(-100%) scale(0.78)', filter: 'blur(6px)',   opacity: '0',    zIndex: '0', boxShadow: 'none' },
  prev2:          { transform: 'translateX(-72%)  scale(0.80)', filter: 'blur(5px)',   opacity: '0.45', zIndex: '1', boxShadow: 'none' },
  prev:           { transform: 'translateX(-63%)  scale(0.90)', filter: 'blur(2.5px)', opacity: '0.72', zIndex: '2', boxShadow: '-6px 0 20px rgba(0,0,0,0.3)' },
  active:         { transform: 'translateX(0)     scale(1)',    filter: 'none',        opacity: '1',    zIndex: '3', boxShadow: '0 8px 40px rgba(0,0,0,0.55)' },
  next:           { transform: 'translateX(63%)   scale(0.90)', filter: 'blur(2.5px)', opacity: '0.72', zIndex: '2', boxShadow: '6px 0 20px rgba(0,0,0,0.3)' },
  next2:          { transform: 'translateX(72%)   scale(0.80)', filter: 'blur(5px)',   opacity: '0.45', zIndex: '1', boxShadow: 'none' },
  'hidden-right': { transform: 'translateX(100%)  scale(0.78)', filter: 'blur(6px)',   opacity: '0',    zIndex: '0', boxShadow: 'none' },
};

const TRANSITION =
  'transform 0.56s cubic-bezier(0.4,0,0.2,1), filter 0.56s ease, opacity 0.44s ease, box-shadow 0.56s ease';

function getStateName(diff: number): StateName {
  if (diff === 0)  return 'active';
  if (diff === 1)  return 'next';
  if (diff === 2)  return 'next2';
  if (diff === -1) return 'prev';
  if (diff === -2) return 'prev2';
  return diff < 0 ? 'hidden-left' : 'hidden-right';
}

function applyCardStyle(el: HTMLElement, state: StateName, instant = false) {
  const s = CARD_STYLES[state];
  el.style.transition = instant ? 'none' : TRANSITION;
  el.style.transform  = s.transform;
  el.style.filter     = s.filter;
  el.style.opacity    = s.opacity;
  el.style.zIndex     = s.zIndex;
  el.style.boxShadow  = s.boxShadow;
}

// ─── Chevron icon ─────────────────────────────────────────────
function ChevronRight() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────
export default function BannerCarousel({ slides = DEFAULT_SLIDES }: { slides?: BannerSlide[] }) {
  const N = slides.length;
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dotRefs  = useRef<(HTMLButtonElement | null)[]>([]);
  const current  = useRef(0);
  const busy     = useRef(false);
  const timer    = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncDots = useCallback((active: number) => {
    dotRefs.current.forEach((el, i) => {
      if (!el) return;
      if (i === active) {
        el.style.background = 'var(--accent)';
        el.style.width = '20px';
        el.style.borderRadius = '3px';
      } else {
        el.style.background = 'rgba(255,255,255,0.28)';
        el.style.width = '6px';
        el.style.borderRadius = '50%';
      }
    });
  }, []);

  const applyAll = useCallback((active: number, instant = false) => {
    cardRefs.current.forEach((el, i) => {
      if (el) applyCardStyle(el, getStateName(i - active), instant);
    });
    syncDots(active);
  }, [syncDots]);

  const goTo = useCallback((idx: number) => {
    if (busy.current) return;
    const next = ((idx % N) + N) % N;
    const gap  = Math.abs(next - current.current);

    if (gap === 0) return;

    // Instant-jump when wrapping (avoids cross-screen animation)
    if (gap > 1) {
      applyAll(next, true);
      void cardRefs.current[0]?.offsetWidth; // force reflow
      current.current = next;
      return;
    }

    busy.current = true;

    current.current = next;
    // applyAll sets: incoming → active(z:3), outgoing → prev/next(z:2)
    // incoming is already above outgoing — no manual boost needed.
    // DO NOT call removeProperty('z-index') afterwards; that clears applyAll's z-indexes
    // and lets DOM-order stacking take over (last card = highest), breaking the effect.
    applyAll(next);

    setTimeout(() => { busy.current = false; }, 640);
  }, [N, applyAll]);

  const advance = useCallback(() => {
    goTo(current.current + 1);
  }, [goTo]);

  const resetTimer = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(advance, 4800);
  }, [advance]);

  useEffect(() => {
    // Initial state: all cards positioned instantly
    applyAll(0, true);
    void cardRefs.current[0]?.offsetWidth;
    // Strip the no-transition overrides so future changes animate
    cardRefs.current.forEach(el => { if (el) el.style.removeProperty('transition'); });
    resetTimer();
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [applyAll, resetTimer]);

  return (
    <div
      className="relative overflow-hidden"
      style={{ background: 'var(--nav-bg)', padding: '0 0 32px' }}
    >
      {/* Left fade */}
      <div
        className="absolute inset-y-0 left-0 pointer-events-none z-20"
        style={{ width: '14%', background: 'linear-gradient(to right, var(--nav-bg) 0%, transparent 100%)' }}
      />
      {/* Right fade */}
      <div
        className="absolute inset-y-0 right-0 pointer-events-none z-20"
        style={{ width: '14%', background: 'linear-gradient(to left, var(--nav-bg) 0%, transparent 100%)' }}
      />

      {/* Deck */}
      <div
        className="relative mx-auto"
        style={{ maxWidth: 860, height: 340, marginTop: 24 }}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            ref={el => { cardRefs.current[i] = el; }}
            onClick={() => {
              const el = cardRefs.current[i];
              if (!el) return;
              const state = getStateName(i - current.current);
              if (state !== 'active') { goTo(i); resetTimer(); }
            }}
            style={{
              position: 'absolute', inset: 0,
              borderRadius: 16, overflow: 'hidden',
              background: slide.bg,
              opacity: 0, // hidden until useEffect sets initial state
              cursor: 'pointer',
            }}
          >
            {/* Decorative number */}
            <div
              aria-hidden
              className="absolute select-none pointer-events-none"
              style={{
                right: -12, top: '50%', transform: 'translateY(-50%)',
                fontFamily: 'var(--font-display, Georgia, serif)',
                fontSize: 'clamp(5rem,18vw,11rem)', fontWeight: 900,
                color: 'rgba(255,255,255,0.05)', lineHeight: 1, letterSpacing: '-.04em',
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </div>

            {/* Content */}
            <div
              className="absolute bottom-0 left-0 right-0 z-10"
              style={{ padding: 'clamp(20px,4vw,32px) clamp(18px,4vw,36px)', background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }}
            >
              <p style={{ fontSize: '.67rem', fontWeight: 700, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>
                {slide.eyebrow}
              </p>
              <h2
                style={{
                  fontFamily: 'var(--font-display, Georgia, serif)',
                  fontSize: 'clamp(1.2rem,3vw,2rem)',
                  color: '#fff', lineHeight: 1.15,
                  fontWeight: 700, marginBottom: 10,
                  textWrap: 'balance' as never,
                }}
              >
                {slide.title}
              </h2>
              <p style={{ fontSize: '.74rem', color: 'rgba(255,255,255,0.50)', marginBottom: 16 }}>
                {slide.meta}
              </p>
              {slide.href && slide.href !== '#' ? (
                <Link
                  href={slide.href}
                  onClick={e => e.stopPropagation()}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 20px', background: 'var(--accent)', color: '#fff',
                    fontWeight: 700, fontSize: '.78rem', borderRadius: 6,
                    textDecoration: 'none',
                  }}
                >
                  {slide.cta} <ChevronRight />
                </Link>
              ) : (
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 20px', background: 'var(--accent)', color: '#fff',
                    fontWeight: 700, fontSize: '.78rem', borderRadius: 6,
                  }}
                >
                  {slide.cta} <ChevronRight />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3" style={{ marginTop: 16 }}>
        {/* Prev arrow */}
        <button
          aria-label="Previous"
          onClick={() => { goTo(current.current - 1); resetTimer(); }}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)', border: 'none',
            cursor: 'pointer', color: 'rgba(255,255,255,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Dots */}
        {slides.map((s, i) => (
          <button
            key={s.id}
            ref={el => { dotRefs.current[i] = el; }}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => { goTo(i); resetTimer(); }}
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'rgba(255,255,255,0.28)',
              border: 'none', cursor: 'pointer', padding: 0,
              transition: 'background 0.2s, width 0.2s, border-radius 0.2s',
            }}
          />
        ))}

        {/* Next arrow */}
        <button
          aria-label="Next"
          onClick={() => { advance(); resetTimer(); }}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)', border: 'none',
            cursor: 'pointer', color: 'rgba(255,255,255,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
