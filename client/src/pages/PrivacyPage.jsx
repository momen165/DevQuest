import "./LegalPages.css";

const PrivacyPage = () => {
  return (
    <div className="legal-page-container">
      <div className="legal-content">
        <div className="legal-header">
          <h1>Privacy Policy</h1>
          <p className="legal-subtitle">
            Your privacy is important to us. This Privacy Policy explains how DevQuest collects,
            uses, and protects your information when you use our coding education platform.
          </p>
          <div className="last-updated">
            <span>Last updated: January 2025</span>
          </div>
        </div>

        <div className="legal-sections">
          <section className="legal-section">
            <h2>🔒 Information We Collect</h2>
            <div className="section-content">
              <h3>Personal Information</h3>
              <ul>
                <li>
                  <strong>Account Information:</strong> Name, email address, country, and profile
                  picture
                </li>
                <li>
                  <strong>Educational Data:</strong> Course progress, quiz scores, coding
                  submissions, and learning achievements
                </li>
                <li>
                  <strong>Payment Information:</strong> Billing details processed securely through
                  Stripe (we do not store payment card details)
                </li>
                <li>
                  <strong>Communication Data:</strong> Messages, feedback, and support requests
                </li>
              </ul>

              <h3>Automatically Collected Information</h3>
              <ul>
                <li>
                  <strong>Usage Analytics:</strong> Pages visited, time spent, feature usage, and
                  learning patterns
                </li>
                <li>
                  <strong>Technical Data:</strong> IP address, browser type, device information, and
                  operating system
                </li>
                <li>
                  <strong>Performance Data:</strong> Site performance metrics and error logs for
                  service improvement
                </li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>🎯 How We Use Your Information</h2>
            <div className="section-content">
              <h3>Educational Services</h3>
              <ul>
                <li>Provide personalized learning experiences and track your coding progress</li>
                <li>Generate certificates and badges for completed courses and achievements</li>
                <li>Recommend relevant courses and learning paths based on your interests</li>
                <li>Facilitate peer interactions and community features</li>
              </ul>

              <h3>Platform Operations</h3>
              <ul>
                <li>Process payments and manage subscriptions securely</li>
                <li>
                  Send important updates about courses, platform changes, and account activity
                </li>
                <li>Provide technical support and respond to your inquiries</li>
                <li>Improve our services through analytics and user feedback</li>
              </ul>

              <h3>Legal and Security</h3>
              <ul>
                <li>Comply with legal obligations and enforce our Terms of Service</li>
                <li>Detect and prevent fraud, spam, and abuse</li>
                <li>Protect the security and integrity of our platform</li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>🤝 Information Sharing</h2>
            <div className="section-content">
              <p>We respect your privacy and limit information sharing to these specific cases:</p>

              <h3>Service Providers</h3>
              <ul>
                <li>
                  <strong>Payment Processing:</strong> Stripe for secure payment handling
                </li>
                <li>
                  <strong>Email Services:</strong> Trusted providers for course notifications and
                  updates
                </li>
                <li>
                  <strong>Analytics:</strong> Aggregated, anonymized data for platform improvement
                </li>
                <li>
                  <strong>Cloud Storage:</strong> AWS for secure data storage and backup
                </li>
              </ul>

              <h3>Legal Requirements</h3>
              <p>
                We may disclose information when required by law, to protect our rights, or to
                ensure user safety.
              </p>

              <h3>What We Don&apos;t Do</h3>
              <div className="highlight-box">
                <p>🚫 We never sell your personal information to third parties</p>
                <p>🚫 We don&apos;t share your coding submissions without permission</p>
                <p>🚫 We don&apos;t use your data for advertising to third parties</p>
              </div>
            </div>
          </section>

          <section className="legal-section">
            <h2>🛡️ Data Security</h2>
            <div className="section-content">
              <h3>Technical Safeguards</h3>
              <ul>
                <li>
                  <strong>Encryption:</strong> All data is encrypted in transit (HTTPS/TLS) and at
                  rest
                </li>
                <li>
                  <strong>Access Controls:</strong> Strict authentication and authorization systems
                </li>
                <li>
                  <strong>Regular Audits:</strong> Ongoing security assessments and vulnerability
                  testing
                </li>
                <li>
                  <strong>Secure Infrastructure:</strong> Industry-standard cloud security with AWS
                </li>
              </ul>

              <h3>Organizational Measures</h3>
              <ul>
                <li>Limited access to personal data on a need-to-know basis</li>
                <li>Regular security training for our development team</li>
                <li>Incident response procedures for potential data breaches</li>
                <li>Regular backup and disaster recovery protocols</li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>⚙️ Your Privacy Rights</h2>
            <div className="section-content">
              <h3>Account Management</h3>
              <ul>
                <li>
                  <strong>Access:</strong> View and download your personal data through account
                  settings
                </li>
                <li>
                  <strong>Update:</strong> Modify your profile information, preferences, and contact
                  details
                </li>
                <li>
                  <strong>Delete:</strong> Request account deletion (some data may be retained for
                  legal compliance)
                </li>
                <li>
                  <strong>Export:</strong> Download your learning progress and coding submissions
                </li>
              </ul>

              <h3>Communication Preferences</h3>
              <ul>
                <li>
                  Unsubscribe from marketing emails while keeping essential course notifications
                </li>
                <li>Adjust notification frequency and types in your account settings</li>
                <li>
                  Opt out of non-essential analytics (core platform analytics remain for service
                  functionality)
                </li>
              </ul>

              <h3>Data Portability</h3>
              <p>
                You can export your learning data in standard formats to transfer to other platforms
                or for personal records.
              </p>
            </div>
          </section>

          <section className="legal-section">
            <h2>🍪 Cookies and Tracking</h2>
            <div className="section-content">
              <h3>Essential Cookies</h3>
              <ul>
                <li>
                  <strong>Authentication:</strong> Keep you logged in securely
                </li>
                <li>
                  <strong>Preferences:</strong> Remember your settings and language choices
                </li>
                <li>
                  <strong>Security:</strong> Prevent fraud and protect against attacks
                </li>
              </ul>

              <h3>Analytics Cookies</h3>
              <ul>
                <li>
                  <strong>Usage Analytics:</strong> Understand how you use our platform to improve
                  features
                </li>
                <li>
                  <strong>Performance Monitoring:</strong> Track site speed and identify technical
                  issues
                </li>
                <li>
                  <strong>A/B Testing:</strong> Test new features to enhance user experience
                </li>
              </ul>

              <h3>Cookie Management</h3>
              <p>
                You can control cookies through your browser settings, but disabling essential
                cookies may affect platform functionality.
              </p>
            </div>
          </section>

          <section className="legal-section">
            <h2>👶 Children&apos;s Privacy</h2>
            <div className="section-content">
              <p>
                DevQuest is designed for users aged 13 and older. We do not knowingly collect
                personal information from children under 13.
              </p>

              <h3>For Users Under 18</h3>
              <ul>
                <li>Parental consent may be required in certain jurisdictions</li>
                <li>Limited data collection focused on educational purposes</li>
                <li>Enhanced privacy protections and restricted data sharing</li>
                <li>
                  Parents can contact us to review, modify, or delete their child&apos;s information
                </li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>🌍 International Data Transfers</h2>
            <div className="section-content">
              <p>
                DevQuest operates globally and may transfer data across borders to provide our
                services effectively.
              </p>

              <h3>Safeguards</h3>
              <ul>
                <li>
                  All international transfers use appropriate legal mechanisms (Standard Contractual
                  Clauses)
                </li>
                <li>Data is processed in jurisdictions with adequate privacy protections</li>
                <li>We ensure the same level of protection regardless of data location</li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>📝 Data Retention</h2>
            <div className="section-content">
              <h3>Active Accounts</h3>
              <ul>
                <li>
                  <strong>Profile Data:</strong> Retained while your account is active
                </li>
                <li>
                  <strong>Learning Progress:</strong> Preserved to maintain your educational journey
                </li>
                <li>
                  <strong>Communications:</strong> Kept for support and service improvement purposes
                </li>
              </ul>

              <h3>Inactive Accounts</h3>
              <ul>
                <li>Accounts inactive for 3+ years may be archived with limited data retention</li>
                <li>Essential data (for legal compliance) may be retained longer</li>
                <li>You can request earlier deletion by contacting support</li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>🔄 Policy Updates</h2>
            <div className="section-content">
              <p>
                We may update this Privacy Policy to reflect changes in our practices or legal
                requirements.
              </p>

              <h3>Notification Process</h3>
              <ul>
                <li>Email notification for significant changes affecting your rights</li>
                <li>In-platform announcements for minor updates and clarifications</li>
                <li>30-day notice period for major policy changes</li>
                <li>Continued use of the platform constitutes acceptance of updated terms</li>
              </ul>
            </div>
          </section>

          <section className="legal-section">
            <h2>📞 Contact Us</h2>
            <div className="section-content">
              <p>
                If you have questions about this Privacy Policy or want to exercise your privacy
                rights:
              </p>

              <div className="contact-info">
                <div className="contact-method">
                  <h3>📧 Email Support</h3>
                  <p>privacy@devquest.com</p>
                  <p>For privacy-specific inquiries and data requests</p>
                </div>

                <div className="contact-method">
                  <h3>🎟️ Support Center</h3>
                  <p>Use our in-platform support system for account-related questions</p>
                </div>

                <div className="contact-method">
                  <h3>📍 Legal Address</h3>
                  <p>
                    DevQuest Privacy Team
                    <br />
                    For official correspondence, please contact us via email or through our support
                    center.
                  </p>
                </div>
              </div>

              <div className="response-time">
                <p>
                  <strong>Response Time:</strong> We aim to respond to privacy requests within 30
                  days.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
