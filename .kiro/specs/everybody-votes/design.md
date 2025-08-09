# Design Document

## Overview

The Everybody Votes game recreates the beloved Wii channel experience with a clean, simple interface that emphasizes social voting and demographic insights. The design focuses on clear visual hierarchy, smooth transitions, and the distinctive blue-and-white aesthetic that made the original so memorable.

## Architecture

### System Architecture
Building on the existing Cloudflare Workers + Durable Objects architecture:

```
Client (Wii-style UI) ↔ WebSocket ↔ Worker ↔ VotingSession (Durable Object)
```

### Core Components
- **VotingSession**: New Durable Object extending GameSession for vote management
- **VotingGame**: Game logic class handling voting phases and demographic analysis
- **Wii-style Frontend**: Clean, channel-inspired UI with smooth animations
- **Demographics Engine**: Secure demographic data collection and analysis

## Components and Interfaces

### VotingSession Durable Object
```typescript
export class VotingSession extends GameSession {
  private votingGame: VotingGame;
  
  // Voting-specific message handlers
  async handleSetDemographics(socket: WebSocket, data: DemographicData): Promise<void>
  async handleSubmitVote(socket: WebSocket, data: VoteSubmission): Promise<void>
  async handleSubmitPrediction(socket: WebSocket, data: PredictionSubmission): Promise<void>
  async handleNextQuestion(socket: WebSocket): Promise<void>
}
```

### VotingGame Logic Class
```typescript
export class VotingGame {
  // Question management
  loadQuestionSet(setId: string): void
  createCustomQuestion(question: string, optionA: string, optionB: string): void
  getCurrentQuestion(): Question | null
  
  // Voting flow
  startVotingPhase(): void
  submitVote(playerId: string, choice: 'A' | 'B'): boolean
  submitPrediction(playerId: string, prediction: 'A' | 'B'): boolean
  
  // Results and analytics
  calculateResults(): VotingResults
  getDemographicBreakdown(): DemographicResults
  getPredictionAccuracy(): PredictionResults
}
```

### Frontend Components
```typescript
// Wii-style UI components
class WiiChannelUI {
  showLobby(): void
  showQuestion(question: Question): void
  showVotingInterface(question: Question): void
  showPredictionInterface(): void
  showResults(results: VotingResults): void
  showDemographicBreakdown(breakdown: DemographicResults): void
}

class DemographicForm {
  collectOptionalData(): DemographicData | null
  validateAndSanitize(data: DemographicData): DemographicData
}
```

## Data Models

### Core Voting Types
```typescript
interface Question {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  category?: string;
  source: 'preset' | 'custom';
}

interface DemographicData {
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  timezone?: string;
  team?: 'A' | 'B';
  ageRange?: '13-17' | '18-24' | '25-34' | '35-44' | '45-54' | '55+';
}

interface VoteSubmission {
  playerId: string;
  questionId: string;
  choice: 'A' | 'B';
  timestamp: number;
}

interface PredictionSubmission {
  playerId: string;
  questionId: string;
  prediction: 'A' | 'B';
  timestamp: number;
}
```

### Game State
```typescript
interface VotingGameState {
  currentQuestion: Question | null;
  questionIndex: number;
  totalQuestions: number;
  phase: 'lobby' | 'voting' | 'predicting' | 'results' | 'finished';
  votes: Map<string, VoteSubmission>;
  predictions: Map<string, PredictionSubmission>;
  demographics: Map<string, DemographicData>;
  results: VotingResults | null;
  playerAccuracy: Map<string, number>;
  timeRemaining: number;
}

interface VotingResults {
  questionId: string;
  totalVotes: number;
  optionAVotes: number;
  optionBVotes: number;
  optionAPercentage: number;
  optionBPercentage: number;
  demographicBreakdown: DemographicResults;
  predictionAccuracy: PredictionResults;
}

interface DemographicResults {
  byGender: Record<string, { A: number; B: number }>;
  byTimezone: Record<string, { A: number; B: number }>;
  byTeam: Record<string, { A: number; B: number }>;
  byAgeRange: Record<string, { A: number; B: number }>;
  interestingInsights: string[];
}
```

### Question Sets
```typescript
interface QuestionSet {
  id: string;
  name: string;
  description: string;
  questions: Question[];
  category: 'food' | 'entertainment' | 'lifestyle' | 'preferences' | 'custom';
}

// Preset question sets inspired by original Everybody Votes
const PRESET_QUESTION_SETS: QuestionSet[] = [
  {
    id: 'food-preferences',
    name: 'Food Preferences',
    description: 'Questions about food and dining choices',
    questions: [
      {
        id: 'pizza-toppings',
        text: 'Which pizza topping do you prefer?',
        optionA: 'Pepperoni',
        optionB: 'Mushrooms',
        category: 'food',
        source: 'preset'
      }
      // ... more questions
    ]
  }
];
```

## User Interface Design

### Wii Channel Aesthetic
The UI recreates the distinctive Everybody Votes channel look:

#### Color Palette
- **Primary Blue**: #4A90E2 (Wii channel blue)
- **Light Blue**: #E3F2FD (backgrounds)
- **White**: #FFFFFF (cards and text areas)
- **Dark Gray**: #333333 (text)
- **Accent Green**: #4CAF50 (correct predictions)
- **Accent Red**: #F44336 (incorrect predictions)

#### Typography
- **Headers**: Clean, rounded sans-serif (similar to Wii system font)
- **Body Text**: Readable, medium weight
- **Numbers/Stats**: Bold, prominent display

