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
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleRowClick = (student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
  };

  if (error) return <div>{error}</div>;

  return (
    <div className="student-subscription-page">
      <Sidebar />
      <div className="student-subscription-content">
        <h2 className="studentPageTitle">Student Management</h2>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={handleSearch}
          />
          <button className="search-button">
            <i className="fas fa-search"></i> Search
          </button>
        </div>

        {filteredStudents.length > 0 ? (
          <table className="subscription-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Subscription</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr
                  key={student.user_id}
                  onClick={() => handleRowClick(student)}
                  className={selectedStudent?.user_id === student.user_id ? 'selected' : ''}
                >
                  <td>{student.user_id}</td>
                  <td>{student.name || 'Unknown'}</td>
                  <td>{student.email || 'Unknown'}</td>
                  <td>{student.subscription_type || 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${student.is_verified ? 'active' : 'inactive'}`}>
                      {student.is_verified ? 'Verified' : 'Unverified'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-results">
            {searchTerm ? 'No students found matching your search.' : 'No students available.'}
          </div>
        )}

        {isModalOpen && selectedStudent && (
          <StudentDetailTable 
            studentId={selectedStudent.user_id} 
            onClose={handleCloseModal}
          />
        )}
      </div>
    </div>
  );
};

export default StudentSubscriptionTable;
