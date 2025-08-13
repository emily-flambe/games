# Everybody Votes MVP Troubleshooting

## Problem Statement
The Everybody Votes game MVP is not working. Players can see the voting UI and click buttons, but clicking vote buttons does nothing - no transition to results screen.

## What Works
✅ Room creation  
✅ Game UI loads (shows "Time to Vote!" with Pizza/Burgers buttons)  
✅ Frontend vote button clicks are detected  
✅ Frontend sends vote messages via WebSocket  
✅ Dev server receives messages  

## What Doesn't Work
❌ Vote button clicks don't show results  
❌ No transition to "YOU WIN!" screen  
❌ Backend vote handling not working  

## Key Findings

### 1. Root Cause: Dev Server Message Handling
The issue is in `scripts/dev-server.js`. The dev server receives the `submit_vote` message but logs:
```
Unknown message type: submit_vote
```

### 2. Message Flow Problem
- Frontend sends: `{ type: 'submit_vote', data: { vote: 'Pizza' } }`
- Dev server receives it but doesn't know how to handle it
- Dev server should forward to Durable Object but doesn't
- Message gets dropped

### 3. Architecture Issue
The dev server acts as a proxy but only handles specific message types:
- `START_GAME` ✅
- `updateName` ✅  
- `chat_message` ✅
- `submit_vote` ❌ (falls to default case)

### 4. Backend Logs Show
```
WebSocket connection: /api/game/KH9PMQ/ws gameType: everybody-votes
Player player_i56d10799 joined session KH9PMQ
Host player_i56d10799 starting game: everybody-votes
Unknown message type: submit_vote  <-- THIS IS THE PROBLEM
Player player_i56d10799 disconnected from session KH9PMQ
```

## Attempted Fixes

### 1. Backend Vote Handling
- ✅ Fixed `EverybodyVotesGameSession.handleVote()` to read `data.data.vote`
- ✅ Added proper message type handling in `handleGameSpecificMessage()`
- ❌ Never gets called because dev server drops the message

### 2. Frontend Message Format
- ✅ Fixed frontend to send proper format: `{ type: 'submit_vote', data: { vote } }`
- ✅ Matches CheckboxGameModule pattern
- ❌ Still doesn't work because dev server issue

### 3. Dev Server Fix (Attempted)
- ✅ Added `handleVote()` method to dev server
- ✅ Added forwarding in default case for `submit_vote`
- ❌ Still testing, may have syntax/logic errors

## Next Steps (For Later)

1. **Fix Dev Server**: Complete the dev server vote handling fix
2. **Test Message Flow**: Verify messages reach the Durable Object
3. **Backend Integration**: Ensure EverybodyVotesGameSession processes votes correctly
4. **End-to-End Test**: Complete flow from vote → results

## Files Modified
- `src/durable-objects/EverybodyVotesGameSession.ts` - Backend vote handling
- `src/static/js/games/EverybodyVotesGameModule.js` - Frontend message format
- `scripts/dev-server.js` - Added vote forwarding (in progress)

## Key Code Locations
- Dev server message switch: `scripts/dev-server.js:453`
- Backend vote handler: `src/durable-objects/EverybodyVotesGameSession.ts:91`
- Frontend vote click: `src/static/js/games/EverybodyVotesGameModule.js:266`

The core issue is that the dev server proxy doesn't forward game-specific messages to Durable Objects.