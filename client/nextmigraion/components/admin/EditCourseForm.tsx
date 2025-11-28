import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import axios from 'axios';
import '@/styles/admin/AddEditCourseComponent.css';
import { FaUpload } from 'react-icons/fa';
import ErrorAlert from './ErrorAlert';

interface Course {
  course_id?: number;
  title?: string;
  description?: string;
  status?: string;
  difficulty?: string;
  language_id?: number | string;
}

interface EditCourseFormProps {
  course: Course | null;
  onClose: () => void;
  onSave: () => void;
  onFileUpload?: (file: File) => Promise<string>;
  languageOptions?: { id: string; name: string }[];
}

const EditCourseForm: React.FC<EditCourseFormProps> = ({
  course,
  onClose,
  onSave,
  languageOptions = [
    { id: '100', name: 'Python (3.12.5)' },
    { id: '62', name: 'Java (OpenJDK 13.0.1)' },
    { id: '105', name: 'C++ (GCC 14.1.0)' },
    { id: '102', name: 'JavaScript (Node.js 22.08.0)' },
    { id: '68', name: 'PHP (7.4.1)' },
    { id: '72', name: 'Ruby (2.7.0)' },
    { id: '104', name: 'C (Clang 18.1.8)' },
    { id: '101', name: 'TypeScript (5.6.2)' },
    { id: '78', name: 'Kotlin (1.3.70)' },
    { id: '73', name: 'Rust (1.40.0)' },
    { id: '51', name: 'C# (Mono 6.6.0.161)' },
    { id: '95', name: 'Go (1.18.5)' },
    { id: '83', name: 'Swift (5.2.3)' },
    { id: '61', name: 'Haskell (GHC 8.8.1)' },
  ]
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Published');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [image, setImage] = useState<File | null>(null);
  const [languageId, setLanguageId] = useState<string>(languageOptions[0]?.id || '100');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const statusOptions = [
    { value: 'Published', label: 'Published' },
    { value: 'Draft', label: 'Draft' },
  ];
  const difficultyOptions = [
    { value: 'Beginner', label: 'Beginner' },
    { value: 'Intermediate', label: 'Intermediate' },
    { value: 'Advanced', label: 'Advanced' },
  ];
  const languageSelectOptions = languageOptions.map(lang => ({ value: lang.id, label: lang.name }));

  const customSelectStyles = {
    control: (provided: any) => ({
      ...provided,
      backgroundColor: '#3e4c5d',
      color: 'white',
      borderColor: '#3e4c5d',
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: 'white',
    }),
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: '#3e4c5d',
      color: 'white',
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isFocused ? '#2c3746' : '#3e4c5d',
      color: 'white',
      cursor: 'pointer',
    }),
    input: (provided: any) => ({
      ...provided,
      color: 'white',
    }),
    dropdownIndicator: (provided: any) => ({
      ...provided,
      color: 'white',
    }),
    indicatorSeparator: (provided: any) => ({
      ...provided,
      backgroundColor: 'white',
    }),
  };

  useEffect(() => {
    if (course) {
      setTitle(course.title || '');
      setDescription(course.description || '');
      setStatus(course.status || 'Published');
      setDifficulty(course.difficulty || 'Beginner');
      setLanguageId(course.language_id?.toString() || '100');
    }
  }, [course]);

  const handleSave = async () => {
    setError('');

    if (!title.trim()) {
      setError('Course title is required.');
      return;
    }
    if (!description.trim()) {
      setError('Course description is required.');
      return;
    }

    setLoading(true);

    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const token = userData?.token;

    if (!token) {
      setError('User is not authenticated.');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('status', status);
      formData.append('difficulty', difficulty);
      formData.append('language_id', languageId);

      if (image) {
        formData.append('image', image);
      }

      if (course && course.course_id) {
        await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/courses/${course.course_id}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/courses`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      onSave();
    } catch (err: any) {
      console.error('Error saving course:', err);
      setError('Failed to save the course. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="edit-course-form">
      <h2>{course ? 'Edit Course' : 'Add New Course'}</h2>

      {error && <ErrorAlert message={error} onClose={() => setError('')} />}

      <div>
        <label>Course Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div>
        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div>
        <label>Status</label>
        <Select
          value={statusOptions.find(opt => opt.value === status)}
          onChange={(opt) => setStatus(opt?.value || 'Published')}
          options={statusOptions}
          styles={customSelectStyles}
          isSearchable={false}
        />
      </div>
    
      <div>
        <label>Difficulty</label>
        <Select
          value={difficultyOptions.find(opt => opt.value === difficulty)}
          onChange={(opt) => setDifficulty(opt?.value || 'Beginner')}
          options={difficultyOptions}
          styles={customSelectStyles}
          isSearchable={false}
        />
      </div>

      <div>
        <label>Programming Language</label>
        <Select
          value={languageSelectOptions.find(opt => opt.value === languageId)}
          onChange={(opt) => setLanguageId(opt?.value || '100')}
          options={languageSelectOptions}
          styles={customSelectStyles}
          isSearchable={false}
        />
      </div>

      <div className="file-upload-container-isolated">
        <label htmlFor="file-upload-isolated" className="upload-button-isolated">
          <FaUpload className="upload-icon-isolated" />
          Upload Image
        </label>
        <input
          id="file-upload-isolated"
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files ? e.target.files[0] : null)}
          style={{ display: 'none' }}
        />
      </div>

      <div className="form-actions">
        <button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          className="cancel-button"
          onClick={() => {
            if (typeof onClose === 'function') {
              onClose();
            }
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default EditCourseForm;
