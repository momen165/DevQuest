import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircularProgressbarWithChildren } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import 'styles/LessonSection.css';
import 'styles/CourseSections.css';
import axios from 'axios';
import { useAuth } from 'AuthContext';

const FREE_LESSON_LIMIT = 5;

const LessonList = ({ sectionName, sectionId, profileData, hasActiveSubscription }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        const fetchLessons = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await axios.get(`http://localhost:5000/api/lesson?section_id=${sectionId}`, {
                    headers: {
                        Authorization: `Bearer ${user.token}`,
                    },
                });
                const lessons = Array.isArray(response.data) ? response.data : [];
                const sortedLessons = lessons.sort((a, b) => (a.order || 0) - (b.order || 0));
                setLessons(sortedLessons);
            } catch (err) {
                setError('Failed to fetch lessons.');
                console.error('Error fetching lessons:', err);
            } finally {
                setLoading(false);
            }
        };
        
        fetchLessons();
    }, [sectionId, user.token]);

    const toggleSection = () => {
        setIsOpen(!isOpen);
    };

    // Calculate section completion stats
    const completedLessons = lessons.filter(lesson => lesson.completed).length;
    const totalLessons = lessons.length;
    const completionPercentage = (completedLessons / totalLessons) * 100;
    const isSectionCompleted = totalLessons > 0 && completedLessons === totalLessons;

    const renderProgressSegments = () => {
        return (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <div className="lesson-progress-circle-wrapper">
                    <CircularProgressbarWithChildren 
                        value={100}
                        strokeWidth={8}
                        styles={{
                            path: { stroke: '#222222' },
                            trail: { stroke: 'transparent' },
                        }}
                    >
                        <svg width="100%" height="100%" viewBox="0 0 36 36" style={{ position: 'absolute' }}>
                            <g transform="translate(18, 18)">
                                {/* Segments */}
                                {lessons.map((lesson, index) => {
                                    const segmentAngle = (360 / lessons.length) - 8;
                                    const startAngle = (index * 360 / lessons.length) - 90 + 4;
                                    const endAngle = startAngle + segmentAngle;
                                    
                                    const innerRadius = 12;
                                    const outerRadius = 16;
                                    const cornerRadius = 1.5;
                                    
                                    const startRadians = (startAngle * Math.PI) / 180;
                                    const endRadians = (endAngle * Math.PI) / 180;
                                    
                                    // Calculate points and control points
                                    const x1 = Math.cos(startRadians) * outerRadius;
                                    const y1 = Math.sin(startRadians) * outerRadius;
                                    const x2 = Math.cos(endRadians) * outerRadius;
                                    const y2 = Math.sin(endRadians) * outerRadius;
                                    const x3 = Math.cos(endRadians) * innerRadius;
                                    const y3 = Math.sin(endRadians) * innerRadius;
                                    const x4 = Math.cos(startRadians) * innerRadius;
                                    const y4 = Math.sin(startRadians) * innerRadius;
                                    
                                    const startOuterAngleRad = startRadians - (Math.PI / 2) * 0.2;
                                    const endOuterAngleRad = endRadians + (Math.PI / 2) * 0.2;
                                    const startInnerAngleRad = startRadians + (Math.PI / 2) * 0.2;
                                    const endInnerAngleRad = endRadians - (Math.PI / 2) * 0.2;

                                    const d = `
                                        M ${x1} ${y1}
                                        A ${outerRadius} ${outerRadius} 0 ${segmentAngle <= 180 ? "0" : "1"} 1 ${x2} ${y2}
                                        Q ${Math.cos(endOuterAngleRad) * (outerRadius - cornerRadius)} ${Math.sin(endOuterAngleRad) * (outerRadius - cornerRadius)}
                                          ${x3} ${y3}
                                        A ${innerRadius} ${innerRadius} 0 ${segmentAngle <= 180 ? "0" : "1"} 0 ${x4} ${y4}
                                        Q ${Math.cos(startInnerAngleRad) * (innerRadius + cornerRadius)} ${Math.sin(startInnerAngleRad) * (innerRadius + cornerRadius)}
                                          ${x1} ${y1}
                                    `;

                                    return (
                                        <path
                                            key={index}
                                            d={d}
                                            fill={lesson.completed ? '#4CAF50' : '#666'}
                                            stroke="none"
                                            style={{
                                                transition: 'fill 0.3s ease',
                                                filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.2))'
                                            }}
                                        />
                                    );
                                })}
                                
                                <circle cx="0" cy="0" r="10.5" fill="rgba(0,0,0,0.8)" />
                            </g>
                        </svg>
                        <div style={{ 
                            fontSize: '14px', 
                            color: '#fff',
                            fontWeight: 'bold',
                            position: 'relative',
                            zIndex: 2
                        }}>
                            {`${completedLessons}/${totalLessons}`}
                        </div>
                    </CircularProgressbarWithChildren>
                </div>
            </div>
        );
    };

    if (loading) {
        return <p>Loading lessons...</p>;
    }

    if (error) {
        return <p className="error">{error}</p>;
    }

    return (
        <div className={`lesson-section ${isSectionCompleted ? 'section-completed' : ''} ${isOpen ? 'content-open' : ''}`}>
            <div className="section-header" onClick={toggleSection}>
                <div className="section-header-content">
                    <h2>{sectionName}</h2>
                    {!isSectionCompleted && (
                        <div className={`lesson-section-progress ${isOpen ? 'right-aligned' : 'center-aligned'}`}>
                            {renderProgressSegments()}
                        </div>
                    )}
                </div>
                <button 
                    className={`toggle-button ${isOpen ? 'open' : ''}`}
                    aria-label={isOpen ? 'Collapse section' : 'Expand section'}
                >
                    ▼
                </button>
            </div>
            <div className={`lesson-content ${isOpen ? 'open' : ''}`}>
                <div className="lesson-list">
                    {lessons.map((lesson, index) => (
                        <Link 
                            to={`/lesson/${lesson.lesson_id}`} 
                            key={lesson.lesson_id}
                            className={`lesson-item ${lesson.completed ? 'completed' : ''} ${
                                !hasActiveSubscription && 
                                (profileData?.exercisesCompleted || 0) >= FREE_LESSON_LIMIT 
                                    ? 'disabled'
                                    : ''
                            }`}
                        >
                            <span>
                                <span className="lesson-number">Lesson {index + 1}</span>
                                <span className="lesson-title">{lesson.name}</span>
                            </span>
                            <div className="checkbox-wrapper-31">
                                <input 
                                    type="checkbox" 
                                    checked={lesson.completed} 
                                    readOnly 
                                />
                                <svg viewBox="0 0 35.6 35.6">
                                    <circle className="background" cx="17.8" cy="17.8" r="17.8"></circle>
                                    <circle className="stroke" cx="17.8" cy="17.8" r="14.37"></circle>
                                    <polyline className="check" points="11.78 18.12 15.55 22.23 25.17 12.87"></polyline>
                                </svg>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LessonList;