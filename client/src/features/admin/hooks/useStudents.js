import { useState, useEffect } from 'react';
import apiClient from 'shared/lib/apiClient';

const deduplicateStudents = (students) => {
  const seen = new Set();
  return students.filter((student) => {
    if (seen.has(student.user_id)) {
      return false;
    }
    seen.add(student.user_id);
    return true;
  });
};

export const useStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/students');
      const uniqueStudents = deduplicateStudents(response.data.students || []);
      setStudents(uniqueStudents);
    } catch (err) {
      console.error('Error fetching students:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to fetch students.');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  return {
    students,
    loading,
    error,
    fetchStudents,
  };
};

export default useStudents;
