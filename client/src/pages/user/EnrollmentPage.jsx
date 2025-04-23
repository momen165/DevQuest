import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "styles/EnrollmentPage.css";
import { useAuth } from "AuthContext";
import CircularProgress from "@mui/material/CircularProgress";

const api_url = import.meta.env.VITE_API_URL;

const EnrollmentPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate("/loginPage");
      return;
    }

    const fetchCourseData = async () => {
      try {
        const { data } = await axios.get(`${api_url}/courses/${courseId}`);
        setCourse(data);

        // Check if the user is already enrolled in the course
        if (user.user_id) {
          const { data: enrollmentData } = await axios.get(
            `${api_url}/courses/${courseId}/enrollments/${user.user_id}`,
          );
          setIsEnrolled(enrollmentData.isEnrolled);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error:", err);
        setError("Failed to load course data");
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [courseId, user, navigate]);

  if (!course) {
    return <div>Course not found</div>;
  }

  const fullImageUrl = course.image ? course.image : "/fallback-image.png";

  const handleStartLearning = () => {
    if (!isEnrolled) {
      axios
        .post(
          `${import.meta.env.VITE_API_URL}/courses/enroll`,
          {
            user_id: user.user_id,
            course_id: courseId,
          },
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          },
        )
        .then(({ data }) => {
          setIsEnrolled(true);
          navigate(`/course/${courseId}`);
        })
        .catch((error) => {
          console.error("Error enrolling in course:", error);
        });
    } else {
      navigate(`/course/${courseId}`);
    }
  };

  const handleImageError = (e) => {
    if (!isUsingFallback) {
      setIsUsingFallback(true);
      e.target.src = "/fallback-image.png";
    } else {
      e.target.style.display = "none";
    }
  };

  return (
    <div className="enrollment-page">
      <div className="enroll-info">
        <header className="enrollment-header">
          <h2 className="course-intro">Introduction to {course.title}</h2>
          <h1 className="course-titl">Master the Language of the Future</h1>
          <p className="course-description">
            {course.description || "Course description goes here."}
          </p>
          <button className="start-button" onClick={handleStartLearning}>
            {isEnrolled ? "Continue learning" : "Start learning"} {course.title}
          </button>
        </header>
      </div>
      <div className="enroll-img">
        <img
          src={fullImageUrl}
          alt={`Course: ${course.title}`}
          style={{ width: "700px", height: "auto" }}
          onError={handleImageError}
        />
      </div>
    </div>
  );
};

export default EnrollmentPage;
