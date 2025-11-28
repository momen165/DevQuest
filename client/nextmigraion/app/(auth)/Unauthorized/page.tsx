'use client';

import React from "react";
import { useRouter } from "next/navigation";

const Unauthorized: React.FC = () => {
  const router = useRouter();

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>403 - Unauthorized</h1>
      <p>You do not have permission to access this page.</p>
      <button
        onClick={() => router.push("/")}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          backgroundColor: "#007BFF",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Go to Homepage
      </button>
    </div>
  );
};

export default Unauthorized;
