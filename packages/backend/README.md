# 📋 MEDASSIST AI V3 - COMPLETE README.md

```markdown
# 🩺 MedAssist AI - Intelligent Medical Assistant

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/yourusername/medassist-ai)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> **AI-powered medical diagnosis assistant with React + TypeScript frontend, Express + TypeScript backend, and MongoDB database.**

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [Docker Setup](#-docker-setup)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

MedAssist AI is a full-stack medical assistant application that leverages artificial intelligence to help patients identify potential health conditions based on their symptoms. The system provides AI-powered diagnosis, doctor recommendations, appointment booking, and comprehensive medical history management.

### Key Capabilities

- **AI Symptom Analysis**: Uses machine learning (scikit-learn) to analyze symptoms and predict potential conditions
- **Intelligent Doctor Assignment**: Automatically recommends the right specialist based on diagnosis
- **Emergency Detection**: Identifies critical conditions and alerts users to call 1122
- **Patient Dashboard**: View medical history, reports, appointments, and notifications
- **Doctor Portal**: Review AI reports, add clinical notes, prescribe medications
- **Appointment System**: Book, cancel, and manage appointments with real-time availability
- **Real-time Notifications**: WebSocket-powered notifications for appointment confirmations and report updates

---

## ✨ Features

### For Patients 👤
- ✅ **AI Symptom Checker** - Voice and text input with instant AI analysis
- ✅ **Medical History** - Complete record of all AI reports and doctor consultations
- ✅ **Appointment Booking** - Find and book appointments with available doctors
- ✅ **Health Education** - Learn about common health conditions and precautions
- ✅ **Feedback System** - Rate and review your experience
- ✅ **Emergency Alert** - One-click access to emergency services (1122)
- ✅ **Real-time Notifications** - Get alerts for appointments and report updates

### For Doctors 👨‍⚕️
- ✅ **Report Review** - Review AI-generated reports and add clinical diagnosis
- ✅ **Prescription Management** - Add prescriptions and treatment plans
- ✅ **Appointment Management** - View and manage patient appointments
- ✅ **Patient History** - Access complete patient medical records
- ✅ **Availability Management** - Set working hours and availability
- ✅ **Performance Dashboard** - Track reports reviewed and appointments

### Technical Features ⚙️
- ✅ **Monorepo Architecture** - Frontend and backend in single repository
- ✅ **TypeScript** - Full type safety for both frontend and backend
- ✅ **MongoDB Atlas** - Cloud-native document database with indexing
- ✅ **JWT Authentication** - Secure authentication with role-based access
- ✅ **WebSocket** - Real-time bidirectional communication
- ✅ **Redis Caching** - Performance optimization for AI predictions
- ✅ **Docker Support** - Containerized deployment with docker-compose
- ✅ **CI/CD Ready** - GitHub Actions workflow included
- ✅ **Comprehensive Testing** - Unit and integration tests with Jest

---

## 🛠️ Tech Stack

### Frontend 🎨
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2.0 | UI Framework |
| TypeScript | 5.0.0 | Type Safety |
| Tailwind CSS | 3.3.0 | Styling |
| React Router | 6.14.0 | Navigation |
| React Hook Form | 7.45.0 | Form Management |
| Zod | 3.22.0 | Validation |
| Socket.io Client | 4.7.0 | Real-time |
| Axios | 1.4.0 | HTTP Client |
| Vite | 4.4.0 | Build Tool |

### Backend 🖥️
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18.17.0 | Runtime |
| Express | 4.18.0 | Web Framework |
| TypeScript | 5.0.0 | Type Safety |
| MongoDB | 7.0.0 | Database |
| Mongoose | 7.4.0 | ODM |
| JWT | 9.0.0 | Authentication |
| Bcrypt | 5.1.0 | Password Hashing |
| Socket.io | 4.7.0 | Real-time |
| Redis | 4.6.0 | Caching |
| Winston | 3.9.0 | Logging |
| Jest | 29.6.0 | Testing |
| Supertest | 6.3.0 | API Testing |

### AI/ML 🤖
- **Python 3.10+** for ML model
- **scikit-learn** - Machine learning
- **pandas** - Data processing
- **joblib** - Model serialization
- **TF-IDF Vectorizer** - Text feature extraction
- **Multinomial Naive Bayes** - Classification algorithm

### DevOps 🚀
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Reverse proxy & static serving
- **PM2** - Process management
- **GitHub Actions** - CI/CD pipeline
- **Husky** - Git hooks

---

## 📁 Project Structure

```
medassist-ai-v3/
├── packages/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   ├── database.ts          # MongoDB connection
│   │   │   │   ├── redis.ts             # Redis client
│   │   │   │   └── env.ts               # Environment validation
│   │   │   ├── models/
│   │   │   │   ├── Patient.model.ts     # Patient schema
│   │   │   │   ├── Doctor.model.ts      # Doctor schema
│   │   │   │   ├── Report.model.ts      # Report schema
│   │   │   │   ├── Appointment.model.ts # Appointment schema
│   │   │   │   ├── Notification.model.ts
│   │   │   │   ├── Feedback.model.ts
│   │   │   │   └── EmergencyAlert.model.ts
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts      # Authentication logic
│   │   │   │   ├── patient.service.ts   # Patient operations
│   │   │   │   ├── doctor.service.ts    # Doctor operations
│   │   │   │   ├── appointment.service.ts
│   │   │   │   ├── ai.service.ts        # AI integration
│   │   │   │   ├── notification.service.ts
│   │   │   │   └── report.service.ts
│   │   │   ├── controllers/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── patient.controller.ts
│   │   │   │   ├── doctor.controller.ts
│   │   │   │   ├── appointment.controller.ts
│   │   │   │   ├── ai.controller.ts
│   │   │   │   └── feedback.controller.ts
│   │   │   ├── routes/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── patient.routes.ts
│   │   │   │   ├── doctor.routes.ts
│   │   │   │   ├── appointment.routes.ts
│   │   │   │   ├── ai.routes.ts
│   │   │   │   └── feedback.routes.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   ├── error.middleware.ts
│   │   │   │   ├── rateLimiter.middleware.ts
│   │   │   │   └── validation.middleware.ts
│   │   │   ├── sockets/
│   │   │   │   └── notification.socket.ts
│   │   │   ├── utils/
│   │   │   │   ├── logger.ts
│   │   │   │   ├── validation.ts
│   │   │   │   └── constants.ts
│   │   │   └── server.ts               # Entry point
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   └── .env
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── common/             # Reusable components
│   │   │   │   │   ├── Button.tsx
│   │   │   │   │   ├── Card.tsx
│   │   │   │   │   ├── Input.tsx
│   │   │   │   │   ├── Modal.tsx
│   │   │   │   │   ├── Toast.tsx
│   │   │   │   │   ├── Loader.tsx
│   │   │   │   │   └── ...
│   │   │   │   ├── layout/             # Layout components
│   │   │   │   │   ├── Sidebar.tsx
│   │   │   │   │   ├── Header.tsx
│   │   │   │   │   ├── Footer.tsx
│   │   │   │   │   └── Layout.tsx
│   │   │   │   └── ...
│   │   │   ├── pages/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── Login.tsx
│   │   │   │   │   ├── Signup.tsx
│   │   │   │   │   └── ...
│   │   │   │   ├── patient/
│   │   │   │   │   ├── Dashboard.tsx
│   │   │   │   │   ├── SymptomChecker.tsx
│   │   │   │   │   ├── MedicalHistory.tsx
│   │   │   │   │   └── ...
│   │   │   │   └── doctor/
│   │   │   │       ├── DoctorDashboard.tsx
│   │   │   │       ├── ReportReview.tsx
│   │   │   │       └── ...
│   │   │   ├── context/
│   │   │   │   ├── AuthContext.tsx
│   │   │   │   └── NotificationContext.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useApi.ts
│   │   │   │   └── useWebSocket.ts
│   │   │   ├── services/
│   │   │   │   ├── api.service.ts
│   │   │   │   └── socket.service.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   ├── utils/
│   │   │   │   ├── validators.ts
│   │   │   │   └── formatters.ts
│   │   │   ├── styles/
│   │   │   │   └── index.css
│   │   │   ├── App.tsx
│   │   │   └── index.tsx
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   └── vite.config.ts
│   └── shared/
│       ├── types/
│       │   └── index.ts
│       └── validators/
│           └── index.ts
├── models/                             # Python ML models
│   ├── disease_model.pkl
│   └── vectorizer.pkl
├── data/                               # JSON data files
│   ├── description_map.json
│   ├── doctor_map.json
│   ├── precautions_map.json
│   └── severity_map.json
├── scripts/
│   ├── deploy.sh
│   └── migrate-data.js
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
├── docker-compose.prod.yml
├── package.json                        # Root package.json
├── tsconfig.json                       # Root TypeScript config
├── .env
├── .gitignore
├── .eslintrc.js
├── .prettierrc
├── README.md
└── LICENSE
```

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v18.17.0 or higher
- **npm** v9.0.0 or higher (or yarn/pnpm)
- **MongoDB** v7.0.0 or higher (or MongoDB Atlas account)
- **Redis** v7.0.0 or higher (optional, for caching)
- **Python** v3.10 or higher (for AI model)
- **Git** v2.0.0 or higher
- **Docker** v20.0.0 or higher (optional)

### Verify Installation

```bash
# Check Node.js version
node --version  # Should be v18.17.0+

