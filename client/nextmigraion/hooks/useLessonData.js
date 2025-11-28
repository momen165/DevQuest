import { useEffect, useState, useRef } from 'react';
import apiClient from '@/utils/apiClient';
import { FREE_LESSON_LIMIT } from '@/utils/lessonConstants';
import { decode as decodeEntities } from 'entities';

export const useLessonData = (lessonId, user, navigate, refreshTrigger = 0) => {
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [languageId, setLanguageId] = useState(null);
  const [lessonsForNav, setLessonsForNav] = useState([]); // Will be populated by /lesson?course_id=...
  const [totalLessons, setTotalLessons] = useState(0);
  const [sectionsForNav, setSectionsForNav] = useState([]); // Will be populated by /sections/course/...
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [completedLessonsCount, setCompletedLessonsCount] = useState(0);
  const [initialCode, setInitialCode] = useState('');
  const [courseIdForNav, setCourseIdForNav] = useState(null);
  const [currentLessonProgress, setCurrentLessonProgress] = useState(null);
  const hasFetched = useRef({}); // Stores { 'lessonId-userId': true }
  const lastRefreshTrigger = useRef(0);
  // Separate effect for refreshing only lesson progress
  useEffect(() => {
    if (
      refreshTrigger > 0 &&
      refreshTrigger !== lastRefreshTrigger.current &&
      lessonId &&
      user?.token
    ) {
      lastRefreshTrigger.current = refreshTrigger;

      const refreshProgress = async () => {
        try {
          const progressResponse = await apiClient.get(`/lesson-progress`, {
            params: { user_id: user?.user_id, lesson_id: lessonId },
            headers: { Authorization: `Bearer ${user?.token}` },
          });

          if (progressResponse.status === 200) {
            setCurrentLessonProgress(progressResponse.data);
          }
        } catch (err) {
          console.error('Failed to refresh lesson progress:', err);
        }
      };

      refreshProgress();
    }
  }, [refreshTrigger, lessonId, user?.token, user?.user_id]);

  useEffect(() => {
    let isMounted = true;
    const currentFetchKey = `${lessonId}-${user?.user_id}`;

    const fetchLesson = async () => {
      // Prevent redundant fetches for the same lessonId and user

      setLoading(true);
      setError('');

      try {
        // --- BLOCK 1: Subscription & Core Lesson ---
        //console.log(`Attempting to fetch lesson ${lessonId} for user ${user?.user_id}`);

        const [subscriptionResponse, lessonResponse] = await Promise.all([
          apiClient.get('/check', { headers: { Authorization: `Bearer ${user?.token}` } }),
          apiClient.get(`/lesson/${lessonId}`, {
            headers: { Authorization: `Bearer ${user?.token}` },
          }),
        ]);

        // console.log(`Lesson ${lessonId} fetch response:`, {
        //   subscriptionStatus: subscriptionResponse.status,
        //   lessonStatus: lessonResponse.status,
        //   lessonData: lessonResponse.data ? 'Present' : 'Missing',
        // });

        if (!isMounted) {
          return;
        }
        if (subscriptionResponse.status !== 200) {
          if (isMounted) navigate('/pricing');
          return;
        }
        const { hasActiveSubscription: activeSub, completedLessons: compLessons } =
          subscriptionResponse.data;
        if (isMounted) {
          setHasActiveSubscription(activeSub);
          setCompletedLessonsCount(compLessons || 0);
        }
        if (!activeSub && compLessons >= FREE_LESSON_LIMIT) {
          if (isMounted) navigate('/pricing?message=Free limit reached.');
          return;
        }
        if (lessonResponse.status === 403) {
          console.log(`LESSON ${lessonId} ACCESS DENIED (403):`, lessonResponse.data);

          if (lessonResponse.data?.status === 'subscription_required') {
            console.log(`LESSON ${lessonId}: Subscription required`);
            if (isMounted) navigate('/pricing?message=Subscription required.');
            return;
          } else if (lessonResponse.data?.status === 'locked') {
            // console.log(`LESSON ${lessonId}: Locked - Need to complete previous lessons`);
            // console.log(`Section ID from locked response:`, lessonResponse.data?.section_id);

            const lockedSectionResponse = await apiClient.get(
              `/sections/${lessonResponse.data?.section_id || 0}`,
              { headers: { Authorization: `Bearer ${user?.token}` } }
            );

            console.log(`LESSON ${lessonId}: Locked section response:`, {
              status: lockedSectionResponse.status,
              courseId: lockedSectionResponse.data?.course_id,
            });

            if (isMounted) {
              if (lockedSectionResponse.status === 200 && lockedSectionResponse.data?.course_id) {
                const msg = lessonResponse.data?.message || 'Complete previous.';
                navigate(`/course/${lockedSectionResponse.data.course_id}?errorMessage=${encodeURIComponent(msg)}`);
              } else {
                navigate('/');
              }
            }
            return;
          }
          if (isMounted) navigate('/');
          return;
        }
        if (lessonResponse.status !== 200) {
          if (isMounted) navigate('/');
          return;
        }

        const lessonData = lessonResponse.data;
        // console.log(`LESSON ${lessonId} DATA:`, {
        //   name: lessonData.name,
        //   section_id: lessonData.section_id,
        //   language_id: lessonData.language_id,
        //   xp: lessonData.xp,
        //   hasTemplateCode: !!lessonData.template_code,
        // });

        if (isMounted) {
          setLesson(lessonData);
          setLanguageId(lessonData.language_id);
        }
        if (!isMounted) {
          return;
        }

        const [sectionResponse, progressResponse] = await Promise.all([
          apiClient.get(`/sections/${lessonData.section_id}`, {
            headers: { Authorization: `Bearer ${user?.token}` },
          }),
          apiClient.get(`/lesson-progress`, {
            params: { user_id: user?.user_id, lesson_id: lessonId },
            headers: { Authorization: `Bearer ${user?.token}` },
          }),
        ]);

        // console.log(`LESSON ${lessonId} SECTION & PROGRESS:`, {
        //   sectionStatus: sectionResponse.status,
        //   progressStatus: progressResponse.status,
        //   progress: progressResponse.data
        //     ? {
        //         completed: progressResponse.data.completed,
        //         hasSubmittedCode: !!progressResponse.data.submitted_code,
        //       }
        //     : 'No progress data',
        // });

        if (!isMounted) {
          /* ... */ return;
        }
        if (sectionResponse.status !== 200 || !sectionResponse.data) {
          /* ... */ if (isMounted) navigate('/');
          return;
        }

        const fetchedCourseId = sectionResponse.data.course_id;
        if (isMounted) {
          setCourseIdForNav(fetchedCourseId);
          if (progressResponse.status === 200) setCurrentLessonProgress(progressResponse.data);
          else setCurrentLessonProgress(null);
        }
        if (!isMounted) {
          /* ... */ return;
        }
        // --- END OF BLOCK 2 ---

        // --- BLOCK 3: Fetch all sections and all lessons for the course (for props to original LessonNavigation) ---

        const [sectionsDataResponse, allLessonsDataResponse] = await Promise.all([
          apiClient.get(`/sections/course/${fetchedCourseId}`, {
            // This fetches sections
            headers: { Authorization: `Bearer ${user?.token}` },
          }),
          apiClient.get('/lesson', {
            // This fetches the flat list of all lessons
            params: { course_id: fetchedCourseId },
            headers: { Authorization: `Bearer ${user?.token}` },
          }),
        ]);

        if (isMounted) {
          if (sectionsDataResponse.status === 200) {
            setSectionsForNav(sectionsDataResponse.data || []); // Used by LessonPage for LessonNavigation prop
          }
          if (allLessonsDataResponse.status === 200) {
            const allLessons = allLessonsDataResponse.data || [];

            setLessonsForNav(allLessons); // Used by LessonPage for LessonNavigation prop

            setTotalLessons(allLessons.length);
          }
        }
        // --- END OF BLOCK 3 ---

        if (isMounted) {
          if (progressResponse.status === 200 && progressResponse.data?.submitted_code) {
            setInitialCode(progressResponse.data.submitted_code);
          } else if (lessonData) {
            setInitialCode(
              lessonData.template_code ? decodeEntities(lessonData.template_code) : ''
            );
          }
        }
      } catch (err) {
        console.error(`%cuseLessonData: fetchLesson error:`, 'color: red; font-weight: bold;', err);
        console.log(`LESSON ${lessonId} ERROR DETAILS:`, {
          status: err.response?.status,
          message: err.response?.data?.message || err.message,
          data: err.response?.data,
        });

        if (isMounted) navigate('/');
      } finally {
        if (isMounted) {
          setLoading(false);
          // Mark as fetched only if the fetch was successful and not unmounted
          if (!error) {
            // Assuming 'error' state is set if there's an issue
            hasFetched.current[currentFetchKey] = true;
          }
        }
      }
    };

    // Only fetch if lessonId is present and user is authenticated
    if (lessonId && user?.token) {
      fetchLesson();
    } else if (!user?.token) {
      // If no token, ensure loading is false and clear fetched state for this user
      setLoading(false);
      // Clear the fetched state for this user if they log out or token is gone
      Object.keys(hasFetched.current).forEach((key) => {
        if (key.endsWith(`-${user?.user_id}`)) {
          delete hasFetched.current[key];
        }
      });
    }

    return () => {
      isMounted = false;
      // When dependencies change (e.g., lessonId or user_id), clear the fetched state for the old key
      // This ensures that if you navigate to a new lesson, it will fetch again.
      // Or if the user changes, it will fetch for the new user.
      delete hasFetched.current[currentFetchKey];
    };
  }, [lessonId, user?.token, user?.user_id, navigate]);

  return {
    lesson,
    loading,
    error,
    languageId,
    lessonsForNav, // Restored: for LessonNavigation's prev/next logic
    totalLessons,
    sectionsForNav, // Restored: for LessonNavigation's prev/next logic
    hasActiveSubscription,
    completedLessonsCount,
    initialCode,
    courseIdForNav,
    currentLessonProgress,
  };
};
