import { useState, useEffect } from "react";
import { FaUserGraduate, FaUserPlus, FaBook } from "react-icons/fa";
import "./DashboardContent.css";
import axios from "axios";
import { useAuth } from "app/AuthContext";
import { Link } from "react-router-dom";
import ActivityWindow from "features/admin/components/ActivityWindow";

const DashboardContent = () => {
  const [studentsCount, setStudentsCount] = useState(0);
  const [newStudentsCount, setNewStudentsCount] = useState(0);
  const [coursesCount, setCoursesCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState([]);
  const [newStudentsList, setNewStudentsList] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [error, setError] = useState(null);
  const [showActivityWindow, setShowActivityWindow] = useState(false);
  const [allActivities, setAllActivities] = useState([]);
  const [recentFeedback, setRecentFeedback] = useState([]);
  const [recentTickets, setRecentTickets] = useState([]);

  const token = JSON.parse(localStorage.getItem("user"))?.token;
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!token) {
          throw new Error("No token found. Please log in again.");
        }

        const authToken = user?.token || token;
        const headers = { Authorization: `Bearer ${authToken}` };

        const [
          studentsResponse,
          coursesResponse,
          activityResponse,
          feedbackResponse,
          ticketsResponse,
        ] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/students`, { headers }),
          axios.get(`${import.meta.env.VITE_API_URL}/courses`, {
            headers: {
              ...headers,
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
            params: { _ts: Date.now() },
          }),
          axios.get(`${import.meta.env.VITE_API_URL}/activities/recent`, { headers }),
          axios.get(`${import.meta.env.VITE_API_URL}/feedback/recent`, { headers }),
          axios.get(`${import.meta.env.VITE_API_URL}/support-tickets/recent`, { headers }),
        ]);

        const { students = [], count = 0 } = studentsResponse.data || {};

        if (!Array.isArray(students)) {
          throw new Error("Invalid students data received");
        }

        setStudentsCount(count);

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const newStudents = students.filter((student) => {
          const createdAt = student?.created_at ? new Date(student.created_at) : null;
          return createdAt && createdAt >= oneWeekAgo;
        });

        setNewStudentsCount(newStudents.length);
        setNewStudentsList(newStudents);

        setCoursesCount(coursesResponse.data.length);
        setAllActivities(activityResponse.data);
        setRecentActivity(activityResponse.data.slice(0, 5));
        setRecentFeedback(feedbackResponse.data);
        setRecentTickets(ticketsResponse.data);
      } catch (err) {
        console.error("Error fetching dashboard data:", err.response?.data || err.message);
        setError(err.response?.data?.error || "Failed to fetch dashboard data.");
      }
    };

    fetchData();
  }, [token, user?.token]);

  const openActivityDetails = (activity) => {
    setSelectedActivity(activity);
  };

  const closeActivityDetails = () => {
    setSelectedActivity(null);
  };

  const openActivityWindow = () => {
    setShowActivityWindow(true);
  };

  const closeActivityWindow = () => {
    setShowActivityWindow(false);
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours === 1) {
      return "1 hour ago";
    } else {
      return `${diffInHours} hours ago`;
    }
  };

  if (error) {
    return <div className="error-message">{error}</div>;
  }
  return (
    <div className="dashboard-content">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="profile">
          <span>Welcome, {user?.name}</span>
          <Link to="/" className="dashboard-to-homeLink">
            ← Back to website
          </Link>
        </div>
      </header>

      <div className="stats-cards">
        <div className="card">
          <FaUserGraduate className="icon" />
          <h3>{studentsCount}</h3>
          <p>Students</p>
        </div>
        <div className="card">
          <FaUserPlus className="icon" />
          <h3>{newStudentsCount}</h3>
          <p>New Students in the last week</p>
        </div>
        <div className="card">
          <FaBook className="icon" />
          <h3>{coursesCount}</h3>
          <p>Courses</p>
        </div>
      </div>

      <div className="activity-section">
        <div className="recent-activity">
          <div className="activity-header">
            <h2>Recent Activity</h2>
            <button className="see-all-button" onClick={openActivityWindow}>
              See all
            </button>
          </div>
          <ul>
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <li key={activity.activity_id}>
                  <div className="activity-short" onClick={() => openActivityDetails(activity)}>
                    {activity.action_description.length > 50
                      ? `${activity.action_description.substring(0, 50)}...`
                      : activity.action_description}
                  </div>
                </li>
              ))
            ) : (
              <li>No recent activity available.</li>
            )}
          </ul>
        </div>

        <div className="dashboard-sidebar">
          <div className="new-students">
            <div className="activity-header">
              <h2>New Students</h2>
              <button className="see-all-button">See all</button>
            </div>
            <ul>
              {newStudentsList.length > 0 ? (
                newStudentsList.map((student) => (
                  <li key={student.user_id}>
                    {student.name} ({student.email})
                  </li>
                ))
              ) : (
                <li>No new students registered in the last week.</li>
              )}
            </ul>
          </div>

          <div className="recent-feedback">
            <div className="activity-header">
              <h2>New Feedback</h2>
              <Link to="/Feedback" className="see-all-button">
                See all
              </Link>
            </div>
            <ul>
              {recentFeedback.length > 0 ? (
                recentFeedback.map((feedback) => (
                  <li key={feedback.feedback_id} className="feedback-item">
                    <div className="feedback-header">
                      <span className="student-name">{feedback.student_name}</span>
                      <span className="time-ago">{formatTimeAgo(feedback.created_at)}</span>
                    </div>
                    <div className="course-name">{feedback.course_name}</div>
                  </li>
                ))
              ) : (
                <li>No new feedback in the last 48 hours.</li>
              )}
            </ul>
          </div>

          <div className="recent-tickets">
            <div className="activity-header">
              <h2>New Support Tickets</h2>
              <Link to="/support" className="see-all-button">
                See all
              </Link>
            </div>
            <ul>
              {recentTickets.length > 0 ? (
                recentTickets.map((ticket) => (
                  <li key={ticket.ticket_id} className="ticket-item">
                    <div className="ticket-header">
                      <span className="student-name">{ticket.user_email}</span>
                      <span className="time-ago">{formatTimeAgo(ticket.time_opened)}</span>
                    </div>
                    <div className={`ticket-status ${ticket.status}`}>{ticket.status}</div>
                  </li>
                ))
              ) : (
                <li>No new support tickets in the last 24 hours</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {selectedActivity && (
        <div className="modal">
          <div className="modal-content">
            <button className="close-button" onClick={closeActivityDetails}>
              &times;
            </button>
            <h3>Activity Details</h3>
            <p>{selectedActivity.action_description}</p>
            <p>Date: {new Date(selectedActivity.created_at).toLocaleString()}</p>
          </div>
        </div>
      )}

      {showActivityWindow && (
        <ActivityWindow activities={allActivities} onClose={closeActivityWindow} />
      )}
    </div>
  );
};

export default DashboardContent;