# Check npm version
npm --version   # Should be v9.0.0+

# Check MongoDB
mongod --version  # Should be v7.0.0+

# Check Python
python --version  # Should be v3.10+

# Check Docker (if using)
docker --version
```

---

## 🚀 Quick Start

Get MedAssist AI running in 5 minutes:

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/medassist-ai.git
cd medassist-ai

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your MongoDB credentials

# 4. Train the AI model (first time only)
npm run train:ai

# 5. Start development server
npm run dev

# 6. Open browser
open http://localhost:3000
```

### Default Test Credentials

```
Patient Login:
Email: patient@example.com
Password: Patient@123

Doctor Login:
Email: doctor@example.com
Password: Doctor@123

Guest Access:
Click "Continue as Guest"
```

---

## 📦 Installation

### Standard Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/medassist-ai.git
cd medassist-ai

# 2. Install all dependencies (root + workspaces)
npm install

# 3. Install Python dependencies for AI model
pip install -r requirements.txt
# OR
pip3 install scikit-learn pandas joblib

# 4. Setup environment
cp .env.example .env

# 5. Train the AI model
python train_model.py

# 6. Build the application
npm run build

# 7. Start production server
npm start
```

### Development Installation

```bash
# 1. Install dependencies
npm install

# 2. Start development servers (both frontend and backend)
npm run dev

