'use client';

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import "@/styles/ChangePassword.css";

function ConfirmEmailChange(): React.JSX.Element {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("verifying");

  useEffect(() => {
    const confirmEmailChange = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setStatus("error");
        toast.error("Invalid token");
        return;
      }

      try {
        const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/confirmEmailChange`, { token });
        setStatus("success");
        toast.success(response.data.message);

        // Clear user data from localStorage as they need to login with new email
        localStorage.removeItem("user");

        // Redirect to login page after 3 seconds
        setTimeout(() => {
          router.push("/LoginPage");
        }, 3000);
      } catch (error: any) {
        setStatus("error");
        const errorMessage =
          error.response?.data?.error || "Failed to confirm email change";
        toast.error(errorMessage);
      }
    };

    confirmEmailChange();
  }, [searchParams, router]);

  return (
    <>
      <Navbar />
      <div className="change-password-container">
        <div className="change-password-main">
          <h2 className="change-password-title">Email Change Confirmation</h2>

          <div className="change-password-form-container">
            {status === "verifying" && (
              <div className="confirmation-message">
                <p>Verifying your email change request...</p>
              </div>
            )}

            {status === "success" && (
              <div className="confirmation-message success">
                <p>Your email has been successfully updated!</p>
                <p>
                  You will be redirected to the login page in a few seconds...
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="confirmation-message error">
                <p>Failed to confirm email change.</p>
                <p>
                  Please try requesting a new email change from your account
                  settings.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default ConfirmEmailChange;
