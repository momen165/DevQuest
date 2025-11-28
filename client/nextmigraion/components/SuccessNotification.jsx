import React, { useEffect } from 'react';

// SuccessNotification component for celebrating achievements
const SuccessNotification = ({ xp, message = "Great job! You've mastered this lesson!" }) => {
  // Add keyframe animation styles on component mount
  useEffect(() => {
    // Add animation styles if they don't exist
    if (!document.getElementById('success-animation-styles')) {
      const style = document.createElement('style');
      style.id = 'success-animation-styles';
      style.innerHTML = `
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        
        @keyframes bounceIn {
          0%, 20%, 40%, 60%, 80%, 100% { transform: scale(1) }
          50% { transform: scale(1.1) }
        }
        
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
        }
        
        @keyframes glitter {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100px) rotate(720deg); opacity: 0; }
        }
        
        @keyframes gradientBG {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .success-confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          background: #ffd700;
          top: -5px;
          opacity: 0;
        }
        
        .success-confetti-piece:nth-child(1) {
          left: 7%;
          animation: confetti 3s ease-in-out 0.1s infinite;
          background-color: #ffeb3b;
        }
        
        .success-confetti-piece:nth-child(2) {
          left: 14%;
          animation: confetti 3.5s ease-in-out 0.5s infinite;
          background-color: #4caf50;
        }
        
        .success-confetti-piece:nth-child(3) {
          left: 21%;
          animation: confetti 2.8s ease-in-out 0.9s infinite;
          background-color: #3f51b5;
        }
        
        .success-confetti-piece:nth-child(4) {
          left: 28%;
          animation: confetti 3.2s ease-in-out 1.3s infinite;
          background-color: #9c27b0;
        }
        
        .success-confetti-piece:nth-child(5) {
          left: 35%;
          animation: confetti 3.7s ease-in-out 1.7s infinite;
          background-color: #e91e63;
        }
        
        .success-confetti-piece:nth-child(6) {
          left: 42%;
          animation: confetti 3s ease-in-out 2.1s infinite;
          background-color: #f44336;
        }
        
        .success-confetti-piece:nth-child(7) {
          left: 49%;
          animation: confetti 3.6s ease-in-out 2.5s infinite;
          background-color: #ff9800;
        }
        
        .success-confetti-piece:nth-child(8) {
          left: 56%;
          animation: confetti 3.2s ease-in-out 2.9s infinite;
          background-color: #00bcd4;
        }
        
        .success-confetti-piece:nth-child(9) {
          left: 63%;
          animation: confetti 3.4s ease-in-out 3.3s infinite;
          background-color: #ffeb3b;
        }
        
        .success-confetti-piece:nth-child(10) {
          left: 70%;
          animation: confetti 3.1s ease-in-out 3.7s infinite;
          background-color: #4caf50;
        }
        
        .success-confetti-piece:nth-child(11) {
          left: 77%;
          animation: confetti 3.3s ease-in-out 4.1s infinite;
          background-color: #3f51b5;
        }
        
        .success-confetti-piece:nth-child(12) {
          left: 84%;
          animation: confetti 3.8s ease-in-out 4.5s infinite;
          background-color: #f44336;
        }
      `;
      document.head.appendChild(style);
    }
    
    return () => {
      // Clean up on unmount if no other instances are running
      if (document.querySelectorAll('.success-notification-container').length <= 1) {
        const styleElement = document.getElementById('success-animation-styles');
        if (styleElement) styleElement.remove();
      }
    };
  }, []);

  return (
    <div
      className="success-notification-container"
      style={{
        position: 'fixed',
        top: '120px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(37, 44, 73, 0.95)',
        color: 'white',
        padding: '20px 30px',
        borderRadius: '12px',
        zIndex: '9999',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(66, 153, 225, 0.3)',
        textAlign: 'center',
        minWidth: '320px',
        animation: 'fadeIn 0.5s ease-out',
        overflow: 'hidden',
        border: '2px solid rgba(74, 222, 128, 0.6)'
      }}
    >
      {/* Confetti elements */}
      <div className="confetti-container" style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }}>
        <div className="success-confetti-piece"></div>
        <div className="success-confetti-piece"></div>
        <div className="success-confetti-piece"></div>
        <div className="success-confetti-piece"></div>
        <div className="success-confetti-piece"></div>
        <div className="success-confetti-piece"></div>
        <div className="success-confetti-piece"></div>
        <div className="success-confetti-piece"></div>
        <div className="success-confetti-piece"></div>
        <div className="success-confetti-piece"></div>
        <div className="success-confetti-piece"></div>
        <div className="success-confetti-piece"></div>
      </div>
      
      {/* Trophy emoji with animation */}
      <div 
        style={{
          fontSize: '40px',
          marginBottom: '15px',
          animation: 'float 2s ease-in-out infinite',
          display: 'inline-block'
        }}
      >
        🏆
      </div>
      
      {/* Success message with animations */}
      <div 
        style={{
          fontSize: '18px',
          fontWeight: 'bold',
          marginBottom: '15px',
          animation: 'bounceIn 2s infinite',
          background: 'linear-gradient(45deg, #4fc3f7, #00e676, #ffeb3b)',
          backgroundSize: '200% 200%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 5px rgba(255,255,255,0.1)',
          animationDuration: '4s',
          animationName: 'gradientBG',
          animationIterationCount: 'infinite'
        }}
      >
        {message}
      </div>
      
      {/* XP gained with pulse animation */}
      <div 
        style={{
          background: 'linear-gradient(90deg, #667eea, #764ba2)',
          padding: '10px 25px',
          borderRadius: '20px',
          fontSize: '24px',
          fontWeight: 'bold',
          display: 'inline-block',
          boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
          animation: 'pulse 1.5s infinite'
        }}
      >
        +{xp} XP
      </div>
      
      {/* Additional star decorations */}
      <div style={{ position: 'absolute', top: '10px', right: '15px', fontSize: '20px', animation: 'glitter 1.5s infinite' }}>✨</div>
      <div style={{ position: 'absolute', bottom: '10px', left: '15px', fontSize: '20px', animation: 'glitter 1.8s infinite' }}>✨</div>
    </div>
  );
};

export default SuccessNotification;