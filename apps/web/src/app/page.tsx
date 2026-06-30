import { LandingNav } from '@/components/landing/landing-nav'
import { LandingHero } from '@/components/landing/landing-hero'
import { LandingFeatureBar } from '@/components/landing/landing-feature-bar'
import { LandingFeaturesGrid } from '@/components/landing/landing-features-grid'
import { LandingDeveloperCta } from '@/components/landing/landing-developer-cta'
import { LandingFooter } from '@/components/landing/landing-footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingFeatureBar />
        <LandingFeaturesGrid />
        <LandingDeveloperCta />
      </main>
      <LandingFooter />
    </div>
  )
}
