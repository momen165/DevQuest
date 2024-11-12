import React, { useState } from 'react';
import Sidebar from 'pages/admin/components/Sidebar';
import StudentDetailTable from 'pages/admin/components/StudentDetailTable'; // Import the new component
import 'pages/admin/styles/Students.css';

const StudentSubscriptionTable = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const students = [
    { id: 1, name: 'John Doe', email: 'john.doe@example.com', subscription: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane.smith@example.com', subscription: 'Inactive' },
    { id: 3, name: 'Alice Johnson', email: 'alice.johnson@example.com', subscription: 'Active' }
  ];

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="student-subscription-page">
      <Sidebar />
      
      <div className="student-subscription-content">
        <h2 className='PageTitle'>Students Subscribed to the Website</h2>
        
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
            {filteredStudents.map(student => (
              <tr key={student.id} onClick={() => setSelectedStudent(student)}>
                <td>{student.id}</td>
                <td>{student.name}</td>
                <td>{student.email}</td>
                <td>{student.subscription}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {selectedStudent && <StudentDetailTable student={selectedStudent} />}
      </div>
    </div>
  );
};

export default StudentSubscriptionTable;
