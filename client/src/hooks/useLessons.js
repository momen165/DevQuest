import { useState, useEffect } from 'react';
import apiClient from 'utils/apiClient';

export const useLessons = (sectionId, token) => {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchLessons = async () => {
    if (!sectionId || !token) return;
    
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/admin/lessons', {
        params: { section_id: sectionId }
      });

      const lessonsWithFormattedContent = response.data.map(lesson => ({
        ...lesson,
        content: lesson.content || '',
        template_code: lesson.template_code || ''
      }));

      setLessons(lessonsWithFormattedContent || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch lessons');
      setLessons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, [sectionId, token]);

  const saveLesson = async (lessonData) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.put(
        `/lesson/${lessonData.lesson_id}`,
        lessonData
      );

      if (response.status === 200) {
        const updatedLessons = lessons.map(lesson =>
          lesson.lesson_id === lessonData.lesson_id ? response.data : lesson
        );
        setLessons(updatedLessons);
        return { success: true, data: response.data };
      }
      return { success: false, error: 'Failed to update lesson' };
    } catch (err) {
      console.error('Error saving lesson:', err);
      const errorMsg = err.response?.data?.message || 'An error occurred while saving the lesson';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const deleteLesson = async (lessonId) => {
    setLoading(true);
    setError('');
    try {
      await apiClient.delete(`/lesson/${lessonId}`);
      setLessons(lessons.filter(lesson => lesson.lesson_id !== lessonId));
      return { success: true };
    } catch (err) {
      console.error('Error deleting lesson:', err);
      const errorMsg = err.response?.data?.message || 'Failed to delete lesson';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const addLesson = async (lessonData) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.post('/lesson', lessonData);

      if (response.status === 201 || response.status === 200) {
        setLessons([...lessons, response.data]);
        return { success: true, data: response.data };
      }
      return { success: false, error: 'Failed to add lesson' };
    } catch (err) {
      console.error('Error adding lesson:', err);
      const errorMsg = err.response?.data?.message || 'Failed to add lesson';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const reorderLessons = async (reorderedLessons) => {
    setLessons(reorderedLessons);
    try {
      const payload = reorderedLessons.map((lesson, index) => ({
        lesson_id: lesson.lesson_id,
        order: index,
      }));

      await apiClient.post('/lessons/reorder', { lessons: payload });
    } catch (err) {
      console.error('Error reordering lessons:', err);
      setError('Failed to reorder lessons');
      fetchLessons(); // Revert on error
    }
  };

  return {
    lessons,
    loading,
    error,
    fetchLessons,
    saveLesson,
    deleteLesson,
    addLesson,
    reorderLessons
  };
};
