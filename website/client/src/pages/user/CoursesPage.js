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
  const [userscount, setUserscount] = useState({});
  const [enrollments, setEnrollments] = useState({});
  const [progress, setProgress] = useState({});

  useEffect(() => {
    const fetchCoursesAndRatings = async () => {
      try {
        const response = await fetch('/api/getCoursesWithRatings', {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch courses and ratings');
        }

        const data = await response.json();
        const { courses, ratings, userscount } = data;

        setCourses(courses);
        setFilteredCourses(courses);
        setRatings(ratings);
        setLoading(false);
        setUser(user);
        setUserscount(userscount);

        const enrollmentsResponse = await fetch(`/api/students/${user.user_id}/enrollments`);
        if (!enrollmentsResponse.ok) {
          throw new Error('Failed to fetch enrollments');
        }
        const enrollmentsData = await enrollmentsResponse.json();
        setEnrollments(enrollmentsData);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load data');
        setLoading(false);
      }
    };

    fetchCoursesAndRatings();
  }, [user]);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/students/${user.user_id}/progress`);
        if (!response.ok) {
          throw new Error('Failed to fetch progress');
        }
        const progressData = await response.json();
        setProgress(progressData);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load progress data');
      }
    };

    if (user) {
      fetchProgress();
    }
  }, [user]);

  const handleFilter = (filter) => {
    if (filter === 'All') {
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
    } else if (filter === 'popular') {
      setFilteredCourses([...courses].sort((a, b) => (userscount[b.course_id] || 0) - (userscount[a.course_id] || 0)));
    } else if (filter === 'rating') {
      setFilteredCourses([...courses].sort((a, b) => ratings[b.course_id] - ratings[a.course_id]));
    }
  };

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
          <FilterTabs onFilterChange={handleFilter} />
        </header>
        <section className="courses-grid">
          {filteredCourses.map((course) => (
              <CourseCard
                  key={course.course_id}
                  courseId={course.course_id}
                  title={course.name}
                  level={course.difficulty || 'Unknown'}
                  rating={ratings[course.course_id] || 'N/A'}
                  students={userscount[course.course_id] || 0}
                  description={course.description}
                  image={course.image}
                  color="#FEFEF2"
                  isEnrolled={!!enrollments[course.course_id]}
                  progress={progress[course.course_id] || 0}
              />
          ))}
        </section>
      </div>
  );
};

export default CoursesPage;