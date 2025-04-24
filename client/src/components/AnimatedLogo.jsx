import React, { useEffect, useState } from "react";
import "../styles/AnimatedLogo.css";
import AnimatedLogoMain from "../assets/icons/animatedLogo.svg";
import AnimatedLogoSecond from "../assets/icons/animatedLogoSecond.svg";

const AnimatedLogo = () => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Trigger animation after a small delay to ensure smooth transition
    setTimeout(() => setAnimate(true), 100);
  }, []);

  return (
    <div className={`animated-logo-card ${animate ? "animate" : ""}`}>
      <div className="animated-logo-tools">
        <div className="animated-logo-circle">
          <span className="animated-logo-red animated-logo-box"></span>
        </div>
        <div className="animated-logo-circle">
          <span className="animated-logo-yellow animated-logo-box"></span>
        </div>
        <div className="animated-logo-circle">
          <span className="animated-logo-green animated-logo-box"></span>
        </div>
      </div>
      <div className="animated-logo-border"></div>
      <div className="animated-logo-content">
        <div className="animated-logo">
          <div className="animated-logo1">
            <img
              src={AnimatedLogoMain}
              alt="Main Logo"
              width="85"
              height="90"
            />
          </div>
          <div className="animated-logo2">
            <img
              src={AnimatedLogoSecond}
              alt="Second Logo"
              width="211"
              height="70"
            />
          </div>
          <div className="animated-logo-trail"></div>
        </div>
        <span className="animated-logo-content-bottom-text">
          dev-quest<b>.</b>tech
        </span>
      </div>
      <span className="animated-logo-bottom-text">universe of Coding</span>
    </div>
  );
};

export default AnimatedLogo;
