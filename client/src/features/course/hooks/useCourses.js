import { useState, useEffect } from "react";
import axios from "axios";

const api_url = import.meta.env.VITE_API_URL;

export const useCourses = (user) => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userscount, setUserscount] = useState({});
  const [enrollments, setEnrollments] = useState({});
  const [progress, setProgress] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchOptimizedCoursesData = async () => {
      setLoading(true);
      try {
        const config = user?.token
          ? {
              headers: { Authorization: `Bearer ${user.token}` },
            }
          : {};

        const response = await axios.get(`${api_url}/optimized-courses`, config);
        const { courses: coursesDataFromApi } = response.data;

        const coursesData = coursesDataFromApi.map((course) => ({
          ...course,
          name: course.name || course.title,
        }));

        const userscountMap = {};
        const enrollmentsMap = {};
        const progressMap = {};

        coursesDataFromApi.forEach((course) => {
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
        console.error("Error loading optimized courses data:", err);
        try {
          const [coursesResponse, enrollmentsResponse] = await Promise.all([
            axios.get(`${api_url}/getCoursesWithRatings`),
            user?.user_id
              ? axios.get(`${api_url}/students/${user.user_id}/enrollments`)
              : Promise.resolve({}),
          ]);

          const { courses: fallbackCourses, userscount: fallbackUserscount } = coursesResponse.data;
          setCourses(fallbackCourses);
          setFilteredCourses(fallbackCourses);
          setUserscount(fallbackUserscount || {});
          setEnrollments(enrollmentsResponse.data || {});
        } catch (fallbackErr) {
          console.error("Fallback error:", fallbackErr);
          setError("Failed to load course data");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOptimizedCoursesData();
  }, [user]);

  const handleFilter = (filter) => {
    switch (filter.toLowerCase()) {
      case "all":
        setFilteredCourses([...courses].sort((a, b) => (a.name || "").localeCompare(b.name || "")));
        break;
      case "difficulty":
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
      case "beginner":
        setFilteredCourses(
          courses.filter((course) => course.difficulty?.toLowerCase() === "beginner")
        );
        break;
      case "intermediate":
        setFilteredCourses(
          courses.filter((course) => course.difficulty?.toLowerCase() === "intermediate")
        );
        break;
      case "advanced":
        setFilteredCourses(
          courses.filter((course) => course.difficulty?.toLowerCase() === "advanced")
        );
        break;
      case "popular":
        setFilteredCourses(
          [...courses].sort(
            (a, b) => (userscount[b.course_id] || 0) - (userscount[a.course_id] || 0)
          )
        );
        break;
      case "rating":
        setFilteredCourses([...courses].sort((a, b) => (b.rating || 0) - (a.rating || 0)));
        break;
      default:
        setFilteredCourses([...courses]);
    }
  };

  const handleSearch = (term) => {
    const termLower = typeof term === "string" ? term.toLowerCase() : "";
    setSearchTerm(termLower);

    if (termLower === "") {
      setFilteredCourses(courses);
    } else {
      const searchResults = courses.filter((course) => {
        const name = (course.name || "").toLowerCase();
        const description = (course.description || "").toLowerCase();
        const difficulty = (course.difficulty || "").toLowerCase();

        return (
          name.includes(termLower) ||
          description.includes(termLower) ||
          difficulty.includes(termLower)
        );
      });
      setFilteredCourses(searchResults);
    }
  };

  return {
    courses,
    filteredCourses,
    loading,
    error,
    userscount,
    enrollments,
    progress,
    searchTerm,
    handleFilter,
    handleSearch,
  };
};
