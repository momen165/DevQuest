# DevQuest

## 🎯 Overview
DevQuest is an interactive coding education platform that combines hands-on learning with gamification elements. Built with React and Node.js, it offers a modern learning experience for aspiring developers.

## ✨ Key Features

### 👨‍💻 Learning Experience
- Interactive code editor with real-time execution
- Multi-language support (Python, JavaScript, Java, C++, and more)
- Automated test case validation
- Progress tracking and achievements
- Customizable learning paths
- Instant feedback system

### 📚 Course System
- Structured learning paths
- Interactive lessons with practice exercises
- Code templates and hints
- Solution checking with custom test cases
- Course progress tracking
- Section-based organization

### 👤 User Features
- Personalized dashboard
- Progress tracking & statistics
- Skill tracking system
- Profile customization
- Achievement system
- Learning streaks

### 👑 Admin Dashboard
- Course management system
- User administration
- Content editing tools
- Analytics dashboard
- System maintenance controls
- Activity logging

## 🛠️ Technology Stack

### Frontend
- **Core**: React 18 + Vite
- **State Management**: Context API
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios
- **UI Components**: 
  - Material-UI
  - React Icons
  - Styled Components
  - React Hot Toast
- **Code Editor**: Monaco Editor
- **Styling**: CSS Modules

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT
- **File Storage**: AWS S3
- **Payment Processing**: Stripe
- **Security**:
  - Helmet
  - Express Rate Limit
  - XSS Protection
  - CORS

## 📁 Project Structure
```
project/
├── client/                 # Frontend React application
│   ├── public/            # Static files
│   └── src/
│       ├── components/    # Reusable components
│       ├── pages/        # Page components
│       ├── hooks/        # Custom React hooks
│       ├── services/     # API services
│       ├── utils/        # Utility functions
│       └── styles/       # Global styles
│
├── server/                # Backend Node.js application
│   ├── config/           # Configuration files
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Custom middleware
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   └── utils/           # Utility functions
│
└── docs/                 # Documentation
```

## ⚙️ Environment Setup

### Frontend (.env)
```
VITE_API_URL=your_api_url
VITE_STRIPE_PUBLIC_KEY=your_stripe_key
```

### Backend (.env)
```
PORT=3000
NODE_ENV=development
DATABASE_URL=your_postgresql_url
JWT_SECRET=your_jwt_secret
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
STRIPE_SECRET_KEY=your_stripe_secret
```

## 🚀 Getting Started

1. Clone the repository
```bash
git clone https://github.com/yourusername/devquest.git
cd devquest
```

2. Install dependencies
```bash
# Install frontend dependencies
cd client
npm install

# Install backend dependencies
cd ../server
npm install
```

3. Set up environment variables
- Copy `.env.example` to `.env` in both client and server directories
- Update the variables with your values

4. Start development servers
```bash
# Start frontend (from client directory)
npm run dev

# Start backend (from server directory)
npm run dev
```

## 🔒 Security Features
- JWT authentication
- Rate limiting
- XSS protection
- CORS configuration
- Input validation
- Secure password hashing
- File upload validation

## 🤝 Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Support
For support, email support@devquest.com or join our Discord community.
