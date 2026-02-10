/**
 * Form validation utilities
 * Centralized validation logic for common form fields
 */

/**
 * Email validation
 * @param {string} email - Email address to validate
 * @returns {Object} { isValid: boolean, error: string }
 */
export const validateEmail = (email) => {
  if (!email || email.trim() === "") {
    return { isValid: false, error: "Email is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }

  return { isValid: true, error: "" };
};

/**
 * Password validation
 * @param {string} password - Password to validate
 * @param {Object} options - Validation options
 * @param {number} options.minLength - Minimum password length (default: 8)
 * @param {boolean} options.requireUppercase - Require uppercase letter (default: true)
 * @param {boolean} options.requireLowercase - Require lowercase letter (default: true)
 * @param {boolean} options.requireNumber - Require number (default: true)
 * @param {boolean} options.requireSpecial - Require special character (default: false)
 * @returns {Object} { isValid: boolean, error: string }
 */
export const validatePassword = (password, options = {}) => {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumber = true,
    requireSpecial = false,
  } = options;

  if (!password || password.trim() === "") {
    return { isValid: false, error: "Password is required" };
  }

  if (password.length < minLength) {
    return { isValid: false, error: `Password must be at least ${minLength} characters long` };
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one uppercase letter" };
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one lowercase letter" };
  }

  if (requireNumber && !/\d/.test(password)) {
    return { isValid: false, error: "Password must contain at least one number" };
  }

  if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one special character" };
  }

  return { isValid: true, error: "" };
};

/**
 * Confirm password validation
 * @param {string} password - Original password
 * @param {string} confirmPassword - Confirmation password
 * @returns {Object} { isValid: boolean, error: string }
 */
export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword || confirmPassword.trim() === "") {
    return { isValid: false, error: "Please confirm your password" };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: "Passwords do not match" };
  }

  return { isValid: true, error: "" };
};

/**
 * Name validation
 * @param {string} name - Name to validate
 * @param {Object} options - Validation options
 * @param {number} options.minLength - Minimum name length (default: 2)
 * @param {number} options.maxLength - Maximum name length (default: 50)
 * @returns {Object} { isValid: boolean, error: string }
 */
export const validateName = (name, options = {}) => {
  const { minLength = 2, maxLength = 50 } = options;

  if (!name || name.trim() === "") {
    return { isValid: false, error: "Name is required" };
  }

  const trimmedName = name.trim();

  if (trimmedName.length < minLength) {
    return { isValid: false, error: `Name must be at least ${minLength} characters long` };
  }

  if (trimmedName.length > maxLength) {
    return { isValid: false, error: `Name cannot exceed ${maxLength} characters` };
  }

  // Only allow letters, spaces, hyphens, and apostrophes
  if (!/^[a-zA-Z\s'-]+$/.test(trimmedName)) {
    return {
      isValid: false,
      error: "Name can only contain letters, spaces, hyphens, and apostrophes",
    };
  }

  return { isValid: true, error: "" };
};

/**
 * Required field validation
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of the field for error message
 * @returns {Object} { isValid: boolean, error: string }
 */
export const validateRequired = (value, fieldName = "This field") => {
  if (value === null || value === undefined) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  if (typeof value === "string" && value.trim() === "") {
    return { isValid: false, error: `${fieldName} is required` };
  }

  if (Array.isArray(value) && value.length === 0) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  return { isValid: true, error: "" };
};

/**
 * URL validation
 * @param {string} url - URL to validate
 * @param {boolean} required - Whether the field is required (default: true)
 * @returns {Object} { isValid: boolean, error: string }
 */
export const validateURL = (url, required = true) => {
  if (!url || url.trim() === "") {
    if (required) {
      return { isValid: false, error: "URL is required" };
    }
    return { isValid: true, error: "" };
  }

  try {
    new URL(url);
    return { isValid: true, error: "" };
  } catch {
    return { isValid: false, error: "Please enter a valid URL" };
  }
};

/**
 * Number range validation
 * @param {number} value - Number to validate
 * @param {Object} options - Validation options
 * @param {number} options.min - Minimum value
 * @param {number} options.max - Maximum value
 * @param {string} options.fieldName - Field name for error message
 * @returns {Object} { isValid: boolean, error: string }
 */
export const validateNumberRange = (value, options = {}) => {
  const { min, max, fieldName = "Value" } = options;

  if (value === null || value === undefined || value === "") {
    return { isValid: false, error: `${fieldName} is required` };
  }

  const numValue = Number(value);

  if (isNaN(numValue)) {
    return { isValid: false, error: `${fieldName} must be a number` };
  }

  if (min !== undefined && numValue < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (max !== undefined && numValue > max) {
    return { isValid: false, error: `${fieldName} cannot exceed ${max}` };
  }

  return { isValid: true, error: "" };
};

/**
 * Text length validation
 * @param {string} text - Text to validate
 * @param {Object} options - Validation options
 * @param {number} options.minLength - Minimum length
 * @param {number} options.maxLength - Maximum length
 * @param {string} options.fieldName - Field name for error message
 * @param {boolean} options.required - Whether field is required (default: true)
 * @returns {Object} { isValid: boolean, error: string }
 */
export const validateTextLength = (text, options = {}) => {
  const { minLength, maxLength, fieldName = "This field", required = true } = options;

  if (!text || text.trim() === "") {
    if (required) {
      return { isValid: false, error: `${fieldName} is required` };
    }
    return { isValid: true, error: "" };
  }

  const trimmedText = text.trim();

  if (minLength !== undefined && trimmedText.length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${minLength} characters long`,
    };
  }

  if (maxLength !== undefined && trimmedText.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} cannot exceed ${maxLength} characters`,
    };
  }

  return { isValid: true, error: "" };
};

/**
 * Validate multiple fields at once
 * @param {Object} fields - Object with field names as keys and validation functions as values
 * @returns {Object} { isValid: boolean, errors: Object }
 *
 * @example
 * const result = validateFields({
 *   email: () => validateEmail(email),
 *   password: () => validatePassword(password),
 *   name: () => validateName(name)
 * });
 */
export const validateFields = (fields) => {
  const errors = {};
  let isValid = true;

  Object.keys(fields).forEach((fieldName) => {
    const validationResult = fields[fieldName]();
    if (!validationResult.isValid) {
      errors[fieldName] = validationResult.error;
      isValid = false;
    }
  });

  return { isValid, errors };
};
