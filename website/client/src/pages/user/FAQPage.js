// /src/pages/FAQPage.js
import React, { useState } from 'react';
import 'styles/FAQPage.css';
import Navbar from 'components/Navbar';
import faqImage from 'assets/images/faq-illustration.png';

const FAQPage = () => {
  const [activeIndex, setActiveIndex] = useState(null);

  const faqs = [
    {
      question: "How does DevQuest ensure the quality of its courses?",
      answer: "Our courses are regularly updated to reflect the latest trends and best practices. We also gather student feedback to continuously improve our offerings.",
    },
    {
      question: "How long do courses typically last?",
      answer: "The duration of courses varies depending on the complexity and depth of the topic. Each course page provides an estimated time to completion.",
    },
    {
      question: "Can I learn at my own pace?",
      answer: "Yes! All courses are self-paced, allowing you to learn whenever it's convenient for you.",
    },
    {
      question: "Do I get a certificate after completion?",
      answer: "Yes, upon successful completion of a course, you will receive a certificate.",
    },
  ];

  const toggleFAQ = (index) => {
    setActiveIndex(index === activeIndex ? null : index);
  };

  return (
    <>
      <Navbar />
      <div className="faq-page">
        <div className="faq-header">
          <img src={faqImage} alt="FAQ Illustration" className="faq-image" />
          <h1>Frequently Asked Questions</h1>
        </div>
        <div className="faq-content">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`faq-item ${activeIndex === index ? 'active' : ''}`}
              onClick={() => toggleFAQ(index)}
            >
              <h3 className="faq-question">
                {faq.question}
                <span>{activeIndex === index ? '–' : '+'}</span>
              </h3>
              {activeIndex === index && <p className="faq-answer">{faq.answer}</p>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default FAQPage;
