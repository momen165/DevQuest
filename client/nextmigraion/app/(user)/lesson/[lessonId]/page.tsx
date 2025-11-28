'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import LessonNavigation from '@/components/LessonNavigation';
import LessonContent from '@/components/LessonContent';
import MonacoEditorComponent from '@/components/MonacoEditorComponent';
import LoadingSpinner from '@/components/CircularProgress';
import CopyNotification from '@/components/CopyNotification';
import BadgeNotification from '@/components/BadgeNotification';
import { languageMappings as LSLanguageMappings } from '@/utils/lessonConstants';
import { useLessonData } from '@/hooks/useLessonData';
import { useResizablePanes } from '@/hooks/useResizablePanes';
import ProtectedRoute from '@/components/ProtectedRoute';
import MaintenanceCheck from '@/components/MaintenanceCheck';
import '@/styles/LessonPage.css';

interface Badge {
  badge_type: string;
  name: string;
  description: string;
  image_path: string;
}

const LessonPage = ({ params }: { params: Promise<{ lessonId: string }> }) => {
  const { lessonId } = React.use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [lessonDataRefreshTrigger, setLessonDataRefreshTrigger] = useState(0);
  const [earnedBadge, setEarnedBadge] = useState<Badge | null>(null);

  const {
    lesson,
    loading: lessonLoading,
    error: lessonError,
    languageId: lessonLanguageId,
    lessonsForNav,
    sectionsForNav,
    initialCode,
    currentLessonProgress,
  } = useLessonData(lessonId, !authLoading && user ? user : null, router, lessonDataRefreshTrigger);

  const { firstPaneStyle, gutterProps, containerStyle, isDragging } = useResizablePanes();

  const [code, setCode] = useState('');
  const [consoleOutput, setConsoleOutput] = useState('Output will appear here...');
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  useEffect(() => {
    if (initialCode !== undefined) {
      setCode(initialCode);
    }
  }, [initialCode]);

  const resetState = () => {
    setConsoleOutput('Output will appear here...');
    setIsAnswerCorrect(false);
  };

  const showCopiedNotification = () => {
    setShowCopyNotification(true);
    setTimeout(() => setShowCopyNotification(false), 2000);
  };

  const handleCodeResult = (success: boolean, resultData?: any) => {
    if (!success) {
      setFailedAttempts((prev) => prev + 1);
    } else if (resultData?.badge_awarded) {
      // Use backend badge fields if available, fallback to helpers
      const badge = resultData.badge_awarded;
      setEarnedBadge({
        badge_type: badge.badge_type,
        name: badge.name || getBadgeName(badge.badge_type),
        description: badge.description || getBadgeDescription(badge.badge_type),
        image_path: badge.image_path || getBadgeImagePath(badge.badge_type),
      });
    }
  };

  const handleRequestProgressRefresh = () => {
    setLessonDataRefreshTrigger((prev) => prev + 1);
  };

  // Helper functions to get badge info
  const getBadgeName = (badgeType: string): string => {
    const badgeNames: { [key: string]: string } = {
      code_novice: 'Code Novice',
      lesson_smasher: 'Lesson Smasher',
      language_explorer: 'Language Explorer',
      streak_master: 'Streak Master',
      xp_achiever: '100 XP Achieved',
    };
    return badgeNames[badgeType] || 'Achievement';
  };

  const getBadgeDescription = (badgeType: string): string => {
    const badgeDescriptions: { [key: string]: string } = {
      code_novice: 'Unlocked after submitting your first code',
      lesson_smasher: 'Unlocked after completing 10 lessons successfully',
      language_explorer: 'Unlocked after using 3 different programming languages',
      streak_master: 'Unlocked after maintaining a 7-day learning streak',
      xp_achiever: 'Unlocked after reaching 100 XP',
    };
    return badgeDescriptions[badgeType] || 'You achieved something special!';
  };

  const getBadgeImagePath = (badgeType: string): string => {
    return `https://pub-7f487491f13f461f98c43d8f13580a44.r2.dev/badges/${badgeType}.png`;
  };

  const handleCloseBadgeNotification = () => {
    setEarnedBadge(null);
  };

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
    flexDirection: 'column' as const,
    overflow: 'hidden' as const,
    transition: isDragging
      ? 'none'
      : containerStyle.flexDirection === 'row'
        ? 'width 0.2s'
        : 'height 0.2s',
  };

  const paneTransitionStyle = {
    transition: isDragging
      ? 'none'
      : containerStyle.flexDirection === 'row'
        ? 'width 0.2s'
        : 'height 0.2s',
  };

  return (
    <MaintenanceCheck>
      <ProtectedRoute>
        <>
          <Navbar />
          <div className="lesson-page" style={containerStyle}>
            <div
              className="lesson-instructions"
              style={{
                ...firstPaneStyle,
                ...paneTransitionStyle,
                overflow: 'auto',
              }}
            >
              <h1>{lesson.name}</h1>
              <LessonContent
                content={lesson.content}
                hint={lesson.hint}
                solution={lesson.solution}
                failedAttempts={failedAttempts}
                currentLessonProgress={currentLessonProgress}
                onRequestProgressRefresh={handleRequestProgressRefresh}
              />
            </div>

            <div className="custom-gutter" {...gutterProps} />

            <div className="lesson-code-area" style={secondPaneStyle}>
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
            lessons={lessonsForNav}
            sections={sectionsForNav}
            isAnswerCorrect={isAnswerCorrect}
            onNext={resetState}
            code={code}
            currentSectionId={lesson.section_id}
            lessonXp={lesson.xp}
            currentLessonProgress={currentLessonProgress}
          />

          {showCopyNotification && (
            <CopyNotification>
              <span>✓</span>
              <span>Copied!</span>
            </CopyNotification>
          )}

          {earnedBadge && (
            <BadgeNotification badge={earnedBadge} onClose={handleCloseBadgeNotification} />
          )}
        </>
      </ProtectedRoute>
    </MaintenanceCheck>
  );
};

export default LessonPage;
