# Games Platform Frontend

A minimal, vanilla TypeScript frontend for the multiplayer games platform with real-time WebSocket communication.

## Architecture

### Core Components

- **`main.ts`** - Application entry point and WebSocket management
- **`GamePortal.ts`** - Game selection and room joining interface  
- **`GameRoom.ts`** - Game room UI with real-time game state updates
- **`index.html`** - Main HTML template with responsive design
- **`styles.css`** - Modern CSS with animations and responsive breakpoints

### WebSocket Communication

The frontend uses a centralized WebSocket manager that handles:
- Automatic connection/reconnection with exponential backoff
- Message type routing to appropriate handlers
- Connection status display
- Error handling and user feedback

### Supported Games

The frontend includes renderers for:
- **Tic Tac Toe** - 3x3 grid with click-to-move
- **Connect Four** - Column-based drop mechanics
- **Rock Paper Scissors** - Choice selection with result history

## Build System

Custom TypeScript-to-JavaScript compiler with no external dependencies:

```bash
# Build once
npm run build

# Build and watch for changes  
npm run build:watch
npm run dev
```

### Build Features

- TypeScript-like syntax support (removes type annotations)
- Import/export resolution and bundling
- Single JavaScript file output (`src/static/bundle.js`)
- Development watch mode for rapid iteration

## File Structure

```
├── src/static/           # Static assets served by backend
│   ├── index.html        # Main HTML template
│   ├── styles.css        # CSS styles
│   └── bundle.js         # Compiled JavaScript bundle
├── frontend-src/         # TypeScript source files
│   ├── main.ts           # Application entry point
│   ├── GamePortal.ts     # Game selection interface
│   └── GameRoom.ts       # Game room functionality
├── build-scripts/        # Build tooling
│   └── build-frontend.js # Custom TypeScript compiler
└── package.json          # NPM scripts and metadata
```

## WebSocket Protocol

The frontend expects these message types from the backend:

### Outgoing Messages (Frontend → Backend)
- `create_room` - Create new game room
- `join_room` - Join existing room by code
- `leave_room` - Leave current room
- `make_move` - Submit game move
- `restart_game` - Request game restart

### Incoming Messages (Backend → Frontend)
- `room_created` - Room creation success
- `room_joined` - Successfully joined room
- `game_state_update` - Current game state
- `player_joined` - New player notification
- `player_left` - Player disconnection
- `game_started` - Game beginning
- `move_made` - Move processed
- `game_ended` - Game completion
- `error` - Error messages

## Features

### User Interface
- Clean, modern design with glass-morphism effects
- Responsive layout for mobile and desktop
- Real-time connection status indicator
- Toast notifications for errors and feedback
- Loading states and smooth transitions

### Game Room Management
- Room code generation and sharing
- Player list with ready status
- Game-specific board rendering
- Turn indication and game state display
- Restart functionality for completed games

### Error Handling
- WebSocket reconnection with exponential backoff
- User-friendly error messages with auto-dismiss
- Graceful degradation for connection issues
- Input validation and sanitization

## Development

The frontend is designed to be:
- **Framework-free** - Pure vanilla JavaScript/TypeScript
- **Lightweight** - No external dependencies
- **Modular** - Clear separation of concerns
- **Extensible** - Easy to add new game types

To add a new game:
1. Add game card to `index.html` games grid
2. Implement board renderer in `GameRoom.ts`
3. Add CSS styles in `styles.css`
4. Rebuild with `npm run build`

## Browser Support

Modern browsers with WebSocket support:
- Chrome 16+
- Firefox 11+
- Safari 7+
- Edge 12+

## Performance

- Single 23KB JavaScript bundle
- CSS-only animations for smooth 60fps
- Minimal DOM manipulation
- Efficient WebSocket message handling
- Responsive images and scalable vector graphics