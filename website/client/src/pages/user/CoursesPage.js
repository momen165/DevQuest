import React, { useState, useEffect } from 'react';
import 'styles/CoursesPage.css';
import CourseCard from 'components/CourseCard';
import FilterTabs from 'components/FilterTabs';
import Navbar from 'components/Navbar';

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch courses from the API
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/courses'); // Update this with your API endpoint
        if (!response.ok) {
          throw new Error('Failed to fetch courses');
        }
        const data = await response.json();
        setCourses(data); // Store fetched courses in state
        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load courses');
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  if (loading) {
    return <div>Loading courses...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="courses-page">
      <Navbar />
      <header className="courses-header">
        <p className="hero-head">All Courses</p>
        <p className="hero-para">
          A large number of courses on different topics are waiting for you.
          <br />
          You can find there everything from self-developing to sciences, for any knowledge levels.
        </p>
        <FilterTabs />
      </header>
      <section className="courses-grid">
        {courses.map((course) => (
          <CourseCard
            key={course.course_id}
            courseId={course.course_id}
            title={course.title}
            level={course.level}
            rating={course.rating || 'N/A'}
            students={course.users || 0} // Assuming `users` contains the student count
            description={course.description}
            image={course.image} // Image path from the backend
            color="#FEFEF2" // Optional default color
          />
        ))}
      </section>
    </div>
  );
};

export default CoursesPage;