# 3. Or start individually:
npm run dev:backend   # Backend only (port 5000)
npm run dev:frontend  # Frontend only (port 3000)
```

### Docker Installation

```bash
# 1. Build and start all services
docker-compose up -d

# 2. View logs
docker-compose logs -f

# 3. Stop services
docker-compose down

# 4. Production mode
docker-compose -f docker-compose.prod.yml up -d
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# ============================================
# MongoDB Configuration
# ============================================
MONGODB_URI=mongodb://localhost:27017/medassist
MONGODB_USER=medassist
MONGODB_PASSWORD=medassist123
MONGODB_DATABASE=medassist

# ============================================
# JWT Authentication
# ============================================
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRY=7d
JWT_REFRESH_EXPIRY=30d

# ============================================
# Server Configuration
# ============================================
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

# ============================================
# Redis Configuration (Optional)
# ============================================
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_TTL=3600

# ============================================
# AI Model Configuration
# ============================================
AI_MODEL_PATH=./models/disease_model.pkl
VECTORIZER_PATH=./models/vectorizer.pkl
AI_CONFIDENCE_THRESHOLD=70

# ============================================
# Email Configuration (Optional)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@medassist.com

# ============================================
# Emergency Services
# ============================================
EMERGENCY_NUMBER=1122
EMERGENCY_EMAIL=emergency@medassist.com

# ============================================
# CORS & Security
# ============================================
CORS_ORIGIN=http://localhost:3000,http://localhost:5000
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

---

## 🏃 Running the Application

### Development Mode

