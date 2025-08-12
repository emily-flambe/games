/**
 * EverybodyVotesGameModule - MVP implementation
 * Simple voting game: Pizza or Burgers?
 */
class EverybodyVotesGameModule extends GameModule {
    constructor() {
        super();
        this.currentPhase = 'WAITING'; // WAITING, VOTING, RESULTS
        this.question = 'Pizza or Burgers?';
        this.options = ['Pizza', 'Burgers'];
        this.myVote = null;
        this.votesCount = 0;
        this.totalPlayers = 0;
        this.results = null;
        this.timeRemaining = 0;
        this.timerInterval = null;
        this.lastVoterName = null;
        this.allVoted = false;
    }

    /**
     * Initialize the game
     */
    init(gameAreaElement, players, initialState, onPlayerAction, onStateChange, rulesElement) {
        super.init(gameAreaElement, players, initialState, onPlayerAction, onStateChange, rulesElement);
        
        console.log('🎮 EverybodyVotesGameModule.init() called with initialState:', initialState);
        
        // Set initial state if provided
        if (initialState) {
            this.currentPhase = initialState.phase || 'VOTING'; // Start directly in voting!
            this.question = initialState.question || 'Pizza or Burgers?';
            this.options = initialState.options || ['Pizza', 'Burgers'];
            this.results = initialState.results || null;
            console.log(`📍 Initial phase: ${this.currentPhase}, question: ${this.question}`);
        } else {
            // Default to VOTING phase
            this.currentPhase = 'VOTING';
        }
        
        this.render();
    }

    /**
     * Get game rules HTML
     */
    getRules() {
        return `
            <h3>Everybody Votes!</h3>
            <p><strong>Simple voting game - Pizza or Burgers?</strong></p>
            <ol>
                <li>Vote for your favorite option</li>
                <li>See how everyone voted!</li>
            </ol>
            <p><em>You have 10 seconds to vote!</em></p>
        `;
    }

    /**
     * Start countdown timer
     */
    startTimer() {
        this.clearTimer();
        this.timerInterval = setInterval(() => {
            this.timeRemaining = Math.max(0, this.timeRemaining - 1);
            this.updateTimerDisplay();
            if (this.timeRemaining <= 0) {
                this.clearTimer();
            }
        }, 1000);
    }

    /**
     * Clear countdown timer
     */
    clearTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * Update timer display
     */
    updateTimerDisplay() {
        const timerElement = this.gameAreaElement?.querySelector('.timer-display');
        if (timerElement) {
            timerElement.textContent = `Time remaining: ${this.timeRemaining}s`;
        }
    }

    /**
     * Render the game UI based on current phase
     */
    render() {
        if (!this.gameAreaElement) return;
        
        let content = '';
        
        switch (this.currentPhase) {
            case 'WAITING':
                content = this.renderWaitingPhase();
                break;
            case 'VOTING':
                content = this.renderVotingPhase();
                break;
            case 'RESULTS':
                content = this.renderResultsPhase();
                break;
            default:
                content = this.renderWaitingPhase();
        }
        
        this.gameAreaElement.innerHTML = content;
        this.attachEventListeners();
    }

    /**
     * Render waiting phase (shouldn't normally see this)
     */
    renderWaitingPhase() {
        return `
            <div class="everybody-votes-container" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 400px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 12px;
                padding: 2rem;
                color: white;
                text-align: center;
            ">
                <h2 style="font-size: 2rem; margin-bottom: 1rem;">🗳️ Everybody Votes!</h2>
                <p style="font-size: 1.2rem;">Game is starting...</p>
            </div>
        `;
    }

