import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import 'styles/LessonNavigation.css';
import axios from "axios";

const LessonNavigation = ({ currentLessonId, lessons, isAnswerCorrect, onNext }) => {
    const navigate = useNavigate();
    const [isCompleted, setIsCompleted] = useState(false);

    // Find current lesson index
    const currentIndex = lessons?.findIndex((lesson) => lesson.lesson_id === currentLessonId);

    // Handle invalid currentLessonId or empty lessons array
    if (currentIndex === -1 || !lessons?.length) {
        console.error(
            `Invalid currentLessonId (${currentLessonId}) or empty lessons array.`
        );
        return null; // Don't render navigation
    }

    const goToPreviousLesson = () => {
        if (currentIndex > 0) {
            navigate(`/lesson/${lessons[currentIndex - 1].lesson_id}`);
        }
    };

    const goToNextLesson = () => {
        if (currentIndex < lessons.length - 1) {
            onNext(); // Reset state
            navigate(`/lesson/${lessons[currentIndex + 1].lesson_id}`);
        }
    };

    const completeLesson = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                throw new Error("User is not logged in.");
            }

            const completedLessons = lessons.filter(lesson => lesson.completed).length + 1;
            const totalLessons = lessons.length;

            if (totalLessons <= 0) {
                throw new Error("Total lessons count cannot be zero.");
            }

            // Mark the current lesson as completed
            const response = await axios.put('http://localhost:5000/api/update-lesson-progress', {
                user_id: user.user_id,
                lesson_id: currentLessonId,
                completed: true, // Mark this lesson as completed
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
                disabled={!isAnswerCorrect || isCompleted} // Enable only if the answer is correct and not completed
            >
                Complete
            </button>
            <button
                className="nav-button next-button"
                onClick={goToNextLesson}
                disabled={!isAnswerCorrect && !isCompleted} // Enable if the answer is correct or the lesson is completed
            >
                Next
            </button>
        </div>
    );
};

export default LessonNavigation;