```bash
# Run both frontend and backend in development
npm run dev

# Backend only (port 5000)
npm run dev:backend

# Frontend only (port 3000)
npm run dev:frontend
```

### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm start

# With PM2 (recommended for production)
npm run pm2:start
pm2 save
pm2 startup
```

### Docker Mode

```bash
# Development
docker-compose up

# Production
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop
docker-compose down

# Stop with volume removal
docker-compose down -v
```

---

## 🐳 Docker Setup

### Development Docker

```yaml
# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    container_name: medassist-mongo
    restart: always
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: medassist
      MONGO_INITDB_ROOT_PASSWORD: medassist123
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7-alpine
    container_name: medassist-redis
    restart: always
    ports:
      - "6379:6379"

  backend:
    build: ./packages/backend
    container_name: medassist-backend
    restart: always
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: development
      MONGODB_URI: mongodb://medassist:medassist123@mongodb:27017/medassist
    depends_on:
      - mongodb
      - redis
    volumes:
      - ./packages/backend:/app
      - /app/node_modules
      - ./models:/app/models
      - ./data:/app/data

  frontend:
    build: ./packages/frontend
    container_name: medassist-frontend
    restart: always
    ports:
      - "3000:3000"
    environment:
      VITE_API_URL: http://localhost:5000
    depends_on:
      - backend
    volumes:
      - ./packages/frontend:/app
      - /app/node_modules

volumes:
  mongo_data:
```

### Production Docker

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    container_name: medassist-mongo-prod
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGODB_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGODB_PASSWORD}
    volumes:
      - mongo_data_prod:/data/db
    networks:
      - medassist-network

  redis:
    image: redis:7-alpine
    container_name: medassist-redis-prod
    restart: always
    networks:
      - medassist-network

  backend:
    build:
      context: ./packages/backend
      dockerfile: Dockerfile.prod
    container_name: medassist-backend-prod
    restart: always
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://${MONGODB_USER}:${MONGODB_PASSWORD}@mongodb:27017/medassist
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - mongodb
      - redis
    networks:
      - medassist-network
    volumes:
      - ./models:/app/models
      - ./data:/app/data

  frontend:
    build:
      context: ./packages/frontend
      dockerfile: Dockerfile.prod
    container_name: medassist-frontend-prod
    restart: always
    networks:
      - medassist-network

  nginx:
    image: nginx:alpine
    container_name: medassist-nginx-prod
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
    networks:
      - medassist-network

networks:
  medassist-network:
    driver: bridge

volumes:
  mongo_data_prod:
```

---

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/signup` | Register new patient | Public |
| POST | `/api/v1/auth/login` | Login user | Public |
| POST | `/api/v1/auth/guest` | Guest login | Public |
| POST | `/api/v1/auth/logout` | Logout user | Private |
| GET | `/api/v1/auth/me` | Get current user | Private |
| POST | `/api/v1/auth/refresh` | Refresh token | Private |

### Patient Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/patients/profile` | Get patient profile | Patient |
| PUT | `/api/v1/patients/profile` | Update profile | Patient |
| GET | `/api/v1/patients/history` | Get medical history | Patient |
| GET | `/api/v1/patients/reports` | Get AI reports | Patient |
| GET | `/api/v1/patients/stats` | Get patient stats | Patient |
| GET | `/api/v1/patients/notifications` | Get notifications | Patient |
| PUT | `/api/v1/patients/notifications/:id` | Mark notification read | Patient |

### Doctor Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/doctors/profile` | Get doctor profile | Doctor |
| PUT | `/api/v1/doctors/profile` | Update profile | Doctor |
| GET | `/api/v1/doctors/reports/pending` | Get pending reports | Doctor |
| GET | `/api/v1/doctors/reports/reviewed` | Get reviewed reports | Doctor |
| POST | `/api/v1/doctors/reviews` | Review a report | Doctor |
| GET | `/api/v1/doctors/appointments` | Get appointments | Doctor |
| PUT | `/api/v1/doctors/availability` | Update availability | Doctor |
| GET | `/api/v1/doctors/stats` | Get doctor stats | Doctor |

