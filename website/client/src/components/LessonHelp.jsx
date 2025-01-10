import React, { useState } from 'react';
import parse from 'html-react-parser';
import '../styles/LessonHelp.css';

const LessonHelp = ({ hint, solution }) => {
  const [isHintVisible, setIsHintVisible] = useState(false);
  const [isSolutionVisible, setIsSolutionVisible] = useState(false);

  return (
    <div className="lesson-help">
      <details className="lesson-help-section">
        <summary className="lesson-help-title">
          👀 Get a Hint
        </summary>
        <div className="lesson-help-content">
          {parse(hint)}
        </div>
      </details>

      <details className="lesson-help-section">
        <summary className="lesson-help-title">
          ✨ Solution
        </summary>
        <div className="lesson-help-content">
          {parse(solution)}
        </div>
      </details>
    </div>
  );
};

export default LessonHelp;
