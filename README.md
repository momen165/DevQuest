# DevQuest

## 🎯 Overview
DevQuest is an interactive learning platform built with React, featuring a modern and responsive user interface designed for an optimal learning experience.

## 🎯 Features

### 🎨 User Interface
- Modern gradient backgrounds
- Dark/Light theme support
- Responsive design
- Interactive code editor
- Real-time code execution
- Progress tracking
- Achievement system

### 📚 Course Management
- Interactive lesson interface
- Split-view layout
- Drag-and-drop section reordering
- Progress tracking
- Code execution environment
- Practice exercises

### 🎮 User Experience
- Intuitive navigation
- Breadcrumb trails
- Real-time feedback
- Profile management
- Subscription system
- FAQ support

### 👑 Admin Features
- Course management
- User management
- Content editing
- Analytics dashboard
- Maintenance controls

## 🛠️ Tech Stack

### 🏗️ Core
- React 18
- Vite
- React Router DOM
- Axios
- Express Validator
- JWT Authentication

### 🎭 UI Components
- Material-UI (MUI)
- React Icons
- GSAP Animations
- React Slick
- React Hot Toast
- Styled Components
- Lucide Icons
- React Circular Progressbar

### 💻 Code Editor
- Monaco Editor
- CodeMirror
  - Python support
  - JavaScript support
  - Java support
  - C++ support
- Highlight.js

### 🔄 State & Forms
- JWT with Decode
- Express Validator
- Node Cache
- HTML React Parser

### 🎨 Styling
- Styled Components
- CSS Modules
- SVGR for SVG handling
- TailwindCSS

### 🛡️ Security
- Helmet
- XSS Protection
- Express Rate Limit
- CORS

### 📦 Additional Features
- Stripe Integration
- AWS S3 Integration
- CKEditor 5
- Sharp (Image Processing)
- Drag and Drop (@hello-pangea/dnd)

## 📁 Project Structure
```
client/
├── public/
├── src/
│   ├── assets/
│   │   ├── icons/
│   │   └── images/
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   │   ├── admin/
│   │   ├── auth/
│   │   └── user/
│   ├── services/
│   ├── store/
│   ├── utils/
│   └── styles/
└── .env
```

## ⚙️ Environment Variables
```
VITE_API_URL=
VITE_GITHUB_CLIENT_ID=
VITE_STRIPE_PUBLIC_KEY=
VITE_ENVIRONMENT=
```

## 🚀 Scripts
```
npm run dev      # Start development server
npm run build    # Build for production

```

## 📱 Pages
- Home
- Login/Register
- Course Catalog
- Course Details
- Challenge Arena
- User Dashboard
- Profile Settings
- Leaderboard
- Achievement Gallery
- Admin Dashboard
- Subscription Management

## 🎨 Features Preview
### 🏠 Home Page
- Hero section
- Featured courses
- Learning paths
- Success stories

### 💻 Challenge Arena
- Code editor
- Real-time output
- Test cases
- Hints system

### 📊 Dashboard
- Progress tracking
- Recent activities
- Enrolled courses
- Achievement badges

### 👤 Profile
- User statistics
- Completed challenges
- Earned certificates
- Activity history

### 👑 Admin Panel
- Course management
- User analytics
- Content editor
- System controls
