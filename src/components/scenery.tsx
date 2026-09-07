import type { ReactNode } from 'react';

/**
 * Landscape artwork, drawn rather than photographed.
 *
 * The reference design leans on large photographs of green country. A village
 * kiosk cannot depend on fetching those — connectivity is the first thing to
 * go — so the scenery here is inline SVG: layered ridgelines in the sage-to-
 * forest palette, a few hundred bytes each, identical every render, and sharp
 * at any size.
 */

export type SceneVariant = 'hills' | 'valley' | 'field' | 'ridge' | 'terrace';

let gradientSeq = 0;

/** Unique gradient ids so several scenes can share a page safely. */
function useIds(count: number) {
  const base = `sc${(gradientSeq += 1)}`;
  return Array.from({ length: count }, (_, i) => `${base}-${i}`);
}

export function Scenery({ variant = 'hills' }: { variant?: SceneVariant }) {
  const [sky, near, mid, far, haze] = useIds(5);

  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dfe9ea" />
          <stop offset="100%" stopColor="#eef2ea" />
        </linearGradient>
        <linearGradient id={far} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c4d3ba" />
          <stop offset="100%" stopColor="#a9bf9c" />
        </linearGradient>
        <linearGradient id={mid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9db38d" />
          <stop offset="100%" stopColor="#7d9a6c" />
        </linearGradient>
        <linearGradient id={near} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5c7a4b" />
          <stop offset="100%" stopColor="#3a5130" />
        </linearGradient>
        <linearGradient id={haze} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eaf0ee" stopOpacity="0.9" />
          <stop offset="34%" stopColor="#eaf0ee" stopOpacity="0" />
          <stop offset="100%" stopColor="#eaf0ee" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="400" height="300" fill={`url(#${sky})`} />

      {/* A pale band on the horizon, the way distance washes out colour. */}
      <rect width="400" height="300" fill={`url(#${haze})`} />

      {variant === 'hills' && (
        <>
          <path d="M0 74 C 60 34, 118 92, 186 62 C 250 34, 320 78, 400 44 L400 300 L0 300 Z" fill={`url(#${far})`} />
          <path d="M0 134 C 74 92, 140 152, 214 122 C 286 94, 340 140, 400 110 L400 300 L0 300 Z" fill={`url(#${mid})`} />
          <path d="M0 198 C 88 164, 158 218, 240 190 C 310 166, 352 202, 400 182 L400 300 L0 300 Z" fill={`url(#${near})`} />
        </>
      )}

      {variant === 'valley' && (
        <>
          <path d="M0 68 C 70 26, 130 88, 200 60 C 268 34, 330 74, 400 42 L400 300 L0 300 Z" fill={`url(#${far})`} />
          <path d="M0 300 L0 118 C 66 98, 122 168, 174 300 Z" fill={`url(#${mid})`} />
          <path d="M400 300 L400 104 C 330 88, 272 164, 226 300 Z" fill={`url(#${mid})`} />
          {/* The track running away between the slopes. */}
          <path d="M182 300 C 192 212, 197 164, 200 112 C 203 164, 208 212, 218 300 Z" fill="#e4e9dc" opacity="0.8" />
          <path d="M0 244 C 96 222, 300 222, 400 248 L400 300 L0 300 Z" fill={`url(#${near})`} />
        </>
      )}

      {variant === 'field' && (
        <>
          <path d="M0 80 C 84 48, 150 100, 226 72 C 296 46, 344 82, 400 60 L400 300 L0 300 Z" fill={`url(#${far})`} />
          <path d="M0 140 C 92 112, 176 156, 260 132 C 322 114, 358 140, 400 124 L400 300 L0 300 Z" fill={`url(#${mid})`} />
          <path d="M0 180 L400 164 L400 300 L0 300 Z" fill={`url(#${near})`} />
          {/* Crop rows converging toward the horizon. */}
          <g stroke="#e4e9dc" strokeWidth="1.4" opacity="0.28">
            {[-200, -120, -50, 20, 90, 170, 260, 350].map((dx) => (
              <line key={dx} x1={200 + dx * 0.24} y1="176" x2={200 + dx} y2="300" />
            ))}
          </g>
        </>
      )}

      {variant === 'ridge' && (
        <>
          <path d="M0 56 L96 12 L182 68 L268 24 L400 78 L400 300 L0 300 Z" fill={`url(#${far})`} />
          <path d="M0 128 L88 82 L190 142 L292 96 L400 150 L400 300 L0 300 Z" fill={`url(#${mid})`} />
          <path d="M0 206 C 100 180, 200 220, 300 196 C 350 184, 378 198, 400 192 L400 300 L0 300 Z" fill={`url(#${near})`} />
        </>
      )}

      {variant === 'terrace' && (
        <>
          <path d="M0 72 C 80 42, 150 92, 228 64 C 300 38, 348 74, 400 54 L400 300 L0 300 Z" fill={`url(#${far})`} />
          {/* Stepped terraces, as on a contour-farmed slope. */}
          <g fill={`url(#${mid})`}>
            <path d="M0 136 C 110 112, 250 148, 400 122 L400 154 C 250 180, 110 144, 0 168 Z" />
            <path d="M0 178 C 110 154, 250 190, 400 164 L400 198 C 250 224, 110 188, 0 212 Z" />
          </g>
          <path d="M0 224 C 110 200, 250 236, 400 210 L400 300 L0 300 Z" fill={`url(#${near})`} />
        </>
      )}
    </svg>
  );
}

/** A landscape panel with content laid over it. */
export function Scene({
  variant = 'hills',
  tall,
  children,
}: {
  variant?: SceneVariant;
  tall?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`scene ${tall ? 'scene--tall' : ''}`}>
      <div className="scene__art">
        <Scenery variant={variant} />
      </div>
      <div className="scene__veil" />
      <div className="scene__body">{children}</div>
    </section>
  );
}

/** Small landscape thumbnail for feature rows. */
export function Thumb({ variant = 'hills' }: { variant?: SceneVariant }) {
  return (
    <div className="thumb">
      <Scenery variant={variant} />
    </div>
  );
}
