import { useState, useEffect } from 'react';
import apiClient from 'shared/lib/apiClient';

export const useAdminCourses = (token) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCourses = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/courses', {
        params: { _ts: Date.now() },
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });
      setCourses(response.data);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
      setError('Failed to fetch courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [token]);

  const saveCourse = async (courseData, courseId = null) => {
    setLoading(true);
    setError(null);
    try {
      if (courseId) {
        const response = await apiClient.put(
          `/courses/${courseId}`,
          courseData
        );
        setCourses(courses.map(c => c.course_id === courseId ? response.data : c));
        return { success: true, data: response.data };
      } else {
        const response = await apiClient.post(
          '/courses',
          courseData
        );
        setCourses([...courses, response.data]);
        return { success: true, data: response.data };
      }
    } catch (err) {
      console.error('Failed to save course:', err);
      const errorMsg = err.response?.data?.error || 'Failed to save course.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const deleteCourse = async (courseId) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.delete(`/courses/${courseId}`);
      setCourses(courses.filter(c => c.course_id !== courseId));
      return { success: true };
    } catch (err) {
      console.error('Failed to delete course:', err);
      const errorMsg = err.response?.data?.error || 'Failed to delete course.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async (courseId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/sections', {
        params: { course_id: courseId }
      });
      return response.data;
    } catch (err) {
      console.error('Failed to fetch sections:', err);
      const errorMsg = 'Failed to fetch sections.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const deleteSection = async (sectionId) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.delete(`/sections/${sectionId}`);
      return { success: true };
    } catch (err) {
      console.error('Failed to delete section:', err);
      const errorMsg = 'Failed to delete section.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  return {
    courses,
    loading,
    error,
    fetchCourses,
    saveCourse,
    deleteCourse,
    fetchSections,
    deleteSection
  };
};

export default useAdminCourses;
