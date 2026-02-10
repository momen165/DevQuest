import { useState, useEffect, useRef, memo } from "react";
import parse from "html-react-parser";
import { useAuth } from "app/AuthContext";
import { useParams } from "react-router-dom";
import apiClient from "shared/lib/apiClient";
import "./HelpSection.css";

const HINT_THRESHOLD = 2;
const SOLUTION_THRESHOLD = 4;

const HelpSection = memo(({ hint, solution, failedAttempts = 0, currentLessonProgress }) => {
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [dynamicHint, setDynamicHint] = useState(hint);
  const [dynamicSolution, setDynamicSolution] = useState(solution);
  const [isUnlockingHint, setIsUnlockingHint] = useState(false);
  const [isUnlockingSolution, setIsUnlockingSolution] = useState(false);
  const lessonUiStateRef = useRef({});

  const { user } = useAuth();
  const { lessonId } = useParams();

  const hintUnlocked = currentLessonProgress?.hint_unlocked || false;
  const solutionUnlocked = currentLessonProgress?.solution_unlocked || false;

  const canShowHint = hintUnlocked || failedAttempts >= HINT_THRESHOLD;
  const canShowSolution = solutionUnlocked || failedAttempts >= SOLUTION_THRESHOLD;

  // Keep open/closed state scoped to each lesson.
  useEffect(() => {
    const lessonState = lessonUiStateRef.current[lessonId] || {
      showHint: false,
      showSolution: false,
    };
    setShowHint(Boolean(lessonState.showHint));
    setShowSolution(Boolean(lessonState.showSolution));
    setIsUnlockingHint(false);
    setIsUnlockingSolution(false);
  }, [lessonId]);

  useEffect(() => {
    if (!lessonId) return;
    lessonUiStateRef.current[lessonId] = {
      showHint,
      showSolution,
    };
  }, [lessonId, showHint, showSolution]);

  // Update dynamic content when progress changes
  useEffect(() => {
    if (currentLessonProgress?.hint) {
      setDynamicHint(currentLessonProgress.hint);
    }
    if (currentLessonProgress?.solution) {
      setDynamicSolution(currentLessonProgress.solution);
    }
  }, [currentLessonProgress]);

  // Keep local dynamic content in sync with latest props from lesson fetches.
  useEffect(() => {
    setDynamicHint(hint || "");
  }, [hint]);

  useEffect(() => {
    setDynamicSolution(solution || "");
  }, [solution]);
  // Handle hint button click
  const handleHintClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const newShowHint = !showHint;
    setShowHint(newShowHint);

    // If showing hint and content is not present, fetch latest lesson payload.
    if (newShowHint && canShowHint && !isUnlockingHint && !dynamicHint) {
      setIsUnlockingHint(true);
      try {
        // Step 1: Unlock if still locked.
        if (!hintUnlocked) {
          await apiClient.post(
            `/lesson/${lessonId}/unlock-hint`,
            {},
            {
              headers: {
                Authorization: `Bearer ${user?.token}`,
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
              },
            }
          );
        }

        // Step 2: Fetch fresh lesson data including hint.
        const lessonResponse = await apiClient.get(`/lesson/${lessonId}`, {
          params: { showHint: true, _ts: Date.now() },
          headers: {
            Authorization: `Bearer ${user?.token}`,
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });

        if (lessonResponse.data?.hint) {
          setDynamicHint(lessonResponse.data.hint);
        } else if (hint) {
          // Fallback to original hint prop if present.
          setDynamicHint(hint);
        }
      } catch (e) {
        console.error("Failed to unlock hint:", e);
        // Fallback to original hint.
        if (hint) {
          setDynamicHint(hint);
        }
      } finally {
        setIsUnlockingHint(false);
      }
    }
  };
  // Handle solution button click
  const handleSolutionClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const newShowSolution = !showSolution;
    setShowSolution(newShowSolution);

    // If showing solution and content is not present, fetch latest lesson payload.
    if (newShowSolution && canShowSolution && !isUnlockingSolution && !dynamicSolution) {
      setIsUnlockingSolution(true);
      try {
        // Step 1: Unlock if still locked.
        if (!solutionUnlocked) {
          await apiClient.post(
            `/lesson/${lessonId}/unlock-solution`,
            {},
            {
              headers: {
                Authorization: `Bearer ${user?.token}`,
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
              },
            }
          );
        }

        // Step 2: Fetch fresh lesson data including solution.
        const lessonResponse = await apiClient.get(`/lesson/${lessonId}`, {
          params: { showSolution: true, _ts: Date.now() },
          headers: {
            Authorization: `Bearer ${user?.token}`,
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });

        if (lessonResponse.data?.solution) {
          setDynamicSolution(lessonResponse.data.solution);
        } else if (solution) {
          // Fallback to original solution prop if present.
          setDynamicSolution(solution);
        }
      } catch (e) {
        console.error("Failed to unlock solution:", e);
        // Fallback to original solution.
        if (solution) {
          setDynamicSolution(solution);
        }
      } finally {
        setIsUnlockingSolution(false);
      }
    }
  };

  return (
    <div className="help-section" style={{ contain: "layout style" }}>
      <div className={`hint-section ${!canShowHint ? "disabled" : ""}`}>
        <button
          type="button"
          onClick={handleHintClick}
          className={`hint-button ${canShowHint ? "available" : ""}`}
          disabled={!canShowHint || isUnlockingHint}
        >
          💡 {showHint ? "Hide Hint" : "Show Hint"}
          {isUnlockingHint && " (Loading...)"}
          {!canShowHint && (
            <span className="attempts-needed">
              (Available after {HINT_THRESHOLD - failedAttempts} more failed attempts)
            </span>
          )}
        </button>
        {showHint && canShowHint && (dynamicHint || hint) && (
          <div className="hint-content">{parse(dynamicHint || hint)}</div>
        )}
      </div>

      <div className={`solution-section ${!canShowSolution ? "disabled" : ""}`}>
        <button
          type="button"
          onClick={handleSolutionClick}
          className={`solution-button ${canShowSolution ? "available" : ""}`}
          disabled={!canShowSolution || isUnlockingSolution}
        >
          ✨ {showSolution ? "Hide Solution" : "Show Solution"}
          {isUnlockingSolution && " (Loading...)"}
          {!canShowSolution && (
            <span className="attempts-needed">
              (Available after {SOLUTION_THRESHOLD - failedAttempts} more failed attempts)
            </span>
          )}
        </button>
        {showSolution && canShowSolution && (dynamicSolution || solution) && (
          <div className="solution-content">{parse(dynamicSolution || solution)}</div>
        )}
      </div>
    </div>
  );
});

HelpSection.displayName = "HelpSection";

export default HelpSection;
