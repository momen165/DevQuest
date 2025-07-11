import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../AuthContext";
import "../styles/RatingForm.css";

const RatingForm = ({ courseId }) => {
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
      if (!user?.user_id || !courseId) {
        console.log("Missing user or courseId:", {
          user_id: user?.user_id,
          courseId,
        });
        return;
      }

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
          },
        );

        
        if (response.data.error) {
          throw new Error(response.data.error);
        }

        setCourseProgress(response.data.progress);
        setHasExistingFeedback(response.data.hasExistingFeedback);
      } catch (error) {
        console.error(
          "Error checking eligibility:",
          error.response?.data || error,
        );
        setMessage(
          error.response?.data?.error || "Error checking feedback eligibility",
        );
      }
    };

    checkEligibility();
  }, [user, courseId]);

 
  // Handle rating selection
  const handleRating = (star) => setRating(star);

  // Handle hover effects
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
      setMessage(
        error.response?.data?.error ||
        "Error submitting feedback. Please try again.",
      );
      console.error("Error submitting feedback:", error);
    }
  };

  const toggleForm = () => {
    setIsVisible(!isVisible);
  };

  const renderForm = () => {
    if (courseProgress < 30 || (hasExistingFeedback && courseProgress < 100)) {
      return (
        <div className={`rating-form ${!isVisible ? "hidden" : ""}`}>
          <p className="rating-title">Course Feedback</p>
          <div className="feedback-message">
            {!user?.user_id ? (
              <p>Please log in to provide feedback.</p>
            ) : courseProgress < 30 ? (
              <p>
                Complete at least 30% of the course to provide feedback. (
                {courseProgress}% completed)
              </p>
            ) : (
              <p>
                You've already submitted feedback for this course. Complete the
                entire course to provide additional feedback, or contact us at
                support@dev-quest.tech for any other thoughts.
              </p>
            )}
            <p className="progress-info">Current Progress: {courseProgress}%</p>
          </div>
        </div>
      );
    }

    return (
      <div className={`rating-form ${!isVisible ? "hidden" : ""}`}>
        <p className="rating-title">Rate Course Content</p>
        <div className="stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`star ${star <= (hoverRating || rating) ? "filled" : ""}`}
              onClick={() => handleRating(star)}
              onMouseEnter={() => handleMouseEnter(star)}
              onMouseLeave={handleMouseLeave}
            >
              ★
            </span>
          ))}
        </div>
        <p className="comment-title">What do you think about this course</p>
        <textarea
          placeholder="Add your comments..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="comment-box"
        />
        <button onClick={handleSubmit} className="submit-button">
          Submit
        </button>
        {message && <p className="message">{message}</p>}
      </div>
    );
  };

  return (
    <>
      <button className="rating-toggle" onClick={toggleForm}>
        <div className="toggle-content">
          <span className="arrow">&#8249;</span>
          <span className="star-icon">★</span>
          <span className="rate-text">Rate</span>
        </div>
      </button>
      {renderForm()}
    </>
  );
};

export default RatingForm;
