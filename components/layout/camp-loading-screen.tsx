/**
 * components/layout/camp-loading-screen.tsx
 *
 * Fluid, nature-inspired full-page loading screen.
 * Shown during auth verification and initial page loads.
 *
 * All animations are defined in globals.css as @keyframes
 * so this can remain a Server Component (no styled-jsx).
 *
 * Design tokens from DESIGN.md:
 *   - camp-cream (#faf6ee) canvas
 *   - camp-forest (#0f3d2e) primary
 *   - camp-moss (#4f7a5c) secondary
 *   - camp-ember (#d26a39) accent
 *   - camp-sand (#f4e8c1) soft surface
 *   - camp-sky (#d9edf6) info tint
 *   - DM Serif Display for headings
 *   - Inter for body
 */

export function CampLoadingScreen() {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-camp-cream">
      {/* ── Animated background layers ─────────────────────────── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="loading-orb loading-orb-1" />
        <div className="loading-orb loading-orb-2" />
        <div className="loading-orb loading-orb-3" />
        <div className="loading-orb loading-orb-4" />
      </div>

      {/* ── Wave layers at the bottom ─────────────────────────── */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0" aria-hidden="true">
        <svg
          className="loading-wave w-full"
          viewBox="0 0 1440 220"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            className="loading-wave-path-1"
            d="M0,120 C240,180 480,60 720,120 C960,180 1200,60 1440,120 L1440,220 L0,220 Z"
            fill="rgba(15,61,46,0.06)"
          />
          <path
            className="loading-wave-path-2"
            d="M0,140 C240,80 480,200 720,140 C960,80 1200,200 1440,140 L1440,220 L0,220 Z"
            fill="rgba(15,61,46,0.04)"
          />
          <path
            className="loading-wave-path-3"
            d="M0,160 C360,200 720,120 1080,160 C1260,180 1380,150 1440,160 L1440,220 L0,220 Z"
            fill="rgba(79,122,92,0.05)"
          />
        </svg>
      </div>

      {/* ── Centered content ──────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center">
        {/* App icon — mountain + sun silhouette */}
        <div className="loading-logo-entrance mb-6">
          <svg
            width="72"
            height="72"
            viewBox="0 0 72 72"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-sm"
          >
            <circle cx="50" cy="20" r="8" className="loading-sun" fill="#d26a39" opacity="0.85" />
            <path d="M8 58 L30 18 L52 58 Z" fill="#4f7a5c" opacity="0.5" />
            <path d="M20 58 L44 22 L68 58 Z" fill="#0f3d2e" opacity="0.85" />
            <path d="M38 30 L44 22 L50 30 Z" fill="#faf6ee" opacity="0.9" />
          </svg>
        </div>

        {/* App name */}
        <h1 className="loading-title-entrance font-serif text-3xl tracking-tight text-camp-forest sm:text-4xl">
          COCM Camp
        </h1>

        {/* Subtitle */}
        <p className="loading-subtitle-entrance mt-2 text-sm font-medium text-camp-moss/70">
          Preparing your workspace…
        </p>

        {/* Flowing loading indicator — 3 morphing dots */}
        <div className="mt-8 flex items-center gap-2">
          <span className="loading-dot loading-dot-1" />
          <span className="loading-dot loading-dot-2" />
          <span className="loading-dot loading-dot-3" />
        </div>
      </div>
    </div>
  );
}
