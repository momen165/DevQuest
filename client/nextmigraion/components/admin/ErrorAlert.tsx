import React from 'react';
import '@/styles/admin/ErrorAlert.css';

interface ErrorAlertProps {
  message: string;
  onClose: () => void;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, onClose }) => {
  return (
    <div className="alert">
      <span>{message}</span>
      <span className="closebtn" onClick={onClose}>&times;</span>
    </div>
  );
};

export default ErrorAlert;
