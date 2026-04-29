# Deal AI - Comprehensive Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Features & Functionality](#features--functionality)
4. [Database Schema](#database-schema)
5. [Authentication System](#authentication-system)
6. [AI Integration](#ai-integration)
7. [Social Media Platform Integration](#social-media-platform-integration)
8. [API Endpoints](#api-endpoints)
9. [How to Post on Platforms](#how-to-post-on-platforms)
10. [Environment Variables](#environment-variables)
11. [Deployment & Setup](#deployment--setup)
12. [User Guide](#user-guide)

## Project Overview

**Deal AI** is a comprehensive real estate marketing and social media management platform that leverages artificial intelligence to automate content creation, scheduling, and posting across multiple social media platforms. The platform is specifically designed for real estate professionals to manage property projects, create marketing campaigns, and maintain consistent social media presence.

### Key Value Propositions
- **AI-Powered Content Generation**: Automatically creates engaging social media content for real estate projects
- **Multi-Platform Management**: Supports Facebook, LinkedIn, Instagram, and Twitter
- **Smart Scheduling**: Intelligent posting schedules based on campaign types and audience engagement
- **Voice-Activated AI Assistant**: Siri-like interface for hands-free project management
- **Multi-Language Support**: Arabic and English localization
- **Real Estate Focused**: Specialized tools for property marketing and case studies

## Architecture & Technology Stack

### Frontend
- **Framework**: Next.js 14.2.5 (React 18)
- **Styling**: Tailwind CSS with custom components
- **UI Components**: Radix UI primitives with custom styling
- **State Management**: React Hooks and Context API
- **Forms**: React Hook Form with Zod validation
- **Internationalization**: Custom i18n implementation (Arabic/English)

### Backend
- **Runtime**: Node.js with Next.js API routes
- **Database**: MongoDB with Prisma ORM
- **Authentication**: Lucia Auth with OAuth support
- **File Storage**: AWS S3 / DigitalOcean Spaces
- **Image Processing**: Sharp, Canvas, Konva

### AI & External Services
- **OpenAI Integration**: GPT-4 for content generation and AI assistant
- **Voice Recognition**: Web Speech API for voice commands
- **Text-to-Speech**: Browser-based speech synthesis
- **Image Generation**: Ideogram.ai integration
- **PDF Processing**: Custom PDF extractor

### Development Tools
- **TypeScript**: Full type safety
- **ESLint & Prettier**: Code quality and formatting
- **Prisma**: Database schema management
- **Yarn**: Package management

## Features & Functionality

### 1. Project Management
- Create and manage real estate projects
- Upload project logos and PDF documents
- Define project locations (country, city, district)
- Set property types (apartments, villas)
- Configure social media platforms

### 2. Case Study Creation
- AI-powered case study generation
- Target audience definition
- Market strategy planning
- Performance metrics tracking
- ROI calculations
- Strategic insights and recommendations

### 3. Content Generation & Scheduling
- AI-generated social media content
- Multiple content lengths (short, medium, long)
- Campaign types (branding, engagement, sales)
- Intelligent posting schedules
- Platform-specific content optimization

### 4. AI Voice Assistant (Siri)
- Voice-activated project management
- Natural language processing
- Hands-free operation
- Multi-language support
- Real-time project creation and management

### 5. Social Media Integration
- Facebook, LinkedIn, Instagram, Twitter support
- OAuth authentication for each platform
- Automated posting capabilities
- Content scheduling and management
- Performance tracking

### 6. Image Management
- AI-generated images from prompts
- Image editing and cropping tools
- Frame templates for social media
- PDF to image conversion
- Cloud storage integration

## Database Schema

### Core Models

#### User
```typescript
model User {
  id        String    @id @map("_id")
  name      String
  email     String    @unique
  image     String?
  password  String?
  googleId  String?   @unique @map("google-id")
  createdAt DateTime  @default(now())
  projects  Project[]
  sessions  Session[]
}
```

#### Project
```typescript
model Project {
  id            String   @id @map("_id")
  userId        String   @map("user-id")
  title         String
  logo          String?
  pdf           String[]
  description   String?
  country       String
  city          String
  distinct      String
  spaces        String
  propertyTypes PROPERTY_TYPE[]
  platforms     Platform[]
  properties    Property[]
  caseStudy     StudyCase[]
  createdAt     DateTime @default(now())
  deletedAt     DateTime? @map("deleted-at")
}
```

#### StudyCase
```typescript
model StudyCase {
  id                  String   @id @map("_id")
  projectId           String   @map("project-id")
  title               String
  refImages           String[] @map("ref-images")
  content             String
  targetAudience      String  @map("target-audience")
  pros                String
  cons                String
  hashtags            String?
  Market_Strategy     String
  Performance_Metrics String
  ROI_Calculation     String
  Strategic_Insights  String
  Recommendations     String
  Post_Frequency      String?
  prompt              String?
  caseStudyResponse   String?
  posts               Post[]
  deletedAt           DateTime? @map("deleted-at")
}
```

#### Post
```typescript
model Post {
  id             String           @id @map("_id")
  caseStudyId    String           @map("case-study-id")
  imageId        String?          @map("image-id")
  framedImageURL String?          @map("framed-image")
  title          String
  noOfWeeks      String           @map("no-of-weeks")
  content        String
  status         POST_STATUS      @default(PENDING)
  platform       PLATFORM
  contentLength  POST_CONTENT_LENGTH @map("content-length")
  campaignType   POST_CAMPAIGN   @map("campaign-type")
  createdAt      DateTime         @default(now())
  postAt         DateTime         @map("post-at")
  confirmedAt    DateTime?        @map("confirmed-at")
  deletedAt      DateTime?        @map("deleted-at")
}
```

#### Platform
```typescript
model Platform {
  id           String   @id @map("_id")
  projectId    String   @map("project-id")
  value        PLATFORM
  clientId     String?
  refreshToken String?
  urn          String?
}
```

### Enums
- **PLATFORM**: FACEBOOK, LINKEDIN, INSTAGRAM, TWITTER
- **PROPERTY_TYPE**: APARTMENT, VILLA
- **POST_CAMPAIGN**: BRANDING_AWARENESS, ENGAGEMENT, SALES_CONVERSION
- **POST_CONTENT_LENGTH**: SHORT, MEDIUM, LONG
- **POST_STATUS**: PENDING, CONFIRMED, PUBLISHED, SUSPENDED

## Authentication System

### Authentication Methods

#### 1. Google OAuth
- **Provider**: Arctic OAuth library
- **Scopes**: profile, email
- **Flow**: Authorization Code with PKCE
- **Callback**: `/api/auth/callback/google`

#### 2. Credential Authentication
- **Provider**: Lucia Auth
- **Method**: Email/Password with Argon2 hashing
- **Session Management**: Secure HTTP-only cookies

### Security Features
- **Session Validation**: Automatic session refresh
- **Secure Cookies**: HTTP-only, secure in production
- **Password Hashing**: Argon2 algorithm
- **CSRF Protection**: State parameter validation
- **Rate Limiting**: Built-in Next.js protection

## AI Integration

### OpenAI Integration
- **Model**: GPT-4
- **Function Calling**: Custom tools for project management
- **Content Generation**: Social media posts, case studies
- **Language Support**: Multi-language content creation

### AI Assistant Tools

#### 1. Project Management
- `createProject`: Create new real estate projects
- `deleteProject`: Remove projects and associated data
- `createCaseStudy`: Generate marketing case studies
- `deleteCaseStudy`: Remove case studies
- `createPost`: Generate social media posts
- `deletePost`: Remove posts

#### 2. Voice Interface
- **Speech Recognition**: Web Speech API
- **Text-to-Speech**: Browser-based synthesis
- **Wake Word**: "Hello" activation
- **Auto-completion**: 3-second delay for hands-free operation

### AI Content Generation
- **Post Ideas**: Platform-specific content suggestions
- **Case Studies**: Comprehensive marketing analysis
- **Image Prompts**: AI-generated visual content
- **Content Optimization**: Length and style adaptation

## Social Media Platform Integration

### Supported Platforms

#### 1. Facebook
- **Authentication**: OAuth 2.0
- **API**: Graph API
- **Features**: Post creation, scheduling, analytics

#### 2. LinkedIn
- **Authentication**: OAuth 2.0
- **API**: LinkedIn Marketing API
- **Features**: Professional content, company updates

#### 3. Instagram
- **Authentication**: OAuth 2.0
- **API**: Instagram Basic Display API
- **Features**: Visual content, stories, reels

#### 4. Twitter
- **Authentication**: OAuth 2.0
- **API**: Twitter API v2
- **Features**: Tweets, threads, media

### Platform Configuration
```typescript
interface PlatformConfig {
  value: PLATFORM;
  clientId: string;
  refreshToken: string;
  urn?: string; // LinkedIn specific
}
```

## API Endpoints

### Authentication Endpoints

#### Google OAuth
```
GET /api/auth/callback/google
- Handles Google OAuth callback
- Creates/updates user account
- Establishes user session
```

### External AI API Endpoints

#### Content Generation
```
POST http://takamol-advanced-ai-mu.vercel.app/shortcontent
- Generates short, medium, and long content
- Input: project title and post content
- Output: Content variations for different platforms
```

#### Social Media Posting

##### LinkedIn
```
POST {AI_API_DOMAIN}/linkedin-post
- Publishes content to LinkedIn
- Requires: text, access_token, urn
```

##### Twitter
```
POST {AI_API_DOMAIN}/twitter-post
- Publishes content to Twitter
- Requires: text, access_token
```

##### Facebook
```
POST {AI_API_DOMAIN}/facebook-post
- Publishes content to Facebook
- Requires: text, access_token
```

##### Instagram
```
POST {AI_API_DOMAIN}/instagram-post
- Publishes content to Instagram
- Requires: text, access_token
```

### Internal API Endpoints

#### Projects
```
GET /api/projects - List user projects
POST /api/projects - Create new project
PUT /api/projects/:id - Update project
DELETE /api/projects/:id - Delete project
```

#### Case Studies
```
GET /api/study-cases - List case studies
POST /api/study-cases - Create case study
PUT /api/study-cases/:id - Update case study
DELETE /api/study-cases/:id - Delete case study
```

#### Posts
```
GET /api/posts - List posts
POST /api/posts - Create new post
PUT /api/posts/:id - Update post
DELETE /api/posts/:id - Delete post
```

#### Properties
```
GET /api/properties - List properties
POST /api/properties - Create property
PUT /api/properties/:id - Update property
DELETE /api/properties/:id - Delete property
```

## How to Post on Platforms

### Step-by-Step Process

#### 1. Platform Connection
1. **Navigate to Project Settings**
2. **Select Social Media Platforms**
3. **Click "Connect" for each platform**
4. **Complete OAuth authentication**
5. **Verify connection status**

#### 2. Content Creation
1. **Create or select a Case Study**
2. **Choose campaign type**:
   - Branding Awareness (5 posts/week)
   - Engagement (5 posts/week)
   - Sales Conversion (3 posts/week)
3. **Select content length**:
   - Short: Quick engagement
   - Medium: Balanced content
   - Long: Detailed information
4. **Set posting schedule**:
   - Automatic: AI-determined optimal times
   - Manual: Custom date and time selection

#### 3. AI Content Generation
1. **Click "Generate Content"**
2. **AI analyzes case study and project details**
3. **Generates platform-specific content**
4. **Creates multiple post variations**
5. **Suggests optimal posting times**

#### 4. Post Scheduling
1. **Review generated content**
2. **Edit content if needed**
3. **Set posting dates and times**
4. **Confirm post details**
5. **Schedule for automatic publishing**

#### 5. Publishing Process
1. **Scheduler monitors scheduled posts**
2. **Automatically publishes at scheduled times**
3. **Handles platform-specific API calls**
4. **Updates post status to "PUBLISHED"**
5. **Logs publishing results**

### Platform-Specific Requirements

#### LinkedIn
- **URN**: Company or personal profile identifier
- **Content**: Professional tone, business-focused
- **Media**: Images, documents, articles
- **Timing**: Business hours (9 AM - 5 PM)

#### Facebook
- **Access Token**: Page or personal account token
- **Content**: Engaging, shareable content
- **Media**: Images, videos, live streams
- **Timing**: Evening hours (7 PM - 9 PM)

#### Twitter
- **Access Token**: App or user token
- **Content**: Concise, trending topics
- **Media**: Images, GIFs, videos
- **Timing**: Multiple times per day

#### Instagram
- **Access Token**: Business account token
- **Content**: Visual-first, aesthetic appeal
- **Media**: High-quality images, stories
- **Timing**: Lunch and evening hours

## Environment Variables

### Required Environment Variables

```bash
# Database
DATABASE_URL="mongodb://username:password@host:port/database"

# Authentication
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Base URLs
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NEXT_PUBLIC_SERVER_BASE_URL="http://localhost:3000"

# AI Services
NEXT_PUBLIC_OPENAI_API_KEY="your-openai-api-key"
NEXT_PUBLIC_AI_API="https://your-ai-api-domain.com"

# Google Services
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-google-maps-api-key"

# File Storage (DigitalOcean Spaces)
DO_SPACE_URL="https://lon1.digitaloceanspaces.com"
DO_SPACE_REGION="lon1"
DO_SPACE_ID="your-space-access-key"
DO_SPACE_SECRET="your-space-secret-key"
```

### Optional Environment Variables

```bash
# Development
NODE_ENV="development"
NEXT_PUBLIC_VERCEL_URL="your-vercel-url"

# Analytics
NEXT_PUBLIC_GA_ID="your-google-analytics-id"
```

## Deployment & Setup

### Prerequisites
- Node.js 18+ 
- MongoDB database
- Google OAuth credentials
- OpenAI API key
- Social media platform developer accounts

### Installation Steps

#### 1. Clone Repository
```bash
git clone <repository-url>
cd deal-ai
```

#### 2. Install Dependencies
```bash
yarn install
# or
npm install
```

#### 3. Environment Configuration
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

#### 4. Database Setup
```bash
# Generate Prisma client
yarn prisma generate

# Run database migrations
yarn prisma db push
```

#### 5. Development Server
```bash
yarn dev
# Application will be available at http://localhost:3000
```

#### 6. Production Build
```bash
yarn build
yarn start
```

### Deployment Platforms

#### Vercel (Recommended)
- **Automatic deployments** from Git
- **Edge functions** support
- **Global CDN** distribution
- **Environment variables** management

#### Other Platforms
- **Netlify**: Static site hosting
- **Railway**: Full-stack deployment
- **DigitalOcean App Platform**: Containerized deployment

## User Guide

### Getting Started

#### 1. Account Creation
1. **Visit the registration page**
2. **Choose authentication method**:
   - Google OAuth (recommended)
   - Email/Password
3. **Complete profile setup**
4. **Verify email (if applicable)**

#### 2. First Project Setup
1. **Click "Create New Project"**
2. **Fill in project details**:
   - Project title and description
   - Location information
   - Property types
   - Social media platforms
3. **Upload project assets**:
   - Logo image
   - PDF documents
4. **Save project configuration**

#### 3. Case Study Creation
1. **Navigate to project dashboard**
2. **Click "Create Case Study"**
3. **Define marketing parameters**:
   - Target audience
   - Market strategy
   - Performance goals
4. **Generate AI content**
5. **Review and customize**

#### 4. Content Management
1. **Access case study dashboard**
2. **Review generated content**
3. **Customize post details**
4. **Set posting schedules**
5. **Monitor publishing status**

### Advanced Features

#### AI Voice Assistant
1. **Say "Hello" to activate**
2. **Use voice commands**:
   - "Create a new project called..."
   - "Generate content for..."
   - "Schedule posts for..."
3. **Review AI responses**
4. **Confirm actions**

#### Content Optimization
1. **Analyze performance metrics**
2. **Adjust posting times**
3. **Optimize content length**
4. **A/B test different approaches**
5. **Track engagement rates**

#### Multi-Platform Management
1. **Centralized content creation**
2. **Platform-specific optimization**
3. **Unified scheduling interface**
4. **Performance analytics**
5. **Cross-platform insights**

### Best Practices

#### Content Strategy
- **Consistent posting schedule**
- **Platform-specific content**
- **Engaging visual elements**
- **Call-to-action inclusion**
- **Hashtag optimization**

#### Platform Optimization
- **LinkedIn**: Professional, business-focused
- **Facebook**: Engaging, community-oriented
- **Twitter**: Concise, trending topics
- **Instagram**: Visual, aesthetic appeal

#### Performance Monitoring
- **Regular analytics review**
- **Engagement rate tracking**
- **Content performance analysis**
- **Audience growth monitoring**
- **ROI measurement**

---

## Conclusion

Deal AI represents a comprehensive solution for real estate professionals seeking to leverage artificial intelligence for social media marketing. The platform combines cutting-edge AI technology with practical business tools, providing an intuitive interface for managing complex marketing campaigns across multiple social media platforms.

### Key Benefits
- **Time Savings**: Automated content generation and scheduling
- **Consistency**: Maintained brand presence across platforms
- **Intelligence**: AI-powered optimization and insights
- **Scalability**: Manage multiple projects and platforms
- **ROI Focus**: Data-driven marketing decisions

### Future Enhancements
- **Advanced Analytics**: Detailed performance insights
- **AI Image Generation**: Custom visual content creation
- **Multi-Language Expansion**: Additional language support
- **Mobile Application**: Native mobile experience
- **API Integration**: Third-party service connections

For technical support or feature requests, please refer to the project documentation or contact the development team.