#### Layout Principles
- **Card-based Design**: All content in rounded white cards
- **Generous Spacing**: Plenty of whitespace between elements
- **Center Alignment**: Most content centered for TV-like viewing
- **Large Touch Targets**: Buttons sized for easy interaction

### Screen Layouts

#### Lobby Screen
```
┌─────────────────────────────────────┐
│           Everybody Votes           │
│                                     │
│  ┌─────────────────────────────┐   │
│  │     Optional Demographics   │   │
│  │  ○ Gender    ○ Team A/B     │   │
│  │  ○ Timezone  ○ Age Range    │   │
│  └─────────────────────────────┘   │
│                                     │
│  Players: [●●●○○] 3/5              │
│                                     │
│         [Start Voting]              │
└─────────────────────────────────────┘
```

#### Voting Screen
```
┌─────────────────────────────────────┐
│  Question 1 of 5        ⏱️ 0:30     │
│                                     │
│    Which do you prefer for         │
│         breakfast?                  │
│                                     │
│  ┌─────────────┐ ┌─────────────┐   │
│  │      A      │ │      B      │   │
│  │   Pancakes  │ │   Waffles   │   │
│  │             │ │             │   │
│  └─────────────┘ └─────────────┘   │
│                                     │
│     👥 3/5 players have voted       │
└─────────────────────────────────────┘
```

#### Prediction Screen
```
┌─────────────────────────────────────┐
│         Make Your Prediction        │
│                                     │
│   Which answer do you think will    │
│        be more popular?             │
│                                     │
│  ┌─────────────┐ ┌─────────────┐   │
│  │      A      │ │      B      │   │
│  │   Pancakes  │ │   Waffles   │   │
│  │             │ │             │   │
│  └─────────────┘ └─────────────┘   │
│                                     │
│    🔮 Predict the crowd choice      │
└─────────────────────────────────────┘
```

#### Results Screen
```
┌─────────────────────────────────────┐
│              Results                │
│                                     │
│  Pancakes: ████████░░ 67%          │
│  Waffles:  ███░░░░░░░ 33%          │
│                                     │
│  ┌─────────────────────────────┐   │
│  │    Demographic Breakdown    │   │
│  │  👨 Men: 45% A, 55% B       │   │
│  │  👩 Women: 78% A, 22% B     │   │
│  │  🌍 US East: 70% A, 30% B   │   │
│  └─────────────────────────────┘   │
│                                     │
│  🎯 Your prediction: ✅ Correct!    │
│     Accuracy: 3/4 (75%)            │
└─────────────────────────────────────┘
```

### Animation and Transitions
- **Smooth Fades**: 300ms ease-in-out transitions between screens
- **Card Animations**: Gentle scale and shadow effects on hover/selection
- **Progress Indicators**: Animated progress bars for voting completion
- **Result Reveals**: Staggered animation showing percentages and breakdowns
- **Confetti Effect**: Celebration animation for high prediction accuracy

## Error Handling

### Client-Side Error Handling
```typescript
class VotingErrorHandler {
  handleConnectionLoss(): void {
    // Show reconnection UI with Wii-style messaging
    showReconnectingOverlay();
  }
  
  handleInvalidVote(reason: string): void {
    // Show gentle error message in Wii style
    showErrorToast(`Unable to vote: ${reason}`);
  }
  
  handleDemographicError(): void {
    // Allow continuing without demographics
    showOptionalDataWarning();
  }
}
```

### Server-Side Validation
```typescript
class VotingValidator {
  validateVoteSubmission(vote: VoteSubmission): ValidationResult {
    // Ensure player hasn't already voted
    // Validate choice is A or B
    // Check voting phase is active
  }
  
  validateDemographicData(data: DemographicData): DemographicData {
    // Sanitize and validate optional demographic fields
    // Remove any PII or invalid data
  }
  
  validateCustomQuestion(question: Question): ValidationResult {
    // Ensure appropriate content
    // Validate question format
    // Check for balanced options
  }
}
```

### Privacy Protection
- **No Individual Tracking**: Demographics never linked to specific votes
- **Aggregation Minimums**: Demographic breakdowns only shown with 3+ responses
- **Data Cleanup**: Demographic data cleared after session ends
- **Opt-out Friendly**: All demographic data collection is optional

## Testing Strategy

### Unit Tests
```typescript
describe('VotingGame', () => {
  test('should calculate accurate vote percentages');
  test('should handle demographic breakdowns correctly');
  test('should track prediction accuracy per player');
  test('should prevent duplicate voting');
});

describe('DemographicAnalysis', () => {
  test('should aggregate demographics securely');
  test('should identify interesting voting patterns');
  test('should protect individual privacy');
});
```

### Integration Tests
```typescript
describe('Voting Flow', () => {
  test('complete voting session with demographics');
  test('voting session without demographics');
  test('custom question creation and voting');
  test('host controls and question management');
});
```

### UI Tests
```typescript
describe('Wii Channel UI', () => {
  test('should display questions clearly');
  test('should show voting progress accurately');
  test('should animate results reveal smoothly');
  test('should handle mobile and desktop layouts');
});
```

### Performance Considerations
- **Efficient Demographics**: O(1) demographic lookups using Maps
- **Batch Updates**: Group WebSocket broadcasts for results
- **Memory Management**: Clear old question data after results shown
- **Responsive Design**: Smooth performance on mobile devices

### Security Measures
- **Input Sanitization**: All user inputs validated and sanitized
- **Rate Limiting**: Prevent spam voting attempts
- **Session Validation**: Ensure votes come from valid session participants
- **Content Filtering**: Basic profanity filtering for custom questions

The design maintains the beloved simplicity and charm of the original Everybody Votes while leveraging modern web technologies for a smooth, engaging multiplayer experience.