// ResetPasswordPage.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ResetPasswordPage.css';
import { EyeIcon, EyeOffIcon, CheckCircleIcon, XCircleIcon, ShieldCheckIcon } from 'lucide-react';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const token = new URLSearchParams(location.search).get('token');

  // Password strength criteria
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[@$!%*?&]/.test(password);

  // Calculate password strength
  const calculateStrength = () => {
    const criteria = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial];
    const strengthPercentage = (criteria.filter(Boolean).length / criteria.length) * 100;

    if (strengthPercentage === 0) return { value: 0, label: '', color: '' };
    if (strengthPercentage <= 40)
      return { value: strengthPercentage, label: 'Weak', color: 'var(--error-color)' };
    if (strengthPercentage <= 80)
      return { value: strengthPercentage, label: 'Moderate', color: 'var(--warning-color)' };
    return { value: strengthPercentage, label: 'Strong', color: 'var(--success-color)' };
  };

  const strength = calculateStrength();

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link');
    }
  }, [token]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(password)) {
      setError('Please ensure your password meets all the requirements below');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/reset-password`,
        { token, newPassword: password },
        { withCredentials: true }
      );

      setMessage('Password reset successful! Redirecting to login...');
      setTimeout(() => navigate('/LoginPage'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-container">
      <div className="reset-password-box reset-password-card">
        <div className="reset-password-header">
          <ShieldCheckIcon className="shield-icon" />
          <h1 className="h1-reset-password">Reset Password</h1>
          <p className="subtitle">Create a new secure password for your account</p>
        </div>

        {error && (
          <div className="message-box error-message">
            <XCircleIcon size={20} />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="message-box success-message">
            <CheckCircleIcon size={20} />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="reset-password-form">
          <div className="form-group">
            <label htmlFor="password" className="label-reset-password">
              <span>New Password</span>
            </label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                placeholder="Enter your new password"
                className={`reset-password password-input ${password ? (hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial ? 'valid' : 'invalid') : ''}`}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
              </button>
            </div>

            {password && (
              <div className="password-strength-container">
                <div className="strength-meter">
                  <div
                    className="strength-meter-fill"
                    style={{
                      width: `${strength.value}%`,
                      backgroundColor: strength.color,
                    }}
                  ></div>
                </div>
                {strength.label && (
                  <span className="strength-text" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                )}
              </div>
            )}

            <div className="password-requirements">
              <p className="requirements-heading">Your password must have:</p>
              <ul>
                <li className={hasMinLength ? 'met' : 'unmet'}>
                  <span className="requirement-icon">
                    {hasMinLength ? <CheckCircleIcon size={16} /> : <XCircleIcon size={16} />}
                  </span>
                  At least 8 characters
                </li>
                <li className={hasUppercase ? 'met' : 'unmet'}>
                  <span className="requirement-icon">
                    {hasUppercase ? <CheckCircleIcon size={16} /> : <XCircleIcon size={16} />}
                  </span>
                  One uppercase letter (A-Z)
                </li>
                <li className={hasLowercase ? 'met' : 'unmet'}>
                  <span className="requirement-icon">
                    {hasLowercase ? <CheckCircleIcon size={16} /> : <XCircleIcon size={16} />}
                  </span>
                  One lowercase letter (a-z)
                </li>
                <li className={hasNumber ? 'met' : 'unmet'}>
                  <span className="requirement-icon">
                    {hasNumber ? <CheckCircleIcon size={16} /> : <XCircleIcon size={16} />}
                  </span>
                  One number (0-9)
                </li>
                <li className={hasSpecial ? 'met' : 'unmet'}>
                  <span className="requirement-icon">
                    {hasSpecial ? <CheckCircleIcon size={16} /> : <XCircleIcon size={16} />}
                  </span>
                  One special character (@$!%*?&)
                </li>
              </ul>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="label-reset-password">
              <span>Confirm Password</span>
            </label>
            <div className="password-input-container">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
                placeholder="Confirm your new password"
                className={`reset-password password-input ${confirmPassword ? (confirmPassword === password ? 'valid' : 'invalid') : ''}`}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={toggleConfirmPasswordVisibility}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
              </button>
            </div>
            {confirmPassword && (
              <div className="passwords-match-indicator">
                {confirmPassword === password ? (
                  <div className="match-success">
                    <CheckCircleIcon size={16} />
                    <span>Passwords match</span>
                  </div>
                ) : (
                  <div className="match-error">
                    <XCircleIcon size={16} />
                    <span>Passwords don&apos;t match</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <button className="submit-button" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                <span>Resetting Password...</span>
              </>
            ) : (
              'Reset Password'
            )}
          </button>

          <div className="login-link">
            <Link to="/LoginPage">Return to Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
