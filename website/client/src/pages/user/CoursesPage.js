import React from 'react';
import 'styles/CoursesPage.css';
import CourseCard from 'components/CourseCard';
import FilterTabs from 'components/FilterTabs';
import Navbar from 'components/Navbar';
import jsicon from 'assets/images/JS-icon.svg'
import pyico from 'assets/icons/python-icon.svg'
import htmlico from 'assets/icons/HTML-icon.svg' 



const CoursesPage = () => {
  return (
    
    <div className="courses-page">
     
     <Navbar/>
     
      <header className="courses-header">
        <p className='hero-head'>All Courses</p>
        <p className='hero-para'>A large number of courses on different topics are waiting for you.
          <br/>
           You can find there everything from self-developing to sciences, for any knowledge levels.</p>
        <FilterTabs />
      </header>
      
      <section className="courses-grid">
        {/* Render multiple CourseCard components here */}
        <CourseCard courseId="javascript" icon={jsicon} color="#FEFEF2" title="JavaScript Fundamentals"  level="Beginner" rating={4.5} students={151} description="Learn the fundamentals of JavaScript and start building interactive websites." />
        <CourseCard courseId="python" icon={pyico} btnpath='/CourseSection' color="#EFE3DE" title="Introduction to Python" level="Beginner" rating={4.6} students={890} description="Master the basics of Python programming for data science and web development." />
        <CourseCard courseId="html" icon={htmlico} color="#C8EBF3" title="HTML5 for Beginners" level="Beginner" rating={4.8} students={170} description="Get started with HTML5 and build your first web pages." />
        <CourseCard title="JavaScript Fundamentals" level="Beginner" rating={4.5} students={151} description="Learn the fundamentals of JavaScript and start building interactive websites." />
        <CourseCard title="JavaScript Fundamentals" level="Beginner" rating={4.5} students={151} description="Learn the fundamentals of JavaScript and start building interactive websites." />
        <CourseCard title="JavaScript Fundamentals" level="Beginner" rating={4.5} students={151} description="Learn the fundamentals of JavaScript and start building interactive websites." />

        {/* Add more CourseCard components as needed */}
      </section>
    </div>
  );
};

export default CoursesPage;
