# DevQuest API Documentation

DevQuest's API provides endpoints for authentication, courses, lessons, subscriptions, support, and admin operations. This documentation reflects the current routes in the server.

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

Rate limiting:

- Auth endpoints: 10 requests per 15 minutes
- All other routes: 1000 requests per 15 minutes

## Endpoints

### Authentication

| Endpoint               | Method | Access    | Description                 |
| ---------------------- | ------ | --------- | --------------------------- |
| `/signup`              | POST   | Public    | Register new user           |
| `/login`               | POST   | Public    | User login                  |
| `/refresh-token`       | POST   | Public    | Refresh access token        |
| `/logout`              | POST   | Public    | Logout user                 |
| `/verify-email`        | GET    | Public    | Verify email address        |
| `/resend-verification` | POST   | Public    | Resend verification email   |
| `/password-reset`      | POST   | Public    | Request password reset      |
| `/reset-password`      | POST   | Public    | Reset password              |
| `/check-auth`          | GET    | Protected | Check authentication status |
| `/update-profile`      | PUT    | Protected | Update user profile         |
| `/change-password`     | POST   | Protected | Change password             |
| `/requestEmailChange`  | POST   | Protected | Request email change        |
| `/confirmEmailChange`  | POST   | Protected | Confirm email change        |

Register User

```http
POST /signup
```

Body:

- name (required)
- email (required)
- password (min 8 chars, must include uppercase, lowercase, number, special character)
- country (required)

Login

```http
POST /login
```

Body:

- email
- password

### Courses

| Endpoint                                   | Method | Access    | Description              |
| ------------------------------------------ | ------ | --------- | ------------------------ |
| `/courses`                                 | GET    | Public    | Get all courses          |
| `/courses/:course_id`                      | GET    | Public    | Get single course        |
| `/courses`                                 | POST   | Protected | Create course            |
| `/courses/:course_id`                      | PUT    | Protected | Update course            |
| `/courses/:course_id`                      | DELETE | Protected | Delete course            |
| `/courses/enroll`                          | POST   | Protected | Enroll in course         |
| `/courses/:course_id/enrollments/:user_id` | GET    | Protected | Check enrollment status  |
| `/courses/:course_id/stats/:user_id`       | GET    | Protected | Get user's course stats  |
| `/users/:user_id/stats`                    | GET    | Protected | Get user's overall stats |

Create or update course body parameters:

- title (required)
- description (required)
- status
- difficulty
- languageId
- image (file, optional)

### Lessons

| Endpoint                               | Method | Access    | Description                           |
| -------------------------------------- | ------ | --------- | ------------------------------------- |
| `/lesson`                              | POST   | Protected | Create lesson                         |
| `/lesson`                              | GET    | Public    | Get lessons (section or course query) |
| `/admin/lessons`                       | GET    | Protected | Get admin lesson data for a section   |
| `/lesson/:lessonId`                    | GET    | Protected | Get lesson by ID                      |
| `/lesson/:lesson_id`                   | PUT    | Protected | Update lesson                         |
| `/lesson/:lesson_id`                   | DELETE | Protected | Delete lesson                         |
| `/lesson/reorder`                      | POST   | Protected | Reorder lessons                       |
| `/lesson/:lessonId/unlock-hint`        | POST   | Protected | Unlock lesson hint                    |
| `/lesson/:lessonId/unlock-solution`    | POST   | Protected | Unlock lesson solution                |
| `/update-lesson-progress`              | PUT    | Protected | Update lesson progress                |
| `/lesson-progress`                     | GET    | Protected | Get lesson progress                   |
| `/lessons/section/:sectionId/progress` | GET    | Protected | Get section lessons with progress     |
| `/lesson/fix-orders`                   | POST   | Protected | Fix lesson ordering                   |
| `/admin/lesson-order-integrity`        | GET    | Protected | Check lesson order integrity          |

Create or update lesson body parameters:

- name (required)
- content (required)
- xp
- testCases
- sectionId (required)
- templateCode

### Sections

