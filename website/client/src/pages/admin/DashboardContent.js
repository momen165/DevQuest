import React, { useState, useEffect } from 'react';
import { FaUserGraduate, FaUserPlus, FaBook } from 'react-icons/fa';
import 'pages/admin/styles/DashboardContent.css';
import axios from 'axios';
import { useAuth } from 'AuthContext';
const DashboardContent = () => {
  const [studentsCount, setStudentsCount] = useState(0);
  const [newStudentsCount, setNewStudentsCount] = useState(0);
  const [coursesCount, setCoursesCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState([]);
  const [newStudentsList, setNewStudentsList] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null); // Track selected activity for modal
  const [error, setError] = useState(null);

  // Retrieve token from localStorage
  const token = JSON.parse(localStorage.getItem('user'))?.token;
  const { user } = useAuth();
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!token) {
          throw new Error('No token found. Please log in again.');
        }

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        // Fetch students data
        const studentsResponse = await axios.get('http://localhost:5000/api/students', { headers });
        const { students = [], count = 0 } = studentsResponse.data || {};

        // Validate data
        if (!Array.isArray(students)) {
          throw new Error('Invalid students data received');
        }

        setStudentsCount(count);

        // Filter new students (registered in the last 7 days)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const newStudents = students.filter((student) => {
          const createdAt = student?.created_at ? new Date(student.created_at) : null;
          return createdAt && createdAt >= oneWeekAgo;
        });

        setNewStudentsCount(newStudents.length);
        setNewStudentsCount(newStudents.length);
        setNewStudentsList(newStudents);

        // Fetch courses data
        const coursesResponse = await axios.get('http://localhost:5000/api/courses', { headers });
        setCoursesCount(coursesResponse.data.length);

        // Fetch recent activity
        const activityResponse = await axios.get('http://localhost:5000/api/activities/recent', { headers });
        setRecentActivity(activityResponse.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err.response?.data || err.message);
        setError(err.response?.data?.error || 'Failed to fetch dashboard data.');
      }
    };

    fetchData();
  }, [token]);
  

  const openActivityDetails = (activity) => {
    setSelectedActivity(activity);
  };

  const closeActivityDetails = () => {
    setSelectedActivity(null);
  };

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="dashboard-content">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="profile">
        <span>{user?.name }</span>
          <p>Admin</p>
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
            <button className="see-all-button">See all</button>
          </div>
          <ul>
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <li key={activity.activity_id}>
                  <div className="activity-short" onClick={() => openActivityDetails(activity)}>
                    {activity.action_description.substring(0, 50)}...
                  </div>
                </li>
              ))
            ) : (
              <li>No recent activity available.</li>
            )}
          </ul>
        </div>

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
    </div>
  );
};

export default DashboardContent;
