'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import '@/styles/Footer.css';
import Image from 'next/image';
import footerLogo from '@/public/assets/icons/layer1.svg';
import { FaLinkedin, FaGithub, FaTwitter, FaEnvelope } from 'react-icons/fa';

interface Course {
  course_id: string;
  name?: string;
  title?: string;
}

interface Enrollments {
  [key: string]: any;
}

const Footer: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollments>({});
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const fetchCoursesAndEnrollments = async () => {
      try {
        const [coursesRes, enrollmentsRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/getCoursesWithRatings`),
          user?.user_id
            ? axios.get(`${process.env.NEXT_PUBLIC_API_URL}/students/${user.user_id}/enrollments`)
            : Promise.resolve({ data: {} }),
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

  const handleCourseClick = (courseId: string) => {
    if (enrollments[courseId]) {
      router.push(`/course/${courseId}`);
    } else {
      router.push(`/enroll/${courseId}`);
    }
  };

  return (
    <footer className="footer">
      <div className="footer__container">
        <div className="footer__brand">
          <Image src={footerLogo} alt="DevQuest" className="footer__logo" width={150} height={50} />
          <p className="footer__tagline">Empowering developers through interactive learning</p>
        </div>

        <div className="footer__content">
          <div className="footer__links">
            <div className="footer__section">
              <h3 className="footer__title">Quick Links</h3>
              <ul>
                <li>
                  <Link href="/">Home</Link>
                </li>
                <li>
                  <Link href="/CoursesPage">Courses</Link>
                </li>
                <li>
                  <Link href="/pricing">Pricing</Link>
                </li>
              </ul>
            </div>

            <div className="footer__section">
              <h3 className="footer__title">Popular Courses</h3>
              <ul>
                {courses.map((course) => (
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
                <li>
                  <Link href="/faq">FAQ</Link>
                </li>
                <li>
                  <Link href="/privacy">Privacy Policy</Link>
                </li>
                <li>
                  <Link href="/terms">Terms of Service</Link>
                </li>
              </ul>
            </div>

            <div className="footer__section">
              <h3 className="footer__title">Contact</h3>
              <ul className="footer__contact-list">
                <li>
                  <FaEnvelope /> <span>contact@email.dev-quest.me</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="footer__bottom">
        <div className="footer__social">
          <a
            href="https://www.linkedin.com/in/momen-aabed/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaLinkedin />
          </a>
          <a href="https://github.com/momen165" target="_blank" rel="noopener noreferrer">
            <FaGithub />
          </a>
        </div>
        <p className="footer__copyright">
          &copy; {new Date().getFullYear()} DevQuest. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
