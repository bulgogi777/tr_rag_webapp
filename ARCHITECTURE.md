# TR RAG WebApp Architecture

## Overview
A Next.js web application for PDF document management with summary generation capabilities. The application provides secure authentication, PDF upload and management, and automated summary generation features.

## Technical Stack
- **Framework**: Next.js 13+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui library
- **Authentication**: Firebase
- **Storage**: AWS S3
- **State Management**: React hooks and context
- **Analytics**: Vercel Analytics

## Directory Structure
```
tr_rag_webapp/
├── app/                    # Next.js 13+ App Router pages
│   ├── api/               # API routes for S3 operations
│   │   └── s3/           # S3-specific endpoints
│   ├── dashboard/        # Main dashboard page
│   ├── login/           # Authentication pages
│   ├── reset-password/  # Password reset functionality
│   └── summaries/       # PDF summary views
├── components/           # React components
│   ├── ui/             # Reusable UI components
│   ├── pdf-list.tsx    # PDF management component
│   ├── pdf-upload.tsx  # File upload component
│   └── site-header.tsx # Navigation header
├── hooks/               # Custom React hooks
│   ├── useAuth.ts      # Authentication hook
│   └── use-toast.ts    # Toast notifications
├── lib/                 # Utility functions and services
│   ├── firebase.ts     # Firebase configuration
│   ├── s3.ts          # S3 integration
│   └── utils.ts       # Helper functions
├── public/             # Static assets
└── styles/            # Global styles
```

## Core Features

### 1. Authentication System
- Email/password authentication via Firebase
- Protected route middleware
- Password reset functionality
- Session management

### 2. PDF Management
#### Upload Features
- Drag-and-drop interface
- Multiple file upload support
- Progress tracking
- File type validation
- Duplicate file detection
- S3 integration with pre-signed URLs

#### List Management
- Sortable by name and upload date
- Filtering capabilities:
  * All documents
  * Documents with summaries
  * Documents needing summaries
- Delete functionality for PDFs and associated summaries

### 3. Summary Generation
- Webhook-based processing
- Progress tracking
- Summary viewing interface
- Error handling and retry capabilities

## API Routes

### S3 Operations
- `/api/s3/upload-url`: Generate pre-signed URLs for uploads
- `/api/s3/list-pdfs`: Retrieve list of uploaded PDFs
- `/api/s3/delete-file`: Remove PDFs and summaries
- `/api/s3/get-summary`: Fetch generated summaries

## Security Features
- Protected routes requiring authentication
- Secure file upload using pre-signed URLs
- Firebase authentication integration
- Input validation and sanitization

## State Management
- React hooks for local state
- Context for authentication state
- Real-time updates for PDF list and summaries

## Error Handling
- Comprehensive error handling for:
  * File uploads
  * Authentication
  * API requests
  * Summary generation
- User-friendly error messages
- Automatic retries where appropriate

## UI/UX Features
- Responsive design
- Loading states and skeletons
- Toast notifications
- Progress indicators
- Confirmation dialogs
- Sorting and filtering capabilities
- Web analytics and tracking via Vercel Analytics
