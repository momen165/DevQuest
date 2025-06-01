import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import Navbar from '../../components/Navbar';
import LessonNavigation from '../../components/LessonNavigation';
import LessonContent from '../../components/LessonContent';
import MonacoEditorComponent from '../../components/MonacoEditorComponent';
import LoadingSpinner from './CircularProgress';
import CopyNotification from '../../components/CopyNotification';
import { languageMappings as LSLanguageMappings } from '../../utils/lessonConstants';
import { useLessonData } from '../../hooks/useLessonData';
import { useResizablePanes } from '../../hooks/useResizablePanes';
import '../../styles/LessonPage.css';

const LessonPage = () => {
  const { lessonId } = useParams();
 
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [lessonDataRefreshTrigger, setLessonDataRefreshTrigger] = useState(0);

  const {
    lesson,
    loading: lessonLoading,
    error: lessonError,
    languageId: lessonLanguageId,
    lessonsForNav, // Restored: from useLessonData
    sectionsForNav, // Restored: from useLessonData
    initialCode,
    // courseIdForNav, // LessonNavigation will get its own courseId if needed
    currentLessonProgress 
  } = useLessonData(lessonId, !authLoading && user ? user : null, navigate, lessonDataRefreshTrigger);

  const {
    firstPaneStyle,
    gutterProps,
    containerStyle,
    isDragging
  } = useResizablePanes();

  const [code, setCode] = useState('');
  const [consoleOutput, setConsoleOutput] = useState('Output will appear here...');
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false); // Used by original LessonNavigation
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  useEffect(() => {
    if (initialCode !== undefined) {
      setCode(initialCode);
    }
  }, [initialCode]);

  const resetState = () => { // This is the onNext callback for LessonNavigation
    setConsoleOutput('Output will appear here...');
    setIsAnswerCorrect(false);
    // Potentially trigger a refresh if needed, or rely on lessonId change
    // setLessonDataRefreshTrigger(prev => prev + 1); // Consider if this is needed onNext
  };

  const showCopiedNotification = () => {
    setShowCopyNotification(true);
    setTimeout(() => setShowCopyNotification(false), 2000);
  };
  const handleCodeResult = (success) => {
    if (!success) {
      setFailedAttempts((prev) => prev + 1);
    }
  };  const handleRequestProgressRefresh = () => {
    setLessonDataRefreshTrigger(prev => prev + 1);
  };

  // handleMarkLessonAsComplete is not needed if LessonNavigation handles its own completion update via API
  
  if (authLoading || lessonLoading) {
    return (
      <div className="centered-loader">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <p className="error">Please log in to view this lesson.</p>; 
  }

  if (lessonError) return <p className="error">{lessonError}</p>;
  if (!lesson) return null; 

  const secondPaneStyle = {
    flex: 1,
    minWidth: 200,
    minHeight: 150,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: isDragging ? 'none' : containerStyle.flexDirection === 'row' ? 'width 0.2s' : 'height 0.2s',
  };

  const paneTransitionStyle = {
    transition: isDragging ? 'none' : containerStyle.flexDirection === 'row' ? 'width 0.2s' : 'height 0.2s',
  };

  return (
    <>
      <Navbar />
      <div
        className="lesson-page"
        style={containerStyle}
      >
        <div
          className="lesson-instructions"
          style={{
            ...firstPaneStyle,
            ...paneTransitionStyle,
            overflow: 'auto',
          }}
        >
          <h1>{lesson.name}</h1>          <LessonContent
            content={lesson.content}
            hint={lesson.hint}
            solution={lesson.solution}
            failedAttempts={failedAttempts}
            currentLessonProgress={currentLessonProgress} // Pass progress to LessonContent
            onRequestProgressRefresh={handleRequestProgressRefresh}
          />
        </div>

        <div
          className="custom-gutter"
          {...gutterProps}
        />

        <div
          className="lesson-code-area"
          style={secondPaneStyle}
        >
          <div className="code-editor">
            <MonacoEditorComponent
              language={LSLanguageMappings[lessonLanguageId] || 'plaintext'}
              code={code}
              setCode={setCode}
              user={user}
              lessonId={lessonId}
              languageId={lessonLanguageId}
              setConsoleOutput={setConsoleOutput}
              setIsAnswerCorrect={setIsAnswerCorrect}
              onCodeResult={handleCodeResult}
              templateCode={lesson?.template_code}
            />
          </div>
          <div className="console">
            <div className="console-header">
              <h3>Console</h3>
            </div>
            <pre className="console-output">{consoleOutput}</pre>
          </div>
        </div>
      </div>

      <LessonNavigation
        currentLessonId={parseInt(lessonId)}
        lessons={lessonsForNav} // Pass lessonsForNav from useLessonData
        sections={sectionsForNav} // Pass sectionsForNav from useLessonData
        isAnswerCorrect={isAnswerCorrect}
        onNext={resetState}
        code={code}
        currentSectionId={lesson.section_id} 
        lessonXp={lesson.xp}
        currentLessonProgress={currentLessonProgress} // Pass progress to LessonNavigation
      />
      {showCopyNotification && (
        <CopyNotification>
          <span>✓</span>
          <span>Copied!</span>
        </CopyNotification>
      )}
    </>
  );
};

export default LessonPage;
