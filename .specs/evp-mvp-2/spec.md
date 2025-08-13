# Everybody Votes Multi-Round Specification (EVP MVP 2)

## Overview
Extend the current single-question Everybody Votes game to support multiple rounds of voting with results displayed between each question.

## Current State Analysis
- **Existing**: Single question with voting → prediction → results flow
- **Game Phases**: `waiting`, `voting`, `predicting`, `results`, `ended`
- **State Management**: Server-authoritative with client predictions

## Multi-Round Extension

### Core Changes

#### 1. Round Management
- Add `currentRound` and `totalRounds` to game state
- Default to 3 rounds for initial implementation
- Track scores across all rounds

#### 2. Enhanced Game Flow
```
Round 1: voting → predicting → results → [continue]
Round 2: voting → predicting → results → [continue]  
Round 3: voting → predicting → results → [final results]
```

#### 3. New Game Phases
- **Existing**: `waiting`, `voting`, `predicting`, `results`, `ended`
- **New**: `round_transition` (between rounds)
- **Modified**: `results` displays round results + option to continue
- **Enhanced**: `ended` shows final multi-round summary

#### 4. Question Management
- Store array of questions in game state
- Simple hardcoded questions initially (3 default questions)
- Cycle through questions by round index
- Architecture ready for future dynamic question loading

#### 5. Scoring System
- Track correct predictions per player across all rounds
- Display running totals during round transitions
- Final leaderboard shows cumulative scores

#### 6. State Structure Changes
```typescript
// Add to existing game state
interface EverybodyVotesState {
  // ... existing fields
  currentRound: number;        // 1-based indexing
  totalRounds: number;         // default: 3
  questions: Question[];       // array of all questions
  roundResults: RoundResult[]; // results from completed rounds
  finalScores: PlayerScore[];  // cumulative scores
}
```

### User Experience

#### Round Transition Flow
1. **Round Results**: Show current round voting results + predictions accuracy
2. **Score Update**: Display updated running scores
3. **Continue Button**: Host clicks "Next Round" (or auto-advance after delay)
4. **New Question**: Next round begins with new question

#### Final Results
- Show all round results in summary
- Display final leaderboard with total correct predictions
- Option to start new game with same players

### Technical Implementation Notes

#### Minimal Code Changes
- Extend existing `handleGameSpecificMessage()` for round management
- Add `advanceToNextRound()` method to EverybodyVotesGameSession
- Reuse existing voting/prediction logic per round
- Extend frontend GameModule for multi-round UI

#### Message Protocol Extensions
- **Existing**: All current messages remain unchanged
- **New**: `advance_round`, `round_results`, `final_summary`
- **Enhanced**: `gameState` includes round information

#### Backward Compatibility
- Single-round games still work (totalRounds = 1)
- Existing message handlers unchanged
- Progressive enhancement approach

### Future Extensibility

#### Easy Extensions
- **Dynamic Questions**: Replace hardcoded array with API/database
- **Custom Round Count**: Host selects 1-10 rounds
- **Question Categories**: Different question types/themes
- **Time Limits**: Add timers per round
- **Power-ups**: Special voting mechanics per round

#### Architecture Benefits
- Question management abstracted from game logic
- Round state isolated from voting mechanics
- Scoring system ready for complex point calculations
- UI components reusable across different question types

### Success Criteria
1. **Seamless Flow**: Rounds transition smoothly without confusion
2. **Clear Progress**: Players always know current round and total
3. **Engaging Results**: Each round feels complete but builds toward finale
4. **Simple Extension**: Adding new questions requires minimal code changes
5. **Performance**: No degradation with multiple rounds of state

## Implementation Priority
This specification maintains the core simplicity of the MVP while creating a solid foundation for rich multi-round gameplay experiences.

### Phase 1: Core Multi-Round
- 3 hardcoded questions
- Basic round progression
- Simple scoring system

### Phase 2: Enhanced UX
- Improved transitions
- Better result displays
- Score animations

### Phase 3: Extensibility
- Dynamic question loading
- Configurable round counts
- Advanced scoring options