### Appointment Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/appointments/available-slots` | Get available slots | Public |
| POST | `/api/v1/appointments/book` | Book appointment | Patient |
| PUT | `/api/v1/appointments/:id/cancel` | Cancel appointment | Patient |
| GET | `/api/v1/appointments/patient` | Get patient appointments | Patient |
| GET | `/api/v1/appointments/doctor` | Get doctor appointments | Doctor |
| PUT | `/api/v1/appointments/:id/status` | Update status | Doctor |

### AI Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/ai/analyze` | Analyze symptoms | Public |
| GET | `/api/v1/ai/education/:topic` | Get health education | Public |
| GET | `/api/v1/ai/doctor/:diagnosis` | Get doctor recommendation | Public |
| GET | `/api/v1/ai/history` | Get prediction history | Patient |

### Feedback Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/feedback/submit` | Submit feedback | Patient |
| GET | `/api/v1/feedback/:id` | Get feedback | Patient |
| GET | `/api/v1/feedback/stats` | Get feedback stats | Admin |

### API Response Format

```typescript
// Success Response
{
  success: true,
  data: {
    // Response data
  },
  message: "Operation successful",
  timestamp: "2024-01-01T00:00:00.000Z"
}

// Error Response
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "Error description",
    details: {} // Optional
  },
  timestamp: "2024-01-01T00:00:00.000Z"
}

// Paginated Response
{
  success: true,
  data: {
    items: [],
    pagination: {
      page: 1,
      limit: 10,
      total: 100,
      pages: 10
    }
  },
  message: "Data retrieved successfully"
}
```

### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `AUTH_001` | Invalid credentials | 401 |
| `AUTH_002` | Token expired | 401 |
| `AUTH_003` | Unauthorized access | 403 |
| `VALID_001` | Validation error | 400 |
| `NOTF_001` | Resource not found | 404 |
| `DB_001` | Database error | 500 |
| `AI_001` | AI model error | 503 |
| `APP_001` | Appointment conflict | 409 |

---

## 🗄️ Database Schema

### MongoDB Collections

#### Patient Collection
```typescript
{
  _id: ObjectId,
  name: string,
  email: string (unique),
  passwordHash: string,
  phone: string,
  dateOfBirth: Date,
  bloodGroup: string (A+, A-, B+, B-, O+, O-, AB+, AB-),
  medicalHistory: [{
    _id: ObjectId,
    text: string,
    recordedDate: Date,
    recordedBy: string
  }],
  reports: [{
    _id: ObjectId,
    reportId: ObjectId,
    symptoms: string,
    aiDiagnosis: string,
    status: string (PENDING, REVIEWED, COMPLETED),
    doctorId: ObjectId,
    createdAt: Date
  }],
  appointments: [{
    _id: ObjectId,
    appointmentId: ObjectId,
    doctorId: ObjectId,
    date: Date,
    time: string,
    status: string (SCHEDULED, COMPLETED, CANCELLED)
  }],
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Doctor Collection
```typescript
{
  _id: ObjectId,
  name: string,
  email: string (unique),
  passwordHash: string,
  specialization: string,
  experienceYears: number,
  consultationFee: number,
  isAvailable: boolean,
  workingHours: {
    start: string,
    end: string
  },
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Report Collection
```typescript
{
  _id: ObjectId,
  patientId: ObjectId (ref: Patient),
  doctorId: ObjectId (ref: Doctor),
  symptoms: string,
  aiDiagnosis: string,
  aiConfidence: number,
  status: string (PENDING, REVIEWED, COMPLETED),
  doctorNotes: string,
  prescription: string,
  doctorDiagnosis: string,
  createdAt: Date,
  reviewedAt: Date,
  updatedAt: Date
}
```

#### Appointment Collection
```typescript
{
  _id: ObjectId,
  doctorId: ObjectId (ref: Doctor),
  patientId: ObjectId (ref: Patient),
  appointmentDate: Date,
  appointmentTime: string,
  status: string (SCHEDULED, COMPLETED, CANCELLED, NO_SHOW),
  reason: string,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test:coverage

# Run tests in watch mode
npm test:watch

# Run specific test file
npm test -- packages/backend/src/__tests__/auth.test.ts

# Run frontend tests only
npm test:frontend

# Run backend tests only
npm test:backend
```

### Test Coverage

```bash
# Generate coverage report
npm test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

### Example Test

```typescript
// packages/backend/src/__tests__/auth.test.ts
import request from 'supertest';
import app from '../server';

describe('Auth API', () => {
  test('POST /api/v1/auth/signup - Register new patient', async () => {
    const response = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        name: 'Test Patient',
        email: 'test@example.com',
        password: 'Test@123',
        phone: '0300-1234567'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('patientId');
  });

  test('POST /api/v1/auth/login - Login patient', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Test@123',
        role: 'patient'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('token');
  });
});
```

---

## 🚀 Deployment

### Deploy to Production

#### Option 1: Deploy with Docker

```bash
# 1. Build production images
docker-compose -f docker-compose.prod.yml build

