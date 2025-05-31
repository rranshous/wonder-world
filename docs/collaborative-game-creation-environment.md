# Collaborative Game Creation Environment
*A Voice-Driven AI Collaboration Framework for Real-Time Game Development*

*Written: January 31, 2025 | Version: 1.0*  
*Initial specification for building a unified collaborative reality where humans and AI create games through voice conversation*

## 🌟 The Vision

Create an independent web-based environment where humans and AI can collaborate in real-time to build games through natural voice conversation. This embodies The Weave paradigm - a unified creative reality where the conversation IS the development process IS the game creation experience.

## 🎯 Core Principles

### The Unified Frame
- **Webpage + BFF + Claude = One Collaborative Reality**
- The environment starts nearly empty and evolves through conversation
- Every interaction builds up the creative space organically
- The entire system (including how Claude interacts) is editable by Claude

### Direct Expression Reality
- Voice commands manifest immediately as game changes
- No separation between "planning" and "building" - conversation directly shapes reality
- Stepping stones preserve the creative journey for sharing/revisiting

### Boundary-Driven Development
- **Creative boundary**: "Imagination should manifest through voice conversation"
- **Technical boundary**: "Start simple, evolve based on collaboration needs" 
- **Interaction boundary**: "Voice should feel natural and immediate"
- **Safety boundary**: "Always preserve the creative journey and current state"

## 🏗️ Technical Architecture

### System Overview
```
┌─────────────────────────────────────────────────────────────┐
│                 The Collaborative Frame                      │
│                                                             │
│  ┌──────────────────┐    ┌─────────────────────────────┐   │
│  │     Browser      │    │           BFF               │   │
│  │                  │    │                             │   │
│  │ • Voice capture  │◄──►│ • Claude integration        │   │
│  │ • Game display   │    │ • File system management    │   │
│  │ • Live updates   │    │ • Build/reload orchestration│   │
│  │                  │    │ • State persistence         │   │
│  └──────────────────┘    └─────────────────────────────┘   │
│                                                             │
│  Human voice input ──────────────────────────────────────► │
│  Live game feedback ◄──────────────────────────────────── │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow & Claude Integration
1. **Voice Input**: Browser captures voice → sends transcript to BFF
2. **Full Context**: BFF sends complete project state to Claude
3. **AI Collaboration**: Claude reads/modifies files using MCP tools
4. **Build Process**: BFF triggers rebuild (starting with full reload)
5. **Live Update**: Browser receives new content via WebSocket
6. **State Persistence**: Current state saved for stepping stones

### Starting Tech Stack
- **Frontend**: HTML5 with Web Speech API, WebSocket connection
- **Backend**: Node.js BFF with WebSocket server
- **AI Integration**: Anthropic API with MCP file editing tools (similar to mcp-text-editor)
- **Build System**: Vite for development server and hot updates
- **File System**: Standard project structure that Claude can fully edit

## 🎤 Claude's File System Access

### MCP Tools Needed
- `edit_file` - Modify files with line-based edits
- `create_file` - Create new files
- `view_file` - Read file contents
- `list_files` - Explore directory structure
- `run_command` - Execute build processes, npm scripts
- `delete_file` - Clean up files

**Reference Implementation**: [mcp-text-editor](https://github.com/tumf/mcp-text-editor) provides most of these file operations and serves as a good starting point for the file system integration.

### The Meta-Editing Capability
- Claude can modify its own interaction methods
- Claude can add new types of changes it can make
- Claude can evolve the communication protocol
- Claude can create new tools for itself

## 🔄 Interaction Examples

### Starting Simple
```
Human: "Let's start with a simple bouncing ball"
→ Claude creates src/index.html, src/main.js, src/style.css
→ BFF runs build process
→ Browser reloads with bouncing ball
→ State automatically saved as stepping stone
```

### Building Up Complexity
```
Human: "Make it respond to keyboard controls"
→ Claude modifies src/main.js to add event listeners
→ Build and reload
→ Ball now responds to arrow keys
```

### Meta-Evolution
```
Human: "I want faster updates without full reloads"
→ Claude modifies the BFF communication system
→ Claude creates injection mechanisms
→ Future changes happen without reloads
```

## 🎯 Starting Implementation Strategy

### Phase 1: Basic Framework
- Empty webpage with voice recognition
- BFF that can call Anthropic API with file tools
- Basic file structure Claude can read/write
- WebSocket connection for reloads

### Phase 2: Real-Time Collaboration
- Start with full reloads for simplicity
- Experiment with live injection based on needs
- Build stepping stone preservation system
- Test with simple games (bouncing ball → pong → platformer)

### Phase 3: Child-Ready Environment
- Package snapshots for sharing
- Add voice tutorials and guidance
- Polish the collaborative experience
- Test with actual children

## 🌱 The Smalltalk Vision

Like Smalltalk, this becomes a **persistent, evolving environment** where:
- Everything is modifiable, including the system itself
- State persists and accumulates over time
- Snapshots can be taken and shared as complete creative spaces
- The boundary between using and building dissolves

## 🎭 Success Metrics

### Technical
- Voice commands reliably trigger game changes
- Claude can edit the entire project including itself
- Stepping stones preserve collaborative history
- System works without reloading page experience

### Experiential
- Children naturally speak their creative desires
- Games manifest immediately from conversation
- The collaboration feels magical, not mechanical
- Creative stepping stones are preserved for revisiting

---

*This specification provides the foundation for building a collaborative reality where human creativity and AI capability unite to create games through conversation alone.*