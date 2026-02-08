# Catchphrase Quiz App

A Catchphrase-style quiz web app for a quiz master (phone) plus a clean "display" view for a big screen. Images (or videos) are covered by a 3x3 grid of squares that can be revealed one at a time.

## Features

- 3x3 grid overlay covering images
- Multiple reveal modes:
  - Manual: Tap specific squares to reveal
  - Random: Reveal random unrevealed squares
  - Sequence: Pre-define the order of reveals
  - Timer: Auto-reveal at set intervals
- Dual-view system:
  - Controller View (phone): Touch-optimized quiz master controls
  - Display View (big screen): Clean broadcast-quality presentation
- Optional video questions:
  - YouTube embed (stable) or direct MP4 URL
- LocalStorage persistence
- Multi-question support with navigation
- Reset functionality for questions or entire quiz
- Username-based quiz management

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000` (the dev server uses a fixed port).

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## How to Use

### Creating a Quiz

1. Click "Create New Quiz"
2. Enter your username
3. Enter a quiz name
4. Add image URLs for each question
5. Click "Create Quiz"

### Running a Quiz

1. From the Controller View on your phone:
   - Use "Open Display" to open the big screen view
   - Cast/mirror the Display tab to your TV/projector
   - Set reveal sequences using "Build Sequence"
   - Enable Timer Mode for automatic reveals
   - Use reveal controls to show squares
   - Navigate between questions

2. The Display View shows:
   - Full-screen image with grid overlay
    - Clean presentation perfect for mirroring
    - Question counter

> Note: Controller <-> Display sync uses `BroadcastChannel`, so it works between tabs/windows on the same device/browser profile (great for casting the Display tab). Cross-device control is not implemented.

### Loading a Saved Quiz

1. Click "Load Existing Quiz"
2. Enter your username
3. Select from your saved quizzes
4. Resume where you left off

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- React Router
- LocalStorage API

## Project Structure

```
catchphrase/
├── src/
│   ├── components/       # Reusable UI components
│   ├── contexts/         # React Context for state management
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Utility functions
│   ├── views/           # Page-level components
│   ├── App.jsx          # Main app component
│   └── main.jsx         # Entry point
├── public/              # Static assets
└── index.html          # HTML entry point
```

## Future Enhancements (Iteration 2)

- Video support with 10-second loops
- YouTube embedding with timestamp extraction
- Audio/soundtrack overlay
- Video clip extraction

## License

MIT
