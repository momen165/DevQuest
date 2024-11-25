import React, { useState } from 'react';
import 'styles/AuthPage.css';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');


  const validateEmail = (email) => {
    return email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  };

  const handleChange = (e) => {
    setEmail(e.target.value);
    setError('');
    setMessage('');
  };

  
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/password-reset', {  // Remove http://localhost:5000
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
        credentials: 'include'
    });
    
      // Handle different status codes
      if (response.status === 404) {
        setError('Email address not found');
        return;
      }
      
      if (response.status === 500) {
        setError('Server error. Please try again later');
        return;
      }
    
      const data = await response.json();
    
      if (response.ok) {
        setMessage(data.message || 'Password reset instructions sent to your email');
        setEmail('');
      } else {
        setError(data.error || 'Failed to send reset instructions. Please try again.');
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false); // Always reset loading state
    }
  };



  return (
    <div className="Auth_container">
      <div className="form-container">
        <h1>Forgot Password</h1>
        <p>Enter your email address to receive a password reset link.</p>
        {message && <p className="success-message">{message}</p>}
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSubmit} className="form">
          <label>
            Email address
            <input
              type="email"
              name="email"
              value={email}
              onChange={handleChange}
              required
              className="input"
              disabled={loading}
            />
          </label>
          <button type="submit" className="button" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <p>
          Remembered your password? <a href="/loginpage">Log in</a>
        </p>
      </div>
      <div className="welcome-container">
        <h2>Need Help?</h2>
        <p>
          Forgot your password? No worries! Just enter your email, and we’ll send you instructions to reset your password. You’ll be back on track in no time.
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
