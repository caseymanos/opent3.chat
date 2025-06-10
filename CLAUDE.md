# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multi-model AI chat application built with Next.js 15, Supabase, and the Vercel AI SDK. It supports conversation branching, real-time chat, and multiple AI providers (OpenAI, Anthropic, Google).

## Development Commands

- `npm run dev` - Start development server with Turbopack
- `npm run dev:debug` - Start with Node.js inspector
- `npm run dev:verbose` - Enable debug logging for Turbopack
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run setup` - Run setup script

## Architecture

### Core Components
- **Chat Interface**: Multi-model chat with conversation branching (`src/components/Chat*`)
- **Real-time Chat**: Supabase real-time subscriptions (`src/hooks/useRealtimeChat.ts`)
- **AI Integration**: Multi-provider AI support via Vercel AI SDK (`src/lib/ai.ts`)
- **Database**: Supabase with conversation branching support

### Database Schema
The app uses Supabase with these key tables:
- `conversations` - Chat conversations with model configuration
- `messages` - Individual messages with branching support via `parent_id` and `branch_index`
- `profiles` - User profiles
- `file_uploads` - File attachment support
- `chat_sessions` - Real-time session management

### AI Provider Support
Supports multiple AI providers with model switching:
- **OpenAI**: GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Opus/Sonnet/Haiku
- **Google**: Gemini Pro (configured but not fully implemented)

### Key Technical Features
- **Conversation Branching**: Messages can have multiple children via `parent_id` system
- **Real-time Updates**: Supabase real-time subscriptions for live chat
- **Multi-model Support**: Switch between AI providers mid-conversation
- **File Attachments**: Support for file uploads and processing
- **Authentication**: Supabase Auth with fallback to demo mode

## Environment Setup

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- AI provider API keys (OpenAI, Anthropic, Google)

## Database Setup

Run Supabase migrations:
```bash
# Apply schema
psql -f supabase/schema.sql

# Apply security policies
psql -f supabase/fix-policies.sql

# Seed demo data
psql -f supabase/seed.sql
```

## Development Notes

- Uses Turbopack for faster development builds
- Real-time subscriptions are simplified to avoid multiple channel errors
- Demo mode with mock user ID for development without auth
- Extensive logging via custom logger (`src/lib/logger.ts`)
- Type-safe database access with generated Supabase types