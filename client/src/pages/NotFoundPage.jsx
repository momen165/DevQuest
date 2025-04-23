// src/pages/NotFoundPage.js
import React from "react";

const NotFoundPage = () => {
  const styles = {
    container: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      textAlign: "center",
      background: "linear-gradient(135deg, #1A3278, #09122A)",
      color: "#ffffff",
      fontFamily: "Arial, sans-serif",
    },
    heading: {
      fontSize: "4rem",
      marginBottom: "1rem",
    },
    paragraph: {
      fontSize: "1.5rem",
      marginBottom: "2rem",
    },
    link: {
      fontSize: "1.2rem",
      color: "#ffffff",
      textDecoration: "none",
      border: "1px solid #ffffff",
      padding: "0.5rem 1rem",
      borderRadius: "5px",
      transition: "background-color 0.3s, color 0.3s",
    },
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>404 - Page Not Found</h1>
      <p style={styles.paragraph}>
        The page you are looking for does not exist.
      </p>
      <a href="/" style={styles.link}>
        Go back to Home
      </a>
    </div>
  );
};

export default NotFoundPage;
