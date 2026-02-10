import { useEffect, useRef, useState, memo } from "react";
import axios from "axios";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import defaultProfilePic from "assets/images/default-profile-pic.png";
import "./FeedbackCardScroll.css"; // Ensure you have the correct path to your CSS file

const FeedbackCardScroll = memo(() => {
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);
  const [feedbackData, setFeedbackData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // Fetch feedback data
  useEffect(() => {
    let isMounted = true;

    const fetchFeedback = async () => {
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/feedback/public`);

        // Transform the API data to match the card format
        const transformedData = data.map((item) => ({
          feedbackId: item.feedback_id,
          name: item.name,
          avatar: item.profileimage || defaultProfilePic,
          rating: "★".repeat(item.rating),
          text: item.comment,
          courseName: item.course_name,
          country: item.country,
        }));

        if (isMounted) {
          setFeedbackData(transformedData);
        }
      } catch (error) {
        console.error("Error fetching feedback:", error);
        // Fallback to empty array to prevent layout breaks
        if (isMounted) {
          setFeedbackData([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchFeedback();

    return () => {
      isMounted = false;
    };
  }, []);

  // Animation setup
  useEffect(() => {
    if (isLoading || !feedbackData.length || isMobile) return;

    gsap.registerPlugin(ScrollTrigger);
    const hoverHandlers = [];

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top 15%",
        end: "+=100%",
        scrub: 0.8,
        pin: true,
        anticipatePin: 1,
        smoothChildTiming: true,
      },
    });

    cardsRef.current.forEach((card, i) => {
      if (!card) return;
      const isCenter = i === Math.floor(cardsRef.current.length / 2);

      // Add base z-index to maintain proper stacking
      card.style.zIndex = 1;

      gsap.set(card, {
        opacity: 0,
        x: i < 2 ? -100 : 100,
        y: 50,
        rotateY: i < 2 ? 45 : -45,
        scale: 0.8,
      });

      // Add hover animations
      const handleMouseEnter = () => {
        gsap.to(card, {
          scale: 1.1,
          zIndex: 100,
          duration: 0.3,
          ease: "power2.out",
        });
      };

      const handleMouseLeave = () => {
        gsap.to(card, {
          scale: isCenter ? 1.05 : 0.92,
          zIndex: 1,
          duration: 0.3,
          ease: "power2.out",
        });
      };

      card.addEventListener("mouseenter", handleMouseEnter);
      card.addEventListener("mouseleave", handleMouseLeave);
      hoverHandlers.push({ card, handleMouseEnter, handleMouseLeave });

      timeline.to(
        card,
        {
          opacity: 1,
          x: `${(i - Math.floor(cardsRef.current.length / 2)) * 70}%`,
          y: isCenter ? -20 : 0,
          rotateY: 0,
          scale: isCenter ? 1.05 : 0.92,
          duration: 1,
          ease: "power2.inOut",
        },
        i * 0.15
      );
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
      hoverHandlers.forEach(({ card, handleMouseEnter, handleMouseLeave }) => {
        card.removeEventListener("mouseenter", handleMouseEnter);
        card.removeEventListener("mouseleave", handleMouseLeave);
      });
    };
  }, [isLoading, feedbackData, isMobile]);

  if (isLoading) {
    return <div className="scroll-section">Loading feedback...</div>;
  }

  if (!feedbackData.length) {
    return <div className="scroll-section">No feedback available</div>;
  }

  return (
    <section className="scroll-section" ref={sectionRef}>
      <h1 className="scroll-section-header">
        <span role="img" aria-label="speech balloon">
          💬
        </span>{" "}
        What Our Developers Say
      </h1>
      <div className="scroll-cards-track">
        {feedbackData.map((feedback, index) => (
          <article
            key={feedback.feedbackId}
            className="scroll-feedback-card"
            ref={(el) => (cardsRef.current[index] = el)}
          >
            <div className="feedback-scroll-card-content">
              <span className="feedback-scroll-card-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="feedback-scroll-user-info">
                <div
                  className="feedback-scroll-user-avatar"
                  style={{ backgroundImage: `url(${feedback.avatar})` }}
                />
                <div className="feedback-scroll-user-details">
                  <div className="feedback-scroll-user-name">
                    👨‍💻 {feedback.name}
                    {feedback.country && (
                      <span className="feedback-scroll-user-country"> 📍 {feedback.country}</span>
                    )}
                  </div>
                  <div className="feedback-scroll-rating">{feedback.rating}</div>
                  {feedback.courseName && (
                    <div className="feedback-scroll-course">📚 {feedback.courseName}</div>
                  )}
                </div>
              </div>
              <p className="testimonial-text">{feedback.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
});

FeedbackCardScroll.displayName = "FeedbackCardScroll";

export default FeedbackCardScroll;
