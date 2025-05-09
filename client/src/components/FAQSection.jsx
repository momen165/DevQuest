// /src/components/FAQSection.js
import React from "react";
import "../styles/FAQSection.css";
import { useNavigate } from "react-router-dom";

const FAQSection = () => {
  const navigate = useNavigate();
  return (
    <section className="faq">
      <h2 className="faq__heading">Frequently Asked Questions</h2>
      <p className="faq__text">
        Can't find the answer you're looking for? Visit our FAQ page.
      </p>
      <button className="faq-btn" onClick={() => navigate("/faq")}>
        Visit FAQ
      </button>
    </section>
  );
};

export default FAQSection;
