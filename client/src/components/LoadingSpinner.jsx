import React from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import './LoadingSpinner.css';

/**
 * Reusable loading spinner component
 * @param {Object} props
 * @param {boolean} props.center - Center the spinner in viewport (default: true)
 * @param {string} props.size - Size of spinner: 'small', 'medium', 'large' (default: 'medium')
 * @param {string} props.message - Optional loading message
 * @param {boolean} props.fullScreen - Use full screen overlay (default: false)
 * @param {string} props.color - MUI color prop: 'primary', 'secondary', 'inherit' (default: 'primary')
 */
const LoadingSpinner = ({ 
  center = true, 
  size = 'medium', 
  message = '', 
  fullScreen = false,
  color = 'primary'
}) => {
  const sizeMap = {
    small: 24,
    medium: 40,
    large: 60
  };

  const spinnerSize = sizeMap[size] || sizeMap.medium;

  if (fullScreen) {
    return (
      <div className="loading-spinner-fullscreen">
        <div className="loading-spinner-content">
          <CircularProgress size={spinnerSize} color={color} />
          {message && <p className="loading-spinner-message">{message}</p>}
        </div>
      </div>
    );
  }

  if (center) {
    return (
      <div className="loading-spinner-centered">
        <CircularProgress size={spinnerSize} color={color} />
        {message && <p className="loading-spinner-message">{message}</p>}
      </div>
    );
  }

  return (
    <div className="loading-spinner-inline">
      <CircularProgress size={spinnerSize} color={color} />
      {message && <span className="loading-spinner-message">{message}</span>}
    </div>
  );
};

export default LoadingSpinner;
