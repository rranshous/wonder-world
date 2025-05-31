# Ultra-Minimal Collaborative Frame

This is the bootstrap seed - a self-modifying web application where you can type commands and Claude will modify the running files in real-time.

## Setup

1. Copy `.env.template` to `.env` and add your Anthropic API key:
   ```bash
   cp .env.template .env
   # Edit .env and add your ANTHROPIC_API_KEY
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Open http://localhost:3000

## First Test

Type: "change the background to blue"

Watch as Claude modifies the CSS file and the page reloads with a blue background!

## How It Works

- You type a command in the web interface
- The command gets sent to Claude via the Anthropic API
- Claude reads all the current files and decides what to modify
- The files get updated on disk
- The page reloads to show the changes

This creates a **self-modifying collaborative loop** that can grow into anything through conversation.

## Evolution Path

Once this works, you can say things like:
- "Add voice recognition"
- "Create a game area" 
- "Add a bouncing ball"
- "Make it respond to keyboard controls"

The system evolves itself through collaboration!
