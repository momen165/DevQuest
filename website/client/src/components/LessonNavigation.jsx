import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCheck, FaBars } from 'react-icons/fa';
import 'styles/LessonNavigation.css';
import axios from "axios";
import { useAuth } from 'AuthContext';

// Create axios instance with default config


const LessonNavigation = ({ currentLessonId, lessons, isAnswerCorrect, onNext, code, currentSectionId, sections, lessonXp }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [showMessage, setShowMessage] = useState(false);
    const [messageType, setMessageType] = useState('');
    const [messageText, setMessageText] = useState('');
    const [menuSections, setMenuSections] = useState([]);
    const [courseName, setCourseName] = useState('');
    const [courseId, setCourseId] = useState(null);
    const [openSectionId, setOpenSectionId] = useState(currentSectionId);
    const [loading, setLoading] = useState(false);

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

    // Add new effect to fetch menu data
    useEffect(() => {
        const fetchMenuData = async () => {
            if (!currentSectionId || !user?.token) return;
            
            setLoading(true);
            try {
                // First get the course ID from the current section
                const sectionResponse = await axios.get(`http://localhost:5000/api/sections/${currentSectionId}`, {
                    headers: {
                        Authorization: `Bearer ${user.token}`,
                    }
                });

                if (sectionResponse.status === 200 && sectionResponse.data) {
                    const courseId = sectionResponse.data.course_id;
                    setCourseId(courseId);

                    // Get course details for the name
                    const courseResponse = await axios.get(`http://localhost:5000/api/courses/${courseId}`, {
                        headers: {
                            Authorization: `Bearer ${user.token}`,
                        }
                    });

                    if (courseResponse.status === 200) {
                        setCourseName(courseResponse.data.title);
                    }

                    // Then get all sections for this course with their lessons
                    const sectionsResponse = await axios.get(`http://localhost:5000/api/sections/course/${courseId}`, {
                        headers: {
                            Authorization: `Bearer ${user.token}`,
                        }
                    });

                    if (sectionsResponse.status === 200) {
                        setMenuSections(sectionsResponse.data || []);
                    }
                }
            } catch (error) {
                console.error('Error fetching menu data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMenuData();
    }, [currentSectionId, user]);

    // Group lessons by section
    const organizedSections = sections?.map(section => ({
        ...section,
        id: section.section_id,
        lessons: lessons.filter(lesson => lesson.section_id === section.section_id)
            .map(lesson => ({
                ...lesson,
                id: lesson.lesson_id,
                lesson_id: lesson.lesson_id,
                name: lesson.name,
                completed: lesson.completed
            }))
            .sort((a, b) => a.lesson_order - b.lesson_order)
    })).sort((a, b) => a.section_order - b.section_order);

    // Add this debug log
    

    // Calculate current section and lesson indices
    const currentSectionIndex = organizedSections?.findIndex(section => 
        section.section_id === currentSectionId || section.id === currentSectionId
    ) || 0;
    const currentSection = organizedSections?.[currentSectionIndex];
    const currentSectionLessons = currentSection?.lessons || [];
    const lessonIndexInSection = currentSectionLessons.findIndex(lesson => lesson.id === currentLessonId);

    const navigateToLesson = (sectionId, lessonId) => {
        navigate(`/lesson/${lessonId}`);
    };

    const goToPreviousLesson = () => {
        if (lessonIndexInSection > 0) {
            // Go to previous lesson in current section
            navigate(`/lesson/${currentSectionLessons[lessonIndexInSection - 1].id}`);
        } else if (currentSectionIndex > 0) {
            // Go to last lesson of previous section
            const previousSection = organizedSections[currentSectionIndex - 1];
            const previousSectionLessons = previousSection.lessons;
            
            if (previousSectionLessons.length === 0) {
                console.error('No lessons found in previous section');
                return;
            }
            
            const lastLessonInPreviousSection = previousSectionLessons[previousSectionLessons.length - 1];
            navigate(`/lesson/${lastLessonInPreviousSection.id}`);
        }
    };

    const goToNextLesson = () => {
        
        if (lessonIndexInSection < currentSectionLessons.length - 1) {
            // Go to next lesson in current section
            onNext();
            navigate(`/lesson/${currentSectionLessons[lessonIndexInSection + 1].id}`);
        } else if (currentSectionIndex < organizedSections?.length - 1) {
            // Go to first lesson of next section
            const nextSection = organizedSections[currentSectionIndex + 1];
            
            const nextSectionLessons = nextSection.lessons;
         
            
            if (!nextSectionLessons || nextSectionLessons.length === 0) {
                console.error('No lessons found in next section');
                return;
            }
            
            const firstLessonInNextSection = nextSectionLessons[0];
            onNext();
            navigate(`/lesson/${firstLessonInNextSection.id}`);
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

    

    const toggleSection = (sectionId) => {
       
        setOpenSectionId(prevId => sectionId === prevId ? null : sectionId);
    };

    return (
        <>
            <div className={`lesson-nav-menu ${isMenuOpen ? 'open' : ''}`}>
                {/* Course Header */}
                <div className="lesson-nav-course-header" onClick={() => navigate(`/course/${courseId}`)}>
                    <h2>{courseName}</h2>
                </div>

                {/* Sections */}
                {menuSections.map((section) => (
                    <div key={section.section_id} className="lesson-nav-section">
                        <div 
                            className="lesson-nav-section-title"
                            onClick={() => toggleSection(section.section_id)}
                            style={{ 
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px'
                            }}
                        >
                            <span>{section.name}</span>
                            <span className={`arrow ${openSectionId === section.section_id ? 'open' : ''}`}>▼</span>
                        </div>
                        <div 
                            className={`lesson-nav-section-content ${openSectionId === section.section_id ? 'open' : ''}`}
                            style={{
                                maxHeight: openSectionId === section.section_id ? '500px' : '0',
                                overflow: 'hidden',
                                transition: 'max-height 0.3s ease-in-out'
                            }}
                        >
                            {section.lessons?.map((lesson) => (
                                <div
                                    key={lesson.lesson_id}
                                    className={`lesson-nav-item ${lesson.lesson_id === currentLessonId ? 'active' : ''}`}
                                    onClick={() => navigate(`/lesson/${lesson.lesson_id}`)}
                                >
                                    {lesson.name}
                                    {lesson.completed && <FaCheck className="completion-icon" />}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {showMessage && (
                <div className={`floating-message ${messageType}`}>
                    <div className="message-content">{messageText}</div>
                </div>
            )}
            
            <div className="lesson-navigation">
                <button className="lesson-menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    <FaBars />
                </button>
                <div className="nav-buttons-wrapper">
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
                    {(lessonIndexInSection < currentSectionLessons.length - 1 || currentSectionIndex < organizedSections?.length - 1) && (
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
        </>
    );
};

export default LessonNavigation;