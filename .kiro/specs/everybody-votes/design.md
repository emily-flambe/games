# Design Document

## Overview

The Everybody Votes game is a multiplayer voting and prediction game that integrates with the existing games platform architecture. Players answer two-choice questions, predict which answer will be more popular, and view results broken down by demographics. The game follows the established GameModule pattern and uses the existing Durable Objects infrastructure for real-time multiplayer functionality.

## Architecture

### High-Level Architecture

The Everybody Votes game follows the existing three-layer architecture:

1. **Client Layer**: EverybodyVotesGameModule extending the base GameModule
2. **Session Management**: Enhanced GameSession Durable Object with voting-specific state
3. **Backend Services**: Cloudflare Workers handling WebSocket connections and static assets

### Integration Points

- **GameModule System**: Implements the standard GameModule interface for seamless integration
- **WebSocket Communication**: Uses existing message-based communication patterns
- **Durable Objects**: Extends current GameSession with voting-specific state management
- **Player Management**: Leverages existing player/spectator system with demographic extensions

## Components and Interfaces

### Frontend Components

#### EverybodyVotesGameModule
```javascript
class EverybodyVotesGameModule extends GameModule {
  // Core game state
  currentQuestion: Question | null
  gamePhase: 'lobby' | 'demographics' | 'voting' | 'prediction' | 'results'
  playerDemographics: Map<string, Demographics>
  votes: Map<string, VoteData>
  predictions: Map<string, PredictionData>
  results: VotingResults | null
  
  // Question management
  questionSets: QuestionSet[]
  customQuestions: Question[]
  playerSubmittedQuestions: Question[]
  
  // UI state
  demographicsForm: DemographicsForm
  votingInterface: VotingInterface
  resultsDisplay: ResultsDisplay
  predictionAccuracyTracker: AccuracyTracker
}
```

#### UI Components
- **DemographicsForm**: Optional demographic data collection interface
- **VotingInterface**: Two-choice question display and voting controls
- **PredictionInterface**: Interface for predicting popular choice
- **ResultsDisplay**: Demographic breakdowns and prediction accuracy visualization
- **QuestionManagement**: Host interface for question selection and player question moderation

### Backend Components

#### Enhanced GameSession State
```typescript
interface EverybodyVotesGameState {
  // Base game state
  type: 'everybody-votes'
  status: 'waiting' | 'demographics' | 'voting' | 'prediction' | 'results' | 'finished'
  
  // Question management
  currentQuestion: Question | null
  questionQueue: Question[]
  questionIndex: number
  playerQuestionSubmissionEnabled: boolean
  pendingPlayerQuestions: Question[]
  
  // Player data
  playerDemographics: Record<string, Demographics>
  votes: Record<string, VoteData>
  predictions: Record<string, PredictionData>
  predictionAccuracy: Record<string, AccuracyStats>
  
  // Results
  currentResults: VotingResults | null
  gameHistory: QuestionResult[]
  
  // Settings
  gameSettings: EverybodyVotesSettings
}
```

#### Message Types
```typescript
// Client to Server
type ClientMessage = 
  | { type: 'submit_demographics', data: Demographics }
  | { type: 'submit_vote', data: { questionId: string, choice: 'A' | 'B' } }
  | { type: 'submit_prediction', data: { questionId: string, prediction: 'A' | 'B' } }
  | { type: 'submit_player_question', data: Question }
  | { type: 'host_approve_question', data: { questionId: string, approved: boolean } }
  | { type: 'host_next_phase', data: { phase: GamePhase } }
  | { type: 'host_select_question_set', data: { questionSetId: string } }

// Server to Client  
type ServerMessage =
  | { type: 'phase_changed', data: { phase: GamePhase, question?: Question } }
  | { type: 'voting_results', data: VotingResults }
  | { type: 'prediction_accuracy_update', data: AccuracyStats }
  | { type: 'player_question_submitted', data: { question: Question, playerId: string } }
  | { type: 'demographic_stats_update', data: DemographicStats }
```

## Data Models

### Core Data Structures

#### Question
```typescript
interface Question {
  id: string
  text: string
  choiceA: string
  choiceB: string
  source: 'preset' | 'host' | 'player'
  submittedBy?: string
  approved?: boolean
  category?: string
}
```

#### Demographics
```typescript
interface Demographics {
  gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say'
  timezone?: string
  team?: 'A' | 'B'
  ageRange?: '18-24' | '25-34' | '35-44' | '45-54' | '55+'
  region?: string
}
```

#### VoteData
```typescript
interface VoteData {
  questionId: string
  choice: 'A' | 'B'
  timestamp: number
  demographics?: Demographics
}
```

#### PredictionData
```typescript
interface PredictionData {
  questionId: string
  prediction: 'A' | 'B'
  timestamp: number
  correct?: boolean
}
```

