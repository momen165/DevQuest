import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from 'components/Navbar';
import LessonList from 'components/LessonSection';
import RatingForm from 'components/RatingForm';
import axios from 'axios';
import 'styles/CourseSections.css';
import { useAuth } from 'AuthContext';
import SupportForm from 'components/SupportForm';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (url, config, retries = 0) => {
    try {
        const response = await axios.get(url, config);
        return response;
    } catch (err) {
        if (retries < MAX_RETRIES) {
            console.log(`Retrying request (${retries + 1}/${MAX_RETRIES})...`);
            await sleep(RETRY_DELAY);
            return fetchWithRetry(url, config, retries + 1);
        }
        throw err;
    }
};

// Define XP thresholds for each level
const LEVEL_THRESHOLDS = [
    0,    // Level 0: 0 XP
    100,  // Level 1: 100 XP
    500,  // Level 2: 500 XP
    850,  // Level 3: 850 XP
    1200, // Level 4: 1200 XP
];

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
                const response = await fetch('http://localhost:5000/api/check', {
                    headers: {
                        'Authorization': `Bearer ${user.token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch subscription details');
                }

                const data = await response.json();
                setHasActiveSubscription(data.hasActiveSubscription);
            } catch (err) {
                console.error('Error checking subscription:', err);
            }
        };

        const fetchProfileData = async () => {
            try {
                const response = await fetch(`/api/students/${user.user_id}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${user.token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch profile data');
                }
                const data = await response.json();
                setProfileData(data);
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
                        'Content-Type': 'application/json'
                    }
                };

                const [sectionsResponse, courseStatsResponse, overallStatsResponse, courseResponse] = await Promise.all([
                    fetchWithRetry(`/api/sections/course/${courseId}`, config),
                    fetchWithRetry(`/api/courses/${courseId}/stats/${user.user_id}`, config),
                    fetchWithRetry(`/api/students/${user.user_id}/stats`, config),
                    fetchWithRetry(`/api/courses/${courseId}`, config)
                ]);

                if (courseResponse.data) {
                    setCourseName(courseResponse.data.title);
                }
                
                if (sectionsResponse.data) {
                    setSections(sectionsResponse.data);
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

    const calculateProgressPercentage = (totalXP, level) => {
        const currentLevelXP = LEVEL_THRESHOLDS[level];
        const nextLevelXP = LEVEL_THRESHOLDS[level + 1];
        const xpInCurrentLevel = totalXP - currentLevelXP;
        const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
        return (xpInCurrentLevel / xpNeededForNextLevel) * 100;
    };

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
                        sections.map((section) => (
                            <LessonList
                                key={section.section_id}
                                sectionName={section.name}
                                sectionId={section.section_id}
                                lessons={section.lessons || []}
                                profileData={profileData}
                                hasActiveSubscription={hasActiveSubscription}
                            />
                        ))
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
                                                width: `${calculateProgressPercentage(stats.totalXP, stats.level)}%`
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
