'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '@/styles/AuthPages.css';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface FormData {
  name: string;
  email: string;
  password: string;
  country: string;
}

const SignupPage: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    country: 'Palestine', // Set default country
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const validateForm = (): boolean => {
    const { name, email, password } = formData;
    if (!name || !email || !password) {
      alert('Name, email and password are required');
      return false;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      alert(
        'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/signup`, formData);
      alert('Signup successful! Check your email for verification.');
      console.log('Signup successful:', response.data);

      // You could redirect to login page here
      router.push('/LoginPage');
    } catch (error: any) {
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
        <h1>Start Your Quest</h1>
        <p>
          Already have an account? <Link href="/LoginPage">Log in</Link>
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
              special character (@$!%*?&)
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
          <button type="submit" className="button">
            Begin Your Journey
          </button>
        </form>
        <p>
          By creating an account, you agree to our <Link href="/terms">Terms of Service</Link> and{' '}
          <Link href="/privacy">Privacy Policy</Link>
        </p>
      </div>
      <div className="welcome-container">
        <h2>Join the Developer Community!</h2>
        <p>
          Ready to embark on an epic coding adventure? DevQuest is your gateway to mastering
          programming skills through interactive challenges, real-world projects, and a supportive
          community of developers. From beginner to expert, we&apos;ll guide you every step of the way.
          Let&apos;s code the future together!
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
