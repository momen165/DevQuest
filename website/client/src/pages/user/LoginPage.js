import React, { useState } from 'react';
import axios from 'axios';
import 'styles/AuthPage.css';
import { useAuth } from 'AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [captchaChecked, setCaptchaChecked] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!captchaChecked) {
      setError('Please confirm you are not a robot.');
      return;
    }
    try {
      const response = await axios.post('http://localhost:5000/api/login', formData);
      const { token } = response.data;
      login(token);
      setSuccess(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your email and password.');
    }
  };

  return (
    <div className="container">
      <div className="form-container">
        <h1>Log in</h1>
        <p>Don't have an account? <a href="/RegistrationPage">Sign up</a></p>
        <form onSubmit={handleSubmit} className="form">
          <label>
            Email address
            <input type="email" name="email" value={formData.email} onChange={handleChange} required className="input" />
          </label>
          <label>
            Password
            <input type="password" name="password" value={formData.password} onChange={handleChange} required className="input" />
          </label>
          <div className="captcha">
            <input type="checkbox" onChange={() => setCaptchaChecked(!captchaChecked)} /> I'm not a robot
          </div>
          <button type="submit" className="button">Log in</button>
        </form>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">Login successful! Redirecting...</p>}
        <p><a href="/ForgotPasswordPage">Forgot your password?</a></p>
      </div>
      <div className="welcome-container">
        <h2>Welcome Back!</h2>
        <p>Log in to continue your programming journey with us. We’re here to support your learning every step of the way. Let’s keep coding together!</p>
      </div>
    </div>
  );
};

export default LoginPage;