#### VotingResults
```typescript
interface VotingResults {
  questionId: string
  totalVotes: number
  choiceAVotes: number
  choiceBVotes: number
  choiceAPercentage: number
  choiceBPercentage: number
  winningChoice: 'A' | 'B'
  demographicBreakdowns: DemographicBreakdown[]
  predictionAccuracy: PredictionAccuracyResults
}
```

#### DemographicBreakdown
```typescript
interface DemographicBreakdown {
  category: 'gender' | 'timezone' | 'team' | 'ageRange' | 'region'
  groups: Array<{
    value: string
    choiceAVotes: number
    choiceBVotes: number
    choiceAPercentage: number
    choiceBPercentage: number
    totalVotes: number
  }>
  significantDifferences: Array<{
    group1: string
    group2: string
    difference: number
    category: string
  }>
}
```

### Question Management

#### QuestionSet
```typescript
interface QuestionSet {
  id: string
  name: string
  description: string
  questions: Question[]
  category: string
}
```

#### Preset Question Sets
- **Pop Culture**: Entertainment, celebrities, trends
- **Food & Lifestyle**: Preferences, habits, choices
- **Technology**: Gadgets, platforms, digital life
- **Would You Rather**: Classic dilemma questions
- **Current Events**: Topical questions (updated regularly)

## Error Handling

### Client-Side Error Handling
- **Network Disconnection**: Automatic reconnection with state recovery
- **Invalid Votes**: Client-side validation before submission
- **Demographic Validation**: Optional field validation with clear error messages
- **Question Submission**: Validation for required fields and appropriate content

### Server-Side Error Handling
- **Duplicate Votes**: Prevent multiple votes per question per player
- **Invalid Phase Transitions**: Validate host actions against current game state
- **Question Moderation**: Content filtering for player-submitted questions
- **Data Consistency**: Ensure demographic data integrity and privacy

### Graceful Degradation
- **Missing Demographics**: Game functions without demographic data
- **Partial Results**: Display available results even with incomplete data
- **Question Loading Failures**: Fallback to default question sets
- **Real-time Updates**: Polling fallback if WebSocket connection fails

## Testing Strategy

### Unit Testing
- **Vote Calculation Logic**: Verify percentage calculations and winner determination
- **Demographic Analysis**: Test breakdown calculations and significant difference detection
- **Prediction Accuracy**: Validate accuracy tracking across multiple questions
- **Question Validation**: Test question format validation and content filtering

### Integration Testing
- **GameModule Integration**: Verify proper integration with existing GameShell
- **WebSocket Communication**: Test all message types and error scenarios
- **State Synchronization**: Ensure consistent state across all connected clients
- **Phase Transitions**: Test all game phase transitions and edge cases

### End-to-End Testing
- **Complete Game Flow**: Test full game from lobby to results across multiple questions
- **Multiplayer Scenarios**: Test with various player counts and demographic combinations
- **Host Controls**: Verify all host management features work correctly
- **Spectator Experience**: Ensure spectators can participate and view results properly

### Performance Testing
- **Large Player Counts**: Test with maximum expected concurrent players
- **Demographic Calculations**: Verify performance with complex demographic breakdowns
- **Real-time Updates**: Test responsiveness of live voting and results updates
- **Memory Usage**: Monitor Durable Object memory usage during extended games

## Security and Privacy

### Data Protection
- **Demographic Privacy**: Individual demographic data never exposed, only aggregated
- **Vote Anonymity**: Individual votes not traceable to specific players in results
- **Data Retention**: Demographic and voting data cleared after game session ends
- **Optional Participation**: All demographic data collection is explicitly optional

### Content Moderation
- **Player Question Filtering**: Host approval required for all player-submitted questions
- **Inappropriate Content**: Automatic filtering and manual moderation capabilities
- **Spam Prevention**: Rate limiting on question submissions and voting actions
- **Abuse Reporting**: Mechanism for reporting inappropriate questions or behavior

### Input Validation
- **Question Format**: Strict validation of question structure and content length
- **Demographic Data**: Validation of demographic field formats and allowed values
- **Vote Integrity**: Prevent duplicate votes and validate choice selections
- **XSS Prevention**: Sanitize all user-generated content before display

## Performance Considerations

### Optimization Strategies
- **Efficient State Updates**: Only broadcast changed data, not full game state
- **Demographic Caching**: Cache demographic breakdowns to avoid recalculation
- **Result Streaming**: Stream results as votes come in for real-time experience
- **Question Preloading**: Preload next questions to reduce transition delays

### Scalability
- **Player Limits**: Support up to 100 concurrent players per game session
- **Question Storage**: Efficient storage and retrieval of large question sets
- **Real-time Performance**: Maintain sub-second response times for voting and results
- **Memory Management**: Optimize Durable Object memory usage for long-running games

### Monitoring
- **Vote Processing Time**: Track time from vote submission to result calculation
- **Demographic Analysis Performance**: Monitor complex breakdown calculation times
- **WebSocket Message Throughput**: Track message volume and processing rates
- **Error Rates**: Monitor validation failures and connection issues