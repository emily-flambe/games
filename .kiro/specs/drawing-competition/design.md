# Design Document

## Overview

The Drawing Competition game extends the existing multiplayer game platform to support creative drawing competitions. The system leverages the current Cloudflare Workers + Durable Objects architecture with WebSocket connections for real-time synchronization. The game follows a structured flow through lobby, drawing, voting, and results phases, with support for different user roles and anonymous voting mechanisms.

## Architecture

### High-Level Architecture

The Drawing Competition game integrates with the existing platform architecture:

```
Frontend (TypeScript) ←→ WebSocket ←→ Cloudflare Worker ←→ Durable Objects
                                                              ├── SessionManager
                                                              └── GameSession (Drawing Competition)
```

### Core Components

1. **DrawingGameSession** (extends GameSession): Manages drawing competition state and flow
2. **DrawingCanvas**: Client-side drawing interface with touch/mouse support
3. **VotingSystem**: Anonymous voting mechanism with result tallying
4. **ImageStorage**: Handles drawing submission and retrieval
5. **TimerManager**: Synchronized countdown timers across all clients

### Game State Management

The drawing competition extends the base `GameState` interface with specific drawing game data:

```typescript
interface DrawingGameState extends GameState {
  type: 'drawing-competition';
  phase: 'lobby' | 'drawing' | 'submission' | 'voting' | 'results';
  prompt: string;
  timeLimit: number; // seconds
  drawings: DrawingSubmission[];
  votes: Vote[];
  results: GameResults;
  settings: DrawingGameSettings;
}
```

## Components and Interfaces

### 1. Drawing Game Session (Backend)

**Purpose**: Manages the complete drawing competition lifecycle
**Location**: `src/durable-objects/DrawingGameSession.ts`

**Key Responsibilities**:
- Phase management (lobby → drawing → voting → results)
- Timer synchronization across all clients
- Drawing submission handling and storage
- Anonymous voting system implementation
- Results calculation and distribution

**Core Methods**:
- `startDrawingPhase()`: Initiates drawing with synchronized timer
- `submitDrawing()`: Handles drawing submissions with validation
- `startVotingPhase()`: Transitions to anonymous voting
- `castVote()`: Processes votes with duplicate prevention
- `calculateResults()`: Tallies votes and determines winner

### 2. Drawing Canvas Component (Frontend)

**Purpose**: Provides drawing interface with basic tools
**Location**: `frontend-src/DrawingCanvas.ts`

**Features**:
- Touch and mouse input support
- Basic drawing tools (pen, eraser, color picker)
- Canvas size optimization for different devices
- Drawing export to base64/blob format
- Undo/redo functionality

**Interface**:
```typescript
interface DrawingCanvas {
  initialize(container: HTMLElement): void;
  setTool(tool: 'pen' | 'eraser'): void;
  setColor(color: string): void;
  setBrushSize(size: number): void;
  clear(): void;
  undo(): void;
  redo(): void;
  exportDrawing(): Promise<Blob>;
  isModified(): boolean;
}
```

### 3. Voting System

**Purpose**: Manages anonymous voting process
**Implementation**: Integrated into DrawingGameSession

**Key Features**:
- Anonymous display of submissions during voting
- Prevention of self-voting
- Real-time vote count updates for spectators
- Vote validation and duplicate prevention

### 4. Timer Manager

**Purpose**: Synchronizes countdown timers across all participants
**Implementation**: WebSocket-based synchronization

**Synchronization Strategy**:
- Server maintains authoritative timer
- Periodic sync messages (every 5 seconds)
- Client-side interpolation for smooth countdown
- Automatic submission when timer expires

### 5. Image Storage System

**Purpose**: Handles drawing submission storage and retrieval

**Storage Strategy**:
- Base64 encoding for small drawings
- Cloudflare R2 integration for larger images
- Temporary storage during game session
- Automatic cleanup after game completion

## Data Models

### Drawing Submission

```typescript
interface DrawingSubmission {
  id: string;
  playerId: string;
  imageData: string; // base64 or storage URL
  submittedAt: number;
  isLateSubmission: boolean;
  metadata: {
    canvasSize: { width: number; height: number };
    toolsUsed: string[];
    drawingTime: number; // milliseconds spent drawing
  };
}
```

### Vote

```typescript
interface Vote {
  id: string;
  voterId: string;
  submissionId: string;
  timestamp: number;
}
```

### Game Results

```typescript
interface GameResults {
  winner: {
    playerId: string;
    playerName: string;
    submissionId: string;
    voteCount: number;
  };
  rankings: Array<{
    playerId: string;
    playerName: string;
    submissionId: string;
    voteCount: number;
    rank: number;
  }>;
  totalVotes: number;
  votingParticipation: number; // percentage
}
```

