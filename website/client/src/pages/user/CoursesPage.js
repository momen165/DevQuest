import React, { useState, useEffect } from 'react';
import 'styles/CoursesPage.css';
import CourseCard from 'components/CourseCard';
import FilterTabs from 'components/FilterTabs';
import Navbar from 'components/Navbar';
import { useAuth } from 'AuthContext';
import CircularProgress from "@mui/material/CircularProgress";

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const [userscount, setUserscount] = useState({});
  const [enrollments, setEnrollments] = useState({});
  const [progress, setProgress] = useState({});

  useEffect(() => {
    const fetchCoursesAndRatings = async () => {
      setLoading(true);
      try {
        const cachedData = localStorage.getItem('coursesData');
        const cachedEnrollments = localStorage.getItem(`enrollments_${user?.user_id}`);

        if (cachedData) {
          const {courses, ratings, userscount} = JSON.parse(cachedData);
          setCourses(courses);
          setFilteredCourses(courses);
          setRatings(ratings);
          setUserscount(userscount);
        }

        if (user?.user_id && cachedEnrollments) {
          setEnrollments(JSON.parse(cachedEnrollments));
        }

        // Always fetch updated data
        const [coursesResponse, enrollmentsResponse] = await Promise.all([
          fetch('/api/getCoursesWithRatings').then(res => res.json()),
          user?.user_id
              ? fetch(`/api/students/${user.user_id}/enrollments`).then(res => res.json())
              : Promise.resolve({}),
        ]);

        const {courses, ratings, userscount} = coursesResponse;

        // Update state with fresh data
        setCourses(courses);
        setFilteredCourses(courses);
        setRatings(ratings || {});
        setUserscount(userscount || {});
        setEnrollments(enrollmentsResponse || {});

        // Cache the data
        localStorage.setItem('coursesData', JSON.stringify({courses, ratings, userscount}));
        if (user?.user_id) {
          localStorage.setItem(`enrollments_${user.user_id}`, JSON.stringify(enrollmentsResponse));
        }
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchCoursesAndRatings();
  }, [user]);


  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/students/${user.user_id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch progress');
        }
        const progressData = await response.json();
        setProgress(progressData.courses); // Assuming progress data is in courses array
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
              progress={Array.isArray(progress) ? progress.find(p => p.course_id === course.course_id)?.progress || 0 : 0}
            />
          ))}
        </section> 
      </div>
  );
};

export default CoursesPage;