import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import 'styles/LessonNavigation.css';
import axios from "axios";

const LessonNavigation = ({ currentLessonId, lessons, isAnswerCorrect, onNext, code }) => {
    const navigate = useNavigate();
    const [isCompleted, setIsCompleted] = useState(false);

    useEffect(() => {
        const fetchLessonProgress = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                if (!user) {
                    throw new Error("User is not logged in.");
                }

                const response = await axios.get(`http://localhost:5000/api/lesson-progress?user_id=${user.user_id}&lesson_id=${currentLessonId}`, {
                    headers: {
                        Authorization: `Bearer ${user.token}`,
                    },
                });

                if (response.data.completed) {
                    setIsCompleted(true);
                }
            } catch (err) {
                console.error('Error fetching lesson progress:', err);
            }
        };

        fetchLessonProgress();
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

            const response = await axios.put('http://localhost:5000/api/update-lesson-progress', {
                user_id: user.user_id,
                lesson_id: currentLessonId,
                completed: true,
                submitted_code: code // Include the submitted code here
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
    );
};

export default LessonNavigation;