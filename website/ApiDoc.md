# DevQuest API Documentation

DevQuest's API provides comprehensive endpoints for course management, user authentication, code execution, and more. This documentation outlines all available endpoints and their usage.

## Base URL
All API requests should be made to: 
```
http://localhost:5000/api
```

## Authentication
Protected routes require JWT authentication via the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

**Rate limiting:** 1000 requests per 15 minutes

## Endpoints

### 🔐 Authentication

| Endpoint | Method | Access | Description |
|----------|--------|---------|-------------|
| `/auth/signup` | POST | Public | Register new user |
| `/auth/login` | POST | Public | User login |
| `/auth/verify-email` | GET | Public | Verify email address |
| `/auth/check-auth` | GET | Public | Check authentication status |
| `/auth/update-profile` | PUT | Protected | Update user profile |
| `/auth/change-password` | POST | Protected | Change password |
| `/auth/password-reset` | POST | Protected | Request password reset |
| `/auth/reset-password` | POST | Protected | Reset password |

#### Register User
```http
POST /auth/signup
```
**Body:**
- name (required)
- email (required)
- password (min 6 chars)
- country (required)

**Returns:** JWT token and user data

#### Login
```http
POST /auth/login
```
**Body:**
- email
- password

**Returns:** JWT token and user data

### 📚 Courses

| Endpoint | Method | Access | Description |
|----------|--------|---------|-------------|
| `/courses` | GET | Public | Get all courses |
| `/courses/:courseId` | GET | Public | Get single course |
| `/courses` | POST | Admin | Create course |
| `/courses/:courseId` | PUT | Admin | Update course |
| `/courses/:courseId` | DELETE | Admin | Delete course |
| `/courses/enroll` | POST | Protected | Enroll in course |
| `/courses/:courseId/enrollments/:userId` | GET | Protected | Check enrollment status |
| `/courses/:courseId/stats/:userId` | GET | Protected | Get user's course stats |

#### Create/Update Course Body Parameters
- title (required)
- description (required)
- status
- difficulty
- languageId
- image (file, optional)

### 📖 Lessons

| Endpoint | Method | Access | Description |
|----------|--------|---------|-------------|
| `/lesson` | POST | Admin | Create lesson |
| `/lesson` | GET | Protected | Get lessons |
| `/lesson/:lessonId` | GET | Protected | Get lesson by ID |
| `/lesson/:lessonId` | PUT | Admin | Update lesson |
| `/lesson/:lessonId` | DELETE | Admin | Delete lesson |
| `/lesson/reorder` | POST | Admin | Reorder lessons |
| `/update-lesson-progress` | PUT | Protected | Update lesson progress |
| `/lesson-progress` | GET | Protected | Get lesson progress |
| `/lessons/section/:sectionId/progress` | GET | Protected | Get section lessons with progress |

#### Create/Update Lesson Body Parameters
- name (required)
- content (required)
- xp
- testCases
- sectionId (required)
- templateCode

### 📑 Sections

| Endpoint | Method | Access | Description |
|----------|--------|---------|-------------|
| `/sections` | POST | Admin | Create section |
| `/sections` | GET | Protected | Get sections |
| `/sections/course/:courseId` | GET | Protected | Get course sections |
| `/sections/:sectionId` | GET | Protected | Get section by ID |
| `/sections/:sectionId` | PUT | Admin | Update section |
| `/sections/:sectionId` | DELETE | Admin | Delete section |
| `/sections/reorder` | POST | Admin | Reorder sections |

### 👨‍🎓 Students

| Endpoint | Method | Access | Description |
|----------|--------|---------|-------------|
| `/students` | GET | Admin | Get all students |
| `/students/:studentId` | GET | Protected | Get student details |
| `/students/:studentId/courses` | GET | Protected | Get student's courses |
| `/students/:userId/enrollments` | GET | Protected | Get user's enrollments |
| `/student/stats/:userId` | GET | Protected | Get student stats |
| `/student/courses/:courseId/stats` | GET | Protected | Get course stats |

### 💳 Subscriptions & Payments

