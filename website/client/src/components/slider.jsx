import React, { useRef } from 'react';
import 'styles/Slider.css';

const Slider = () => {
  const sliderRef = useRef(null);

  const scrollLeft = () => {
    sliderRef.current.scrollBy({
      left: -300, // Adjust the value for scrolling distance
      behavior: 'smooth'
    });
  };

  const scrollRight = () => {
    sliderRef.current.scrollBy({
      left: 300, // Adjust the value for scrolling distance
      behavior: 'smooth'
    });
  };

  return (
    <div className="slider-container">
      <button className="slider-arrow left-arrow" onClick={scrollLeft}>{"<"}</button>
      <div className="slider" ref={sliderRef}>
        {/* Replace these divs with actual sections or items */}
        <div className="slider-item">Section 1</div>
        <div className="slider-item">Section 2</div>
        <div className="slider-item">Section 3</div>
        <div className="slider-item">Section 4</div>
        <div className="slider-item">Section 5</div>
        <div className="slider-item">Section 5</div>
        <div className="slider-item">Section 5</div>
        <div className="slider-item">Section 5</div>
        <div className="slider-item">Section 5</div>
      </div>
      <button className="slider-arrow right-arrow" onClick={scrollRight}>{">"}</button>
    </div>
  );
};

export default Slider;
