import type { GameState, Player, DrawingGameState, DrawingStroke } from '../../types/shared';

// Simple word list for drawing prompts
const DRAWING_WORDS = [
  'cat', 'dog', 'house', 'tree', 'car', 'sun', 'moon', 'flower', 'bird', 'fish',
  'apple', 'book', 'chair', 'computer', 'phone', 'smile', 'heart', 'star', 'cloud', 'mountain'
];

const TURN_DURATION = 60000; // 60 seconds per turn
const MAX_ROUNDS = 3;
const POINTS_FOR_DRAWER = 50;
const POINTS_FOR_GUESSER = 100;

export class DrawingGame {
  private gameState: GameState;
  private drawingState: DrawingGameState;
  private turnTimer: any = null;

  constructor(gameState: GameState) {
    this.gameState = gameState;
    this.drawingState = this.initializeDrawingState();
    this.gameState.data.drawingState = this.drawingState;
  }

  private initializeDrawingState(): DrawingGameState {
    return {
      currentDrawer: null,
      word: null,
      strokes: [],
      round: 1,
      maxRounds: MAX_ROUNDS,
      turnTimeLeft: TURN_DURATION,
      phase: 'waiting',
      scores: {},
      guesses: [],
      correctGuessers: []
    };
  }

  public canStartGame(): boolean {
    return this.gameState.players.length >= 2;
  }

  public startGame(): void {
    if (!this.canStartGame()) {
      throw new Error('Need at least 2 players to start');
    }

    this.gameState.status = 'active';
    this.drawingState.phase = 'drawing';
    
    // Initialize scores for all players
    this.gameState.players.forEach(player => {
      this.drawingState.scores[player.id] = 0;
    });

    this.startNewTurn();
  }

  private startNewTurn(): void {
    // Clear previous turn data
    this.drawingState.strokes = [];
    this.drawingState.guesses = [];
    this.drawingState.correctGuessers = [];
    
    // Select next drawer (rotate through players)
    let currentDrawerIndex = -1;
    if (this.drawingState.currentDrawer) {
      currentDrawerIndex = this.gameState.players.findIndex(p => p.id === this.drawingState.currentDrawer);
    }
    const nextDrawerIndex = (currentDrawerIndex + 1) % this.gameState.players.length;
    this.drawingState.currentDrawer = this.gameState.players[nextDrawerIndex].id;
    
    // Select a random word
    this.drawingState.word = DRAWING_WORDS[Math.floor(Math.random() * DRAWING_WORDS.length)];
    
    // Reset timer
    this.drawingState.turnTimeLeft = TURN_DURATION;
    this.drawingState.phase = 'drawing';
    
    // Start turn timer
    this.startTurnTimer();
  }

  private startTurnTimer(): void {
    if (this.turnTimer) {
      clearInterval(this.turnTimer);
    }
    
    this.turnTimer = setInterval(() => {
      this.drawingState.turnTimeLeft -= 1000;
      
      if (this.drawingState.turnTimeLeft <= 0) {
        this.endTurn();
      }
    }, 1000);
  }

  private endTurn(): void {
    if (this.turnTimer) {
      clearInterval(this.turnTimer);
      this.turnTimer = null;
    }
    
    this.drawingState.phase = 'results';
    
    // Award points for correct guesses
    this.drawingState.correctGuessers.forEach(playerId => {
      this.drawingState.scores[playerId] = (this.drawingState.scores[playerId] || 0) + POINTS_FOR_GUESSER;
    });
    
    // Award points to drawer if anyone guessed correctly
    if (this.drawingState.correctGuessers.length > 0 && this.drawingState.currentDrawer) {
      this.drawingState.scores[this.drawingState.currentDrawer] = 
        (this.drawingState.scores[this.drawingState.currentDrawer] || 0) + POINTS_FOR_DRAWER;
    }
    
    // Check if game should end
    const allPlayersHadTurn = this.gameState.players.every(player => {
      return this.gameState.players.indexOf(player) < this.drawingState.round;
    });
    
    if (allPlayersHadTurn && this.drawingState.round >= this.drawingState.maxRounds) {
      this.endGame();
    } else {
      // Prepare for next turn after a short delay
      setTimeout(() => {
        if (allPlayersHadTurn) {
          this.drawingState.round++;
        }
        this.startNewTurn();
      }, 3000);
    }
  }

  private endGame(): void {
    this.drawingState.phase = 'finished';
    this.gameState.status = 'finished';
    
    if (this.turnTimer) {
      clearInterval(this.turnTimer);
      this.turnTimer = null;
    }
  }

  public handleDrawStroke(stroke: DrawingStroke, playerId: string): boolean {
    // Only the current drawer can draw
    if (playerId !== this.drawingState.currentDrawer || this.drawingState.phase !== 'drawing') {
      return false;
    }
    
    this.drawingState.strokes.push(stroke);
    return true;
  }

  public handleClearCanvas(playerId: string): boolean {
    // Only the current drawer can clear
    if (playerId !== this.drawingState.currentDrawer || this.drawingState.phase !== 'drawing') {
      return false;
    }
    
    this.drawingState.strokes = [];
    return true;
  }

  public handleGuess(guess: string, playerId: string): boolean {
    // Can't guess if you're the drawer or if already guessed correctly
    if (playerId === this.drawingState.currentDrawer || 
        this.drawingState.correctGuessers.includes(playerId) ||
        this.drawingState.phase !== 'drawing') {
      return false;
    }
    
    const normalizedGuess = guess.toLowerCase().trim();
    const normalizedWord = (this.drawingState.word || '').toLowerCase().trim();
    
    // Record the guess
    this.drawingState.guesses.push({
      playerId,
      guess,
      timestamp: Date.now()
    });
    
    // Check if guess is correct
    if (normalizedGuess === normalizedWord) {
      this.drawingState.correctGuessers.push(playerId);
      
      // End turn early if everyone has guessed correctly
      const nonDrawerPlayers = this.gameState.players.filter(p => p.id !== this.drawingState.currentDrawer);
      if (this.drawingState.correctGuessers.length === nonDrawerPlayers.length) {
        this.endTurn();
      }
      
      return true;
    }
    
    return false;
  }

  public getCurrentDrawer(): Player | null {
    if (!this.drawingState.currentDrawer) return null;
    return this.gameState.players.find(p => p.id === this.drawingState.currentDrawer) || null;
  }

  public getWordForDrawer(): string | null {
    return this.drawingState.word;
  }

  public getWordForGuessers(): string {
    if (!this.drawingState.word) return '';
    // Show blanks with correct length
    return this.drawingState.word.replace(/./g, '_');
  }

  public getGameState(): DrawingGameState {
    return this.drawingState;
  }

  public cleanup(): void {
    if (this.turnTimer) {
      clearInterval(this.turnTimer);
      this.turnTimer = null;
    }
  }
}