import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from 'components/Navbar';
import LessonList from 'components/LessonSection';
import RatingForm from 'components/RatingForm';
import axios from 'axios';
import 'styles/CourseSections.css';
import { useAuth } from 'AuthContext';
import SupportForm from 'components/SupportForm';

const CourseSection = () => {
    const { courseId } = useParams();
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [profileData, setProfileData] = useState(null);
    const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
    const { user } = useAuth();
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
                console.log('Subscription data:', data);
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
        const fetchSections = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await axios.get(`http://localhost:5000/api/section?course_id=${courseId}`);
                setSections(response.data);
            } catch (err) {
                setError('Failed to fetch sections.');
                console.error('Error fetching sections:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSections();
    }, [courseId]);

    return (
        <>
            <Navbar />
            <div className="Page">
                <div className="Section">
                    <h1>Course Sections</h1>
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
                                profileData={profileData}
                                hasActiveSubscription={hasActiveSubscription}
                            />
                        ))
                    )}
                </div>
                <div className="rating">
                    <RatingForm courseId={courseId} />
                </div>
            </div>
            <SupportForm/>
        </>
        
    );
};

export default CourseSection;
