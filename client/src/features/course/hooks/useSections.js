import { useState } from 'react';
import apiClient from 'shared/lib/apiClient';

export const useSections = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const saveSection = async (sectionData) => {
    setLoading(true);
    setError('');
    try {
      if (sectionData.section_id) {
        // Update existing section
        const response = await apiClient.put(
          `/sections/${sectionData.section_id}`,
          sectionData
        );
        return { success: true, data: response.data, isUpdate: true };
      } else {
        // Add new section
        const response = await apiClient.post('/sections', sectionData);
        return { success: true, data: response.data, isUpdate: false };
      }
    } catch (err) {
      console.error('Error saving section:', err);
      const errorMessage = err.message === 'Authentication token not found'
        ? 'Please log in to continue'
        : 'Failed to save the section. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const deleteSection = async (sectionId) => {
    setLoading(true);
    setError('');
    try {
      await apiClient.delete(`/sections/${sectionId}`);
      return { success: true };
    } catch (err) {
      console.error('Error deleting section:', err);
      const errorMsg = err.response?.data?.message || 'Failed to delete section';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const reorderSections = async (reorderedSections) => {
    setLoading(true);
    setError('');
    try {
      const payload = reorderedSections.map((section, index) => ({
        section_id: section.section_id,
        order: index,
      }));

      await apiClient.post('/sections/reorder', { sections: payload });
      return { success: true };
    } catch (err) {
      console.error('Error reordering sections:', err);
      setError('Failed to reorder sections. Please try again.');
      return { success: false, error: 'Failed to reorder sections' };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    saveSection,
    deleteSection,
    reorderSections
  };
};
