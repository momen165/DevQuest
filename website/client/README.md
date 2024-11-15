# DevQuest

DevQuest is a full-stack web application combining a React-based frontend and a Node.js backend. This project is designed for scalability, maintainability, and ease of use.

## Table of Contents
1. Project Structure
2. Features
3. Technologies Used
4. Getting Started
5. Scripts
6. Environment Variables
7. Contributing
8. License

## Project Structure
- client/ — React frontend
  - src/ — React source code
  - public/ — Static files
  - .env — Client-specific environment variables
- server/ — Node.js backend
  - src/ — Backend logic
  - uploads/ — Uploaded files directory
  - .env — Server-specific environment variables
- node_modules/ — Shared dependencies
- package.json — Shared dependencies and scripts for client and server
- README.md — Project documentation

## Features
### Frontend:
- React-based SPA (Single Page Application)
- API integration with Axios for smooth data flow
- Modular and reusable components
- Responsive UI design

### Backend:
- REST API built with Node.js and Express
- Secure JWT-based user authentication
- PostgreSQL database integration
- File upload functionality using Multer

## Technologies Used
### Frontend:
- React
- React Router DOM
- Axios
- React Icons

### Backend:
- Node.js
- Express
- PostgreSQL
- JWT
- Multer

## Getting Started
### Prerequisites:
- Node.js (v16 or later)
- npm (v8 or later)
- PostgreSQL (configured locally or hosted)

### Installation:
1. Clone the repository:
   git clone https://github.com/your-username/DevQuest.git
   cd DevQuest/website

2. Install dependencies:
   npm install

3. Set up environment variables:
   - Create a `.env` file in the client directory for frontend configuration.
   - Create a `.env` file in the server directory for backend configuration.

4. Start the development environment:
   npm start

## Scripts
- npm start: Starts both the frontend and backend.
- npm run start:client: Starts the React frontend only.
- npm run start:server: Starts the Node.js backend only.
- npm run build: Builds the React app for production.

## Environment Variables
### Client (.env):
- REACT_APP_API_URL: Base URL for the backend API (e.g., http://localhost:5000).

### Server (.env):
- PORT: Port for the backend server (default is 5000).
- DB_URL: PostgreSQL database connection string.
- JWT_SECRET: Secret key for JWT authentication.

## Contributing
Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a new branch: git checkout -b feature-name.
3. Commit your changes: git commit -m "Add a new feature".
4. Push to the branch: git push origin feature-name.
5. Open a pull request.

## License
This project is licensed under the MIT License.
