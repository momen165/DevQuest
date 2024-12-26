import React, { useState, useEffect } from 'react';
import 'styles/CoursesPage.css';
import CourseCard from 'components/CourseCard';
import FilterTabs from 'components/FilterTabs';
import Navbar from 'components/Navbar';
import { useAuth } from 'AuthContext';
import CircularProgress from "@mui/material/CircularProgress";
import SupportForm from 'components/SupportForm';
import axios from 'axios';
import AnimatedLogo from 'components/AnimatedLogo';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

const isCacheValid = (timestamp) => {
  if (!timestamp) return false;
  return (new Date().getTime() - timestamp) < CACHE_DURATION;
};

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
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchCoursesAndRatings = async () => {
      setLoading(true);
      try {
        const cachedData = localStorage.getItem('coursesData');
        const parsedCache = cachedData ? JSON.parse(cachedData) : null;
        
        if (parsedCache && isCacheValid(parsedCache.timestamp)) {
          setCourses(parsedCache.courses);
          setFilteredCourses(parsedCache.courses);
          setRatings(parsedCache.ratings);
          setUserscount(parsedCache.userscount);
        }
        
        const [coursesResponse, enrollmentsResponse] = await Promise.all([
          axios.get('/api/getCoursesWithRatings'),
          user?.user_id
              ? axios.get(`/api/students/${user.user_id}/enrollments`)
              : Promise.resolve({}),
        ]);

        const {courses, ratings, userscount} = coursesResponse.data;

        setCourses(courses);
        setFilteredCourses(courses);
        setRatings(ratings || {});
        setUserscount(userscount || {});
        setEnrollments(enrollmentsResponse.data || {});

        localStorage.setItem('coursesData', JSON.stringify({
          courses,
          ratings,
          userscount,
          timestamp: new Date().getTime()
        }));
        
        if (user?.user_id) {
          localStorage.setItem(`enrollments_${user.user_id}`, JSON.stringify({
            data: enrollmentsResponse.data,
            timestamp: new Date().getTime()
          }));
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
        const response = await axios.get(`/api/students/${user.user_id}`);
        setProgress(response.data.courses); // Assuming progress data is in courses array
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
    switch (filter.toLowerCase()) {
      case 'all':
        setFilteredCourses([...courses].sort((a, b) => 
          (a.name || '').localeCompare(b.name || '')
        ));
        break;
        
      case 'difficulty':
        setFilteredCourses([...courses].sort((a, b) => {
          const levels = { beginner: 1, intermediate: 2, advanced: 3 };
          return (levels[a.difficulty?.toLowerCase()] || 0) - (levels[b.difficulty?.toLowerCase()] || 0);
        }));
        break;
        
      case 'beginner':
        setFilteredCourses(
          courses.filter((course) => 
            course.difficulty?.toLowerCase() === 'beginner'
          )
        );
        break;
        
      case 'intermediate':
        setFilteredCourses(
          courses.filter((course) => 
            course.difficulty?.toLowerCase() === 'intermediate'
          )
        );
        break;
        
      case 'advanced':
        setFilteredCourses(
          courses.filter((course) => 
            course.difficulty?.toLowerCase() === 'advanced'
          )
        );
        break;
        
      case 'popular':
        setFilteredCourses([...courses].sort((a, b) => 
          (userscount[b.course_id] || 0) - (userscount[a.course_id] || 0)
        ));
        break;
        
      case 'rating':
        setFilteredCourses([...courses].sort((a, b) => 
          (ratings[b.course_id] || 0) - (ratings[a.course_id] || 0)
        ));
        break;
        
      default:
        setFilteredCourses([...courses]);
    }
  };

  const handleSearch = (event) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);
    
    if (term === '') {
      setFilteredCourses(courses);
    } else {
      const searchResults = courses.filter(course => {
        const name = (course.name || '').toLowerCase();
        const description = (course.description || '').toLowerCase();
        const difficulty = (course.difficulty || '').toLowerCase();
        
        return name.includes(term) ||
               description.includes(term) ||
               difficulty.includes(term);
      });
      setFilteredCourses(searchResults);
    }
  };

  return (
      <div className="courses-page">
        <Navbar />
        <header className="courses-header">
          <AnimatedLogo />
          <p className="hero-head">All Courses</p>
          <p className="hero-para">
            A large number of courses on different topics are waiting for you.
            <br />
            You can find there everything from self-developing to sciences, for any knowledge levels.
          </p>
          <div className="search-container">
            <input
              type="text"
              className="search-bar"
              placeholder="Search for courses..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
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
                language_id={course.language_id}
                isEnrolled={!!enrollments[course.course_id]}
                progress={
                  Array.isArray(progress) 
                    ? progress.find(p => p.course_id === course.course_id)?.progress || 0 
                    : 0
                }
              />
          ))}
        </section> 
        <SupportForm/>
      </div>
  );
};

export default CoursesPage;