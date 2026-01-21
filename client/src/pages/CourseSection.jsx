import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Navbar from 'shared/ui/Navbar';
import LessonList from 'features/lesson/components/LessonSection';
import RatingForm from 'features/feedback/components/RatingForm';
import axios from 'axios';
import './CourseSections.css';
import { useAuth } from 'app/AuthContext';
import SupportForm from 'features/support/components/SupportForm';
import { calculateLevel, calculateLevelProgress, getXPForLevel } from 'features/profile/hooks/xpCalculator';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
});

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async (endpoint, config, retries = 0) => {
  try {
    const response = await api.get(endpoint, config);
    return response;
  } catch (err) {
    if (retries < MAX_RETRIES) {
      await sleep(RETRY_DELAY);
      return fetchWithRetry(endpoint, config, retries + 1);
    }
    throw err;
  }
};

const CourseSection = () => {
  const { courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [stats, setStats] = useState({
    courseXP: 0,
    exercisesCompleted: 0,
    streak: 0,
    name: '',
    profileImage: '',
    totalXP: 0,
    level: 0,
    xpToNextLevel: 0,
  });
  const [courseName, setCourseName] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);  const FREE_LESSON_LIMIT = 5;

  useEffect(() => {
    const fetchOptimizedCourseSectionData = async () => {
      setLoading(true);
      setError('');
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        };        // Use the new optimized endpoint that combines all data in one request
        const response = await fetchWithRetry(`/optimized-course-section/${courseId}`, config);
        
        if (response.data) {
          const { course, subscription, profile, sections, stats } = response.data;
          
          // Set all state from the optimized response
          setCourseName(course.title);
          setHasActiveSubscription(subscription.hasActiveSubscription);
          setProfileData({
            name: profile.name,
            profileimage: profile.profileimage,
            streak: profile.streak,
            exercisesCompleted: profile.exercisesCompleted
          });
          
          // Ensure lessons array exists and is properly formatted
          const formattedSections = sections.map((section) => ({
            ...section,
            lessons: Array.isArray(section.lessons) ? section.lessons : [],
          }));
          setSections(formattedSections);
          
          setStats(stats);
          
          
        }
      } catch (err) {
        console.error('Error loading optimized course section data:', err);
        
        // Fallback to original approach if optimized endpoint fails
        await fetchDataFallback();
      } finally {
        setLoading(false);
      }
    };

    const fetchDataFallback = async () => {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        };

        // Original separate API calls as fallback
        try {
          const courseResponse = await fetchWithRetry(`/courses/${courseId}`, config);
          if (courseResponse.data) {
            setCourseName(courseResponse.data.title);
          }
        } catch (err) {
          if (err.response?.status === 404 || err.response?.status === 403) {
            setError(
              err.response?.data?.error || 'Course not available. Redirecting to home page...'
            );
            setTimeout(() => {
              navigate('/');
            }, 2000);
            return;
          }
          throw err;
        }

        // Check subscription status
        const subscriptionResponse = await fetchWithRetry('/check', config);
        setHasActiveSubscription(subscriptionResponse.data.hasActiveSubscription);

        // Get profile data
        const profileResponse = await fetchWithRetry(`/students/${user.user_id}`, config);
        setProfileData(profileResponse.data);

        // Get sections, course stats, and overall stats
        const [sectionsResponse, courseStatsResponse, overallStatsResponse] = await Promise.all([
          fetchWithRetry(`/sections/course/${courseId}`, config),
          fetchWithRetry(`/student/courses/${courseId}/stats`, config),
          fetchWithRetry(`/student/stats/${user.user_id}`, config),
        ]);

        if (sectionsResponse.data) {
          const formattedSections = sectionsResponse.data.map((section) => ({
            ...section,
            lessons: Array.isArray(section.lessons) ? section.lessons : [],
          }));
          setSections(formattedSections);
        }

        if (courseStatsResponse.data && overallStatsResponse.data) {
          const totalXP = overallStatsResponse.data.totalXP || 0;
          const userLevel = calculateLevel(totalXP);

          setStats({
            courseXP: courseStatsResponse.data.courseXP || 0,
            exercisesCompleted: courseStatsResponse.data.exercisesCompleted || 0,
            streak: courseStatsResponse.data.streak || 0,
            name: user.name,
            profileImage: user.profileimage,
            totalXP: totalXP,
            level: userLevel,
            xpToNextLevel: Math.round(overallStatsResponse.data.xpToNextLevel || 0),
          });
        }
      } catch (err) {
        console.error('Fallback error details:', err.response?.data || err.message);
        setError('Failed to fetch course data. Please try again.');
      }
    };    if (courseId && user?.user_id) {
      fetchOptimizedCourseSectionData();
    }
  }, [courseId, user, navigate]);

  useEffect(() => {
    // Check for error message in location state (from redirects)
    if (location.state?.errorMessage) {
      setErrorMessage(location.state.errorMessage);
      setShowErrorMessage(true);

      // Clear the error message after 5 seconds
      const timer = setTimeout(() => {
        setShowErrorMessage(false);
      }, 5000);

      return () => clearTimeout(timer);
    }  }, [location]);

  return (
    <div className="course-section-wrapper">
      <Navbar />
      <div className="Page">
        <div className="Section">
          <div className="course-header">
            <h1>{courseName}</h1>
            <div className="course-breadcrumb">
              <span>Courses</span>
              <span className="separator">/</span>
              <span className="current">{courseName}</span>
            </div>

            {/* Error message for locked lessons */}
            {showErrorMessage && (
              <div className="course-error-message">
                <span>{errorMessage}</span>
                <button onClick={() => setShowErrorMessage(false)}>×</button>
              </div>
            )}

            {profileData && !hasActiveSubscription && (
              <div className="subscription-notice">
                <p>
                  Free trial: {profileData.exercisesCompleted || 0}/{FREE_LESSON_LIMIT} lessons
                  completed
                </p>
                {(profileData.exercisesCompleted || 0) >= FREE_LESSON_LIMIT && (
                  <p className="upgrade-message">Subscribe now to unlock all lessons!</p>
                )}
              </div>
            )}

            {loading ? (
              <p>Loading sections...</p>
            ) : error ? (
              <p className="error">{error}</p>
            ) : sections.length === 0 ? (
              <p>No sections found for this course.</p>
            ) : (
              sections.map((section) => {
                return (
                  <LessonList
                    key={section.section_id}
                    sectionName={section.name}
                    sectionId={section.section_id}
                    lessons={section.lessons}
                    profileData={profileData}
                    hasActiveSubscription={hasActiveSubscription}
                  />
                );
              })
            )}
          </div>
          {/* The "rating" div is now outside and after the "course-header" div, but still within "Section" as per new.txt initial structure.
              To match old.txt, "rating" div should be a sibling to "Section" div.
              The following change moves the "rating" div to be a sibling of "Section" */}
        </div>{' '}
        {/* End of "Section" div */}
        <div className="rating">
          {' '}
          {/* "rating" div is now a sibling to "Section" */}
          <div className="user-sidebar">
            <p className="status-title">My Status</p>
            <div className="user-info">
              <div className="user-icon">
                {stats.profileImage ? (
                  <img src={user.profileimage} alt="Profile" className="profile-image" />
                ) : (
                  <div className="default-avatar">
                    {stats.name ? stats.name[0].toUpperCase() : '?'}
                  </div>
                )}
              </div>
              <div className="user-details">
                <p className="username">{stats.name}</p>
                <p className="user-level">Level {stats.level}</p>
                <div className="xp-progress">
                  <div className="xp-progress-bar">
                    <div
                      className="xp-progress-fill"
                      style={{
                        width: `${
                          stats.totalXP && stats.totalXP > 0
                            ? calculateLevelProgress(stats.totalXP)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <p className="xp-progress-text">{stats.xpToNextLevel} XP to next level</p>
                </div>
              </div>
            </div>

            <div className="user-progress">
              <div className="progress-box">
                <p className="progress-value">{stats.courseXP}+</p>
                <p className="progress-label">Course XP</p>
              </div>
              <div className="progress-box">
                <p className="progress-value">{stats.exercisesCompleted}</p>
                <p className="progress-label">Lessons Completed</p>
              </div>
              <div className="progress-box">
                <p className="progress-value">{stats.streak}</p>
                <p className="progress-label">Day Streak</p>
              </div>
            </div>
          </div>
          <RatingForm courseId={courseId} />
        </div>
        <SupportForm />
        {showErrorMessage && (
          <div className="error-message">
            <p>{errorMessage}</p>
            <button onClick={() => setShowErrorMessage(false)}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseSection;
