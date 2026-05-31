import { LegalPage } from '@/components/sections/LegalPage'

export const metadata = { title: 'Privacy Policy · ielts.camp' }

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="29 May 2026"
      intro="ielts.camp respects your privacy. This policy explains what data we collect, why we collect it, and the choices you have. We keep it short and plain — no dark patterns."
      sections={[
        {
          heading: 'Information we collect',
          body: (
            <>
              We collect the account details you give us (name, email), your practice activity
              (test attempts, answers, band scores, study time), and the writing and speaking
              submissions you send for AI feedback. We also collect basic technical data such as
              browser type and device, used only to keep the service running.
            </>
          ),
        },
        {
          heading: 'How we use your data',
          body: (
            <>
              Your data powers the product: tracking your band progress, computing streaks and
              study statistics, generating personalised study plans, and returning AI feedback on
              your essays and speaking. We never sell your personal data to third parties.
            </>
          ),
        },
        {
          heading: 'AI processing',
          body: (
            <>
              Writing and speaking submissions are sent to our AI provider solely to generate your
              feedback and band estimate. They are not used to train third-party models, and you can
              delete any submission from your account at any time.
            </>
          ),
        },
        {
          heading: 'Data storage & security',
          body: (
            <>
              Data is stored on managed infrastructure (Supabase) with encryption in transit and at
              rest. Access is restricted to systems that need it to operate the service. Payment
              details are handled entirely by Stripe — we never store your card number.
            </>
          ),
        },
        {
          heading: 'Your rights',
          body: (
            <>
              You can access, export, or delete your data at any time from Settings, or by emailing
              us. Deleting your account removes your personal data and submissions from our active
              systems.
            </>
          ),
        },
        {
          heading: 'Cookies',
          body: (
            <>
              We use only the cookies required to keep you signed in and remember your theme and
              language preferences. We do not run third-party advertising trackers.
            </>
          ),
        },
      ]}
    />
  )
}
