import React, { useState, useEffect } from "react";
import axios from "axios";
import "./PricingPage.css";
import SEOHead from "shared/seo/SEOHead";
import { useAuth } from "app/AuthContext";
import { loadStripe } from "@stripe/stripe-js";
import { useNavigate } from "react-router-dom";
import { 
  HiOutlineBookOpen, 
  HiOutlineChartBar, 
  HiOutlineCode, 
  HiOutlineStar,
  HiOutlineLightningBolt,
  HiOutlineDeviceMobile 
} from "react-icons/hi";

// Initialize Stripe - only if key is available
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

const api_url = import.meta.env.VITE_API_URL;

// Feature list for the pricing card
const features = [
  { icon: HiOutlineBookOpen, title: "Unlimited Courses", description: "Access our entire library of coding courses" },
  { icon: HiOutlineChartBar, title: "Progress Tracking", description: "Keep your streak and monitor your growth" },
  { icon: HiOutlineCode, title: "Interactive Exercises", description: "Practice with hands-on coding challenges" },
  { icon: HiOutlineStar, title: "Achievement Badges", description: "Earn rewards as you master new skills" },
  { icon: HiOutlineLightningBolt, title: "Priority Support", description: "Get help when you need it most" },
  { icon: HiOutlineDeviceMobile, title: "Learn Anywhere", description: "Access on desktop, tablet, or mobile" },
];

