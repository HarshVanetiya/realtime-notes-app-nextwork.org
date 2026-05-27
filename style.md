# Design AI Prompt: Flat Minimalist Realtime Notes Workspace

Use this specification to generate, build, or style the user interface for the **Realtime Notes App**. The design language is strictly flat, modern, minimalist, and highly structured, relying on clean border definitions and subtle shadows rather than gradients or glowing effects.

---

## Global Design Tokens (Theme System)

### 1. Color Palette (Light & Dark Themes)
- **Light Theme (Clean White & Slate-Gray):**
  - `Background`: Clean slate white (`hsl(220 20% 97%)`)
  - `Foreground (Text)`: Deep charcoal (`hsl(224 40% 12%)`)
  - `Card Background`: Pure white (`hsl(0 0% 100%)`)
  - `Border`: Soft gray (`hsl(220 13% 88%)`)
  - `Muted / Secondary`: Muted gray (`hsl(220 14% 93%)` with text `hsl(220 15% 50%)`)
  - `Primary Accent`: Soft Indigo (`hsl(243 75% 59%)`)
  - `Primary Foreground`: White (`hsl(0 0% 100%)`)
  - `Favorite Accent`: Amber yellow (`hsl(45 90% 50%)`)

- **Dark Theme (Deep Navy & Indigo-Gray):**
  - `Background`: Deep navy/indigo canvas (`hsl(224 39% 7%)`)
  - `Foreground (Text)`: Off-white (`hsl(213 31% 91%)`)
  - `Card Background`: Slate navy (`hsl(225 35% 10%)`)
  - `Border`: Subtle dark navy line (`hsl(225 25% 18%)`)
  - `Muted / Secondary`: Slate gray (`hsl(225 28% 14%)` with text `hsl(215 20% 55%)`)
  - `Primary Accent`: Vibrant Indigo-Purple (`hsl(243 75% 65%)`)
  - `Primary Foreground`: White (`hsl(0 0% 100%)`)

### 2. Typography
- **Font Family**: Modern sans-serif (`Inter`, system font stack) with enabled font-features (`cv11`, `ss01`) for crisp letter spacing and clean numbers.
- **Font Scale**: 
  - Titles: Large, tracking-tight (`tracking-tight font-extrabold text-4xl sm:text-5xl`)
  - Headers: Semi-bold, readable (`font-semibold text-lg`)
  - Body: Leading-relaxed, legible (`text-sm leading-relaxed`)
  - Captions/Subtext: Small, muted (`text-xs text-muted-foreground`)

### 3. Borders & Shadows (Strictly Flat Elevation)
- **Border Radius**: Soft rounded corners (`var(--radius)` = `0.75rem` / `12px`).
- **Shadows**:
  - Cards / Normal State: Soft flat shadow (`shadow-sm` / `0 1px 2px rgba(0,0,0,0.05)`)
  - Active Elements / Hover: Mild shadow elevation (`shadow-md` / `0 4px 6px rgba(0,0,0,0.07)`)
  - **No Gradients, No Glowing Filters, No Blurred Color Drops.**

---

## Workspace Layout & Shell

The layout consists of a **Sticky Navigation Sidebar** on the left and a **Main Content Container** on the right.

### 1. Left Sidebar Component (`AppSidebar`)
- **Hover-Expand / Collapsible Behavior (Supabase Style)**:
  - By default on desktop, the sidebar collapses to a narrow vertical rail (`w-[70px]`).
  - When hovered over, it expands smoothly with a transition (`transition-all duration-300 ease-in-out`) to its full width (`w-64`) and floats over the main content (applying `z-40 shadow-lg`), preventing layout shifts on the page.
- **Brand Logo Header**: Flat solid Indigo `bg-primary` icon box (Lucide `NotebookPen`). When expanded, it displays a clear "Realtime Notes" title and subtitle. When collapsed, the text container is smoothly hidden (`opacity-0 w-0 pointer-events-none`).
- **Navigation Links**: Vertical stack of links (e.g., "My Notes", "Create Note") using Lucide icons.
  - *Collapsed State*: Shows only the centered icon with normal sizing.
  - *Expanded State*: Shows the icon and the text label with a smooth fade-in.
  - *Active State*: Subtle background tint (`bg-primary/10` with text `text-primary`) and a thin vertical accent bar on the left edge.
