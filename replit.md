# Overview

This is a full-stack AI chat application built with React, Express, and PostgreSQL. The application provides a ChatGPT-like interface for interacting with Ollama (local AI models). Users can create conversations, manage AI models, and customize chat settings through a modern web interface.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite with custom configuration for development and production
- **Component Structure**: Organized into pages, components (chat, modals, ui), hooks, and lib directories

## Backend Architecture
- **Runtime**: Node.js with TypeScript (ESM modules)
- **Framework**: Express.js for REST API
- **Database**: PostgreSQL with Drizzle ORM for schema management and queries
- **Storage Layer**: Abstracted storage interface with in-memory implementation for development
- **API Structure**: RESTful endpoints for conversations, messages, models, and settings
- **Development**: Hot reloading with Vite middleware integration

## Database Design
- **ORM**: Drizzle with PostgreSQL dialect
- **Schema Structure**:
  - `conversations`: Chat sessions with title, model, timestamps
  - `messages`: Individual chat messages with role (user/assistant) and content
  - `ollama_models`: Available AI models with metadata and availability status
  - `settings`: Key-value configuration storage with JSON values
- **Relationships**: Messages reference conversations with cascade delete
- **Migrations**: Managed through Drizzle Kit with schema-first approach

## Authentication & Authorization
- **Current State**: No authentication system implemented
- **Session Management**: Basic Express session handling prepared but not actively used
- **Security**: CORS configured for development environment

## AI Integration
- **Ollama Client**: Custom client for communicating with local Ollama API
- **Model Management**: Pull, delete, and list operations for AI models
- **Chat Streaming**: Prepared for real-time message streaming (implementation pending)
- **Default Configuration**: Localhost Ollama instance on port 11434

## Development Features
- **Hot Reloading**: Vite development server with Express middleware
- **Error Handling**: Runtime error overlay for development
- **Logging**: Request/response logging with duration tracking
- **TypeScript**: Strict type checking across frontend and backend
- **Path Aliases**: Configured for clean imports (@/ for client, @shared for shared types)

# External Dependencies

## Core Dependencies
- **@neondatabase/serverless**: PostgreSQL client for Neon database
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management and caching
- **express**: Node.js web framework
- **react**: Frontend UI library
- **wouter**: Lightweight React router

## UI & Styling
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **clsx**: Conditional className utility

## Development Tools
- **vite**: Build tool and development server
- **typescript**: Static type checking
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Fast bundling for production

## AI & External Services
- **Ollama API**: Local AI model inference (http://localhost:11434)
- **React Markdown**: Markdown rendering for AI responses
- **Prism**: Syntax highlighting for code blocks

## Database & Migration
- **drizzle-kit**: Database migration and introspection tools
- **connect-pg-simple**: PostgreSQL session store (prepared for future use)

## Utilities
- **date-fns**: Date manipulation and formatting
- **nanoid**: Unique ID generation
- **zod**: Runtime type validation and schema definition