const PricingPage = () => {
  const [isMonthly, setIsMonthly] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const { user } = useAuth();
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setCheckingSubscription(false);
        return;
      }

      try {
        setCheckingSubscription(true);

        const response = await axios.get(`${api_url}/check`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });
        setHasActiveSubscription(response.data.hasActiveSubscription);
      } catch (error) {
        console.error("Error checking subscription:", error);
        setHasActiveSubscription(false);
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkSubscription();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setHasActiveSubscription(false);
      setCheckingSubscription(false);
    }
  }, [user]);

  const handleChoosePlan = async () => {
    if (!user) {
      navigate("/LoginPage", {
        state: {
          from: "/pricing",
          message: "Please log in to purchase a subscription",
        },
      });
      return;
    }

    if (!user.token) {
      setErrorMessage("Authentication token is missing. Please log in again.");
      return;
    }

    setLoading(true);
    try {
      const stripe = await stripePromise;
      if (!stripe) {
        setErrorMessage("Payment processor not configured. Please contact support.");
        setLoading(false);
        return;
      }

      const { data } = await axios.post(
        `${api_url}/create-checkout-session`,
        {
          priceId: isMonthly
            ? "price_1QV9vuHxgK7P1VPXGB14mjGT"
            : "price_1QVBWXHxgK7P1VPX5pSXWJbG",
        },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      );

      if (!data || !data.id) {
        setErrorMessage("Invalid response from payment processor.");
        return;
      }

      const { error } = await stripe.redirectToCheckout({ sessionId: data.id });
      if (error) {
        console.error("Stripe checkout error:", error);
        setErrorMessage("Failed to redirect to checkout.");
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      setErrorMessage("Failed to create checkout session.");
    } finally {
      setLoading(false);
    }
  };

  const openPopup = () => {
    if (!user) {
      navigate("/LoginPage", {
        state: {
          from: "/pricing",
          message: "Please log in to purchase a subscription",
        },
      });
      return;
    }
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
  };

  // Structured data for pricing page
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "DevQuest Premium Subscription",
    "description": "Unlock unlimited access to all programming courses and premium features",
    "brand": {
      "@type": "Brand",
      "name": "DevQuest"
    },
    "offers": [
      {
        "@type": "Offer",
        "priceSpecification": {
          "@type": "PriceSpecification",
          "price": "9.99",
          "priceCurrency": "USD",
          "billingDuration": "P1M"
        },
        "availability": "https://schema.org/InStock"
      },
      {
        "@type": "Offer", 
        "priceSpecification": {
          "@type": "PriceSpecification",
          "price": "99.99",
          "priceCurrency": "USD",
          "billingDuration": "P1Y"
        },
        "availability": "https://schema.org/InStock"
      }
    ]
  };

  return (
    <div className="pricing-page">
      <SEOHead
        title="Pricing Plans - Choose Your DevQuest Subscription | DevQuest"
        description="Choose the perfect DevQuest subscription plan for you. Get unlimited access to all programming courses, premium features, and personalized learning paths. Monthly and yearly plans available with flexible pricing."
        keywords="DevQuest pricing, programming course subscription, coding bootcamp cost, monthly coding plan, yearly programming access, premium coding education, affordable programming courses"
        canonical="/pricing"
        structuredData={structuredData}
      />
      
      {/* Decorative background elements */}
      <div className="pricing-bg-decoration">
        <div className="pricing-orb pricing-orb--1"></div>
        <div className="pricing-orb pricing-orb--2"></div>
        <div className="pricing-orb pricing-orb--3"></div>
        <div className="pricing-grid-pattern"></div>
      </div>

      <main className="pricing-content">
        <header className="pricing-hero">
          <span className="pricing-badge">Simple Pricing</span>
          <h1 className="pricing-title">
            Invest in Your <span className="pricing-title-gradient">Future</span>
          </h1>
          <p className="pricing-subtitle">
            One plan, unlimited possibilities. Start your coding journey today.
          </p>
        </header>

        {checkingSubscription ? (
          <div className="pricing-loading">
            <div className="pricing-loading-spinner">
              <div className="pricing-loading-ring"></div>
              <div className="pricing-loading-ring"></div>
              <div className="pricing-loading-ring"></div>
            </div>
            <p>Checking subscription status...</p>
          </div>
        ) : hasActiveSubscription ? (
          <div className="pricing-active-subscription">
            <div className="pricing-active-icon">✓</div>
            <h2>You&apos;re Already a Premium Member!</h2>
            <p>Enjoy unlimited access to all courses and features.</p>
            <button 
              className="pricing-manage-btn"
              onClick={() => navigate('/account')}
            >
              Manage Subscription
            </button>
          </div>
        ) : (
          <div className="pricing-main">
            {/* Billing Toggle */}
            <div className="pricing-toggle-wrapper">
              <span className={`pricing-toggle-label ${isMonthly ? 'active' : ''}`}>Monthly</span>
              <button 
                className="pricing-toggle-switch"
                onClick={() => setIsMonthly(!isMonthly)}
                aria-label="Toggle billing period"
              >
                <span className={`pricing-toggle-slider ${!isMonthly ? 'yearly' : ''}`}></span>
              </button>
              <span className={`pricing-toggle-label ${!isMonthly ? 'active' : ''}`}>
                Yearly
                <span className="pricing-save-tag">Save 17%</span>
              </span>
            </div>

            {/* Main Pricing Card */}
            <div className="pricing-card">
              <div className="pricing-card-glow"></div>
              
              <div className="pricing-card-header">
                <div className="pricing-plan-badge">Most Popular</div>
                <h2 className="pricing-plan-name">DevQuest Premium</h2>
                <p className="pricing-plan-desc">Everything you need to master coding</p>
              </div>

              <div className="pricing-price-section">
                <div className="pricing-price-container">
                  <span className="pricing-currency">$</span>
                  <span className="pricing-amount">{isMonthly ? '10' : '100'}</span>
                  <div className="pricing-period-info">
                    <span className="pricing-period">/{isMonthly ? 'month' : 'year'}</span>
                    <span className="pricing-billing-note">
                      {isMonthly ? 'Billed monthly' : 'Billed annually'}
                    </span>
                  </div>
                </div>
                {!isMonthly && (
                  <div className="pricing-yearly-savings">
                    <span className="pricing-original-price">$120/year</span>
                    <span className="pricing-savings-amount">You save $20!</span>
                  </div>
                )}
              </div>

              <button 
                className="pricing-cta-button" 
                onClick={openPopup}
              >
                <span>Get Started Now</span>
                <svg className="pricing-cta-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <div className="pricing-guarantee">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Cancel anytime, no questions asked</span>
              </div>
            </div>

            {/* Features Grid */}
            <div className="pricing-features-section">
              <h3 className="pricing-features-title">Everything included in Premium</h3>
              <div className="pricing-features-grid">
                {features.map((feature, index) => (
                  <div className="pricing-feature-card" key={index}>
                    <feature.icon className="pricing-feature-icon" />
                    <h4 className="pricing-feature-title">{feature.title}</h4>
                    <p className="pricing-feature-desc">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="pricing-trust-section">
              <div className="pricing-trust-item">
                <span className="pricing-trust-number">10,000+</span>
                <span className="pricing-trust-label">Happy Learners</span>
              </div>
              <div className="pricing-trust-divider"></div>
              <div className="pricing-trust-item">
                <span className="pricing-trust-number">50+</span>
                <span className="pricing-trust-label">Expert Courses</span>
              </div>
              <div className="pricing-trust-divider"></div>
              <div className="pricing-trust-item">
                <span className="pricing-trust-number">4.9★</span>
                <span className="pricing-trust-label">Average Rating</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {showPopup && (
        <div className="pricing-modal-overlay" onClick={closePopup}>
          <div className="pricing-modal" onClick={(e) => e.stopPropagation()}>
            <button className="pricing-modal-close" onClick={closePopup}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            <div className="pricing-modal-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            <h2 className="pricing-modal-title">Complete Your Purchase</h2>
            
            <div className="pricing-modal-plan">
              <div className="pricing-modal-plan-info">
                <span className="pricing-modal-plan-name">DevQuest Premium</span>
                <span className="pricing-modal-plan-period">{isMonthly ? 'Monthly' : 'Yearly'} Plan</span>
              </div>
              <div className="pricing-modal-plan-price">
                ${isMonthly ? '10' : '100'}
                <span>/{isMonthly ? 'mo' : 'yr'}</span>
              </div>
            </div>
            
            <div className="pricing-modal-actions">
              <button
                className="pricing-modal-confirm"
                onClick={handleChoosePlan}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="pricing-btn-spinner"></span>
                    Processing...
                  </>
                ) : (
                  'Proceed to Checkout'
                )}
              </button>
              <button className="pricing-modal-cancel" onClick={closePopup}>
                Cancel
              </button>
            </div>
            
            {errorMessage && (
              <div className="pricing-modal-error">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {errorMessage}
              </div>
            )}
            
            <p className="pricing-modal-secure">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15V17M6 21H18C19.1046 21 20 20.1046 20 19V13C20 11.8954 19.1046 11 18 11H6C4.89543 11 4 11.8954 4 13V19C4 20.1046 4.89543 21 6 21ZM16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11H16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Secure checkout powered by Stripe
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingPage;
