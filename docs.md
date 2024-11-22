I'll help you generate the documentation in Markdown format (.md). Let me gather the information and format it appropriately.

# DevQuest Backend Documentation

## Table of Contents
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Database](#database)
- [File Management](#file-management)
- [Code Execution](#code-execution)

## Overview

DevQuest is a modern educational platform built with Node.js and Express, featuring a robust backend architecture. The system supports course management, user authentication, code execution, and comprehensive learning tracking.

## Tech Stack

```markdown
- Node.js
- Express
- PostgreSQL
- JWT Authentication
- Multer
- Sharp
- Judge0 API
- Bcrypt
- Helmet
```

## Getting Started

### Environment Variables

```markdown
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
DB_PORT=your_database_port
JWT_SECRET=your_jwt_secret
PORT=5000
```

### Installation

```bash
npm install
npm start
```

## Architecture

### Core Components

```markdown
1. Authentication Service
2. Course Management System
3. User Management System
4. File Upload Service
5. Code Execution Engine
6. Activity Logging System
```

## API Documentation

### Authentication Endpoints

```markdown
POST /api/signup
- Request:
  ```json
  {
    "name": "string",
    "email": "string",
    "password": "string",
    "country": "string"
  }
  ```

POST /api/login
- Request:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
```

### Course Management

```markdown
GET /api/courses
GET /api/courses/:courseId
POST /api/addCourses
PUT /api/editCourses/:id
DELETE /api/courses/:courseId
```

### Section Management

```markdown
POST /api/sections
PUT /api/sections/:id
GET /api/section
DELETE /api/section/:id
POST /api/sections/reorder
```

### Lesson Management

```markdown
POST /api/lessons
GET /api/lessons
PUT /api/lessons/:id
DELETE /api/lessons/:id
GET /api/lesson/:lessonId
POST /api/lessons/reorder
```

### User Management

```markdown
GET /api/students
GET /api/students/:studentId
GET /api/students/:studentId/courses
POST /api/updateProfile
POST /api/changePassword
```

## Security

### Implemented Security Measures

```markdown
1. JWT Authentication
2. Password Hashing (bcrypt)
3. Input Validation
4. CORS Configuration
5. Helmet Security Headers
6. File Upload Restrictions
7. Request Size Limiting
```

### Authentication Middleware

```javascript
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    // Token verification logic
};
```

## Database

### Schema Overview

```markdown
1. Users Table
   - user_id (PK)
   - name
   - email
   - password
   - country
   - bio
   - profileimage

2. Course Table
   - course_id (PK)
   - name
   - description
   - status
   - difficulty
   - language_id
   - image

3. Section Table
   - section_id (PK)
   - course_id (FK)
   - title
   - section_order

4. Lesson Table
   - lesson_id (PK)
   - section_id (FK)
   - name
   - content
   - expected_output
   - xp
   - lesson_order
```

## File Management

### Upload Configuration

```markdown
- Storage: Memory Storage
- File Size Limit: 5MB
- Allowed Extensions: jpeg, jpg, png, webp, svg
- Image Processing: Sharp for optimization
```

## Code Execution

### Judge0 Integration

```markdown
- API Endpoint: POST /api/run
- Base URL: http://51.44.5.41:2358
- Features:
  - Code compilation
  - Execution
  - Output comparison
  - Error handling
```

### Request Format

```json
{
  "lessonId": "number",
  "code": "string",
  "languageId": "number"
}
```

## Activity Logging

### System Events

```markdown
- User registration
- Course creation/modification
- Section management
- Lesson updates
- Administrative actions
```

### Logging Function

```javascript
const logActivity = async (actionType, actionDescription, userId = null) => {
    // Activity logging implementation
};
```

## Error Handling

```markdown
- Global error handler
- Specific error responses
- Error logging
- Client-friendly error messages
```

## Performance Optimization

```markdown
1. Database Connection Pooling
2. Image Optimization
3. Caching Headers
4. Query Optimization
5. Request Rate Limiting
```

## Maintenance

### Regular Tasks

```markdown
1. Database backup
2. Log rotation
3. Security updates
4. Performance monitoring
5. Error log review
```

## Contributing

```markdown
1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request
```

## License

This project is licensed under the MIT License - see the LICENSE.md file for details.

---
*Last Updated: 2024-11-22*
