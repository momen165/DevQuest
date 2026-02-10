// ErrorAlert.js
import "./ErrorAlert.css";

const ErrorAlert = ({ message, onClose }) => {
  return (
    <div className="alert">
      <span>{message}</span>
      <span className="closebtn" onClick={onClose}>
        &times;
      </span>
    </div>
  );
};

export default ErrorAlert;
