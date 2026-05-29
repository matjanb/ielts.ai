import { FloatingNav } from '@/components/layout/FloatingNav'
import { LiveActivityToaster } from '@/components/layout/LiveActivityToaster'
import { Hero } from '@/components/sections/Hero'
import { UniversitiesMarquee } from '@/components/sections/UniversitiesMarquee'
import { StatsStrip } from '@/components/sections/StatsStrip'
import { DashboardShowcase } from '@/components/sections/DashboardShowcase'
import { Features } from '@/components/sections/Features'
import { HowItWorks } from '@/components/sections/HowItWorks'
import { Pricing } from '@/components/sections/Pricing'
import { ForSchools } from '@/components/sections/ForSchools'
import { Testimonials } from '@/components/sections/Testimonials'
import { FinalCTA } from '@/components/sections/FinalCTA'
import { Footer } from '@/components/sections/Footer'

export default function LandingPage() {
  return (
    <main>
      <FloatingNav />
      <Hero />
      <UniversitiesMarquee />
      <StatsStrip />
      <DashboardShowcase />
      <Features />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <ForSchools />
      <FinalCTA />
      <Footer />
      <LiveActivityToaster />
    </main>
  )
}