    /**
     * Render voting phase
     */
    renderVotingPhase() {
        console.log('🎨 Rendering voting phase...');
        
        return `
            <div class="everybody-votes-container" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 2rem;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 12px;
                color: white;
            ">
                <h2 style="font-size: 2rem; margin-bottom: 1rem;">🗳️ Time to Vote!</h2>
                
                <div style="
                    background: rgba(255, 255, 255, 0.1);
                    padding: 1.5rem;
                    border-radius: 8px;
                    margin-bottom: 2rem;
                    backdrop-filter: blur(10px);
                ">
                    <h3 style="font-size: 1.8rem; margin: 0 0 1rem 0;">${this.question}</h3>
                    ${this.votesCount > 0 ? `
                        <div style="
                            background: rgba(255, 255, 255, 0.2);
                            padding: 1rem;
                            border-radius: 6px;
                            margin-top: 1rem;
                        ">
                            <p style="margin: 0; font-size: 1.2rem;">
                                📊 ${this.votesCount}/${this.totalPlayers} players voted
                            </p>
                            ${this.lastVoterName ? `
                                <p style="margin: 0.5rem 0 0 0; font-size: 1rem; opacity: 0.8;">
                                    Latest: ${this.lastVoterName}
                                </p>
                            ` : ''}
                            ${this.allVoted ? `
                                <p style="margin: 0.5rem 0 0 0; font-size: 1rem; color: #4CAF50; font-weight: bold;">
                                    ✅ All players voted! Calculating results...
                                </p>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
                
                <div style="
                    display: flex;
                    gap: 2rem;
                    flex-wrap: wrap;
                    justify-content: center;
                ">
                    <button class="vote-btn" data-vote="Pizza" style="
                        background: white;
                        color: #667eea;
                        border: none;
                        padding: 2rem 3rem;
                        font-size: 2rem;
                        font-weight: bold;
                        border-radius: 12px;
                        cursor: pointer;
                        transition: all 0.3s;
                        min-width: 200px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        🍕 Pizza
                    </button>
                    
                    <button class="vote-btn" data-vote="Burgers" style="
                        background: white;
                        color: #764ba2;
                        border: none;
                        padding: 2rem 3rem;
                        font-size: 2rem;
                        font-weight: bold;
                        border-radius: 12px;
                        cursor: pointer;
                        transition: all 0.3s;
                        min-width: 200px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        🍔 Burgers
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render results phase
     */
    renderResultsPhase() {
        console.log('🎨 Rendering results phase...');
        
        if (!this.results) {
            return `<div class="everybody-votes-container">Loading results...</div>`;
        }
        
        const pizzaVotes = this.results['Pizza'] || 0;
        const burgersVotes = this.results['Burgers'] || 0;
        const totalVotes = this.results.totalVotes || 0;
        
        const pizzaPercentage = totalVotes > 0 ? Math.round((pizzaVotes / totalVotes) * 100) : 0;
        const burgersPercentage = totalVotes > 0 ? Math.round((burgersVotes / totalVotes) * 100) : 0;
        
        return `
            <div class="everybody-votes-container" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 2rem;
                background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
                border-radius: 12px;
                color: white;
                text-align: center;
            ">
                <h2 style="font-size: 2.5rem; margin-bottom: 1rem;">📊 Results</h2>
                
                <div style="
                    background: rgba(255, 255, 255, 0.1);
                    padding: 1.5rem;
                    border-radius: 8px;
                    margin-bottom: 2rem;
                    backdrop-filter: blur(10px);
                    width: 100%;
                    max-width: 500px;
                ">
                    <h3 style="font-size: 1.8rem; margin: 0 0 1rem 0;">${this.question}</h3>
                    
                    <div style="margin-bottom: 1rem;">
                        <div style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 0.5rem;
                            padding: 1rem;
                            background: rgba(255, 255, 255, 0.2);
                            border-radius: 8px;
                        ">
                            <span style="font-size: 1.5rem;">🍕 Pizza</span>
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <div style="
                                    background: #ff6b6b;
                                    height: 20px;
                                    border-radius: 10px;
                                    min-width: 100px;
                                    width: ${pizzaPercentage * 2}px;
                                    max-width: 200px;
                                "></div>
                                <span style="font-weight: bold; min-width: 60px;">${pizzaVotes} (${pizzaPercentage}%)</span>
                            </div>
                        </div>
                        
                        <div style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 1rem;
                            background: rgba(255, 255, 255, 0.2);
                            border-radius: 8px;
                        ">
                            <span style="font-size: 1.5rem;">🍔 Burgers</span>
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <div style="
                                    background: #4ecdc4;
                                    height: 20px;
                                    border-radius: 10px;
                                    min-width: 100px;
                                    width: ${burgersPercentage * 2}px;
                                    max-width: 200px;
                                "></div>
                                <span style="font-weight: bold; min-width: 60px;">${burgersVotes} (${burgersPercentage}%)</span>
                            </div>
                        </div>
                    </div>
                    
                    <p style="font-size: 1.2rem; margin: 1rem 0;">
                        Total votes: ${totalVotes}
                    </p>
                </div>
                
                <button id="end-game-btn" style="
                    background: #ff6b6b;
                    color: white;
                    border: none;
                    padding: 1rem 2rem;
                    font-size: 1.5rem;
                    font-weight: bold;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s;
                    min-width: 200px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    🏁 End Game
                </button>
            </div>
        `;
    }

    /**
     * Attach event listeners after rendering
     */
    attachEventListeners() {
        // Vote buttons
        const voteBtns = this.gameAreaElement.querySelectorAll('.vote-btn');
        voteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const vote = e.target.dataset.vote;
                if (vote && this.onPlayerAction) {
                    console.log(`🗳️ Player voting for: ${vote}`);
                    this.myVote = vote; // Remember the vote
                    this.onPlayerAction({
                        type: 'submit_vote',
                        data: { vote: vote }
                    });
                }
            });
        });
        
        // End Game button
        const endGameBtn = this.gameAreaElement.querySelector('#end-game-btn');
        if (endGameBtn && this.onPlayerAction) {
            endGameBtn.addEventListener('click', () => {
                console.log('🏁 End Game button clicked');
                this.onPlayerAction({
                    type: 'end_game',
                    data: {}
                });
            });
        }
    }

    /**
     * Handle player actions
     */
    handlePlayerAction(playerId, action) {
        // Actions are handled by the server
    }

    /**
     * Handle state updates from server
     */
    handleStateUpdate(gameSpecificState) {
        super.handleStateUpdate(gameSpecificState);
        
        // Update phase
        if (gameSpecificState.phase) {
            this.currentPhase = gameSpecificState.phase;
        }
        
        // Update question and options
        if (gameSpecificState.question) {
            this.question = gameSpecificState.question;
        }
        if (gameSpecificState.options) {
            this.options = gameSpecificState.options;
        }
        
        // Update results
        if (gameSpecificState.results) {
            this.results = gameSpecificState.results;
        }
        
        // Update vote counts for progress display
        if (gameSpecificState.votes) {
            this.votesCount = Object.keys(gameSpecificState.votes).length;
            // Check if we already voted
            if (gameSpecificState.votes[this.localPlayerId]) {
                this.myVote = gameSpecificState.votes[this.localPlayerId];
            }
        }
        if (gameSpecificState.players) {
            this.totalPlayers = Object.keys(gameSpecificState.players).length;
        }
        
        // Handle voting timer
        if (gameSpecificState.votingEndTime && this.currentPhase === 'VOTING') {
            this.timeRemaining = Math.max(0, Math.floor((gameSpecificState.votingEndTime - Date.now()) / 1000));
            this.startTimer();
        }
        
        this.render();
    }

    /**
     * Handle WebSocket messages
     */
    handleMessage(message) {
        switch (message.type) {
            case 'phase_changed':
                this.currentPhase = message.phase;
                if (this.currentPhase !== 'VOTING') {
                    this.clearTimer();
                }
                this.render();
                break;
                
            case 'voting_started':
                this.currentPhase = 'VOTING';
                this.question = message.question || 'Pizza or Burgers?';
                this.options = message.options || ['Pizza', 'Burgers'];
                this.timeRemaining = message.timeLimit || 10;
                this.myVote = null; // Reset vote for new round
                this.startTimer();
                this.render();
                break;
                
            case 'vote_confirmed':
                // Vote was successfully recorded
                this.render();
                break;
                
            case 'vote_count_update':
                this.votesCount = message.votesCount || 0;
                this.totalPlayers = message.totalPlayers || 0;
                this.render();
                break;
                
            case 'vote_progress':
                console.log('📊 Vote progress update:', message.data);
                this.votesCount = message.data.votesCount || 0;
                this.totalPlayers = message.data.totalPlayers || 0;
                this.lastVoterName = message.data.voterName;
                this.allVoted = message.data.allVoted || false;
                this.render();
                break;
                
            case 'voting_results':
                console.log('📊 Voting results received:', message.data);
                this.currentPhase = 'RESULTS';
                this.results = message.data.results;
                this.question = message.data.question;
                this.render();
                break;
                
            // game_results removed - now using standard game_ended message handled by GameShell
                
            case 'error':
                console.error('Game error:', message.message);
                break;
        }
    }

    /**
     * Clean up game resources
     */
    cleanup() {
        super.cleanup();
        this.clearTimer();
        this.currentPhase = 'WAITING';
        this.myVote = null;
        this.results = null;
        this.votesCount = 0;
        this.totalPlayers = 0;
        this.timeRemaining = 0;
        this.lastVoterName = null;
        this.allVoted = false;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EverybodyVotesGameModule;
} else {
    window.EverybodyVotesGameModule = EverybodyVotesGameModule;
}