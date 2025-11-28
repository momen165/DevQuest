// /src/components/FAQSection.js
import React from "react";
import "@/styles/FAQSection.css";
import { useRouter } from 'next/navigation';

const FAQSection = () => {
  const navigate = useRouter();
  return (
    <section className="faq">
      <h2 className="faq__heading">Frequently Asked Questions</h2>
      <p className="faq__text">
        Can't find the answer you're looking for? Visit our FAQ page.
      </p>
      <button className="faq-btn" onClick={() => router.push("/faq")}>
        Visit FAQ
      </button>
    </section>
  );
};

export default FAQSection;