| Endpoint | Method | Access | Description |
|----------|--------|---------|-------------|
| `/subscribe` | POST | Protected | Create subscription |
| `/subscription` | DELETE | Protected | Cancel subscription |
| `/subscription` | PUT | Protected | Update subscription |
| `/check` | GET | Protected | Check subscription status |
| `/status` | GET | Protected | Get detailed subscription status |
| `/create-checkout-session` | POST | Protected | Create Stripe checkout |
| `/create-portal-session` | POST | Protected | Create Stripe portal session |

### 💭 Feedback

| Endpoint | Method | Access | Description |
|----------|--------|---------|-------------|
| `/feedback` | GET | Admin | Get all feedback |
| `/feedback` | POST | Protected | Submit feedback |
| `/feedback/reply` | POST | Admin | Reply to feedback |
| `/feedback/public` | GET | Public | Get public feedback |
| `/feedback/eligibility/:courseId` | GET | Protected | Check feedback eligibility |
| `/feedback/recent` | GET | Protected | Get recent feedback |
| `/feedback/reopen` | POST | Admin | Reopen feedback |

### 💻 Code Execution

```http
POST /run
```
**Access:** Protected  
**Rate Limiting:** 50 requests per 15 minutes

**Body:**
- code (required)
- language (required)
- input (optional)

**Returns:** Execution results

### 🎯 Support

| Endpoint | Method | Access | Description |
|----------|--------|---------|-------------|
| `/support` | POST | Protected | Create support ticket |
| `/support-tickets` | GET | Admin | Get all tickets |
| `/user-support-tickets` | GET | Protected | Get user tickets |
| `/support-tickets/:ticketId/reply` | POST | Protected | Reply to ticket |
| `/support-tickets/:ticketId` | DELETE | Protected | Delete ticket |
| `/support-tickets/:ticketId/close` | POST | Protected | Close ticket |
| `/support-tickets/recent` | GET | Admin | Get recent tickets |

### 👨‍💼 Admin

| Endpoint | Method | Access | Description |
|----------|--------|---------|-------------|
| `/admin/status` | GET | Admin | Check admin status |
| `/admin/activities` | GET | Admin | Get admin activities |
| `/admin/metrics/system` | GET | Admin | Get system metrics |
| `/admin/metrics/performance` | GET | Admin | Get performance metrics |
| `/admin/add-admin` | POST | Admin | Add new admin |
| `/admin/maintenance-mode` | POST | Admin | Toggle maintenance mode |
| `/admin/settings` | GET | Admin | Get system settings |
| `/admin/remove-admin` | POST | Admin | Remove admin |

### 📤 File Upload

| Endpoint | Method | Access | Description |
|----------|--------|---------|-------------|
| `/upload` | POST | Protected | Upload file |
| `/uploadProfilePic` | POST | Protected | Upload profile picture |
| `/removeProfilePic` | DELETE | Protected | Remove profile picture |

## Error Handling

| Status Code | Description |
|------------|-------------|
| 200 | Success |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 408 | Request Timeout |
| 413 | Payload Too Large |
| 429 | Too Many Requests |
| 500 | Server Error |

*All error responses include a message explaining the error.*

## Security Measures
- ✅ CORS enabled for frontend origin
- ✅ Rate limiting implemented
- ✅ Helmet security headers
- ✅ XSS protection
- ✅ Input validation
- ✅ Secure password hashing
- ✅ JWT token authentication

## File Upload Specifications
- **Supported for:** Course images and profile pictures
- **Max file size:** 5MB
- **Allowed types:** jpg, jpeg, png, gif, webp, svg
- **Processing:** Files optimized with Sharp

## Code Execution Limits
- **Time limit:** 10 seconds
- **Memory limit:** 512MB
- **Output size:** 100KB
- **Network access:** Disabled

## Subscription Features
- Monthly and yearly plans
- Automatic renewal
- Stripe integration
- Billing portal access
- Payment history

## Support System Features
- 24-hour ticket expiration
- Automatic responses
- Admin notifications
- Ticket tracking
- Message history

---
*For detailed implementation examples and testing, please refer to the codebase.*