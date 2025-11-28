import React, { useState, useEffect } from 'react';
import parse from 'html-react-parser';
import { useAuth } from '@/contexts/AuthContext';
import { useParams } from 'next/navigation';
import apiClient from '@/utils/apiClient';
import '@/styles/LessonHelp.css';

const HINT_THRESHOLD = 2;
const SOLUTION_THRESHOLD = 4;

const HelpSection = ({ hint, solution, failedAttempts = 0, currentLessonProgress, onRequestProgressRefresh }) => {
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [dynamicHint, setDynamicHint] = useState(hint);
  const [dynamicSolution, setDynamicSolution] = useState(solution);
  const [isUnlockingHint, setIsUnlockingHint] = useState(false);
  const [isUnlockingSolution, setIsUnlockingSolution] = useState(false);
  
  const { user } = useAuth();
  const { lessonId } = useParams();

  const hintUnlocked = currentLessonProgress?.hint_unlocked || false;
  const solutionUnlocked = currentLessonProgress?.solution_unlocked || false;

  const canShowHint = hintUnlocked || failedAttempts >= HINT_THRESHOLD;
  const canShowSolution = solutionUnlocked || failedAttempts >= SOLUTION_THRESHOLD;

  // Update dynamic content when progress changes
  useEffect(() => {
    if (currentLessonProgress?.hint) {
      setDynamicHint(currentLessonProgress.hint);
    }
    if (currentLessonProgress?.solution) {
      setDynamicSolution(currentLessonProgress.solution);
    }
  }, [currentLessonProgress]);
  // Handle hint button click
  const handleHintClick = async () => {
    const newShowHint = !showHint;
    setShowHint(newShowHint);
    
    // If showing hint and it needs to be unlocked
    if (newShowHint && canShowHint && !hintUnlocked && !isUnlockingHint) {
      setIsUnlockingHint(true);
      try {
        // Step 1: Call unlock API
        await apiClient.post(
          `/lesson/${lessonId}/unlock-hint`,
          {},
          { headers: { Authorization: `Bearer ${user?.token}` } }
        );
        
        // Step 2: Fetch updated lesson data to get the actual hint content
        const lessonResponse = await apiClient.get(
          `/lesson/${lessonId}`,
          { headers: { Authorization: `Bearer ${user?.token}` } }
        );
        
        if (lessonResponse.data?.hint) {
          setDynamicHint(lessonResponse.data.hint);
        } else if (hint) {
          // Fallback to original hint prop
          setDynamicHint(hint);
        }
        
        // Refresh progress to sync state
        if (onRequestProgressRefresh) {
          setTimeout(() => onRequestProgressRefresh(), 100);
        }
      } catch (e) {
        console.error("Failed to unlock hint:", e);
        // Fallback to original hint
        if (hint) {
          setDynamicHint(hint);
        }
      } finally {
        setIsUnlockingHint(false);
      }
    }
  };
  // Handle solution button click
  const handleSolutionClick = async () => {
    const newShowSolution = !showSolution;
    setShowSolution(newShowSolution);
    
    // If showing solution and it needs to be unlocked
    if (newShowSolution && canShowSolution && !solutionUnlocked && !isUnlockingSolution) {
      setIsUnlockingSolution(true);
      try {
        // Step 1: Call unlock API
        await apiClient.post(
          `/lesson/${lessonId}/unlock-solution`,
          {},
          { headers: { Authorization: `Bearer ${user?.token}` } }
        );
        
        // Step 2: Fetch updated lesson data to get the actual solution content
        const lessonResponse = await apiClient.get(
          `/lesson/${lessonId}`,
          { headers: { Authorization: `Bearer ${user?.token}` } }
        );
        
        if (lessonResponse.data?.solution) {
          setDynamicSolution(lessonResponse.data.solution);
        } else if (solution) {
          // Fallback to original solution prop
          setDynamicSolution(solution);
        }
        
        // Refresh progress to sync state
        if (onRequestProgressRefresh) {
          setTimeout(() => onRequestProgressRefresh(), 100);
        }
      } catch (e) {
        console.error("Failed to unlock solution:", e);
        // Fallback to original solution
        if (solution) {
          setDynamicSolution(solution);
        }
      } finally {
        setIsUnlockingSolution(false);
      }
    }
  };

  return (
    <div className="help-section" style={{ contain: 'layout style' }}>
      <div className={`hint-section ${!canShowHint ? 'disabled' : ''}`}>
        <button
          type="button"
          onClick={handleHintClick}
          className={`hint-button ${canShowHint ? 'available' : ''}`}
          disabled={!canShowHint || isUnlockingHint}
        >
          💡 {showHint ? 'Hide Hint' : 'Show Hint'}
          {isUnlockingHint && ' (Loading...)'}
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

      <div className={`solution-section ${!canShowSolution ? 'disabled' : ''}`}>
        <button
          type="button"
          onClick={handleSolutionClick}
          className={`solution-button ${canShowSolution ? 'available' : ''}`}
          disabled={!canShowSolution || isUnlockingSolution}
        >
          ✨ {showSolution ? 'Hide Solution' : 'Show Solution'}
          {isUnlockingSolution && ' (Loading...)'}
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
};

export default HelpSection;