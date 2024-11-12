import React from 'react';

const StudentDetailTable = ({ student }) => {
  const courses = [
    { name: 'Introduction to Python', progress: '89%' },
    { name: 'HTML5 for Beginners', progress: '50%' },
    { name: 'JavaScript Fundamentals', progress: '13%' },
  ];

  return (
    <div className="student-detail-container">
      <h3>Selected User</h3>
      <table className="subscription-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Subscription</th>
            <th>Courses</th>
            <th>Courses Progress</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course, index) => (
            <tr key={index}>
              {index === 0 && (
                <>
                  <td rowSpan={courses.length}>{student.id}</td>
                  <td rowSpan={courses.length}>{student.name}</td>
                  <td rowSpan={courses.length}>{student.email}</td>
                  <td rowSpan={courses.length}>{student.subscription}</td>
                </>
              )}
              <td>{course.name}</td>
              <td>{course.progress}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StudentDetailTable;
