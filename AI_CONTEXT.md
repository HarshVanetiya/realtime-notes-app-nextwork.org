# Project Context: Real-Time Notes App

## Overview
This is a full-stack Next.js web application built to learn and demonstrate Supabase features. It's a real-time note-taking app where users can create, view, edit, and favorite notes, as well as attach images to them. 

## Technology Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives (shadcn/ui style) and Lucide React icons
- **Backend/Database as a Service**: Supabase
- **Authentication**: Supabase Auth (Cookie-based via `@supabase/ssr`)
- **Language**: TypeScript

## Key Features & Architecture

### 1. Authentication (`app/auth/*`, `components/*-form.tsx`)
- Full auth flow implemented: Login, Sign up, Forgot Password, Update Password, and Email Confirmation.
- Uses `getClaims()` for secure authentication verification.

### 2. Database & Security
- **Row Level Security (RLS)**: Tables are secured using RLS so users can only access their own data (`auth.uid() = user_id`).
- **Data Model**: Primarily revolves around a `notes` table.

### 3. Real-Time Sync (`components/NotesList.tsx`)
- Implements Supabase Realtime subscriptions to sync note updates (create, update, delete, favorite status) across multiple browser tabs or clients.
- Proper cleanup of subscriptions is implemented to prevent memory leaks and unintended data bleeding.

### 4. Storage (`components/NoteForm.tsx`, `components/NoteCard.tsx`)
- Uses Supabase Storage for image attachments.
- Follows a per-user file isolation strategy (files stored in folders named after the user's ID) protected by RLS policies.

## Project Structure
- `/app`: Next.js App Router pages and layouts.
  - `/app/auth`: Authentication routes.
  - `/app/notes`: Protected notes dashboard and note creation pages.
- `/components`: React components.
  - `NoteCard.tsx`: Display individual notes.
  - `NoteForm.tsx`: Form for creating/editing notes with image upload.
  - `NotesList.tsx`: Handles rendering the list of notes and real-time subscriptions.
  - `/components/ui`: Reusable primitive components (likely from shadcn/ui).
- `/lib/supabase`: Supabase configuration and clients.
  - `client.ts`: Browser client.
  - `server.ts`: Server client (using cookies).
  - `proxy.ts`: Potentially for routing Supabase requests.

## Development Guidelines for AIs
- **CRITICAL: Provide code snippets, instructions, and explanations to guide the user rather than directly editing files unless the user specifically asks you to edit the codebase.**
- Ensure any database interactions use the appropriate Supabase client (Server client for Server Components/Actions, Browser client for Client Components).
- Respect the existing Tailwind CSS styling and Radix UI components.
- Any new features involving database tables MUST include RLS policies.
- For real-time features, ensure channels are properly created and removed on unmount.
