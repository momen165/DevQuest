import React, { useState } from 'react';
import 'styles/AuthPage.css';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');

  const handleChange = (e) => {
    setEmail(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Password reset requested for:', email);
    // Here you can add logic to handle the password reset request
  };

  return (
    <div className="container">
      <div className="form-container">
        <h1>Forgot Password</h1>
        <p>Enter your email address to receive a password reset link.</p>
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
            />
          </label>
          <button type="submit" className="button">Send Reset Link</button>
        </form>
        <p>Remembered your password? <a href="/loginpage">Log in</a></p>
      </div>
      <div className="welcome-container">
        <h2>Need Help?</h2>
        <p>Forgot your password? No worries! Just enter your email, and we’ll send you instructions to reset your password. You’ll be back on track in no time.</p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
