import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'styles/AuthPages.css';
import {useNavigate} from 'react-router-dom';
import { useAuth } from 'AuthContext';

const SignupPage = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    country: 'Palestine'  // Set default country
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

    const validateForm = () => {
        const {name, email, password} = formData;
        if (!name || !email || !password) {
            alert('Name, email and password are required');
            return false;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            alert('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)');
            return false;
        }
        return true;
    };

  const handleSubmit = async (e) => {
    e.preventDefault();
      if (!validateForm()) return;
    try {
      const response = await axios.post('/api/signup', formData);
        alert('Signup successful! Check your email for verification.');
        console.log('Signup successful:', response.data);

      // You could redirect to login page here
        navigate('/LoginPage');
    } catch (error) {
        if (error.response) {
            console.error('Signup failed:', error.response.data.error);
        } else if (error.request) {
            // No response received from server
            console.error('No response from server:', error.request);
        } else {
            // Other errors
            console.error('Error:', error.message);
        }
    }
  };

  return (
      <div className="Auth_container">
          <div className="form-container">
              <h1>Create an account</h1>
              <p>Already have an account? <a href="/LoginPage">Log in</a></p>
              <form onSubmit={handleSubmit} className="form">
                  <label>
                      Name
                      <input
                          type="text"
                          name="name"
                          id="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="input"
                          autoComplete="name"
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
                      />
                      <p className="hint">Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)</p>
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
                          <option value="Palestine">Palestine</option>
                          <option value="Jordan">Jordan</option>
                          <option value="USA">USA</option>
                          <option value="UK">UK</option>
                          <option value="Other">Other</option>
                      </select>
                  </label>
                  <div className="captcha">
                      <input type="checkbox" required/> I'm not a robot
                  </div>
                  <button type="submit" className="button">Create account</button>
              </form>
              <p>By creating an account, you agree to our <a href="/terms">Terms of use</a> and <a href="/privacy">Privacy
                  Policy</a></p>
          </div>
          <div className="welcome-container">
              <h2>Welcome!</h2>
              <p>Create your account to embark on your programming journey with us. Whether you're a beginner or looking
                  to sharpen your skills, we're here to help you every step of the way. Let's start coding together!</p>
          </div>
      </div>
  );
};

export default SignupPage;