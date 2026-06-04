import { LegalPage } from '@/components/sections/LegalPage'

export const metadata = { title: 'Refund Policy · ielts.camp' }

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      updated="5 June 2026"
      intro="This Refund Policy explains when refunds may be available for subscriptions purchased through IELTS Camp. By purchasing a subscription, you agree to this policy."
      sections={[
        {
          heading: 'General Policy',
          body: (
            <>
              IELTS Camp provides immediate access to digital educational
              services, including AI-powered feedback, practice tests, study
              tools, and premium learning features. Because access is provided
              immediately upon purchase, subscription fees are generally
              non-refundable except where required by applicable law or as
              expressly stated in this policy.
            </>
          ),
        },
        {
          heading: 'Subscription Billing',
          body: (
            <>
              Subscription plans may be offered on a monthly, quarterly, or
              annual basis. By purchasing a subscription, you authorize the
              recurring charges associated with your selected plan.
              <br />
              <br />
              Subscription fees are charged in advance for each billing period
              and remain active until canceled.
            </>
          ),
        },
        {
          heading: 'Cancellation',
          body: (
            <>
              You may cancel your subscription at any time through the customer
              billing portal provided by Paddle.
              <br />
              <br />
              Cancellation prevents future renewals but does not automatically
              entitle you to a refund for the current billing period.
              <br />
              <br />
              After cancellation, you will continue to have access to premium
              features until the end of your current paid subscription period.
            </>
          ),
        },
        {
          heading: 'Account Deletion',
          body: (
            <>
              Deleting your account does not automatically cancel your subscription
              and does not constitute a refund request.
              <br />
              <br />
              To prevent future charges, you must cancel your subscription through your
              account settings or the payment provider&apos;s subscription management page.
            </>
          ),
        },
        {
          heading: 'Refund Eligibility',
          body: (
            <>
              Refund requests may be considered in circumstances including:
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>Duplicate or accidental charges.</li>
                <li>
                  Billing errors caused by technical issues within our systems.
                </li>
                <li>
                  Unauthorized purchases where evidence reasonably supports the
                  claim.
                </li>
                <li>
                  Cases where applicable consumer protection laws require a
                  refund.
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: 'Non-Refundable Situations',
          body: (
            <>
              Refunds will generally not be issued for:
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>Failure to use the subscription after purchase.</li>
                <li>
                  Dissatisfaction with examination results or learning outcomes.
                </li>
                <li>
                  Changes in personal circumstances or study plans.
                </li>
                <li>
                  Forgetting to cancel before a subscription renewal date.
                </li>
                <li>
                  Temporary service interruptions caused by factors outside our
                  reasonable control.
                </li>
                <li>
                  AI-generated feedback or score estimates that differ from
                  expectations.
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: 'Additional Features and Services',
          body: (
            <>
              Additional features, upgrades, or one-time purchases are subject to the
              same refund conditions as the main transaction unless local law requires
              otherwise.
            </>
          ),
        },
        {
          heading: 'Free Trial Users',
          body: (
            <>
              Where a free trial is offered, users are encouraged to evaluate
              the platform during the trial period before purchasing a
              subscription. No refunds will be provided solely because a user
              decides the service is not suitable after substantial use of paid
              features.
            </>
          ),
        },
        {
          heading: 'How to Request a Refund',
          body: (
            <>
              Refund requests should be submitted within fourteen (14) days of
              the charge date unless a longer period is required by applicable
              law.
              <br />
              <br />
              When submitting a request, please include:
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>The email address associated with your account.</li>
                <li>The date of purchase.</li>
                <li>The reason for the refund request.</li>
                <li>
                  Any relevant documentation supporting the request.
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: 'Processing of Refunds',
          body: (
            <>
              Approved refunds will generally be issued to the original payment
              method used for the purchase.
              <br />
              <br />
              Processing times may vary depending on your payment provider,
              financial institution, and geographic location.
            </>
          ),
        },
        {
          heading: 'Paddle Payments',
          body: (
            <>
              Payments are processed by Paddle, our Merchant of Record. Certain
              refund requests may be handled directly through Paddle&apos;s billing
              systems and procedures.
              <br />
              <br />
              Where applicable, Paddle&apos;s payment and refund requirements may
              apply in addition to this policy.
            </>
          ),
        },
        {
          heading: 'Chargebacks and Payment Disputes',
          body: (
            <>
              We encourage users to contact us before initiating a chargeback or
              payment dispute.
              <br />
              <br />
              If a chargeback is initiated, access to IELTS.CAMP may be temporarily
              suspended while the matter is reviewed. This does not affect your legal
              right to dispute unauthorized transactions.
            </>
          ),
        },
        {
          heading: 'Feedback',
          body: (
            <>
              When requesting a refund, we would appreciate learning the reason for your
              decision. Your feedback helps us improve IELTS.CAMP for all learners.
              <br />
              <br />
              Providing feedback is entirely voluntary and has no effect on the processing
              of your refund request.
            </>
          ),
        },
        {
          heading: 'Changes to This Policy',
          body: (
            <>
              We may update this Policy from time to time.
              <br />
              <br />
              The version of the Policy in effect on the date of your purchase will govern
              that transaction. We recommend saving a copy of this Policy for your records.
            </>
          ),
        },
        {
          heading: 'Contact Information',
          body: (
            <>
              For all refund-related inquiries, please contact us:
              <br />
              <br />
              IELTS.CAMP
              <br />
              Email:{' '}
              <a href="mailto:support@ielts.camp" style={{ color: 'var(--accent)', textDecoration: 'none' }}>support@ielts.camp</a>
              <br />
              Website:{' '}
              <a href="https://ielts.camp" style={{ color: 'var(--accent)', textDecoration: 'none' }}>https://ielts.camp</a>
            </>
          ),
        },
      ]}
    />
  )
}

