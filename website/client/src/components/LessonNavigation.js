import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import 'styles/LessonNavigation.css';
import axios from "axios";

const LessonNavigation = ({ currentLessonId, lessons, isAnswerCorrect, onNext, code }) => {
    const navigate = useNavigate();
    const [isCompleted, setIsCompleted] = useState(false);
    const [courseId, setCourseId] = useState(null);

    useEffect(() => {
        const fetchLessonData = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                if (!user) {
                    throw new Error("User is not logged in.");
                }

                // First get the lesson progress
                const progressResponse = await axios.get(`/api/lesson-progress?user_id=${user.user_id}&lesson_id=${currentLessonId}`, {
                    headers: {
                        Authorization: `Bearer ${user.token}`,
                    },
                });

                if (progressResponse.data.completed) {
                    setIsCompleted(true);
                }

                // Then get the lesson details to find its section
                const lessonResponse = await axios.get(`/api/lesson/${currentLessonId}`, {
                    headers: {
                        Authorization: `Bearer ${user.token}`,
                    },
                });

                // Now get the section details to find the course_id
                const sectionResponse = await axios.get(`/api/sections/${lessonResponse.data.section_id}`, {
                    headers: {
                        Authorization: `Bearer ${user.token}`,
                    },
                });
                setCourseId(sectionResponse.data.course_id);

            } catch (err) {
                console.error('Error fetching data:', err);
            }
        };

        fetchLessonData();
    }, [currentLessonId]);

    const currentIndex = lessons?.findIndex((lesson) => lesson.lesson_id === currentLessonId);

    if (currentIndex === -1 || !lessons?.length) {
        console.error(`Invalid currentLessonId (${currentLessonId}) or empty lessons array.`);
        return null;
    }

    const goToPreviousLesson = () => {
        if (currentIndex > 0) {
            navigate(`/lesson/${lessons[currentIndex - 1].lesson_id}`);
        }
    };

    const goToNextLesson = () => {
        if (currentIndex < lessons.length - 1) {
            onNext();
            navigate(`/lesson/${lessons[currentIndex + 1].lesson_id}`);
        }
    };

    const completeLesson = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                throw new Error("User is not logged in.");
            }

            const response = await axios.put('/api/update-lesson-progress', {
                user_id: user.user_id,
                lesson_id: currentLessonId,
                completed: true,
                submitted_code: code
            }, {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            });

            if (response.status === 200) {
                alert('Lesson marked as completed!');
                setIsCompleted(true);
            } else {
                alert('Failed to update progress.');
            }
        } catch (err) {
            console.error('Error completing lesson:', err);
            alert(`Error: ${err.message}`);
        }
    };

    return (
        <div className="lesson-navigation">
            <div className='lesson-nav-back-button'>
            {courseId && (
                <button 
                    className="lesson-nav-back-button"
                    onClick={() => navigate(`/course/${courseId}`)}
                >
                    ← Back to Course
                </button>
            )}
            </div>
            <div className='lesson-nav-btns'>
            <button
                className="nav-button prev-button"
                onClick={goToPreviousLesson}
                disabled={currentIndex === 0}
            >
                Prev
            </button>
            <button
                className="nav-button complete-button"
                onClick={completeLesson}
                disabled={!isAnswerCorrect || isCompleted}
            >
                Complete
            </button>
            {currentIndex < lessons.length - 1 && (
                <button
                    className="nav-button next-button"
                    onClick={goToNextLesson}
                    disabled={!isCompleted}
                >
                    Next
                </button>
            )}
        </div>
        </div>
    );
};

export default LessonNavigation;