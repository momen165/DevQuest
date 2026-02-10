import { useState } from "react";
import parse from "html-react-parser";
import "./LessonHelp.css";

const LessonHelp = ({ hint, solution }) => {
  const [isHintOpen, setIsHintOpen] = useState(false);
  const [isSolutionOpen, setIsSolutionOpen] = useState(false);

  const toggleHint = () => {
    setIsHintOpen(!isHintOpen);
    if (isSolutionOpen) setIsSolutionOpen(false);
  };

  const toggleSolution = () => {
    setIsSolutionOpen(!isSolutionOpen);
    if (isHintOpen) setIsHintOpen(false);
  };

  return (
    <div className="lesson-help">
      <div className={`lesson-help-section ${isHintOpen ? "open" : ""}`}>
        <div className="lesson-help-title" onClick={toggleHint}>
          👀 Get a Hint
          <span className={`arrow ${isHintOpen ? "open" : ""}`}>▼</span>
        </div>
        <div className="lesson-help-content">{parse(hint)}</div>
      </div>

      <div className={`lesson-help-section ${isSolutionOpen ? "open" : ""}`}>
        <div className="lesson-help-title" onClick={toggleSolution}>
          ✨ Solution
          <span className={`arrow ${isSolutionOpen ? "open" : ""}`}>▼</span>
        </div>
        <div className="lesson-help-content">{parse(solution)}</div>
      </div>
    </div>
  );
};

export default LessonHelp;