# 2. Start services
docker-compose -f docker-compose.prod.yml up -d

# 3. Check status
docker-compose -f docker-compose.prod.yml ps

# 4. View logs
docker-compose -f docker-compose.prod.yml logs -f
```

#### Option 2: Deploy to Cloud Services

**AWS EC2:**
```bash
# 1. SSH to EC2 instance
ssh -i your-key.pem ec2-user@your-ip

# 2. Install dependencies
sudo yum install -y docker docker-compose git

# 3. Clone and deploy
git clone https://github.com/yourusername/medassist-ai.git
cd medassist-ai
docker-compose -f docker-compose.prod.yml up -d
```

**Heroku:**
```bash
# 1. Install Heroku CLI
brew tap heroku/brew && brew install heroku

# 2. Login and create app
heroku login
heroku create medassist-ai

# 3. Add MongoDB Atlas addon
heroku addons:create mongodb-atlas:free

# 4. Deploy
git push heroku main
```

**Vercel (Frontend) + Railway (Backend):**
```bash
# Frontend to Vercel
cd packages/frontend
npm run build
vercel --prod

# Backend to Railway
cd packages/backend
railway up
```

#### Option 3: Manual Deployment

```bash
# 1. Build the application
npm run build

# 2. Start with PM2
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 3. Configure Nginx
sudo cp nginx/nginx.conf /etc/nginx/sites-available/medassist
sudo ln -s /etc/nginx/sites-available/medassist /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 4. Setup SSL with Certbot
sudo certbot --nginx -d medassist.com -d www.medassist.com
```

### Environment Variables for Production

```env
NODE_ENV=production
MONGODB_URI=mongodb://medassist:password@mongodb-production:27017/medassist
JWT_SECRET=your_production_secret_key_here
REDIS_URL=redis://redis-production:6379
CORS_ORIGIN=https://medassist.com
FRONTEND_URL=https://medassist.com
BACKEND_URL=https://api.medassist.com
```

---

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Commit Convention

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Format code
refactor: Refactor code
perf: Improve performance
test: Add tests
chore: Update dependencies
```

### Code Style

```bash
# Run linter
npm run lint

# Format code
npm run format

# Fix lint issues
npm run lint:fix
```

### Pull Request Checklist

- [ ] Code follows project style
- [ ] Tests are added/updated
- [ ] Documentation is updated
- [ ] All tests pass
- [ ] No console.log statements in production
- [ ] Proper error handling added
- [ ] Typescript types are correct

## 🙏 Acknowledgments

- **Database Systems Course** - Project inspiration and guidance
- **scikit-learn** - Machine learning framework
- **MongoDB** - NoSQL database
- **React** - UI framework
- **Express** - Web framework
- **All Contributors** - Who helped make this project possible


## 🔒 Security

- All passwords are hashed using bcrypt
- JWT tokens with expiration
- Rate limiting on all endpoints
- CORS properly configured
- Security headers with Helmet
- Input validation and sanitization
- MongoDB injection protection
- XSS prevention

---

## 📊 Performance

- **Frontend**: Lazy loading, code splitting, image optimization
- **Backend**: Redis caching, MongoDB indexing, connection pooling
- **API**: Response compression, pagination, rate limiting
- **Database**: Proper indexing, aggregation pipelines, sharding ready

