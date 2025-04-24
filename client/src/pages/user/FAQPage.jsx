// /src/pages/FAQPage.js
import React, { useState } from "react";
import "../../styles/FAQPage.css";
import Navbar from "../../components/Navbar";
import faqImage from "../../assets/images/faq-illustration.png";

const FAQPage = () => {
  const [activeIndex, setActiveIndex] = useState(null);

  const faqs = [
    {
      question: "What is DevQuest?",
      answer:
        "DevQuest is an interactive coding education platform that offers self-paced programming courses. Our platform combines theoretical learning with hands-on coding practice to help you master programming skills.",
    },
    {
      question: "What subscription options are available?",
      answer:
        "We offer both monthly ($10/month) and yearly ($100/year) subscription plans. The yearly plan comes with a 30% discount compared to monthly billing. Both plans give you full access to all courses and features.",
    },
    {
      question: "How does the learning process work?",
      answer:
        "Each course is divided into sections with interactive lessons. You'll learn through a combination of text-based content, practical coding exercises, and real-time feedback. Our integrated code editor allows you to practice as you learn.",
    },
    {
      question: "Do you offer coding practice environments?",
      answer:
        "Yes! Each lesson includes an integrated code editor where you can write, test, and run your code. We support multiple programming languages including Python, JavaScript, Java, and C++.",
    },
    {
      question: "How do I track my progress?",
      answer:
        "Your progress is automatically tracked as you complete lessons. You can view your course completion status, earned XP, and current learning streak through your profile dashboard.",
    },
    {
      question: "What kind of support is available?",
      answer:
        "We offer multiple support channels including a dedicated support ticket system, course feedback options, and admin responses to your queries. Our team typically responds within 24 hours.",
    },
    {
      question: "Can I learn at my own pace?",
      answer:
        "Absolutely! All courses are self-paced, allowing you to learn whenever it's convenient for you. Your progress is saved automatically, so you can resume where you left off.",
    },
    {
      question: "What happens after I complete a course?",
      answer:
        "After completing a course, you'll have gained practical programming skills and can track your achievements in your profile. You can then progress to more advanced courses to further enhance your skills.",
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
              className={`faq-item ${activeIndex === index ? "active" : ""}`}
              onClick={() => toggleFAQ(index)}
            >
              <h3 className="faq-question">
                {faq.question}
                <span>{activeIndex === index ? "–" : "+"}</span>
              </h3>
              {activeIndex === index && (
                <p className="faq-answer">{faq.answer}</p>
              )}
            </div>
          ))}
        </div>
      </div>
      <footer />
    </>
  );
};

export default FAQPage;
