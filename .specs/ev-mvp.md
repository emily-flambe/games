# Everybody Votes MVP Specification

## Overview
A simple voting game where all players vote on "Pizza or Burgers?", then see the results.

## Game Flow

### Phase 1: WAITING
- Players join the room
- Host sees "Start Game" button
- Non-hosts see "Waiting for host to start..."
- Minimum 2 players required to start

### Phase 2: VOTING
- **Duration**: 10 seconds
- **Question**: "Pizza or Burgers?"
- **UI**: Two large buttons side-by-side
  - Left button: "🍕 Pizza" 
  - Right button: "🍔 Burgers"
- Players click one option to vote
- After voting: Show "Vote submitted! Waiting for others..."
- Cannot change vote once submitted

### Phase 3: RESULTS
- **Duration**: Display indefinitely (game ends)
- **Display**:
  - Question at top
  - Bar chart showing vote percentages
  - Text: "Pizza: X votes (Y%)" and "Burgers: X votes (Y%)"
  - Winner announcement: "🏆 [Winner] wins!"
  - Tie handling: "🤝 It's a tie!"

## Technical Implementation

### Backend Messages

**Server → Client:**
```javascript
// Phase change
{ type: 'phase_changed', phase: 'VOTING' | 'RESULTS' }

// Voting phase data
{ type: 'voting_started', question: 'Pizza or Burgers?', options: ['Pizza', 'Burgers'], timeLimit: 10 }

// Results data
{ 
  type: 'game_results',
  question: 'Pizza or Burgers?',
  results: {
    'Pizza': 3,
    'Burgers': 2
  },
  totalVotes: 5,
  winner: 'Pizza' // or 'TIE'
}
```

**Client → Server:**
```javascript
// Submit vote
{ type: 'submit_vote', vote: 'Pizza' | 'Burgers' }
```

### State Management

**Server State:**
```typescript
{
  phase: 'WAITING' | 'VOTING' | 'RESULTS',
  question: 'Pizza or Burgers?',
  options: ['Pizza', 'Burgers'],
  votes: Map<playerId, 'Pizza' | 'Burgers'>,
  votingEndTime: number // timestamp
}
```

### Rules
1. Each player can vote exactly once
2. Votes are private until results phase
3. Game automatically transitions to RESULTS after 10 seconds
4. No replay - game ends after showing results
5. Host can start new game by creating new room

## Error Handling
- If player disconnects during voting: Their vote (if submitted) is kept
- If host disconnects: Game continues, new host assigned
- If < 2 players remain: Show "Not enough players"

## MVP Exclusions
- No predictions
- No multiple questions  
- No score tracking
- No replay functionality
- No custom questions