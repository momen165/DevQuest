import React, { useState } from 'react';
import axios from 'axios';
import 'styles/AuthPage.css';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    country: 'Palestine',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/signup', formData);

      console.log(response.data.message);
      // You could redirect to login page here
      window.location.href = '/LoginPage';
    } catch (err) {
      console.error('Error during signup:', err);
    }
  };

  return (
    <div className="container">
      <div className="form-container">
        <h1>Create an account</h1>
        <p>Already have an account? <a href="/LoginPage">Log in</a></p>
        <form onSubmit={handleSubmit} className="form">
          <label>
            Name
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="input"
            />
          </label>
          <label>
            Email address
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="input"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="input"
            />
            <p className="hint">Use 8 or more characters with a mix of letters, numbers & symbols</p>
          </label>
          <label>
            Country
            <select
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="select"
            >
              <option value="Palestine">Palestine</option>
              <option value="Other">Other</option>
            </select>
          </label>
          <div className="captcha">
            <input type="checkbox" required /> I'm not a robot
          </div>
          <button type="submit" className="button">Create account</button>
        </form>
        <p>By creating an account, you agree to our <a href="/terms">Terms of use</a> and <a href="/privacy">Privacy Policy</a></p>
      </div>
      <div className="welcome-container">
        <h2>Welcome!</h2>
        <p>Create your account to embark on your programming journey with us. Whether you’re a beginner or looking to sharpen your skills, we’re here to help you every step of the way. Let’s start coding together!</p>
      </div>
    </div>
  );
};

export default SignupPage;
