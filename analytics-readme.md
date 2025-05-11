# DevQuest Analytics System

This directory contains the implementation of DevQuest's analytics system, which tracks and visualizes site usage data.

## Overview

The analytics system consists of several components:

- Database tables for storing visit and session data
- Backend API endpoints for retrieving analytics data
- Admin dashboard visualizations

## Database Schema

### site_visits

Tracks individual page views across the site:

- `visit_id`: Primary key
- `user_id`: Foreign key to users table (nullable for anonymous users)
- `ip_address`: Visitor's IP address
- `visit_date`: Timestamp of visit
- `page_visited`: URL/path visited
- `referrer`: Referring URL
- `device_type`: Device type (Desktop, Mobile, Tablet)
- `browser`: Browser name
- `os`: Operating system
- `country`: Country (from IP geolocation)
- `city`: City (from IP geolocation)

### user_sessions

Tracks user sessions and engagement:

- `session_id`: Primary key
- `user_id`: Foreign key to users table (nullable for anonymous users)
- `session_start`: Session start timestamp
- `session_end`: Session end timestamp
- `session_duration`: Duration in seconds
- `page_views`: Number of pages viewed
- `bounce`: Whether this was a bounce (single page view)
- `ip_address`: User's IP address
- `device_type`: Device type
- `created_at`: Creation timestamp

### quiz_attempts

Tracks quiz attempts by users:

- `attempt_id`: Primary key
- `user_id`: User ID
- `quiz_id`: Quiz ID
- `score`: Achieved score
- `max_score`: Maximum possible score
- `attempted_at`: Timestamp when attempt started
- `completed_at`: Timestamp when attempt was completed
- `passed`: Boolean indicating pass/fail

## Setup and Installation

1. Run the `analytics_setup.sql` migration script to create required tables
2. Ensure `trackVisits` middleware is properly configured in `server.js`
3. Install required dependencies: `npm install date-fns geoip-lite ua-parser-js`

## API Endpoints

### GET /admin/analytics

Returns analytics data for the admin dashboard.

**Query Parameters:**

- `range`: Time range to analyze (7days, 30days, 90days)

**Response:**

```json
{
  "visits": {
    "daily": [...],
    "monthly": [...],
    "last7Days": [...],
    "total": 12345,
    "unique": 5678
  },
  "userStats": {
    "totalUsers": 1000,
    "activeUsers": 500,
    "newUsers": 50
  },
  "topPages": [...],
  "userEngagement": {
    "newUsersDaily": [...],
    "activeUsers24h": 100,
    "quizzesTaken": 250,
    "mostAttemptedLessons": [...]
  },
  "environmentInfo": {
    "topCountries": [...],
    "browserStats": [...]
  },
  // ... other metrics
}
```

## Data Collection Process

1. The `trackVisits` middleware captures each page visit
2. Session data is tracked with session start/end times
3. Analytics controller aggregates this data on request

## Testing with Sample Data

A test script is provided to generate sample data:

```bash
node server/scripts/generateTestData.js
```

## Viewing Analytics

Analytics are accessible to admin users via the `/Analytics` page in the admin dashboard.

## Future Enhancements

- Real-time analytics with WebSockets
- More detailed funnel analysis
- Custom date ranges for analytics
- Downloadable reports in CSV/PDF format
- Event tracking for user interactions (clicks, form submissions)

## Dependencies

- date-fns: For date manipulation
- geoip-lite: For IP-based geolocation
- ua-parser-js: For user agent parsing
- chart.js/react-chartjs-2: For data visualization
