import React, { useState, useEffect } from 'react';
import '../../styles/CoursesPage.css';
import CourseCard from '../../components/CourseCard';
import FilterTabs from '../../components/FilterTabs';
import Navbar from '../../components/Navbar';
import SEOHead from '../../components/SEOHead';
import { useAuth } from '../../AuthContext';
import CircularProgress from '@mui/material/CircularProgress';
import Footer from '../../components/Footer';
import SupportForm from '../../components/SupportForm';
import axios from 'axios';
const api_url = import.meta.env.VITE_API_URL;

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const [userscount, setUserscount] = useState({});
  const [enrollments, setEnrollments] = useState({});
  const [progress, setProgress] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  useEffect(() => {
    const fetchOptimizedCoursesData = async () => {
      setLoading(true);
      try {
        // Use the new optimized endpoint that combines all data in one request
        const config = user?.token ? {
          headers: { Authorization: `Bearer ${user.token}` }
        } : {};

        const response = await axios.get(`${api_url}/optimized-courses`, config);
        const { courses, optimized } = response.data;

        // Transform the optimized data for component state
        const coursesData = courses.map(course => ({
          ...course,
          name: course.name || course.title // Ensure compatibility
        }));

        const userscountMap = {};
        const enrollmentsMap = {};
        const progressMap = {};

        courses.forEach(course => {
          userscountMap[course.course_id] = course.userscount || 0;
          if (course.is_enrolled) {
            enrollmentsMap[course.course_id] = true;
          }
          if (course.progress) {
            progressMap[course.course_id] = { progress: course.progress };
          }
        });

        setCourses(coursesData);
        setFilteredCourses(coursesData);
        setUserscount(userscountMap);
        setEnrollments(enrollmentsMap);
        setProgress(progressMap);

       
      } catch (err) {
        console.error('Error loading optimized courses data:', err);
        // Fallback to original approach if optimized endpoint fails
        try {
          const [coursesResponse, enrollmentsResponse] = await Promise.all([
            axios.get(`${api_url}/getCoursesWithRatings`),
            user?.user_id
              ? axios.get(`${api_url}/students/${user.user_id}/enrollments`)
              : Promise.resolve({}),
          ]);

          const { courses, userscount } = coursesResponse.data;
          setCourses(courses);
          setFilteredCourses(courses);
          setUserscount(userscount || {});
          setEnrollments(enrollmentsResponse.data || {});
        } catch (fallbackErr) {
          console.error('Fallback error:', fallbackErr);
          setError('Failed to load course data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOptimizedCoursesData();
  }, [user]);
  // Remove the separate progress fetching effect since it's now included in the optimized endpoint
  // useEffect(() => {
  //   const fetchProgress = async () => {
  //     if (!user) return;
  //     try {
  //       const response = await axios.get(`${api_url}/students/${user.user_id}`);
  //       setProgress(response.data.courses);
  //     } catch (err) {
  //       console.error('Error:', err);
  //       setError('Failed to load progress data');
  //     }
  //   };
  //   fetchProgress();
  // }, [user]);

  const handleFilter = (filter) => {
    switch (filter.toLowerCase()) {
      case 'all':
        setFilteredCourses([...courses].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        break;

      case 'difficulty':
        setFilteredCourses(
          [...courses].sort((a, b) => {
            const levels = { beginner: 1, intermediate: 2, advanced: 3 };
            return (
              (levels[a.difficulty?.toLowerCase()] || 0) -
              (levels[b.difficulty?.toLowerCase()] || 0)
            );
          })
        );
        break;

      case 'beginner':
        setFilteredCourses(
          courses.filter((course) => course.difficulty?.toLowerCase() === 'beginner')
        );
        break;

      case 'intermediate':
        setFilteredCourses(
          courses.filter((course) => course.difficulty?.toLowerCase() === 'intermediate')
        );
        break;

      case 'advanced':
        setFilteredCourses(
          courses.filter((course) => course.difficulty?.toLowerCase() === 'advanced')
        );
        break;

      case 'popular':
        setFilteredCourses(
          [...courses].sort(
            (a, b) => (userscount[b.course_id] || 0) - (userscount[a.course_id] || 0)
          )
        );
        break;

      case 'rating':
        setFilteredCourses([...courses].sort((a, b) => (b.rating || 0) - (a.rating || 0)));
        break;

      default:
        setFilteredCourses([...courses]);
    }
  };
  const handleSearch = (term) => {
    // FilterTabs is now passing the value directly as a string
    const searchTerm = typeof term === 'string' ? term.toLowerCase() : '';

    setSearchTerm(searchTerm);

    if (searchTerm === '') {
      setFilteredCourses(courses);
    } else {
      const searchResults = courses.filter((course) => {
        const name = (course.name || '').toLowerCase();
        const description = (course.description || '').toLowerCase();
        const difficulty = (course.difficulty || '').toLowerCase();

        return (
          name.includes(searchTerm) ||
          description.includes(searchTerm) ||
          difficulty.includes(searchTerm)
        );
      });
      setFilteredCourses(searchResults);
    }
  };

  // Structured data for courses page
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": "Programming Courses",
    "description": "Comprehensive collection of interactive programming courses",
    "provider": {
      "@type": "EducationalOrganization",
      "name": "DevQuest",
      "url": "https://www.dev-quest.me"
    },
    "courseMode": "online",
    "educationalLevel": "beginner to advanced",
    "teaches": [
      "Python Programming",
      "JavaScript Development", 
      "Java Programming",
      "C++ Programming",
      "Web Development",
      "Software Engineering"
    ]
  };

  // Structured data for each course (JSON-LD)
  const courseStructuredDataList = filteredCourses.map(course => ({
    "@context": "https://schema.org",
    "@type": "Course",
    "name": course.name,
    "description": course.description,
    "provider": {
      "@type": "EducationalOrganization",
      "name": "DevQuest",
      "url": "https://www.dev-quest.me"
    },
    "hasCourseInstance": [{
      "@type": "CourseInstance",
      "courseMode": "online",
      "instructor": {
        "@type": "Person",
        "name": "DevQuest Team"
      },
      "startDate": "2025-01-01",
      "endDate": "2025-12-31",
      "courseWorkload": "PT20H",
      "location": {
        "@type": "VirtualLocation",
        "url": "https://www.dev-quest.me"
      }
    }],
    "offers": {
      "@type": "Offer",
      "category": "Education",
      "url": `https://www.dev-quest.me/courses/${course.course_id}`,
      "price": course.price ?? "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    }
  }));

  return (
    <div className="courses-page">
      <SEOHead
        title="Programming Courses - Learn Python, JavaScript, Java & More | DevQuest"
        description="Explore our comprehensive catalog of interactive programming courses. Learn Python, JavaScript, Java, C++ and more with hands-on exercises, real-time feedback and personalized learning paths. Choose from beginner to advanced levels."
        keywords="programming courses, Python course, JavaScript course, Java programming, C++ tutorial, coding bootcamp, online programming, learn to code, developer courses, coding education"
        canonical="/CoursesPage"
        structuredData={structuredData}
      />
      {/* Inject JSON-LD for each course for Google rich results */}
      {courseStructuredDataList.map((data, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
          aria-hidden="true"
        />
      ))}
      <Navbar />
      <header className="courses-header">
        <FilterTabs onFilterChange={handleFilter} onSearch={handleSearch} searchTerm={searchTerm} />
      </header>
      <section className="courses-grid">
        {filteredCourses.map((course) => (
          <CourseCard
            key={course.course_id}
            courseId={course.course_id}
            title={course.name}
            level={course.difficulty || 'Unknown'}
            rating={course.rating || 'N/A'}
            students={userscount[course.course_id] || 0}
            description={course.description}
            image={course.image}
            language_id={course.language_id}
            isEnrolled={!!enrollments[course.course_id]}
            progress={
              // Support both array format (legacy) and object format (optimized)
              Array.isArray(progress)
                ? progress.find((p) => p.course_id === course.course_id)?.progress || 0
                : progress[course.course_id]?.progress || 0
            }
          />
        ))}
      </section>
      <SupportForm />
      <Footer />
    </div>
  );
};

export default CoursesPage;
