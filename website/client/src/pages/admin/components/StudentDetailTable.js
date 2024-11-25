import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StudentDetailTable = ({ studentId }) => {
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);

  const [error, setError] = useState(null);

  useEffect(() => {
    if (!studentId) {
      console.error('Invalid student ID:', studentId);
      setError('Invalid student ID.');
      return;
    }

    const fetchStudentDetails = async () => {
      try {
       
        const userData = JSON.parse(localStorage.getItem('user'));
        const token = userData ? userData.token : null;

        if (!token) {
          setError('No token found. Please log in again.');
          return;
        }

        // Fetch student details
        const studentResponse = await axios.get(
          `/api/students/${studentId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setStudent(studentResponse.data);

        // Fetch courses associated with the student
        try {
          const coursesResponse = await axios.get(
            `/api/students/${studentId}/courses`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          console.log('Fetched Courses:', coursesResponse.data); // Debug API response
          setCourses(coursesResponse.data);
        } catch (courseErr) {
          if (courseErr.response?.status === 404) {
            console.warn('No courses found for the student.');
            setCourses([]); // No courses for the student
          } else {
            throw courseErr;
          }
        }
      } catch (err) {
        console.error('Error fetching student details:', err);
        setError('Failed to load student details.');
      } finally {
        
      }
    };

    fetchStudentDetails();
  }, [studentId]);

  if (!studentId) return <div>Please select a valid student to view details.</div>;
 
  if (error) return <div>{error}</div>;

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
          {courses.length > 0 ? (
            courses.map((course, index) => (
              <tr key={index}>
                {index === 0 && (
                  <>
                    <td rowSpan={courses.length}>{student.user_id}</td>
                    <td rowSpan={courses.length}>{student.name}</td>
                    <td rowSpan={courses.length}>{student.email}</td>
                    <td rowSpan={courses.length}>{student.subscription || 'N/A'}</td>
                  </>
                )}
                <td>{course.course_name || 'Unnamed Course'}</td>
                <td>{course.progress || '0%'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6">No courses found for this student.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default StudentDetailTable;
