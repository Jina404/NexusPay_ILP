import { LandingNav } from '@/components/landing/landing-nav'
import { LandingHero } from '@/components/landing/landing-hero'
import { LandingFeatureBar } from '@/components/landing/landing-feature-bar'
import { LandingProblem } from '@/components/landing/landing-problem'
import { LandingFeaturesGrid } from '@/components/landing/landing-features-grid'
import { LandingHowItWorks } from '@/components/landing/landing-how-it-works'
import { LandingWhyIlp } from '@/components/landing/landing-why-ilp'
import { LandingMarket } from '@/components/landing/landing-market'
import { LandingBusinessModel } from '@/components/landing/landing-business-model'
import { LandingWhyWin } from '@/components/landing/landing-why-win'
import { LandingDeveloperCta } from '@/components/landing/landing-developer-cta'
import { LandingFooter } from '@/components/landing/landing-footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingFeatureBar />
        <LandingProblem />
        <LandingFeaturesGrid />
        <LandingHowItWorks />
        <LandingWhyIlp />
        <LandingMarket />
        <LandingBusinessModel />
        <LandingWhyWin />
        <LandingDeveloperCta />
      </main>
      <LandingFooter />
    </div>
  )
}
