# Form Validation & Loading Component Examples

## Using the LoadingSpinner Component

### Basic Usage
```jsx
import LoadingSpinner from 'components/LoadingSpinner';

// Centered loading (default)
<LoadingSpinner />

// With message
<LoadingSpinner message="Loading courses..." />

// Different sizes
<LoadingSpinner size="small" />
<LoadingSpinner size="medium" />
<LoadingSpinner size="large" />

// Full screen overlay
<LoadingSpinner fullScreen message="Processing payment..." />

// Inline spinner
<LoadingSpinner center={false} size="small" message="Saving..." />
```

### In Components
```jsx
function MyComponent() {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return <LoadingSpinner message="Loading data..." />;
  }

  return <div>Your content</div>;
}
```

## Using Form Validation Utilities

### Basic Field Validation
```jsx
import { 
  validateEmail, 
  validatePassword, 
  validateName,
  validateRequired 
} from 'utils/formValidation';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);

    if (!emailValidation.isValid) {
      setErrors(prev => ({ ...prev, email: emailValidation.error }));
      return;
    }

    if (!passwordValidation.isValid) {
      setErrors(prev => ({ ...prev, password: passwordValidation.error }));
      return;
    }

    // Submit form
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="email" 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {errors.email && <span className="error">{errors.email}</span>}
      
      <input 
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {errors.password && <span className="error">{errors.password}</span>}
      
      <button type="submit">Login</button>
    </form>
  );
}
```

### Multiple Field Validation
```jsx
import { validateFields, validateEmail, validatePassword, validateName } from 'utils/formValidation';

function RegistrationForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();

    const validation = validateFields({
      name: () => validateName(formData.name),
      email: () => validateEmail(formData.email),
      password: () => validatePassword(formData.password),
      confirmPassword: () => validateConfirmPassword(formData.password, formData.confirmPassword)
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    // Submit form
    console.log('Form is valid!');
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields with error display */}
    </form>
  );
}
```

### Custom Password Requirements
```jsx
import { validatePassword } from 'utils/formValidation';

const passwordValidation = validatePassword(password, {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true
});
```

### Real-time Validation
```jsx
function EmailInput() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleBlur = () => {
    const validation = validateEmail(email);
    setError(validation.error);
  };

  return (
    <div>
      <input
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setError(''); // Clear error on change
        }}
        onBlur={handleBlur}
      />
      {error && <span className="error">{error}</span>}
    </div>
  );
}
```

## Performance Optimization with React.memo

### Components Already Optimized
The following components are now wrapped with React.memo for better performance:

- ✅ CourseCard
- ✅ FilterTabs
- ✅ FeedbackCardScroll
- ✅ Navbar
- ✅ Footer
- ✅ CodeBlock
- ✅ CoursesSlider
- ✅ MonacoEditorComponent
- ✅ CustomEditor
- ✅ LessonContent
- ✅ BadgeDisplay
- ✅ HelpSection
- ✅ RatingForm

### When to Use React.memo
Use React.memo for components that:
- Render frequently with the same props
- Have expensive render operations
- Receive complex objects as props
- Are used in lists or grids

### Example: Optimized Course List
```jsx
import { memo } from 'react';

const CourseItem = memo(({ course, onClick }) => {
  return (
    <div onClick={() => onClick(course.id)}>
      <h3>{course.title}</h3>
      <p>{course.description}</p>
    </div>
  );
});

CourseItem.displayName = 'CourseItem';
```

## Best Practices

### Form Validation
1. Validate on blur for better UX
2. Clear errors on input change
3. Show specific error messages
4. Use consistent validation across forms
5. Consider using validateFields() for complex forms

### Loading States
1. Use fullScreen for blocking operations (payments, critical actions)
2. Use centered for page-level loading
3. Use inline for button/action loading
4. Always provide meaningful loading messages
5. Consider skeleton loaders for content-heavy pages

### Performance
1. Memo components that render frequently
2. Use useMemo for expensive calculations
3. Use useCallback for event handlers passed to memoized children
4. Profile your app to identify bottlenecks
5. Don't over-optimize - measure first!
