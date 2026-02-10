import React, { Suspense, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "app/AuthContext";
import LessonNavigation from "features/lesson/components/LessonNavigation";
import LessonContent from "features/lesson/components/LessonContent";
import LoadingSpinner from "shared/ui/LoadingSpinner";
import BadgeNotification from "features/badge/components/BadgeNotification";
import { languageMappings as LSLanguageMappings } from "features/lesson/utils/lessonConstants";
import { formatBadge } from "features/badge/utils/badgeUtils";
import { useLessonData } from "features/lesson/hooks/useLessonData";
import { useResizablePanes } from "features/editor/hooks/useResizablePanes";
import "./LessonPage.css";

const MonacoEditorComponent = React.lazy(
  () => import("features/editor/components/MonacoEditorComponent")
);

const LessonPage = () => {
  const { lessonId } = useParams();

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [lessonDataRefreshTrigger, setLessonDataRefreshTrigger] = useState(0);
  const [earnedBadge, setEarnedBadge] = useState(null);

  const {
    lesson,
    loading: lessonLoading,
    error: lessonError,
    languageId: lessonLanguageId,
    lessonsForNav,
    sectionsForNav,
    initialCode,
    currentLessonProgress,
  } = useLessonData(
    lessonId,
    !authLoading && user ? user : null,
    navigate,
    lessonDataRefreshTrigger
  );

  const { firstPaneStyle, gutterProps, containerStyle, isDragging } = useResizablePanes();

  const [code, setCode] = useState("");
  const [consoleOutput, setConsoleOutput] = useState("Output will appear here...");
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);
  const [failedAttemptsByLesson, setFailedAttemptsByLesson] = useState({});
  const currentFailedAttempts = failedAttemptsByLesson[lessonId] || 0;

  useEffect(() => {
    if (initialCode !== undefined) {
      setCode(initialCode);
    }
  }, [initialCode]);

  const resetState = () => {
    setConsoleOutput("Output will appear here...");
    setIsAnswerCorrect(false);
  };

  const handleCodeResult = (success, resultData) => {
    if (!success) {
      setFailedAttemptsByLesson((prev) => ({
        ...prev,
        [lessonId]: (prev[lessonId] || 0) + 1,
      }));
    } else if (resultData?.badge_awarded) {
      setEarnedBadge(formatBadge(resultData.badge_awarded));
    }
  };

  const handleRequestProgressRefresh = () => {
    setLessonDataRefreshTrigger((prev) => prev + 1);
  };

  const handleCloseBadgeNotification = () => {
    setEarnedBadge(null);
  };

  if (authLoading || lessonLoading) {
    return <LoadingSpinner fullScreen message="Loading lesson..." />;
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
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    transition: isDragging
      ? "none"
      : containerStyle.flexDirection === "row"
        ? "width 0.2s"
        : "height 0.2s",
  };

  const paneTransitionStyle = {
    transition: isDragging
      ? "none"
      : containerStyle.flexDirection === "row"
        ? "width 0.2s"
        : "height 0.2s",
  };

  return (
    <div className="lesson-page-wrapper">
      <div className="lesson-page" style={{ ...containerStyle, height: "calc(100vh - 144px)" }}>
        <div
          className="lesson-instructions"
          style={{
            ...firstPaneStyle,
            ...paneTransitionStyle,
            overflow: "auto",
          }}
        >
          <h1>{lesson.name}</h1>{" "}
          <LessonContent
            content={lesson.content}
            hint={lesson.hint}
            solution={lesson.solution}
            failedAttempts={currentFailedAttempts}
            currentLessonProgress={currentLessonProgress}
            onRequestProgressRefresh={handleRequestProgressRefresh}
          />
        </div>

        <div className="custom-gutter" {...gutterProps} />

        <div className="lesson-code-area" style={secondPaneStyle}>
          <div className="code-editor">
            <Suspense fallback={<LoadingSpinner message="Loading editor..." />}>
              <MonacoEditorComponent
                language={LSLanguageMappings[lessonLanguageId] || "plaintext"}
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
            </Suspense>
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
        currentLessonId={parseInt(lessonId, 10)}
        lessons={lessonsForNav}
        sections={sectionsForNav}
        isAnswerCorrect={isAnswerCorrect}
        onNext={resetState}
        code={code}
        currentSectionId={lesson.section_id}
        lessonXp={lesson.xp}
        currentLessonProgress={currentLessonProgress}
      />

      {earnedBadge && (
        <BadgeNotification badge={earnedBadge} onClose={handleCloseBadgeNotification} />
      )}
    </div>
  );
};

export default LessonPage;