### Drawing Game Settings

```typescript
interface DrawingGameSettings {
  timeLimit: number; // 30-300 seconds
  maxPlayers: number;
  allowSpectators: boolean;
  hostCanParticipate: boolean;
  promptSource: 'suggested' | 'custom';
  customPrompt?: string;
  canvasSize: { width: number; height: number };
  availableColors: string[];
  brushSizes: number[];
}
```

## Error Handling

### Client-Side Error Handling

1. **Connection Errors**: Graceful degradation with reconnection attempts
2. **Drawing Errors**: Canvas state recovery and error notifications
3. **Submission Errors**: Retry mechanism with user feedback
4. **Timer Sync Errors**: Fallback to local timer with warning

### Server-Side Error Handling

1. **Invalid Submissions**: Validation with detailed error messages
2. **Storage Failures**: Retry logic with fallback storage options
3. **Vote Validation**: Duplicate detection and fraud prevention
4. **Phase Transition Errors**: State recovery and participant notification

### Error Recovery Strategies

- **Drawing Loss Prevention**: Auto-save drawing state every 30 seconds
- **Vote Recovery**: Allow vote changes within 10-second window
- **Connection Recovery**: Rejoin game with preserved state
- **Data Corruption**: Fallback to previous valid state

## Testing Strategy

### Unit Tests

1. **Drawing Canvas Tests**:
   - Tool switching and drawing operations
   - Touch/mouse input handling
   - Export functionality
   - Undo/redo operations

2. **Game Session Tests**:
   - Phase transitions
   - Timer synchronization
   - Vote validation
   - Results calculation

3. **Voting System Tests**:
   - Anonymous submission display
   - Self-vote prevention
   - Vote tallying accuracy
   - Duplicate vote handling

### Integration Tests

1. **End-to-End Game Flow**:
   - Complete game session from lobby to results
   - Multi-player scenarios with different roles
   - Connection interruption and recovery
   - Timer synchronization across clients

2. **Real-time Communication**:
   - WebSocket message handling
   - State synchronization
   - Error propagation
   - Reconnection scenarios

### Performance Tests

1. **Canvas Performance**:
   - Drawing responsiveness on various devices
   - Memory usage during extended drawing sessions
   - Export performance for different image sizes

2. **Concurrent Users**:
   - Multiple simultaneous games
   - High-frequency drawing operations
   - Vote submission under load

### Browser Compatibility Tests

1. **Cross-browser Canvas Support**:
   - Chrome, Firefox, Safari, Edge
   - Mobile browsers (iOS Safari, Chrome Mobile)
   - Touch vs mouse input differences

2. **WebSocket Compatibility**:
   - Connection stability across browsers
   - Message handling consistency
   - Reconnection behavior

## Security Considerations

### Drawing Submission Security

- **Content Validation**: Basic image format validation
- **Size Limits**: Maximum canvas size and file size restrictions
- **Rate Limiting**: Prevent submission spam

### Voting Security

- **Anonymous Voting**: No player identity revealed during voting phase
- **Vote Integrity**: Cryptographic vote validation
- **Self-Vote Prevention**: Server-side validation
- **Duplicate Prevention**: One vote per player per game

### Data Privacy

- **Temporary Storage**: Drawings deleted after game completion
- **No Personal Data**: Only game-related data stored
- **Session Isolation**: Game data isolated between sessions

## Performance Optimizations

### Client-Side Optimizations

1. **Canvas Rendering**:
   - Efficient drawing algorithms
   - Minimal redraws
   - Optimized brush rendering

2. **Image Compression**:
   - Lossy compression for submissions
   - Progressive loading for voting phase
   - Thumbnail generation for quick display

### Server-Side Optimizations

1. **Memory Management**:
   - Efficient drawing data storage
   - Garbage collection for completed games
   - Connection pooling

2. **Network Optimization**:
   - Compressed WebSocket messages
   - Batched state updates
   - Efficient image transfer protocols

## Scalability Considerations

### Horizontal Scaling

- **Durable Objects**: Natural partitioning by game session
- **Load Distribution**: Session-based routing
- **Resource Isolation**: Independent game state management

### Resource Management

- **Memory Limits**: Maximum drawings per game
- **Storage Cleanup**: Automatic cleanup after game completion
- **Connection Limits**: Maximum players per game session

### Monitoring and Metrics

- **Game Completion Rates**: Track successful game completions
- **Performance Metrics**: Drawing response times, vote processing
- **Error Rates**: Connection failures, submission errors
- **User Engagement**: Drawing time, voting participation