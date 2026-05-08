import { FloatingNav } from '@/components/layout/FloatingNav'
import { Hero } from '@/components/sections/Hero'
import { Features } from '@/components/sections/Features'
import { HowItWorks } from '@/components/sections/HowItWorks'
import { DashboardPreview } from '@/components/sections/DashboardPreview'
import { Pricing } from '@/components/sections/Pricing'
import { FAQ } from '@/components/sections/FAQ'
import { Footer } from '@/components/sections/Footer'

export default function LandingPage() {
  return (
    <main>
      <FloatingNav />
      <Hero />
      <Features />
      <HowItWorks />
      <DashboardPreview />
      <Pricing />
      <FAQ />
      <Footer />
    </main>
  )
}
