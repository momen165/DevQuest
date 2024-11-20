import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from 'components/Navbar';
import LessonList from 'components/LessonSection';
import axios from 'axios';
import 'styles/CourseSections.css';

const CourseSection = () => {
  const { courseId } = useParams();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSections = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(`http://localhost:5000/api/section?course_id=${courseId}`);
        setSections(response.data);
      } catch (err) {
        setError('Failed to fetch sections.');
        console.error('Error fetching sections:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSections();
  }, [courseId]);

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
