import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from 'components/Navbar';
import LessonList from 'components/LessonSection';
import RatingForm from 'components/RatingForm';
import axios from 'axios';
import 'styles/CourseSections.css';
import { useAuth } from 'AuthContext';
import SupportForm from 'components/SupportForm';
import { calculateLevel, calculateLevelProgress } from '../../utils/xpCalculator';

// Create axios instance with default config
const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
    timeout: 10000,
});

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (endpoint, config, retries = 0) => {
    try {
        const response = await api.get(endpoint, config);
        return response;
    } catch (err) {
        if (retries < MAX_RETRIES) {
            
            await sleep(RETRY_DELAY);
            return fetchWithRetry(endpoint, config, retries + 1);
        }
        throw err;
    }
};

const CourseSection = () => {
    const { courseId } = useParams();
    const { user } = useAuth();
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [stats, setStats] = useState({
        courseXP: 0,
        exercisesCompleted: 0,
        streak: 0,
        name: '',
        profileImage: '',
        totalXP: 0,
        level: 0,
        xpToNextLevel: 0
    });
    const [courseName, setCourseName] = useState('');
    const [profileData, setProfileData] = useState(null);
    const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
    const FREE_LESSON_LIMIT = 5;

    useEffect(() => {
        const fetchSubscriptionStatus = async () => {
            try {
                const response = await api.get('/api/check', {
                    headers: {
                        'Authorization': `Bearer ${user.token}`,
                    },
                });

                setHasActiveSubscription(response.data.hasActiveSubscription);
            } catch (err) {
                console.error('Error checking subscription:', err);
            }
        };

        const fetchProfileData = async () => {
            try {
                const response = await api.get(`/api/students/${user.user_id}`, {
                    headers: {
                        'Authorization': `Bearer ${user.token}`,
                    },
                });

                setProfileData(response.data);
            } catch (err) {
                console.error('Error checking subscription status:', err);
            }
        };

        if (user?.user_id) {
            fetchSubscriptionStatus();
            fetchProfileData();
        }
    }, [user]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError('');
            try {
                const config = {
                    headers: {
                        'Authorization': `Bearer ${user.token}`,
                    }
                };

                

                const [sectionsResponse, courseStatsResponse, overallStatsResponse, courseResponse] = await Promise.all([
                    fetchWithRetry(`/api/sections/course/${courseId}`, config),
                    fetchWithRetry(`/api/student/courses/${courseId}/stats`, config),
                    fetchWithRetry(`/api/student/stats/${user.user_id}`, config),
                    fetchWithRetry(`/api/courses/${courseId}`, config)
                ]);

                

                if (courseResponse.data) {
                    setCourseName(courseResponse.data.title);
                }
                    
                if (sectionsResponse.data) {
                    // Ensure lessons array exists and is properly formatted
                    const formattedSections = sectionsResponse.data.map(section => ({
                        ...section,
                        lessons: Array.isArray(section.lessons) ? section.lessons : []
                    }));
                    
                    setSections(formattedSections);
                }
                
                if (courseStatsResponse.data && overallStatsResponse.data) {
                    setStats({
                        courseXP: courseStatsResponse.data.courseXP || 0,
                        exercisesCompleted: courseStatsResponse.data.exercisesCompleted || 0,
                        streak: courseStatsResponse.data.streak || 0,
                        name: user.name,
                        profileImage: user.profileimage,
                        totalXP: overallStatsResponse.data.totalXP || 0,
                        level: overallStatsResponse.data.level || 0,
                        xpToNextLevel: overallStatsResponse.data.xpToNextLevel || 0
                    });
                }
            } catch (err) {
                console.error('Error details:', err.response?.data || err.message);
                setError('Failed to fetch course data. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        if (courseId && user?.user_id) {
            fetchData();
        }
    }, [courseId, user]);

   

    return (
        <>
            <Navbar />
            <div className="Page">
                <div className="Section">
                    <div className="course-header">
                        <h1>{courseName}</h1>
                        <div className="course-breadcrumb">
                            <span>Courses</span>
                            <span className="separator">/</span>
                            <span className="current">{courseName}</span>
                        </div>
                    </div>
                    
                    {profileData && !hasActiveSubscription && (
                        <div className="subscription-notice">
                            <p>Free trial: {profileData.exercisesCompleted || 0}/{FREE_LESSON_LIMIT} lessons completed</p>
                            {(profileData.exercisesCompleted || 0) >= FREE_LESSON_LIMIT && (
                                <p className="upgrade-message">
                                    Subscribe now to unlock all lessons!
                                </p>
                            )}
                        </div>
                    )}

                    {loading ? (
                        <p>Loading sections...</p>
                    ) : error ? (
                        <p className="error">{error}</p>
                    ) : sections.length === 0 ? (
                        <p>No sections found for this course.</p>
                    ) : (
                        sections.map((section) => {
                            
                            return (
                                <LessonList
                                    key={section.section_id}
                                    sectionName={section.name}
                                    sectionId={section.section_id}
                                    lessons={section.lessons}
                                    profileData={profileData}
                                    hasActiveSubscription={hasActiveSubscription}
                                />
                            );
                        })
                    )}
                </div>
                <div className="rating">
                    <div className='user-sidebar'>
                        <p className='status-title'>My Status</p>
                        <div className='user-info'>
                            <div className='user-icon'>
                                {stats.profileImage ? (
                                    <img 
                                        src={user.profileimage}
                                        alt="Profile" 
                                        className="profile-image"
                                    />
                                ) : (
                                    <div className="default-avatar">
                                        {stats.name ? stats.name[0].toUpperCase() : '?'}
                                    </div>
                                )}
                            </div>
                            <div className='user-details'>
                                <p className='username'>{stats.name}</p>
                                <p className='user-level'>Level {stats.level}</p>
                                <div className='xp-progress'>
                                    <div className='xp-progress-bar'>
                                        <div 
                                            className='xp-progress-fill' 
                                            style={{
                                                width: `${calculateLevelProgress(stats.totalXP)}%`
                                            }}
                                        />
                                    </div>
                                    <p className='xp-progress-text'>
                                        {stats.xpToNextLevel} XP to next level
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className='user-progress'>
                            <div className='progress-box'>
                                <p className='progress-value'>{stats.courseXP}+</p>
                                <p className='progress-label'>Course XP</p>
                            </div>
                            <div className='progress-box'>
                                <p className='progress-value'>{stats.exercisesCompleted}</p>
                                <p className='progress-label'>Exercises Completed</p>
                            </div>
                            <div className='progress-box'>
                                <p className='progress-value'>{stats.streak}</p>
                                <p className='progress-label'>Day Streak</p>
                            </div>
                        </div>
                    </div>
                    <RatingForm courseId={courseId} />
                </div>
            </div>
            <SupportForm/>
        </>
    );
};

export default CourseSection;
