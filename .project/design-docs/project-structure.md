# Project Structure - Games Platform

## Overview
This is a minimal multiplayer games platform built on Cloudflare Workers with WebSocket support. The platform uses a shared waiting room architecture where all games share the same multiplayer infrastructure.

## Critical Architecture Facts

### 🚨 Universal Waiting Room System
**ALL GAMES USE THE SAME WAITING ROOM** - This is a core architectural decision that must be preserved:
- Universal player controls (name/emoji selection) work across all game types
- Shared WebSocket connection handling via `/api/game/{sessionId}/ws`
- Common player state management (connection status, host assignment)
- Unified room joining/leaving functionality

### File Structure
```
games/
├── src/static/
│   ├── app.js          # Main client-side game logic (1048 lines)
│   ├── index.html      # Single-page application with all game UIs
│   └── styles.css      # Unified styling for all games
├── dev-server.js       # Development server
├── package.json        # Node.js dependencies
├── wrangler.toml       # Cloudflare Workers configuration
└── test_*.js           # Testing utilities
```

### Game Client Architecture (app.js:5-1043)
- **Single GameClient class** handles all game types
- **Universal initialization**: All games show player controls (`src/static/app.js:136-138`, `158-160`)
- **Game-specific branching**: Conditional logic based on `this.gameType`
- **Shared WebSocket**: One connection per room regardless of game type

### Game Type Support
Currently implemented:
- ✅ **checkbox-game**: Full implementation with real-time state sync
- 🚧 **tic-tac-toe**, **rock-paper-scissors**, **connect-four**, **drawing**: UI defined but logic pending

### WebSocket Message Types
Standard message types used across all games:
- `player_identity`, `host_assigned`, `name_changed`, `emoji_changed`
- `player_joined`, `playerLeft`, `game_state`, `playerUpdated`
- Game-specific: `checkbox_toggled` (checkbox-game)

### UI Components

#### Universal Components (Always Present)
- Game portal with game selection cards (`src/static/index.html:17-64`)
- Player controls section (`src/static/index.html:76-100`)
- Players list with host indicators (`src/static/index.html:102-108`)
- Room code display and leave functionality

#### Game-Specific Components
- **Checkbox Game Board** (`src/static/index.html:110-120`): Hidden by default, shown on game start
- **Drawing Controls** (`src/static/index.html:122-135`): Complete UI, awaiting backend
- Other games: UI cards exist, boards need implementation

### Emoji System
- **Animal emojis only**: Curated list of 80 animal emojis (`src/static/app.js:526-535`)
- **Collision prevention**: Used emojis are disabled for other players
- **Floating animations**: Background emoji animations for all connected players
- **Positioning system**: Critical positioning code for emoji picker (`src/static/app.js:606-636`)

### Critical Code Sections (DO NOT MODIFY)

#### Emoji Picker Positioning (`src/static/app.js:606-636`)
```javascript
// CRITICAL: Move picker to body to escape parent container stacking contexts
// CRITICAL: Use setProperty with 'important' to force override CSS conflicts
```
This code has specific positioning fixes and should not be modified without understanding the stacking context issues.

#### Checkbox Game State Sync (`src/static/app.js:285-291`)
The checkbox game uses real-time state synchronization that must be preserved when adding new games.

### Room Management
- **6-character room codes**: Uppercase alphanumeric
- **Active rooms API**: `/api/active-rooms` endpoint
- **Auto-cleanup**: Inactive rooms are managed server-side
- **Manual join**: Direct room code entry
- **Quick join**: Click active room buttons

### Development Server
- **Local development**: `npm run dev` (port configuration in dev-server.js)
- **Static file serving**: Serves `src/static/` directory
- **Cloudflare Workers**: Production deployment via `wrangler deploy`

### Testing Infrastructure
- `test_websocket.js`: WebSocket connection testing
- `test_multiplayer.js`: Multiplayer functionality testing  
- `test-host-ui.js`: Host interface testing

## Regression Prevention Guidelines

### ⚠️ When Adding New Games:
1. **Never break the universal waiting room** - all games must use the shared player controls
2. **Follow the existing pattern**: Initialize in `startGame()`, show controls, handle game-specific logic in branching
3. **Preserve WebSocket message handling** for universal messages
4. **Add game-specific UI** to `index.html` with `display: none` by default
5. **Use consistent game type naming**: lowercase-with-hyphens

### ⚠️ When Modifying UI:
1. **Test emoji picker positioning** across different screen sizes
2. **Verify player controls** work across all game types  
3. **Check floating emoji animations** don't break
4. **Ensure room joining/leaving** works universally

### ⚠️ When Changing WebSocket Logic:
1. **Test with multiple games** - changes affect all game types
2. **Verify host assignment** works correctly
3. **Check state synchronization** for existing games
4. **Test connection recovery** scenarios

## Future Expansion Notes
- Game-specific boards can be added to `index.html` following the checkbox game pattern
- New WebSocket message types should be documented here
- Server-side game logic expansion should maintain the room-agnostic architecture
- Consider game state persistence requirements for more complex games

---
*Created: 2025-08-10*  
*Purpose: Prevent regressions in shared waiting room architecture*