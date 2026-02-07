import React, { useState } from 'react';
import {
  FiSave,
  FiTrash2,
  FiEdit2,
  FiPlus,
  FiFileText,
  FiBook,
  FiAward,
  FiCode,
  FiTerminal,
  FiHelpCircle,
  FiCheckCircle,
  FiX,
} from 'react-icons/fi';
import axios from 'axios';
import './AdminManage.css';
import CustomEditor from 'features/editor/components/CustomEditor';
import SimpleMonacoEditor from 'features/editor/components/SimpleMonacoEditor';
import TestCaseManager from 'features/editor/components/TestCaseManager';
import LoadingSpinner from 'shared/ui/LoadingSpinner';
import ErrorAlert from './ErrorAlert';
import { useAuth } from 'app/AuthContext';
import { decode as decodeEntities } from 'entities';
import { languageMappings } from 'features/lesson/utils/lessonConstants';
import { validateRequired, validateNumberRange } from 'shared/utils/formValidation';

const DEFAULT_LESSON_TEMPLATE = `<div class="lesson-template">
  <h1 class="lesson-template-heading">Exercise</h1>
... [truncated for brevity, keep existing constant]
</div>`;

const LessonForm = ({ section, lesson = null, languageId, onSave, onCancel, onDelete }) => {
  const { user } = useAuth();

  // Helper function for default test case
  const getDefaultTestCase = () => ({
    input: '',
    expected_output: '',
    auto_detect: false,
    use_pattern: false,
    pattern: '',
  });

  // Group related state together
  const [lessonName, setLessonName] = useState(lesson?.name || '');
  const [editorData, setEditorData] = useState(() => lesson?.content || DEFAULT_LESSON_TEMPLATE);
  const [xp, setXp] = useState(lesson?.xp || 0);
  const [templateCode, setTemplateCode] = useState(() => {
    if (lesson?.template_code) {
      return decodeEntities(lesson.template_code);
    }
    return '';
  });
  const [hint, setHint] = useState(lesson?.hint || '');
  const [solution, setSolution] = useState(lesson?.solution || '');

  // UI state
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Test cases state
  const [test_cases, setTestCases] = useState(() => {
    if (lesson?.test_cases) {
      try {
        const cases = Array.isArray(lesson.test_cases)
          ? lesson.test_cases
          : JSON.parse(lesson.test_cases);
        return cases.map((test) => ({
          input: test.input || '',
          expected_output: test.auto_detect ? '' : test.expected_output || '',
          auto_detect: test.auto_detect === true,
          use_pattern: test.use_pattern === true,
          pattern: test.pattern || '',
        }));
      } catch (error) {
        console.error('Error parsing test cases:', error);
        return [getDefaultTestCase()];
      }
    }
    return [getDefaultTestCase()];
  });

  // Validation function
  const validate = () => {
    const nameValidation = validateRequired(lessonName, 'Lesson name');
    if (!nameValidation.isValid) {
      setError(nameValidation.error);
      return false;
    }

    const xpValidation = validateNumberRange(xp, { min: 0, fieldName: 'XP' });
    if (!xpValidation.isValid) {
      setError(xpValidation.error);
      return false;
    }

    for (let i = 0; i < test_cases.length; i++) {
      const testCase = test_cases[i];
      if (!testCase.auto_detect && !testCase.use_pattern && !testCase.expected_output.trim()) {
        setError(
          `Test case ${i + 1}: Expected output is required when not using auto-detect or pattern validation`
        );
        return false;
      }

      if (testCase.use_pattern && !testCase.pattern.trim()) {
        setError(`Test case ${i + 1}: Pattern is required when pattern validation is enabled`);
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    setIsSaving(true);
    setError('');

    const processedTestCases = test_cases.map((test) => ({
      input: test.input || '',
      auto_detect: test.auto_detect === true,
      use_pattern: test.use_pattern === true,
      pattern: test.pattern || '',
      expected_output: test.auto_detect ? '' : test.expected_output || '',
    }));

    try {
      const lessonData = {
        section_id: section.section_id,
        name: lessonName,
        content: editorData,
        xp: parseInt(xp),
        test_cases: processedTestCases,
        template_code: templateCode,
        hint,
        solution,
        auto_detect: test_cases[0]?.auto_detect || false,
      };

      const url = lesson
        ? `${import.meta.env.VITE_API_URL}/lesson/${lesson.lesson_id}`
        : `${import.meta.env.VITE_API_URL}/lesson`;

      const method = lesson ? 'put' : 'post';

      const response = await axios[method](url, lessonData, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200 || response.status === 201) {
        onSave(response.data);
      } else {
        setError(`Failed to ${lesson ? 'update' : 'create'} lesson`);
      }
    } catch (err) {
      console.error('Error saving lesson:', err);
      setError(err.response?.data?.message || 'An error occurred while saving the lesson');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!lesson?.lesson_id) return;
    if (!window.confirm('Are you sure you want to delete this lesson?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/lesson/${lesson.lesson_id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      onDelete(lesson.lesson_id);
    } catch (err) {
      console.error('Error deleting lesson:', err);
      alert('Failed to delete lesson.');
    }
  };

  return (
    <div className={`form-container ${isSaving ? 'form-loading' : ''}`}>
      {isSaving && <LoadingSpinner message="Saving lesson..." fullScreen />}
      {error && <ErrorAlert message={error} onClose={() => setError('')} />}

      <div className="form-header">
        <h3 className="form-title">
          {lesson ? <FiEdit2 size={20} /> : <FiPlus size={20} />}
          {lesson ? 'Edit Lesson' : 'Add New Lesson'}
        </h3>
      </div>

      <form className="lesson-form">
        <div className="form-group">
          <label className="form-label">
            <FiFileText size={14} /> Lesson Name
          </label>
          <input
            type="text"
            className="form-input"
            value={lessonName}
            onChange={(e) => setLessonName(e.target.value)}
            placeholder="Enter a descriptive name for the lesson"
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <FiBook size={14} /> Lesson Content
          </label>
          <div className="editor-container">
            <CustomEditor
              initialData={editorData}
              onChange={setEditorData}
              className="lesson-editor"
              config={{
                placeholder: 'Start writing your lesson content here...',
              }}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            <FiAward size={14} /> Experience Points (XP)
          </label>
          <input
            type="number"
            className="form-input"
            value={xp}
            onChange={(e) => setXp(Number(e.target.value))}
            placeholder="Enter XP value"
            min="0"
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <FiTerminal size={14} /> Test Cases
          </label>
          <TestCaseManager testCases={test_cases} onChange={setTestCases} />
        </div>

        <div className="form-group">
          <label className="form-label">
            <FiCode size={14} /> Starter Template Code
          </label>
          <div className="editor-container" style={{ height: '400px', marginBottom: '1rem' }}>
            <SimpleMonacoEditor
              code={templateCode}
              setCode={setTemplateCode}
              language={languageId ? languageMappings[languageId] || 'plaintext' : 'plaintext'}
            />
          </div>
          <small className="form-text text-muted">
            This code will be provided as a starting point for students.
            {languageId && languageMappings[languageId] && (
              <span> (Language: {languageMappings[languageId]})</span>
            )}
          </small>
        </div>

        <div className="form-group">
          <label className="form-label">
            <FiHelpCircle size={14} /> Hint
          </label>
          <div className="editor-container">
            <CustomEditor initialData={hint} onChange={setHint} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            <FiCheckCircle size={14} /> Solution
          </label>
          <div className="editor-container">
            <CustomEditor initialData={solution} onChange={setSolution} />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            <FiX size={16} />
            Cancel
          </button>
          {lesson?.lesson_id && (
            <button type="button" onClick={handleDelete} className="btn btn-danger">
              <FiTrash2 size={16} /> Delete
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-primary"
          >
            <FiSave size={16} /> {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LessonForm;