| Endpoint                     | Method | Access    | Description         |
| ---------------------------- | ------ | --------- | ------------------- |
| `/sections`                  | POST   | Protected | Create section      |
| `/sections`                  | GET    | Protected | Get sections        |
| `/admin/sections`            | GET    | Protected | Get admin sections  |
| `/sections/course/:courseId` | GET    | Protected | Get course sections |
| `/sections/:section_id`      | GET    | Protected | Get section by ID   |
| `/sections/:section_id`      | PUT    | Protected | Update section      |
| `/sections/:section_id`      | DELETE | Protected | Delete section      |
| `/sections/reorder`          | POST   | Protected | Reorder sections    |

### Students

| Endpoint                           | Method | Access    | Description            |
| ---------------------------------- | ------ | --------- | ---------------------- |
| `/students`                        | GET    | Protected | Get all students       |
| `/students/:studentId`             | GET    | Protected | Get student details    |
| `/students/:studentId/courses`     | GET    | Protected | Get student's courses  |
| `/students/:userId/enrollments`    | GET    | Protected | Get user's enrollments |
| `/student/stats/:userId`           | GET    | Protected | Get student stats      |
| `/student/courses/:courseId/stats` | GET    | Protected | Get course stats       |
| `/student/delete-account`          | DELETE | Protected | Delete student account |

### Subscriptions and payments

| Endpoint                       | Method | Access    | Description                               |
| ------------------------------ | ------ | --------- | ----------------------------------------- |
| `/status`                      | GET    | Protected | Get subscription status (DB)              |
| `/check`                       | GET    | Protected | Check active subscription (Stripe)        |
| `/list-subscriptions`          | GET    | Protected | List subscriptions (admin only)           |
| `/user/:userId`                | GET    | Protected | Get user subscription status (admin only) |
| `/pricing-plans`               | GET    | Public    | Get pricing plans                         |
| `/create-checkout-session`     | POST   | Protected | Create Stripe checkout session            |
| `/create-portal-session`       | POST   | Protected | Create Stripe billing portal session      |
| `/checkout-session/:sessionId` | GET    | Protected | Fetch checkout session by id              |
| `/webhook`                     | POST   | Public    | Stripe webhook endpoint (raw body)        |

### Feedback

| Endpoint                              | Method | Access    | Description                      |
| ------------------------------------- | ------ | --------- | -------------------------------- |
| `/feedback`                           | GET    | Protected | Get all feedback                 |
| `/feedback`                           | POST   | Protected | Submit feedback                  |
| `/feedback/reply`                     | POST   | Protected | Reply to feedback (admin only)   |
| `/feedback/public`                    | GET    | Public    | Get public feedback              |
| `/feedback/eligibility/:courseId`     | GET    | Protected | Check feedback eligibility       |
| `/feedback/recent`                    | GET    | Protected | Get recent feedback (admin only) |
| `/feedback/reopen`                    | POST   | Protected | Reopen feedback (admin only)     |
| `/getCoursesWithRatings`              | GET    | Public    | Get courses with ratings         |
| `/optimized-courses`                  | GET    | Protected | Get optimized course data        |
| `/optimized-course-section/:courseId` | GET    | Protected | Get optimized section data       |

### Code execution

```http
POST /run
```

Access: Protected
Rate limiting: 50 requests per 15 minutes

Body:

- code (required)
- language (required)
- input (optional)

Cache stats:

```http
GET /cache-stats
```

### Support

