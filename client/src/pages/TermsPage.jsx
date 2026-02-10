import { Link } from "react-router-dom";
import "./LegalPages.css";

const TermsPage = () => {
  return (
    <div className="legal-page-container">
      <div className="legal-content">
        <div className="legal-header">
          <h1>Terms of Service</h1>
          <p className="legal-subtitle">
            Welcome to DevQuest! These Terms of Service govern your use of our coding education
            platform. By creating an account or using our services, you agree to these terms.
          </p>
          <div className="last-updated">
            <span>Last updated: January 2025</span>
          </div>
        </div>

        <div className="legal-sections">
          <section className="legal-section">
            <h2>🎯 Acceptance of Terms</h2>
            <div className="section-content">
              <p>
                By accessing or using DevQuest, you agree to be bound by these Terms of Service and
                our Privacy Policy. If you disagree with any part of these terms, you may not access
                our services.
              </p>

              <h3>Who Can Use DevQuest</h3>
              <ul>
                <li>You must be at least 13 years old to create an account</li>
                <li>Users under 18 may require parental consent in certain jurisdictions</li>
                <li>You must provide accurate and complete information during registration</li>
                <li>
                  You are responsible for maintaining the security of your account credentials
                </li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>📚 Educational Services</h2>
            <div className="section-content">
              <h3>Course Access and Content</h3>
              <ul>
                <li>
                  <strong>Course Materials:</strong> Access to programming courses, tutorials,
                  exercises, and assessments
                </li>
                <li>
                  <strong>Interactive Features:</strong> Code editor, progress tracking,
                  certificates, and community features
                </li>
                <li>
                  <strong>Personalized Learning:</strong> Customized learning paths and
                  recommendations based on your progress
                </li>
                <li>
                  <strong>Lifetime Access:</strong> Once enrolled, you maintain access to course
                  materials (subject to platform availability)
                </li>
              </ul>

              <h3>Certificates and Recognition</h3>
              <ul>
                <li>Completion certificates are issued upon successfully finishing courses</li>
                <li>
                  Certificates are for educational recognition and may not represent professional
                  accreditation
                </li>
                <li>We reserve the right to revoke certificates in cases of academic dishonesty</li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>💳 Payment and Subscriptions</h2>
            <div className="section-content">
              <h3>Pricing and Billing</h3>
              <ul>
                <li>
                  <strong>Subscription Plans:</strong> Monthly and annual subscription options with
                  different access levels
                </li>
                <li>
                  <strong>Payment Processing:</strong> Payments are processed securely through
                  Stripe
                </li>
                <li>
                  <strong>Auto-Renewal:</strong> Subscriptions automatically renew unless cancelled
                </li>
                <li>
                  <strong>Price Changes:</strong> We may update pricing with 30 days advance notice
                </li>
              </ul>

              <h3>Refunds and Cancellations</h3>
              <ul>
                <li>
                  <strong>Cancellation:</strong> You can cancel your subscription at any time
                  through account settings
                </li>
                <li>
                  <strong>Refund Policy:</strong> Refunds are considered on a case-by-case basis
                  within 30 days of purchase
                </li>
                <li>
                  <strong>Access After Cancellation:</strong> You retain access to paid content
                  until the end of your billing period
                </li>
                <li>
                  <strong>Free Trial:</strong> Cancel during the trial period to avoid charges
                </li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>👤 User Responsibilities</h2>
            <div className="section-content">
              <h3>Account Security</h3>
              <ul>
                <li>Maintain the confidentiality of your login credentials</li>
                <li>Notify us immediately of any unauthorized access to your account</li>
                <li>
                  Use strong, unique passwords and enable two-factor authentication when available
                </li>
                <li>You are responsible for all activities under your account</li>
              </ul>

              <h3>Acceptable Use</h3>
              <div className="highlight-box">
                <p>✅ Use DevQuest for legitimate educational purposes</p>
                <p>✅ Respect other users and maintain a positive learning environment</p>
                <p>✅ Provide honest feedback and engage constructively with the community</p>
                <p>✅ Follow academic integrity guidelines in your learning</p>
              </div>

              <h3>Prohibited Activities</h3>
              <div className="highlight-box">
                <p>🚫 Sharing account credentials or allowing unauthorized access</p>
                <p>🚫 Attempting to bypass payment systems or access controls</p>
                <p>🚫 Uploading malicious code or attempting to hack the platform</p>
                <p>🚫 Harassment, discrimination, or abusive behavior toward other users</p>
                <p>
                  🚫 Reproducing or distributing copyrighted course materials without permission
                </p>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>📝 Intellectual Property</h2>
            <div className="section-content">
              <h3>DevQuest Content</h3>
              <ul>
                <li>
                  <strong>Ownership:</strong> All course materials, platform design, and proprietary
                  content belong to DevQuest
                </li>
                <li>
                  <strong>License:</strong> We grant you a limited, non-transferable license to
                  access and use our content for personal learning
                </li>
                <li>
                  <strong>Restrictions:</strong> You may not copy, distribute, or commercialize our
                  content without written permission
                </li>
                <li>
                  <strong>Trademarks:</strong> DevQuest name, logo, and branding are protected
                  trademarks
                </li>
              </ul>

              <h3>Your Content</h3>
              <ul>
                <li>
                  <strong>Code Submissions:</strong> You retain ownership of code you write during
                  exercises
                </li>
                <li>
                  <strong>Platform License:</strong> By submitting content, you grant us a license
                  to use it for educational and platform improvement purposes
                </li>
                <li>
                  <strong>Feedback and Contributions:</strong> Comments, reviews, and forum posts
                  may be used to improve our services
                </li>
                <li>
                  <strong>Portfolio Projects:</strong> You own your final projects and may use them
                  in your professional portfolio
                </li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>⚖️ Privacy and Data Protection</h2>
            <div className="section-content">
              <p>
                Your privacy is important to us. Our data practices are detailed in our{" "}
                <Link to="/privacy" style={{ color: "#91EAE4", textDecoration: "none" }}>
                  Privacy Policy
                </Link>
                .
              </p>

              <h3>Data Usage Summary</h3>
              <ul>
                <li>We collect information necessary to provide educational services</li>
                <li>Your learning progress is tracked to personalize your experience</li>
                <li>We use analytics to improve platform functionality and course content</li>
                <li>We never sell your personal information to third parties</li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>🛡️ Platform Availability and Limitations</h2>
            <div className="section-content">
              <h3>Service Availability</h3>
              <ul>
                <li>
                  <strong>Uptime:</strong> We strive for 99.9% uptime but cannot guarantee
                  uninterrupted service
                </li>
                <li>
                  <strong>Maintenance:</strong> Scheduled maintenance may temporarily limit access
                </li>
                <li>
                  <strong>Updates:</strong> We regularly update content and platform features
                </li>
                <li>
                  <strong>Technical Issues:</strong> We work quickly to resolve any technical
                  problems
                </li>
              </ul>

              <h3>Limitation of Liability</h3>
              <p>
                DevQuest provides educational services &quot;as is&quot; without warranties. We are
                not liable for:
              </p>
              <ul>
                <li>
                  Career outcomes or job placement (courses are educational, not job guarantees)
                </li>
                <li>Technical issues beyond our reasonable control</li>
                <li>Third-party service interruptions (payment processors, hosting providers)</li>
                <li>Loss of data due to user error or external factors</li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>🚨 Account Suspension and Termination</h2>
            <div className="section-content">
              <h3>Grounds for Suspension</h3>
              <ul>
                <li>Violation of these Terms of Service</li>
                <li>Fraudulent payment activity or chargebacks</li>
                <li>Abusive behavior toward other users or staff</li>
                <li>Attempts to compromise platform security</li>
              </ul>

              <h3>Termination Process</h3>
              <ul>
                <li>
                  <strong>Warning System:</strong> Minor violations typically receive warnings
                  before suspension
                </li>
                <li>
                  <strong>Temporary Suspension:</strong> Serious violations may result in temporary
                  account suspension
                </li>
                <li>
                  <strong>Permanent Termination:</strong> Severe or repeated violations can lead to
                  permanent account closure
                </li>
                <li>
                  <strong>Appeal Process:</strong> You may appeal account actions through our
                  support system
                </li>
              </ul>

              <h3>Effect of Termination</h3>
              <ul>
                <li>Access to courses and platform features will be revoked</li>
                <li>Certificates and progress records may be retained for verification purposes</li>
                <li>Refunds will be considered based on the circumstances of termination</li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>🌐 Third-Party Services</h2>
            <div className="section-content">
              <h3>Integrated Services</h3>
              <ul>
                <li>
                  <strong>Payment Processing:</strong> Stripe for secure payment handling
                </li>
                <li>
                  <strong>Email Communications:</strong> Third-party services for course
                  notifications
                </li>
                <li>
                  <strong>Analytics:</strong> Tools to understand platform usage and improve
                  services
                </li>
                <li>
                  <strong>Code Execution:</strong> Secure sandboxed environments for running student
                  code
                </li>
              </ul>

              <h3>External Links</h3>
              <p>
                Our platform may contain links to external resources. We are not responsible for the
                content or practices of third-party websites.
              </p>
            </div>
          </section>

          <section className="legal-section">
            <h2>📋 Dispute Resolution</h2>
            <div className="section-content">
              <h3>Communication First</h3>
              <p>
                We encourage resolving disputes through direct communication with our support team
                before pursuing formal legal action.
              </p>

              <h3>Arbitration (If Applicable)</h3>
              <p>
                For certain types of disputes, we may use binding arbitration as an alternative to
                court proceedings.
              </p>
            </div>
          </section>

          <section className="legal-section">
            <h2>🔄 Changes to Terms</h2>
            <div className="section-content">
              <h3>Modification Process</h3>
              <ul>
                <li>
                  <strong>Notification:</strong> Material changes will be communicated via email and
                  platform announcements
                </li>
                <li>
                  <strong>Effective Date:</strong> Changes take effect 30 days after notification
                </li>
                <li>
                  <strong>Continued Use:</strong> Using the platform after changes take effect
                  constitutes acceptance
                </li>
                <li>
                  <strong>Objection:</strong> If you disagree with changes, you may terminate your
                  account before they take effect
                </li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>📞 Contact Information</h2>
            <div className="section-content">
              <p>Questions about these Terms of Service? We&apos;re here to help:</p>

              <div className="contact-info">
                <div className="contact-method">
                  <h3>📧 Legal Inquiries</h3>
                  <p>legal@devquest.com</p>
                  <p>For terms-related questions and legal matters</p>
                </div>

                <div className="contact-method">
                  <h3>🎟️ General Support</h3>
                  <p>support@devquest.com</p>
                  <p>For account help and platform questions</p>
                </div>

                <div className="contact-method">
                  <h3>📍 Business Address</h3>
                  <p>
                    DevQuest Legal Department
                    <br />
                    Remote Office / Global Team
                    <br />
                  </p>
                </div>
              </div>

              <div className="response-time">
                <p>
                  <strong>Response Time:</strong> We typically respond to legal inquiries within 5-7
                  business days.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
