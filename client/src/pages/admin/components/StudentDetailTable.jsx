import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/StudentDetailModal.css';

const StudentDetailTable = ({ studentId, onClose }) => {
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!studentId) {
      setError('Invalid student ID.');
      setLoading(false);
      return;
    }

    const fetchStudentDetails = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('user'));
        const token = userData?.token;

        if (!token) {
          setError('No token found. Please log in again.');
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        // Fetch student data and courses
        const [studentResponse, coursesResponse] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/students/${studentId}`, { headers }),
          axios.get(`${import.meta.env.VITE_API_URL}/students/${studentId}/courses`, { headers })
        ]);
 
        // Fetch subscription status using new endpoint
        const subscriptionResponse = await axios.get(`${import.meta.env.VITE_API_URL}/user/${studentId}`, { headers });

        setStudent(studentResponse.data);
        setCourses(coursesResponse.data);
        setSubscriptionStatus(subscriptionResponse.data);
      } catch (err) {
        console.error('Error fetching student details:', err);
        setError(err.response?.data?.message || 'Failed to load student details.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentDetails();
  }, [studentId]);

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('student-modal-overlay')) {
      onClose();
    }
  };

  if (!studentId) return null;

  return (
    <div className="student-modal-overlay" onClick={handleOverlayClick}>
      <div className="student-modal-content">
        <button className="student-modal-close" onClick={onClose}>×</button>
        
        {loading ? (
          <div className="student-modal-loading">
            <div className="student-modal-spinner"></div>
            <p>Loading student details...</p>
          </div>
        ) : error ? (
          <div className="student-modal-error">{error}</div>
        ) : (
          <>
            <div className="student-modal-header">
              <h3 className="student-modal-title">Student Details</h3>
              <div className="student-status-badge">
                <span className={`student-status-dot student-status-dot--${subscriptionStatus?.hasActiveSubscription ? 'active' : 'inactive'}`}></span>
                {subscriptionStatus?.hasActiveSubscription ? 'Active' : 'Inactive'}
              </div>
            </div>

            <div className="student-info-container">
              <div className="student-info-item">
                <label className="student-info-label">Student ID</label>
                <span className="student-info-value">{student?.user_id}</span>
              </div>
              <div className="student-info-item">
                <label className="student-info-label">Full Name</label>
                <span className="student-info-value">{student?.name}</span>
              </div>
              <div className="student-info-item">
                <label className="student-info-label">Email Address</label>
                <span className="student-info-value">{student?.email}</span>
              </div>
              <div className="student-info-item">
                <label className="student-info-label">Subscription Plan</label>
                <span className="student-info-value">
                  {subscriptionStatus?.hasActiveSubscription ? (
                    <>
                      {subscriptionStatus.subscription?.subscription_type}
                      <small style={{ display: 'block', fontSize: '0.85em', color: '#64748b' }}>
                        Expires: {new Date(subscriptionStatus.subscription?.subscription_end_date).toLocaleDateString()}
                      </small>
                    </>
                  ) : (
                    'No active subscription'
                  )}
                </span>
              </div>
            </div>

            <div className="student-courses">
              <h4 className="student-courses-title">Enrolled Courses</h4>
              {courses.length > 0 ? (
                <div className="student-courses-grid">
                  {courses.map((course, index) => (
                    <div key={index} className="student-course-item">
                      <div className="student-course-header">
                        <h5 className="student-course-title">{course.course_name || 'Unnamed Course'}</h5>
                        <span className={`student-course-status student-course-status--${course.progress >= 100 ? 'completed' : 'in-progress'}`}>
                          {course.progress >= 100 ? 'Completed' : 'In Progress'}
                        </span>
                      </div>
                      <div className="student-course-progress">
                        <div className="student-progress-bar">
                          <div 
                            className="student-progress-fill"
                            style={{ width: `${course.progress || 0}%` }}
                          />
                        </div>
                        <span className="student-progress-text">{course.progress || 0}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="student-courses-empty">
                  <p>No courses found for this student.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentDetailTable;