| Endpoint                            | Method | Access    | Description                    |
| ----------------------------------- | ------ | --------- | ------------------------------ |
| `/support`                          | POST   | Protected | Create support ticket          |
| `/support-tickets`                  | GET    | Protected | Get all tickets                |
| `/user-support-tickets`             | GET    | Protected | Get user tickets               |
| `/support-tickets/:ticketId/reply`  | POST   | Protected | Reply to ticket                |
| `/support-tickets/:ticketId`        | DELETE | Protected | Delete ticket                  |
| `/support-tickets/:ticketId/close`  | POST   | Protected | Close ticket                   |
| `/support-tickets/recent`           | GET    | Protected | Get recent tickets             |
| `/support/anonymous`                | POST   | Public    | Create anonymous ticket        |
| `/support/anonymous/access/request` | POST   | Public    | Request anonymous access       |
| `/support/anonymous/access/verify`  | POST   | Public    | Verify anonymous access        |
| `/support/anonymous/:email`         | GET    | Public    | Get anonymous tickets by email |
| `/support/analytics/dashboard`      | GET    | Protected | Support dashboard analytics    |
| `/support/tickets/recent`           | GET    | Protected | Recent tickets for dashboard   |

### Admin

| Endpoint                         | Method | Access    | Description                       |
| -------------------------------- | ------ | --------- | --------------------------------- |
| `/admin/system-settings`         | GET    | Public    | Get system settings               |
| `/admin/maintenance-status`      | GET    | Public    | Get maintenance status            |
| `/admin/status`                  | GET    | Protected | Check admin status                |
| `/admin/activities`              | GET    | Protected | Get admin activities              |
| `/admin/metrics/system`          | GET    | Protected | Get system metrics                |
| `/admin/metrics/performance`     | GET    | Protected | Get performance metrics           |
| `/admin/analytics`               | GET    | Protected | Get site analytics                |
| `/admin/add-admin`               | POST   | Protected | Add new admin                     |
| `/admin/remove-admin`            | POST   | Protected | Remove admin                      |
| `/admin/maintenance-mode`        | POST   | Protected | Toggle maintenance mode           |
| `/admin/settings`                | GET    | Protected | Get system settings (admin)       |
| `/admin/grant-free-subscription` | POST   | Protected | Grant free subscription           |
| `/admin/performance/metrics`     | GET    | Protected | Get performance metrics summary   |
| `/admin/performance/summary`     | GET    | Protected | Get performance dashboard summary |
| `/admin/performance/clear`       | POST   | Protected | Clear performance metrics         |

### Badges

| Endpoint        | Method | Access    | Description         |
| --------------- | ------ | --------- | ------------------- |
| `/badges/user`  | GET    | Protected | Get user badges     |
| `/badges/all`   | GET    | Protected | Get all badges      |
| `/badges/award` | POST   | Protected | Award badge to user |

### Pageviews

| Endpoint          | Method | Access | Description           |
| ----------------- | ------ | ------ | --------------------- |
| `/track-pageview` | POST   | Public | Track client pageview |

### File upload

| Endpoint            | Method | Access    | Description            |
| ------------------- | ------ | --------- | ---------------------- |
| `/upload`           | POST   | Protected | Upload file            |
| `/uploadProfilePic` | POST   | Protected | Upload profile picture |
| `/removeProfilePic` | DELETE | Protected | Remove profile picture |
| `/editor`           | POST   | Protected | Upload editor image    |
| `/profile-image`    | POST   | Protected | Upload profile image   |
| `/course-image`     | POST   | Protected | Upload course image    |
| `/badge-image`      | POST   | Protected | Upload badge image     |

## Error handling

| Status Code | Description       |
| ----------- | ----------------- |
| 200         | Success           |
| 400         | Bad Request       |
| 401         | Unauthorized      |
| 403         | Forbidden         |
| 404         | Not Found         |
| 408         | Request Timeout   |
| 413         | Payload Too Large |
| 429         | Too Many Requests |
| 500         | Server Error      |

All error responses include a message explaining the error.

## Security measures

- CORS enabled for frontend origin
- Rate limiting implemented
- Helmet security headers
- Input sanitization middleware
- JWT token authentication

## File upload specifications

- Max file size: 10MB
- Processing: images optimized with Sharp

## Code execution limits

- Time limit: 10 seconds
- Memory limit: 512MB
- Output size: 100KB
- Network access: disabled

## Support system features

- 24-hour ticket expiration
- Automatic responses
- Admin notifications
- Ticket tracking
- Message history

---

For detailed implementation examples and testing, please refer to the codebase.
