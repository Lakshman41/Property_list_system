# Property Listing System API

> A comprehensive, production-ready backend solution for managing property listings with advanced search capabilities, user management, and real-time caching.

[![Node.js](https://img.shields.io/badge/Node.js-18.x+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.x-green.svg)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7.x-red.svg)](https://redis.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/[username]/property-listing-api.git
cd property-listing-api

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Import sample data
npm run import-csv

# Start development server
npm run dev
```

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Advanced Features](#-advanced-features)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### Core Functionality
- **🔐 Secure Authentication**: JWT-based auth with bcrypt password hashing
- **🏠 Property Management**: Full CRUD operations with ownership controls
- **🔍 Advanced Search**: Multi-parameter filtering and full-text search
- **⚡ High Performance**: Redis caching for optimized response times
- **📱 RESTful API**: Clean, well-documented endpoints
- **📊 Pagination**: Efficient data retrieval with customizable page sizes

### User Features
- **❤️ Favorites System**: Save and manage favorite properties
- **💬 Recommendations**: Share properties with other users
- **🎯 Personalized Results**: Filter by 15+ property attributes
- **📈 Sorting Options**: Multiple sorting criteria available

### Technical Features
- **🏗️ TypeScript**: Type-safe development experience
- **🚀 Performance Optimized**: Intelligent caching strategies
- **📊 Data Import**: CSV bulk import functionality
- **🔒 Security**: Input sanitization and validation
- **📈 Scalable Architecture**: Modular, maintainable codebase

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| **Runtime** | Node.js 18+ |
| **Framework** | Express.js |
| **Language** | TypeScript |
| **Database** | MongoDB + Mongoose ODM |
| **Caching** | Redis + ioredis |
| **Authentication** | JWT + bcryptjs |
| **Validation** | Custom middleware |
| **Development** | Nodemon, ts-node |

## 📋 Prerequisites

Before getting started, ensure you have:

- **Node.js** 18.x or higher ([Download](https://nodejs.org/))
- **npm** or **yarn** package manager
- **Git** for version control
- **API Testing Tool** (Postman, Insomnia, or similar)

### Database Services

Choose one option for each:

**MongoDB:**
- 🏠 Local MongoDB installation, OR
- ☁️ [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (Recommended - Free M0 tier available)

**Redis:**
- 🏠 Local Redis installation, OR
- ☁️ [Upstash Redis](https://upstash.com/) (Recommended - Free tier available)

## 🚀 Installation

### 1. Clone Repository

```bash
git clone https://github.com/[your-username]/property-listing-api.git
cd property-listing-api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create your environment configuration:

```bash
# Copy example environment file
cp .env.example .env
```

### 4. Configure Environment Variables

Edit `.env` with your specific values:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/propertydb?retryWrites=true&w=majority

# Cache
REDIS_URL=redis://default:password@host:port

# Security
JWT_SECRET=your_super_secure_random_string_min_32_chars
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30

# Optional: Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 5. Import Sample Data

```bash
npm run import-csv
```

### 6. Start Development Server

```bash
npm run dev
```

✅ **Success!** Your API is now running at `http://localhost:3001`

## ⚙️ Configuration

### Getting Database URLs

#### MongoDB Atlas Setup
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new M0 (free) cluster
3. Add your IP to Network Access (or use `0.0.0.0/0` for development)
4. Create database user with username/password
5. Get connection string from "Connect" → "Drivers"

#### Upstash Redis Setup
1. Create account at [Upstash](https://upstash.com/)
2. Create new Redis database (free tier available)
3. Copy the Redis URL from dashboard

### Security Configuration

Generate a strong JWT secret:
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

## 📚 API Documentation

Base URL: `http://localhost:3001/api/v1`

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | ❌ |
| POST | `/auth/login` | User login | ❌ |
| GET | `/auth/me` | Get current user | ✅ |

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

#### Login User
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "_id": "64a1b2c3d4e5f6789012345",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Property Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/properties` | List all properties | ❌ |
| GET | `/properties/:id` | Get single property | ❌ |
| POST | `/properties` | Create property | ✅ |
| PUT | `/properties/:id` | Update property | ✅ (owner only) |
| DELETE | `/properties/:id` | Delete property | ✅ (owner only) |

#### Create Property
```http
POST /api/v1/properties
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "originalId": "PROP_001",
  "title": "Luxury Downtown Apartment",
  "propertyType": "Apartment",
  "price": 35000000,
  "locationState": "Maharashtra",
  "locationCity": "Mumbai",
  "areaSqFt": 1800,
  "bedrooms": 3,
  "bathrooms": 2,
  "amenities": ["gym", "rooftop-terrace", "security"],
  "furnishingStatus": "Semi-Furnished",
  "availableFrom": "2024-08-01",
  "listedBy": "Agent",
  "tags": ["luxury", "city-view", "modern"],
  "isVerified": true,
  "listingType": "sale",
  "colorTheme": "#3498db",
  "rating": 4.7
}
```

#### Get Properties with Filters
```http
GET /api/v1/properties?locationCity=Mumbai&minPrice=20000000&propertyType=Apartment&amenities=gym,security&sortBy=price_asc&page=1&limit=10
```

### User Favorites

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/me/favorites` | Get user's favorites |
| POST | `/users/me/favorites/:propertyId` | Add to favorites |
| DELETE | `/users/me/favorites/:propertyId` | Remove from favorites |

### User Recommendations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/me/recommendations` | Get received recommendations |
| POST | `/users/me/recommend/:propertyId` | Recommend property to user |

#### Recommend Property
```http
POST /api/v1/users/me/recommend/64a1b2c3d4e5f6789012345
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "recipientEmail": "friend@example.com",
  "message": "Check out this amazing property!"
}
```

## 🔍 Advanced Features

### Search & Filtering

The API supports extensive filtering options:

#### Text Search
```http
GET /api/v1/properties?keywords=luxury waterfront villa
```

#### Range Filters
- `minPrice`, `maxPrice`
- `minAreaSqFt`, `maxAreaSqFt`
- `minBedrooms`, `maxBedrooms`
- `minBathrooms`, `maxBathrooms`
- `minRating`, `maxRating`

#### Exact Match Filters
- `propertyType` (Villa, Apartment, House, etc.)
- `locationState`
- `locationCity`
- `furnishingStatus` (Furnished, Semi-Furnished, Unfurnished)
- `listedBy` (Owner, Agent, Builder)
- `listingType` (sale, rent)
- `isVerified` (true, false)

#### Date Range Filters
```http
GET /api/v1/properties?availableAfter=2024-06-01&availableBefore=2024-12-31
```

#### Array Filters
- `amenities=pool,gym,security` (must have ALL)
- `tags=luxury,modern` (must have at least ONE)

#### Sorting Options
- `sortBy=price_asc` or `price_desc`
- `sortBy=createdAt_desc` (default)
- `sortBy=rating_asc` or `rating_desc`
- `sortBy=areaSqFt_desc`

### Caching Strategy

The API implements intelligent Redis caching:

- **Property Details**: Individual properties cached for 1 hour
- **Search Results**: Filtered lists cached for 15 minutes
- **Auto-Invalidation**: Cache cleared on property updates
- **Cache Headers**: Responses include cache status for debugging

### Pagination

All list endpoints support pagination:

```http
GET /api/v1/properties?page=2&limit=20
```

**Response includes:**
- `count`: Items in current page
- `totalProperties`: Total items available
- `totalPages`: Total pages available
- `currentPage`: Current page number

## 🚀 Deployment

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3001
MONGO_URI=your_production_mongodb_uri
REDIS_URL=your_production_redis_uri
JWT_SECRET=your_production_jwt_secret
```

### Deploy to Render

1. Fork this repository
2. Connect your GitHub account to [Render](https://render.com)
3. Create a new Web Service
4. Configure environment variables
5. Deploy!

### Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Deploy to Heroku

```bash
# Install Heroku CLI
heroku create your-app-name
heroku config:set NODE_ENV=production
heroku config:set MONGO_URI=your_mongo_uri
# ... set other environment variables
git push heroku main
```

### Health Check Endpoint

```http
GET /api/v1/health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "database": "connected",
    "cache": "connected"
  }
}
```

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Test coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Manual Testing

Use the provided Postman collection:

1. Import `postman_collection.json`
2. Set environment variables
3. Run authentication requests first
4. Test other endpoints with the JWT token

### Sample Test Data

The CSV import includes:
- 100+ sample properties
- Various property types and locations
- Realistic pricing and amenities
- Test users for development

## 📝 Available Scripts

```json
{
  "dev": "nodemon src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "import-csv": "ts-node src/utils/csvImporter.ts",
  "test": "jest",
  "test:watch": "jest --watch",
  "lint": "eslint src/**/*.ts",
  "format": "prettier --write src/**/*.ts"
}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Ensure tests pass: `npm test`
6. Commit changes: `git commit -m 'Add amazing feature'`
7. Push to branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public methods
- Write tests for new features
- Use Prettier for formatting