- **User Avatar / Profile (Bottom)**:
  - *Collapsed State*: Displays user initials in a centered, soft `bg-primary/10 text-primary` circle.
  - *Expanded State*: Expands to show email address, sign-in status, and an inline Logout button (fading in on hover).

### 2. Global Header Component (`AppHeader`)
- **Sticky Banner**: Stays at the top of the main container, uses translucent glassmorphism (`bg-background/80 backdrop-blur-md`) with a thin bottom border.
- **Left**: Dynamic Page Title and descriptive subtext.
- **Center (Search Bar)**: Minimal search input with a magnifying glass icon. Soft border that changes color on focus.
- **Right**: Theme Switcher button (Toggle between Light/Dark modes) and optional contextual action buttons.

---

## Core Pages

### 1. Notes Dashboard (`/notes`)
- **Main Action Button**: Prominent flat primary button (`bg-primary text-primary-foreground`) to create a new note.
- **Filter Tabs**: Solid tabs ("All Notes" and "Favorites") with item counts next to them. Active tab has a flat solid background matching the canvas color.
- **Grid Layout**: A responsive 1 to 4 column card grid showing the user's notes.
- **Empty States**: Centered illustration card with Lucide icons (BookOpen or Star), clean headings, and a clear call-to-action button to prompt note creation.

### 2. Create / Edit Note Page (`/notes/create`)
- **Layout**: Centered, standard single-column page container.
- **NoteForm Card**:
  - **Title Field**: A large, borderless input with a thin underline border that highlights on focus.
  - **Block Editor**: Notion-style text editor with support for blocks, lists, headings, and embedded media.
  - **Image Attachment Drag Zone**: A dashed border box displaying a Lucide Upload icon. Highlights on drag-over, and shows image previews with a hover-delete button when an image is attached.
  - **Actions**: Flat "Save Note" and "Cancel" buttons at the bottom.

### 3. Individual Note Detail Page (`/notes/[id]`)
- **Cover Banner**: If the note has an image, it renders as a crisp, flat header cover banner image container with a fixed height and smooth corner radiuses.
- **Back Button**: A clean text link with a Lucide ArrowLeft icon.
- **Title**: Large, bold heading.
- **Content Area**: Renders the complete BlockNote layout with responsive width scaling.

---

## Core Interactive Components

### 1. Note Card Component (`NoteCard`)
- **Container**: A rounded card with a thin border. Hovering raises the card slightly (`shadow-md`) and dims the borders.
- **Header**: Shows the note title and hidden hover actions (Lucide Star and Trash icons).
- **Favorite Indicators**: 
  - *Stripe*: If favorited, a thin, solid amber line (`bg-amber-400`, height `2px`) runs across the top of the card.
  - *Border/Bg*: The card border becomes amber-tinted (`border-amber-400/60`) and takes a very soft amber background tint (`bg-amber-500/[0.02]`).
- **Body & Media Preview**: Extracts the first block of plain-text from the editor JSON and crops it to 3 lines max. If a cover photo exists, it displays at the top of the card with a flat dividing border.
- **Footer**: Displays relative timestamp ("2h ago", "Just now") and a small badge indicator for favorited items.

### 2. Floating Note Window System (`NoteWindow`)
- **Draggable & Resizable Window**: Renders floating on top of the dashboard, allowing users to view notes in side-by-side windows.
- **Visual Frame**: Rounded corner card (`rounded-xl`) with a flat borders and a clean `shadow-lg` shadow.
- **Window Header**: Acts as the drag handle.
  - *macOS traffic lights*: Three colored circles in a row (Red `bg-red-500` to close, Yellow `bg-yellow-500` to minimize, Green `bg-green-500` to navigate to the full page).
  - *Title*: Center-aligned note title.
- **Body**: Scrollable container displaying the note text and cover attachment.

### 3. Minimized Windows Dock
- **macOS Style Dock**: Sticks to the bottom center of the dashboard.
- **Container**: Rounded pill box (`bg-background/80 backdrop-blur-lg border border-border/50 shadow-lg`) containing circular note icons.
- **Behavior**: Minimized note buttons hover upwards and display a tooltip on hover. Clicking them restores the draggable window back to its active state.
