import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from 'components/Navbar';
import LessonList from 'components/LessonSection';
import axios from 'axios';
import 'styles/CourseSections.css';
import { useAuth } from 'AuthContext';

const CourseSection = () => {
  const { courseId } = useParams(); // Extract courseId from route params
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Get the current user from AuthContext
  const { user } = useAuth();

  useEffect(() => {
    const fetchSections = async () => {
      setLoading(true);
      setError('');
      try {
        // Ensure user is authenticated and token is available
        if (!user || !user.token) {
          setError('User is not authenticated.');
          return;
        }

        // Fetch sections for the given course
        const response = await axios.get(`/api/section?course_id=${courseId}`, {
          headers: {
            Authorization: `Bearer ${user.token}`, // Pass the token in headers
          },
        });
        setSections(response.data); // Update state with sections data
      } catch (err) {
        setError('Failed to fetch sections.');
        console.error('Error fetching sections:', err);
      } finally {
        setLoading(false); // Stop the loading spinner
      }
    };

    fetchSections();
  }, [courseId, user]); // Re-run if courseId or user changes

  return (
    <>
      <Navbar />
      <div className="Page">
        <div className="Section">
          <h1>Course Sections</h1>
          {loading ? (
            <p>Loading sections...</p>
          ) : error ? (
            <p className="error">{error}</p>
          ) : sections.length === 0 ? (
            <p>No sections found for this course.</p>
          ) : (
            sections.map((section) => (
              <LessonList
                key={section.section_id}
                sectionName={section.name}
                sectionId={section.section_id}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default CourseSection;
