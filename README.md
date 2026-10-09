# SolarConnect Portal - Backend API

RESTful API backend for SolarConnect Portal built with Node.js, Express, and MongoDB (Mongoose).

## Features
- Connection & Field Application management (PM Surya Ghar Muft Bijli Yojana)
- Real-time application tracking with Application ID & Mobile Number
- User authentication & Executive management
- Solar calculator assistance endpoints

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (running locally or MongoDB Atlas URI)

### Installation
```bash
npm install
```

### Environment Setup
Copy `.env.example` to `.env` and set your configuration:
```bash
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/solarconnect
NODE_ENV=development
```

### Running Server
```bash
# Start server
node index.js
```
