import React, { useState, useEffect } from 'react';
import Sidebar from 'pages/admin/components/Sidebar';
import StudentDetailTable from 'pages/admin/components/StudentDetailTable';
import axios from 'axios';
import 'pages/admin/styles/Students.css';

const StudentSubscriptionTable = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [students, setStudents] = useState([]); // Ensure it's always an array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const userData = JSON.parse(localStorage.getItem('user'));
        const token = userData ? userData.token : null;

        if (!token) {
          throw new Error('No token found. Please log in again.');
        }

        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get('http://localhost:5000/api/students', { headers });

        console.log('Fetched Students:', response.data); // Debug fetched students
        setStudents(response.data.students || []); // Use `students` or fallback to empty array
      } catch (err) {
        console.error('Error fetching students:', err.response?.data || err.message);
        setError(err.response?.data?.error || 'Failed to fetch students.');
        setStudents([]); // Fallback to empty array
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredStudents = Array.isArray(students)
    ? students.filter(
        (student) =>
          student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  if (loading) return <div>Loading students...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="student-subscription-page">
      <Sidebar />
      <div className="student-subscription-content">
        <h2 className="PageTitle">Students Subscribed to the Website</h2>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search students by name or email"
            value={searchTerm}
            onChange={handleSearch}
          />
          <button className="search-button">Search</button>
        </div>

        <table className="subscription-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Subscription</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr
                key={student.user_id}
                onClick={() => {
                  console.log('Selected Student:', student); // Debug selected student
                  setSelectedStudent(student);
                }}
              >
                <td>{student.user_id}</td>
                <td>{student.name}</td>
                <td>{student.email}</td>
                <td>{student.subscription || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {selectedStudent && <StudentDetailTable studentId={selectedStudent.user_id} />}
      </div>
    </div>
  );
};

export default StudentSubscriptionTable;
