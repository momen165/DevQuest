import React, { useState, useEffect } from 'react';
import Sidebar from 'pages/admin/components/Sidebar';
import StudentDetailTable from 'pages/admin/components/StudentDetailTable';
import axios from 'axios';
import 'pages/admin/styles/Students.css';

const deduplicateStudents = (students) => {
  const seen = new Set();
  return students.filter((student) => {
    if (seen.has(student.user_id)) {
      return false;
    }
    seen.add(student.user_id);
    return true;
  });
};

const StudentSubscriptionTable = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [students, setStudents] = useState([]); // Ensure it's always an array
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('user'));
        const token = userData ? userData.token : null;

        if (!token) {
          throw new Error('No token found. Please log in again.');
        }

        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get('/api/students', { headers });

        console.log('Fetched Students:', response.data); // Debug fetched students
        const uniqueStudents = deduplicateStudents(response.data.students || []);
        setStudents(uniqueStudents); // Set deduplicated data
      } catch (err) {
        console.error('Error fetching students:', err.response?.data || err.message);
        setError(err.response?.data?.error || 'Failed to fetch students.');
        setStudents([]); // Fallback to empty array
      }
    };

    fetchStudents();
  }, []);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredStudents = deduplicateStudents(
      Array.isArray(students)
          ? students.filter((student) => {
            const name = student.name ? student.name.toLowerCase() : '';
            const email = student.email ? student.email.toLowerCase() : '';
            const search = searchTerm.toLowerCase();
            return name.includes(search) || email.includes(search);
          })
          : []
  );

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
                <td>{student.name || 'Unknown'}</td>
                <td>{student.email || 'Unknown'}</td>
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
