# County Game Specification

## Overview
A silly circle game where each player says a county name and everyone celebrates together with "Yay!"

## Game Flow

### Phase 1: WAITING
- Players join the room
- Host sees "Start Game" button
- Non-hosts see "Waiting for host to start..."
- Minimum 2 players required to start

### Phase 2: COUNTY_SUBMISSION
- **Duration**: 30 seconds
- **UI**: Single text input field
  - Placeholder: "Enter a county name..."
  - Submit button: "Submit County"
- Players type a county name (e.g., where they were born or live)
- After submitting: Show "County submitted! Waiting for others..."
- Cannot change county once submitted

### Phase 3: GAME_OVER
- Game ends when all players submit or timer expires
- Standard win screen displays with:
  - Title: "Yay!"
  - Winner: "Everyone!" (always)
  - Additional info: List of all counties submitted

## Technical Implementation

### Backend Messages

**Server → Client:**
```javascript
// Phase change
{ type: 'phase_changed', phase: 'COUNTY_SUBMISSION' | 'GAME_OVER' }

// Game over with everyone winning
{ 
  type: 'game_over',
  winner: 'Everyone!',
  additionalInfo: {
    counties: [
      { playerName: 'Alice', county: 'Cook County' },
      { playerName: 'Bob', county: 'King County' }
    ]
  }
}
```

**Client → Server:**
```javascript
// Submit county
{ type: 'submit_county', county: 'Cook County' }
```

### State Management

**Server State:**
```typescript
{
  phase: 'WAITING' | 'COUNTY_SUBMISSION' | 'GAME_OVER',
  counties: Map<playerId, string>,
  submissionEndTime: number // timestamp
}
```

### Rules
1. Each player submits exactly one county
2. County names are displayed in the win screen
3. Game automatically ends after 30 seconds or when all players submit
4. Everyone always wins - it's a celebration game!
5. New game requires creating a new room

## Error Handling
- If player disconnects during submission: Their county (if submitted) is kept for the win screen
- If all players disconnect: Game session ends
- Empty submissions not allowed

## MVP Exclusions
- No county validation (any text accepted)
- No duplicate checking
- No scoring or history
- No replay/rounds functionality
- No county facts or maps