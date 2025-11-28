'use client';

import React, { useState, useEffect } from "react";
import axios from "axios";
import "@/styles/PricingPage.css";
import Navbar from "@/components/Navbar";
import SEOHead from "@/components/SEOHead";
import { useAuth } from "@/contexts/AuthContext";
import { loadStripe } from "@stripe/stripe-js";
import SupportForm from "@/components/SupportForm";
import Footer from "@/components/Footer";
import { useRouter } from "next/navigation";

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const api_url = process.env.NEXT_PUBLIC_API_URL;

const PricingPage: React.FC = () => {
  const [isMonthly, setIsMonthly] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const { user } = useAuth();
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const router = useRouter();

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
      router.push("/LoginPage");
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
        setErrorMessage("Failed to initialize payment processor.");
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
      router.push("/LoginPage");
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
      <Navbar />
      <main className="pricing-content">
        <h1>Select the best plan that suits you</h1>
        <p>Unlock the full potential of DevQuest</p>

        {checkingSubscription ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Checking subscription status...</p>
          </div>
        ) : hasActiveSubscription ? (
          <div className="active-subscription-notice">
            <h2>You already have an active subscription</h2>
            <p>You can manage your subscription in your account settings.</p>
          </div>
        ) : (
          <>
            {/* Toggle between Monthly and Yearly Plans */}
            <div className="pricing-plan-toggle-container">
              <button
                className={`pricing-plan-toggle-btn ${isMonthly ? "pricing-plan-toggle-btn--active" : ""}`}
                onClick={() => setIsMonthly(true)}
              >
                Monthly
              </button>
              <button
                className={`pricing-plan-toggle-btn ${!isMonthly ? "pricing-plan-toggle-btn--active" : ""}`}
                onClick={() => setIsMonthly(false)}
              >
                Yearly <span className="pricing-plan-save-badge">save 30%</span>
              </button>
            </div>

            {/* Pricing Card */}
            <div className="pricing-card">
              <h2>${isMonthly ? 10 : 100}</h2>
              <p>/ {isMonthly ? "month" : "month (billed yearly)"}</p>
              <button className="choose-plan-button" onClick={openPopup}>
                Choose Plan
              </button>
            </div>

            <div id="card-container"></div>
          </>
        )}
      </main>

      {/* Popup for Subscription Confirmation */}
      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <h2>Confirm Your Subscription</h2>
            <p>
              You have selected the{" "}
              <strong>{isMonthly ? "Monthly" : "Yearly"}</strong> plan for
              <strong> ${isMonthly ? 10 : 100}/month</strong>.
            </p>
            <button
              className="confirm-button"
              onClick={handleChoosePlan}
              disabled={loading}
            >
              {loading ? "Processing..." : "Confirm"}
            </button>
            <button className="cancel-button" onClick={closePopup}>
              Cancel
            </button>
            {successMessage && (
              <p className="success-message">{successMessage}</p>
            )}
            {errorMessage && <p className="error-message">{errorMessage}</p>}
          </div>
        </div>
      )}
      <SupportForm />
      <Footer />
    </div>
  );
};

export default PricingPage;
