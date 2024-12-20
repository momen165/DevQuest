import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import 'styles/LessonNavigation.css';
import axios from "axios";

const LessonNavigation = ({ currentLessonId, lessons, isAnswerCorrect, onNext, code, currentSectionId, sections, lessonXp }) => {
    const navigate = useNavigate();
    const [isCompleted, setIsCompleted] = useState(false);
    const [showMessage, setShowMessage] = useState(false);
    const [messageType, setMessageType] = useState('');
    const [messageText, setMessageText] = useState('');

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

    // Group lessons by section and sort them
    const lessonsBySection = lessons.reduce((acc, lesson) => {
        if (!acc[lesson.section_id]) {
            acc[lesson.section_id] = [];
        }
        acc[lesson.section_id].push(lesson);
        return acc;
    }, {});

    // Sort lessons within each section by lesson_order
    Object.values(lessonsBySection).forEach(sectionLessons => {
        sectionLessons.sort((a, b) => a.lesson_order - b.lesson_order);
    });

    // Sort sections by section_order
    const sortedSections = sections?.sort((a, b) => a.section_order - b.section_order);
    
    // Get current section's lessons
    const currentSectionLessons = lessonsBySection[currentSectionId] || [];
    const lessonIndexInSection = currentSectionLessons.findIndex(lesson => lesson.lesson_id === currentLessonId);

    // Get current section index
    const currentSectionIndex = sortedSections?.findIndex(section => section.section_id === currentSectionId);


    const goToPreviousLesson = () => {
        if (lessonIndexInSection > 0) {
            // Go to previous lesson in current section
            navigate(`/lesson/${currentSectionLessons[lessonIndexInSection - 1].lesson_id}`);
        } else if (currentSectionIndex > 0) {
            // Go to last lesson of previous section
            const previousSection = sortedSections[currentSectionIndex - 1];
            const previousSectionLessons = lessonsBySection[previousSection.section_id] || [];
            
            if (previousSectionLessons.length === 0) {
                console.error('No lessons found in previous section');
                return;
            }
            
            const lastLessonInPreviousSection = previousSectionLessons[previousSectionLessons.length - 1];
            navigate(`/lesson/${lastLessonInPreviousSection.lesson_id}`);
        }
    };

    const goToNextLesson = () => {
        if (lessonIndexInSection < currentSectionLessons.length - 1) {
            // Go to next lesson in current section
            onNext();
            navigate(`/lesson/${currentSectionLessons[lessonIndexInSection + 1].lesson_id}`);
        } else if (currentSectionIndex < sortedSections.length - 1) {
            // Go to first lesson of next section
            const nextSection = sortedSections[currentSectionIndex + 1];
            const nextSectionLessons = lessonsBySection[nextSection.section_id] || [];
            
            if (nextSectionLessons.length === 0) {
                console.error('No lessons found in next section');
                return;
            }
            
            const firstLessonInNextSection = nextSectionLessons[0];
            onNext();
            navigate(`/lesson/${firstLessonInNextSection.lesson_id}`);
        }
    };

    const showNotification = (type, text) => {
      
        setMessageType(type);
        setMessageText(text);
        setShowMessage(true);
        setTimeout(() => {
            // Add exit class first
            const message = document.querySelector('.floating-message');
            if (message) message.classList.add('exit');
            // Then remove the message after animation completes
            setTimeout(() => setShowMessage(false), 500);
        }, 3000);
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
                submitted_code: code
            }, {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            });

            if (response.status === 200) {
                showNotification('success', 
                    <div className="success-message">
                        <div>🎉 Great job! You've mastered this lesson!</div>
                        <div className="xp-gained">+{lessonXp} XP</div>
                    </div>
                );
                setIsCompleted(true);
            } else {
                showNotification('error', 'Unable to update lesson progress. Please try again.');
            }
        } catch (err) {
            console.error('Error completing lesson:', err);
            showNotification('error', `Error: ${err.message}`);
        }
    };

    return (
        <>
            {showMessage && (
                <div className={`floating-message ${messageType}`}>
                    <div className="message-content">
                        {messageText}
                   
                    </div>
                </div>
            )}
            <div className="lesson-navigation">
                <button
                    className="nav-button prev-button"
                    onClick={goToPreviousLesson}
                    disabled={currentSectionIndex === 0 && lessonIndexInSection === 0}
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
                {(lessonIndexInSection < currentSectionLessons.length - 1 || currentSectionIndex < sortedSections.length - 1) && (
                    <button
                        className="nav-button next-button"
                        onClick={goToNextLesson}
                        disabled={!isCompleted}
                    >
                        Next
                    </button>
                )}
            </div>
        </>
    );
};

export default LessonNavigation;