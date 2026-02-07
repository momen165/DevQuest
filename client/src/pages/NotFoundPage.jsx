// src/pages/NotFoundPage.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const NotFoundPage = () => {
  const navigate = useNavigate();
  const [glitchText, setGlitchText] = useState("404");
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Glitch effect for 404 text
  useEffect(() => {
    const glitchChars = ["4", "0", "4", "█", "▓", "▒", "░"];
    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        const randomChars = Array.from({ length: 3 }, () => 
          glitchChars[Math.floor(Math.random() * glitchChars.length)]
        ).join("");
        setGlitchText(randomChars);
        setTimeout(() => setGlitchText("404"), 100);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Mouse movement effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleGoHome = () => {
    navigate("/");
  };

  const handleBrowseCourses = () => {
    navigate("/CoursesPage");
  };

  const styles = {
    container: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      textAlign: "center",
      background: `linear-gradient(-45deg, #1E3C90, #09112A, #230982, #1a4f7e)`,
      backgroundSize: "400% 400%",
      color: "#ffffff",
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
      overflow: "hidden",
      animation: "gradientBG 15s ease infinite",
    },
    backgroundOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(52, 152, 219, 0.1) 0%, transparent 50%)`,
      pointerEvents: "none",
      transition: "background 0.3s ease",
    },
    floatingElements: {
      position: "absolute",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
    },
    floatingElement: {
      position: "absolute",
      width: "4px",
      height: "4px",
      background: "rgba(52, 152, 219, 0.6)",
      borderRadius: "50%",
      animation: "float 6s ease-in-out infinite",
    },
    content: {
      position: "relative",
      zIndex: 2,
      maxWidth: "800px",
      padding: "0 2rem",
    },
    errorCode: {
      fontSize: "clamp(8rem, 20vw, 12rem)",
      fontWeight: "900",
      marginBottom: "1rem",
      background: "linear-gradient(135deg, #3498db, #2980b9, #4299e1)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      textShadow: "0 0 50px rgba(52, 152, 219, 0.5)",
      animation: "pulse 2s ease-in-out infinite alternate",
      fontFamily: "monospace",
      letterSpacing: "0.1em",
    },
    title: {
      fontSize: "clamp(2rem, 5vw, 3rem)",
      fontWeight: "700",
      marginBottom: "1.5rem",
      color: "#ffffff",
      textShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
    },
    subtitle: {
      fontSize: "clamp(1.1rem, 2.5vw, 1.3rem)",
      marginBottom: "3rem",
      color: "rgba(255, 255, 255, 0.8)",
      lineHeight: "1.6",
      maxWidth: "600px",
      margin: "0 auto 3rem auto",
    },
    buttonContainer: {
      display: "flex",
      gap: "1.5rem",
      flexWrap: "wrap",
      justifyContent: "center",
      alignItems: "center",
    },
    button: {
      padding: "1rem 2rem",
      fontSize: "1.1rem",
      fontWeight: "600",
      border: "none",
      borderRadius: "12px",
      cursor: "pointer",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      gap: "0.5rem",
      position: "relative",
      overflow: "hidden",
      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
    },
    primaryButton: {
      background: "linear-gradient(135deg, #3498db, #2980b9)",
      color: "#ffffff",
      border: "1px solid rgba(255, 255, 255, 0.1)",
    },
    secondaryButton: {
      background: "rgba(255, 255, 255, 0.1)",
      color: "#ffffff",
      border: "1px solid rgba(255, 255, 255, 0.2)",
      backdropFilter: "blur(10px)",
    },
    codeBlock: {
      position: "absolute",
      bottom: "2rem",
      right: "2rem",
      background: "rgba(0, 0, 0, 0.5)",
      border: "1px solid rgba(52, 152, 219, 0.3)",
      borderRadius: "8px",
      padding: "1rem",
      fontFamily: "monospace",
      fontSize: "0.9rem",
      color: "#3498db",
      backdropFilter: "blur(10px)",
      maxWidth: "300px",
    },
    animation: `
      @keyframes gradientBG {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      
      @keyframes pulse {
        0% { transform: scale(1); }
        100% { transform: scale(1.05); }
      }
      
      @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
        50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
      }
      
      @keyframes slideInUp {
        from { 
          opacity: 0; 
          transform: translateY(30px); 
        }
        to { 
          opacity: 1; 
          transform: translateY(0); 
        }
      }
    `,
  };

  // Add the CSS animations to the document
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = styles.animation;
    document.head.appendChild(styleSheet);
    return () => document.head.removeChild(styleSheet);
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.backgroundOverlay}></div>
      
      {/* Floating Elements */}
      <div style={styles.floatingElements}>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            style={{
              ...styles.floatingElement,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
              animationDuration: `${4 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      <div style={styles.content}>
        <div style={styles.errorCode}>{glitchText}</div>
        
        <h1 style={styles.title}>
          Oops! Page Not Found
        </h1>
        
        <p style={styles.subtitle}>
          The page you&apos;re looking for seems to have ventured into the digital void. 
          Don&apos;t worry though – your coding journey continues here at DevQuest!
        </p>

        <div style={styles.buttonContainer}>
          <button
            onClick={handleGoHome}
            style={{...styles.button, ...styles.primaryButton}}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 8px 25px rgba(52, 152, 219, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.2)";
            }}
          >
            🏠 Back to Home
          </button>
          
          <button
            onClick={handleBrowseCourses}
            style={{...styles.button, ...styles.secondaryButton}}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.background = "rgba(255, 255, 255, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.background = "rgba(255, 255, 255, 0.1)";
            }}
          >
            📚 Browse Courses
          </button>
        </div>
      </div>

      {/* Code block decoration */}
      <div style={styles.codeBlock}>
        <div>if (page.exists()) {'{'}</div>
        <div>&nbsp;&nbsp;render(page);</div>
        <div>{'}'} else {'{'}</div>
        <div>&nbsp;&nbsp;return &lt;NotFoundPage /&gt;;</div>
        <div>{'}'}</div>
      </div>
    </div>
  );
};

export default NotFoundPage;
