import { LegalPage } from '@/components/sections/LegalPage'
import Link from 'next/link'


export const metadata = { title: 'Privacy Policy · ielts.camp' }

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="2 June 2026"
      intro="IELTS Camp ('we', 'our', or 'us') is committed to protecting your privacy and handling your personal information responsibly. This Privacy Policy explains what information we collect, how we use it, how we share it, and the rights and choices available to you when using our website, applications, and services."
      sections={[
        {
          heading: 'Information We Collect',
          body: (
            <>
              We collect information you provide directly when creating an account,
              subscribing to our services, contacting support, or using our learning
              tools. This may include your name, email address, account credentials,
              and communication preferences.
              <br />
              <br />
              We also collect learning and performance data generated through your
              use of the platform, including practice test attempts, answers, scores,
              band estimates, study progress, study history, learning analytics,
              streaks, and other educational metrics.
              <br />
              <br />
              When you use writing or speaking assessment features, we collect the
              text, audio, transcripts, and related content you submit for evaluation
              and feedback.
              <br />
              <br />
              Technical information may also be collected automatically, including
              IP address, browser type, operating system, device information,
              language preferences, referral URLs, timestamps, and diagnostic logs
              necessary to maintain and secure the service.
            </>
          ),
        },
        {
          heading: 'How We Use Your Information',
          body: (
            <>
              We use your information to:
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>Create and manage your account.</li>
                <li>Provide IELTS preparation services and educational content.</li>
                <li>
                  Generate AI-powered feedback, scoring estimates, and study
                  recommendations.
                </li>
                <li>Track learning progress and performance statistics.</li>
                <li>Process subscriptions and manage billing.</li>
                <li>
                  Communicate important account, service, and support information.
                </li>
                <li>
                  Improve platform functionality, reliability, and user experience.
                </li>
                <li>
                  Detect, prevent, and investigate fraud, abuse, security incidents,
                  and violations of our Terms of Service.
                </li>
                <li>
                  Comply with legal obligations and enforce our agreements.
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: 'AI Processing and Automated Analysis',
          body: (
            <>
              Certain features use artificial intelligence and machine learning
              technologies to analyze writing submissions, speaking recordings,
              and study performance in order to generate feedback,
              recommendations, and estimated band scores.
              <br />
              <br />
              Your submissions are processed solely for the purpose of providing
              the requested service. We do not intentionally use your personal
              submissions to train public AI models. AI-generated feedback is
              provided for educational purposes only and should not be considered
              an official IELTS assessment.
            </>
          ),
        },
        {
          heading: 'Subscription Payments and Billing',
          body: (
            <>
              Subscription payments are processed through Paddle, our authorized
              Merchant of Record. Paddle manages payment processing, tax
              collection, invoicing, refunds, and subscription administration on
              our behalf.
              <br />
              <br />
              We do not store complete payment card information on our servers.
              Payment information is collected and processed directly by Paddle
              in accordance with Paddle's privacy and security practices.
            </>
          ),
        },
        {
          heading: 'Third-Party Service Providers',
          body: (
            <>
              We use trusted third-party providers to operate our services,
              including providers for hosting, database management, analytics,
              authentication, customer support, artificial intelligence
              processing, and payment processing.
              <br />
              <br />
              These providers receive access only to the information reasonably
              necessary to perform their services and are required to protect
              your information in accordance with applicable laws and contractual
              obligations.
            </>
          ),
        },
        {
          heading: 'Data Retention',
          body: (
            <>
              We retain personal information only for as long as necessary to
              provide the services, comply with legal obligations, resolve
              disputes, enforce agreements, and maintain legitimate business
              records.
              <br />
              <br />
              Learning history, submissions, and account information may remain
              available while your account is active. Upon account deletion,
              personal information will be removed or anonymized within a
              reasonable period unless retention is required by law or necessary
              for legitimate business purposes.
            </>
          ),
        },
        {
          heading: 'Data Security',
          body: (
            <>
              We implement administrative, technical, and organizational
              safeguards designed to protect personal information against
              unauthorized access, disclosure, alteration, or destruction.
              <br />
              <br />
              While we strive to use commercially reasonable security measures,
              no internet transmission or storage system can be guaranteed to be
              completely secure. Users are responsible for maintaining the
              confidentiality of their account credentials.
            </>
          ),
        },
        {
          heading: 'International Data Transfers',
          body: (
            <>
              Our services may be operated using infrastructure and service
              providers located in multiple countries. By using IELTS Camp,
              you understand that your information may be transferred to,
              stored in, and processed in jurisdictions outside your country
              of residence where data protection laws may differ.
            </>
          ),
        },
        {
          heading: 'Your Privacy Rights',
          body: (
            <>
              Depending on your jurisdiction, you may have rights regarding your
              personal information, including the right to:
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>Access your personal data.</li>
                <li>Correct inaccurate information.</li>
                <li>Request deletion of personal information.</li>
                <li>Request data portability.</li>
                <li>Object to certain processing activities.</li>
                <li>Withdraw consent where processing is based on consent.</li>
              </ul>
              <p className="mt-4">
                Requests may be submitted through your account settings or by
                contacting us directly.
              </p>
            </>
          ),
        },
        {
          heading: 'Cookies and Similar Technologies',
          body: (
            <>
              We use cookies and similar technologies to provide core
              functionality, maintain authentication sessions, remember
              preferences, improve performance, and understand how users
              interact with our services.
              <br />
              <br />
              We do not use third-party advertising networks to track users
              across unrelated websites for behavioral advertising purposes.
            </>
          ),
        },
        {
          heading: "Children's Privacy",
          body: (
            <>
              Our services are not directed toward children under the age
              required by applicable law to provide valid consent. We do not
              knowingly collect personal information from children without
              appropriate authorization. If we become aware that such
              information has been collected improperly, we will take
              reasonable steps to remove it.
            </>
          ),
        },
        {
          heading: 'Changes to This Policy',
          body: (
            <>
              We may update this Privacy Policy periodically to reflect
              operational, legal, or regulatory changes. Updated versions
              will be posted on this page with a revised "Last Updated"
              date. Continued use of the services after changes become
              effective constitutes acceptance of the revised policy.
            </>
          ),
        },
        {
          heading: 'Contact Information',
          body: (
            <>
              If you have questions regarding this Privacy Policy or our
              privacy practices, please contact us through the support
              channels provided on the platform.
            </>
          ),
        },
        {
  heading: 'Related Policies',
  body: (
    <>
      Please review our related legal documents for additional information about
      your rights and responsibilities when using IELTS Camp.
      <ul className="list-disc pl-6 mt-3 space-y-2">
        <li>
          <Link
            href="/terms"
            className="text-blue-600 hover:underline"
          >
            Terms of Service
          </Link>
        </li>
        <li>
          <Link
            href="/termsConditions"
            className="text-blue-600 hover:underline"
          >
            Terms and Conditions
          </Link>
        </li>
        <li>
          <Link
            href="/refund"
            className="text-blue-600 hover:underline"
          >
            Refund Policy
          </Link>
        </li>
      </ul>
    </>
  ),
},
      ]}
    />
  )
}