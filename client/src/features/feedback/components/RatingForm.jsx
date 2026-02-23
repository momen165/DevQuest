import { useState, useEffect, memo } from "react";
import axios from "axios";
import { useAuth } from "app/AuthContext";
import "./RatingForm.css";

const RatingForm = memo(({ courseId }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [hoverRating, setHoverRating] = useState(0);
  const [courseProgress, setCourseProgress] = useState(0);
  const [hasExistingFeedback, setHasExistingFeedback] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const checkEligibility = async () => {
      if (!user?.user_id || !courseId) return;

      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/feedback/eligibility/${courseId}`,
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
            validateStatus: function (status) {
              return status < 500;
            },
          }
        );

        if (response.data.error) {
          throw new Error(response.data.error);
        }

        setCourseProgress(response.data.progress);
        setHasExistingFeedback(response.data.hasExistingFeedback);
      } catch (error) {
        console.error("Error checking eligibility:", error.response?.data || error);
        setMessage(error.response?.data?.error || "Error checking feedback eligibility");
      }
    };

    checkEligibility();
  }, [user, courseId]);

  const handleRating = (star) => setRating(star);
  const handleMouseEnter = (star) => setHoverRating(star);
  const handleMouseLeave = () => setHoverRating(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const feedbackData = {
        course_id: courseId,
        rating,
        comment,
      };

      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
      };

      await axios.post(`${import.meta.env.VITE_API_URL}/feedback`, feedbackData, config);

      setMessage("Feedback submitted successfully!");
      setRating(0);
      setComment("");
      setHasExistingFeedback(true);
    } catch (error) {
      setMessage(error.response?.data?.error || "Error submitting feedback. Please try again.");
      console.error("Error submitting feedback:", error);
    }
  };

  const toggleForm = () => {
    setIsVisible(!isVisible);
  };

  const canRate = courseProgress >= 30 && (!hasExistingFeedback || courseProgress >= 100);

  return (
    <div className="rf-wrapper">
      <button className="rf-toggle" onClick={toggleForm} type="button">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 1.5L9.79 5.12L13.81 5.72L10.91 8.54L11.59 12.54L8 10.67L4.41 12.54L5.09 8.54L2.19 5.72L6.21 5.12L8 1.5Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={isVisible ? "currentColor" : "none"}
          />
        </svg>
        <span>{isVisible ? "Close" : "Rate"}</span>
      </button>

      <div className={`rf-panel ${isVisible ? "rf-panel-visible" : ""}`}>
        {!canRate ? (
          <>
            <p className="rf-heading">Course Feedback</p>
            <div className="rf-info">
              {!user?.user_id ? (
                <p>Please log in to provide feedback.</p>
              ) : courseProgress < 30 ? (
                <p>
                  Complete at least 30% of the course to leave feedback.
                  <span className="rf-progress-note">{courseProgress}% completed</span>
                </p>
              ) : (
                <p>
                  You&apos;ve already submitted feedback. Complete the entire course to submit
                  additional feedback.
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="rf-heading">Rate this course</p>
            <div className="rf-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`rf-star ${star <= (hoverRating || rating) ? "rf-star-active" : ""}`}
                  onClick={() => handleRating(star)}
                  onMouseEnter={() => handleMouseEnter(star)}
                  onMouseLeave={handleMouseLeave}
                  aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M10 2L12.09 6.26L16.81 6.97L13.41 10.27L14.18 14.97L10 12.77L5.82 14.97L6.59 10.27L3.19 6.97L7.91 6.26L10 2Z"
                      fill={star <= (hoverRating || rating) ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ))}
            </div>
            <textarea
              placeholder="Share your thoughts about this course..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="rf-textarea"
              rows={3}
            />
            <button
              onClick={handleSubmit}
              className="rf-submit"
              type="button"
              disabled={rating === 0}
            >
              Submit feedback
            </button>
          </>
        )}
        {message && (
          <p
            className={`rf-message ${message.includes("success") ? "rf-message-ok" : "rf-message-err"}`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
});

RatingForm.displayName = "RatingForm";

export default RatingForm;
