import React from 'react';
import 'styles/CoursesPage.css';
import CourseCard from 'components/CourseCard';
import FilterTabs from 'components/FilterTabs';
import Navbar from 'components/Navbar';
import SEOHead from 'components/SEOHead';
import AdSense from 'components/AdSense';
import { useAuth } from 'AuthContext';
import LoadingSpinner from 'components/LoadingSpinner';
import Footer from 'components/Footer';
import SupportForm from 'components/SupportForm';
import { useCourses } from 'hooks/useCourses';

const CoursesPage = () => {
  const { user } = useAuth();
  const {
    filteredCourses,
    loading,
    error,
    userscount,
    enrollments,
    progress,
    searchTerm,
    handleFilter,
    handleSearch
  } = useCourses(user);

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

  if (loading) {
    return <LoadingSpinner fullScreen message="Exploring our courses..." />;
  }

  if (error) {
    return (
      <div className="courses-error-container">
        <Navbar />
        <div className="error-message">
          <h2>Oops! Something went wrong</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Try Again
          </button>
        </div>
        <Footer />
      </div>
    );
  }

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

      {/* Ad Unit - Below header, above courses */}
      <div style={{ margin: '30px auto', maxWidth: '1200px', minWidth: '300px', width: '100%', textAlign: 'center' }}>
        <AdSense />
      </div>

      <section className="courses-grid">
        {filteredCourses.length > 0 ? (
          filteredCourses.map((course) => (
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
          ))
        ) : (
          <div className="no-courses-found">
            <h3>No courses found matching "{searchTerm}"</h3>
            <p>Try searching for a different language or difficulty level.</p>
          </div>
        )}
      </section>
      <SupportForm />
      <Footer />
    </div>
  );
};
export default CoursesPage;
