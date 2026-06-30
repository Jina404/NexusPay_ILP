'use client'

import dynamic from 'next/dynamic'

export const LandingHeroGlobe = dynamic(
  () => import('@/components/landing/landing-hero-globe').then((m) => m.LandingHeroGlobe),
  {
    ssr: false,
    loading: () => (
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(85vw,340px)] sm:inset-y-0 sm:top-auto sm:right-0 sm:left-[38%] z-0 flex items-center justify-center sm:justify-end"
        aria-hidden
      >
        <div className="h-48 w-48 sm:h-72 sm:w-72 rounded-full bg-blue-900/25 blur-3xl" />
      </div>
    )
  }
)