## 🔮 Future Enhancements

### Planned Features
- [ ] **Image Upload**: Property photos with cloud storage
- [ ] **Advanced RBAC**: Admin roles and permissions
- [ ] **Real-time Notifications**: WebSocket integration
- [ ] **Geolocation**: Map integration and location-based search
- [ ] **Analytics**: Property view tracking and insights
- [ ] **API Rate Limiting**: Enhanced DDoS protection
- [ ] **GraphQL API**: Alternative to REST endpoints
- [ ] **Microservices**: Split into domain-specific services

### Performance Improvements
- [ ] **Database Indexing**: Optimize query performance
- [ ] **CDN Integration**: Static asset delivery
- [ ] **Horizontal Scaling**: Load balancer support
- [ ] **Monitoring**: APM and logging integration

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- **Documentation**: [API Docs](https://your-api-docs-url.com)
- **Issues**: [GitHub Issues](https://github.com/[username]/property-listing-api/issues)
- **Email**: support@yourcompany.com
- **Discord**: [Join our community](https://discord.gg/yourserver)

## 📊 Project Status

- ✅ **Stable**: Core API functionality
- ✅ **Production Ready**: Deployed and tested
- 🔄 **Active Development**: Regular updates and improvements
- 📈 **Growing**: New features added regularly

---

**Built with ❤️ by [LAKSHMAN SINGH]**

⭐ **Star this repo** if you found it helpful!