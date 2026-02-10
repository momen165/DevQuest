import { FiTrash2, FiPlus, FiTerminal } from "react-icons/fi";
import "./TestCaseManager.css";

const TestCaseManager = ({ testCases = [], onChange }) => {
  // Ensure we always have at least one test case if none provided
  const cases =
    testCases.length > 0
      ? testCases
      : [
          {
            input: "",
            expected_output: "",
            auto_detect: false,
            use_pattern: false,
            pattern: "",
          },
        ];

  const handleTestCaseChange = (index, field, value) => {
    const updated = [...cases];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addTestCase = () => {
    const updated = [
      ...cases,
      {
        input: "",
        expected_output: "",
        auto_detect: false,
        use_pattern: false,
        pattern: "",
      },
    ];
    onChange(updated);
  };

  const removeTestCase = (index) => {
    if (cases.length > 1) {
      const updated = cases.filter((_, i) => i !== index);
      onChange(updated);
    }
  };

  return (
    <div className="test-cases">
      {cases.map((testCase, index) => (
        <div key={index} className="test-case-card">
          <div className="test-case-header">
            <div className="test-case-title">
              <FiTerminal size={16} />
              <span>Test Case {index + 1}</span>
            </div>
            {cases.length > 1 && (
              <button
                type="button"
                onClick={() => removeTestCase(index)}
                className="test-case-remove"
                title="Remove test case"
              >
                <FiTrash2 size={14} />
              </button>
            )}
          </div>

          <div className="test-case-options">
            <label className="test-case-checkbox">
              <input
                type="checkbox"
                checked={testCase.auto_detect || false}
                onChange={(e) => handleTestCaseChange(index, "auto_detect", e.target.checked)}
              />
              <span className="checkbox-label">Auto-detect Output</span>
            </label>
            <label className="test-case-checkbox">
              <input
                type="checkbox"
                checked={testCase.use_pattern || false}
                onChange={(e) => handleTestCaseChange(index, "use_pattern", e.target.checked)}
              />
              <span className="checkbox-label">Use Pattern Matching</span>
            </label>
          </div>

          <div className="test-case-field">
            <label className="test-case-label">Input</label>
            <textarea
              className="test-case-textarea"
              value={testCase.input || ""}
              onChange={(e) => handleTestCaseChange(index, "input", e.target.value)}
              placeholder="Enter test input..."
              rows={3}
            />
          </div>

          {!testCase.auto_detect && (
            <div className="test-case-field">
              <label className="test-case-label">Expected Output</label>
              <textarea
                className="test-case-textarea"
                value={testCase.expected_output || ""}
                onChange={(e) => handleTestCaseChange(index, "expected_output", e.target.value)}
                placeholder="Enter expected output..."
                rows={3}
              />
            </div>
          )}

          {testCase.use_pattern && (
            <div className="test-case-field">
              <label className="test-case-label">Pattern (Regex)</label>
              <input
                type="text"
                className="test-case-input"
                value={testCase.pattern || ""}
                onChange={(e) => handleTestCaseChange(index, "pattern", e.target.value)}
                placeholder="Enter regex pattern..."
              />
            </div>
          )}
        </div>
      ))}

      <button type="button" onClick={addTestCase} className="test-case-add">
        <FiPlus size={16} />
        Add Test Case
      </button>
    </div>
  );
};

export default TestCaseManager;
