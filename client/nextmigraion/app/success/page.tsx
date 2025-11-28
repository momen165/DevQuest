'use client';

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import "@/styles/PaymentSuccessPage.css";

const PaymentSuccessPage: React.FC = () => {
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const sessionIdParam = searchParams.get("session_id");
    setSessionId(sessionIdParam);

    if (sessionIdParam) {
      axios
        .get(`${process.env.NEXT_PUBLIC_API_URL}/checkout-session/${sessionIdParam}`)
        .then((response) => {
          setMessage("Payment successful! Thank you for your purchase.");
          setIsSuccess(true);
        })
        .catch((error) => {
          setMessage(
            "There was an issue retrieving your session. Please contact support.",
          );
          setIsSuccess(false);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setMessage("No session ID found.");
      setIsSuccess(false);
      setLoading(false);
    }
  }, [searchParams]);

  return (
    <div className="payment-success-page">
      <h1>Payment Status</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className={`message ${isSuccess ? "success" : "error"}`}>
          <p>{message}</p>
        </div>
      )}
    </div>
  );
};

export default PaymentSuccessPage;
