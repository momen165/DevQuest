import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from 'AuthContext';
import '../styles/Footer.css';
import footerLogo from '../assets/icons/footerLogo.svg';
import { FaLinkedin, FaGithub, FaTwitter, FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';

const Footer = () => {
    const [courses, setCourses] = useState([]);
    const [enrollments, setEnrollments] = useState({});
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        const fetchCoursesAndEnrollments = async () => {
            try {
                const [coursesRes, enrollmentsRes] = await Promise.all([
                    axios.get('/api/getCoursesWithRatings'),
                    user?.user_id
                        ? axios.get(`/api/students/${user.user_id}/enrollments`)
                        : Promise.resolve({})
                ]);

                // Get first 5 courses
                setCourses(coursesRes.data.courses.slice(0, 5));
                setEnrollments(enrollmentsRes.data || {});
            } catch (err) {
                console.error('Error fetching footer data:', err);
            }
        };

        fetchCoursesAndEnrollments();
    }, [user]);

    const handleCourseClick = (courseId) => {
        if (enrollments[courseId]) {
            navigate(`/course/${courseId}`);
        } else {
            navigate(`/enroll/${courseId}`);
        }
    };

    return (
        <footer className="footer">
            <div className="footer__container">
                <div className="footer__brand">
                    <img src={footerLogo} alt="DevQuest" className="footer__logo" />
                    <p className="footer__tagline">Empowering developers through interactive learning</p>
                </div>

                <div className="footer__content">
                    <div className="footer__links">
                        <div className="footer__section">
                            <h3 className="footer__title">Quick Links</h3>
                            <ul>
                                <li><Link to="/">Home</Link></li>
                                <li><Link to="/CoursesPage">Courses</Link></li>
                                <li><Link to="/pricing">Pricing</Link></li>
                            </ul>
                        </div>
                        
                        <div className="footer__section">
                            <h3 className="footer__title">Popular Courses</h3>
                            <ul>
                                {courses.map(course => (
                                    <li key={course.course_id}>
                                        <button 
                                            className="footer__course-link"
                                            onClick={() => handleCourseClick(course.course_id)}
                                        >
                                            {course.name || course.title}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="footer__section">
                            <h3 className="footer__title">Support</h3>
                            <ul>
                                <li><Link to="/faq">FAQ</Link></li>
                                <li><Link to="/privacy">Privacy Policy</Link></li>
                            </ul>
                        </div>

                        <div className="footer__section">
                            <h3 className="footer__title">Contact</h3>
                            <ul className="footer__contact-list">
                                <li><FaEnvelope /> <span>contact@devquest.com</span></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <div className="footer__bottom">
                <div className="footer__social">
                    <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"><FaLinkedin /></a>
                    <a href="https://github.com" target="_blank" rel="noopener noreferrer"><FaGithub /></a>
                    <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"><FaTwitter /></a>
                </div>
                <p className="footer__copyright">&copy; 2024 DevQuest. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;