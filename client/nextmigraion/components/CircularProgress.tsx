import React from 'react';
import "@/styles/CircularProgress.css";

const CircularProgress: React.FC = () => {
  return (
    <div className="spinner-container">
      <div className="spinner">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
    </div>
  );
}

export default CircularProgress;
