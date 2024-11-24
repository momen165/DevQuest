import React, { useState, useEffect } from 'react';
import 'styles/CoursesPage.css';
import CourseCard from 'components/CourseCard';
import FilterTabs from 'components/FilterTabs';
import Navbar from 'components/Navbar';
import { useAuth } from 'AuthContext';
const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, setUser } = useAuth();
  // Fetch courses and ratings from the API
  useEffect(() => {
    const fetchCoursesAndRatings = async () => {
      try {
        const coursesResponse = await fetch('/api/courses');
        if (!coursesResponse.ok) {
          throw new Error('Failed to fetch courses');
        }
        const coursesData = await coursesResponse.json();
  
        const ratingsResponse = await fetch('/api/feedback',{
       
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      }); // Use the new GET API for feedback

        if (!ratingsResponse.ok) {
          throw new Error('Failed to fetch feedback');
        }
        const ratingsData = await ratingsResponse.json();
  
        console.log("Fetched Ratings Data:", ratingsData); // Debugging line
  
        setCourses(coursesData);
        setFilteredCourses(coursesData);
        setRatings(ratingsData); // Set the ratings for courses
        setLoading(false);  
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load data');
        setLoading(false);
      }
    };
  
    fetchCoursesAndRatings();
  }, []);
  
  // Handle filter change
  // In CoursesPage.js
// Update the filter function
const handleFilter = (filter) => {
  if (filter === 'All') {
    setFilteredCourses(courses);
  } else if (filter === 'Name') {
    setFilteredCourses([...courses].sort((a, b) => a.title?.localeCompare(b.title)));
  } else if (filter === 'Difficulty') {
    setFilteredCourses(
      [...courses].sort((a, b) => {
        const levels = { Beginner: 1, Intermediate: 2, Advanced: 3 };
        return (levels[a.difficulty] || 0) - (levels[b.difficulty] || 0);
      })
    );
  } else if (filter === 'Beginner') {
    setFilteredCourses(courses.filter((course) => course.difficulty === 'Beginner'));
  }
};

// Update the debug logging
console.log("Course Difficulties:", courses.map(course => course.difficulty));

  if (loading) {
    return <div>Loading courses...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }
  console.log("Course Levels:", courses.map(course => course.difficulty));
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
        <FilterTabs onFilterChange={handleFilter} />
      </header>
      <section className="courses-grid">
        {filteredCourses.map((course) => (
          <CourseCard
            key={course.course_id}
            courseId={course.course_id}
            title={course.title}
            level={course.difficulty}
            
            rating={ratings[course.course_id] || 'N/A'}  // Show average rating or 'N/A'
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
