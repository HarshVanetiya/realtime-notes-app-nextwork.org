<img src="https://cdn.prod.website-files.com/677c400686e724409a5a7409/6790ad949cf622dc8dcd9fe4_nextwork-logo-leather.svg" alt="NextWork" width="300" />

# Build a Real-Time Notes App

**Project Link:** [View Project](https://learn.nextwork.org/projects/6a3a7ddb-254f-4f60-b724-7619e0096351)

**Author:** Harsh Vanetia  
**Email:** hvanetiya@gmail.com

---

![Image](https://learn.nextwork.org/elated_turquoise_agile_tangelo/uploads/6a3a7ddb-254f-4f60-b724-7619e0096351_kz6vakg0)

## Project Overview

### Goals and motivation

I am building a notes app using supabase and nextjs so that I can learn all features of supabase

## Scaffolding the Next.js App with Supabase

### Setting up the project

In this step, I'm setting up nextjs project with supabase template so that I can use cookie-based auth, TypeScript, Tailwind CSS, and pre-built UI components right out of the box.

![Image](https://learn.nextwork.org/elated_turquoise_agile_tangelo/uploads/6a3a7ddb-254f-4f60-b724-7619e0096351_c3omz2p4)

### What the template provides

The template gives me auth setup and pre configured ui and supabase which means I don't have to build supabase client and logic for authentication

## Designing a Secure Database with Row Level Security

### Creating the notes table

In this step, I'm setting up tables and RLS so that I can store data and only authorised user can see their own data

![Image](https://learn.nextwork.org/elated_turquoise_agile_tangelo/uploads/6a3a7ddb-254f-4f60-b724-7619e0096351_ayq9rybo)

### How Row Level Security protects user data

Row Level Security ensures that user without sufficient permissions cant fetch the data by checking auth.uid with tables user_id

## Building the Protected Notes Dashboard

### Dashboard architecture

In this step, I'm building UI. so that users can their own notes

### Secure authentication with getClaims()

I learned that getClaims() is used because it reads access token from storage and verify it cryptographically. Older method getSession does not do that 

## Enabling Real-Time Sync Across Tabs

### Setting up real-time subscriptions

In this step, I'm creating real time subscription for notes so that notes can noteslist component can sync data accross all tabs

![Image](https://learn.nextwork.org/elated_turquoise_agile_tangelo/uploads/6a3a7ddb-254f-4f60-b724-7619e0096351_3lubzu2p)

### Cleaning up subscriptions properly

The cleanup function calls supabase.removeChannel which prevents updation of another user's notes affecting current users list

## Adding Image Attachments with Supabase Storage

### Configuring the storage bucket

In this step, I'm setting up storage bucket so that I can store media for notes

![Image](https://learn.nextwork.org/elated_turquoise_agile_tangelo/uploads/6a3a7ddb-254f-4f60-b724-7619e0096351_kdongp7t)

### Per-user file isolation strategy

Each user's files are stored in a folder named their userId The policy ensures only user whom the folder is belongs to can access the media inside it

## Testing the Full-Stack App End to End

### Full flow verification

In this step, I'm testing complete app so that I can confirm all functionalities work correctly

### Confirming Row Level Security works

I verified RLS by creating a second account and observing that new account is not displaying other account's notes

## Secret Mission: Real-Time Favorites with Filtering

![Image](https://learn.nextwork.org/elated_turquoise_agile_tangelo/uploads/6a3a7ddb-254f-4f60-b724-7619e0096351_7l2w103v)

### Reusing the existing subscription for favorites

In this project extension, the existing subscription already handles updation of UI on change of fav status

## Reflections and Key Takeaways

### Tools and concepts learned

The key tools I used include supabase, vercel and vs code Key concepts I learnt include supabase storage, real-time, RLS and database tables

### Time and challenges

This project took me approximately 2hrs The most challenging part was real time subscription

### Final thoughts

I did this project today to learn how to leverage supabse to build full stack app. Another skill I want to learn is scalability.

---

*Built with [NextWork](https://learn.nextwork.org) - [View this project](https://learn.nextwork.org/projects/6a3a7ddb-254f-4f60-b724-7619e0096351)*
