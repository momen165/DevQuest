import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AuthPages.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'app/AuthContext';
import { toast } from 'react-hot-toast';
import { validateEmail, validatePassword, validateName } from 'shared/utils/formValidation';

const SignupPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    country: 'Palestine', // Set default country
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const validateForm = () => {
    const { name, email, password } = formData;
    
    const nameValid = validateName(name);
    if (!nameValid.isValid) {
      toast.error(nameValid.error);
      return false;
    }

    const emailValid = validateEmail(email);
    if (!emailValid.isValid) {
      toast.error(emailValid.error);
      return false;
    }

    const passwordValid = validatePassword(password);
    if (!passwordValid.isValid) {
      toast.error(passwordValid.error);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/signup`, formData);
      toast.success('Signup successful! Check your email for verification.');
      console.log('Signup successful:', response.data);

      navigate('/LoginPage');
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Signup failed. Please try again.';
      toast.error(errorMsg);
      console.error('Signup failed:', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="Auth_container">
      <div className="form-container">
        <h1>Start Your Quest</h1>
        <p>
          Already have an account? <a href="/LoginPage">Log in</a>
        </p>
        <form onSubmit={handleSubmit} className="form">
          <label>
            Full Name
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="input"
              autoComplete="name"
              placeholder="Enter your full name"
            />
          </label>
          <label>
            Email address
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="input"
              autoComplete="email"
              placeholder="Enter your email address"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="input"
              autoComplete="new-password"
              placeholder="Create a strong password"
            />
            <p className="hint">
              🔒 Password requirements: At least 8 characters with uppercase, lowercase, number, and
              special character
            </p>
          </label>
          <label>
            Country
            <select
              name="country"
              id="country"
              value={formData.country}
              onChange={handleChange}
              className="select"
              autoComplete="country"
            >
              <option value="Palestine">🇵🇸 Palestine</option>
              <option value="Jordan">🇯🇴 Jordan</option>
              <option value="USA">🇺🇸 USA</option>
              <option value="UK">🇬🇧 UK</option>
              <option value="Other">🌍 Other</option>
            </select>
          </label>
          <div className="captcha">
            <input type="checkbox" required id="robot-check" />
            <label htmlFor="robot-check">I&apos;m not a robot 🤖</label>
          </div>
          <button type="submit" className="button" disabled={loading}>
            {loading ? 'Creating Account...' : 'Begin Your Journey'}
          </button>
        </form>
        <p>
          By creating an account, you agree to our <a href="/terms">Terms of Service</a> and{' '}
          <a href="/privacy">Privacy Policy</a>
        </p>
      </div>
      <div className="welcome-container">
        <h2>Join the Developer Community!</h2>
        <p>
          Ready to embark on an epic coding adventure? DevQuest is your gateway to mastering
          programming skills through interactive challenges, real-world projects, and a supportive
          community of developers. From beginner to expert, we&apos;ll guide you every step of the
          way. Let&apos;s code the future together!
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
