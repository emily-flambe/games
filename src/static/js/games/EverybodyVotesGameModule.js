/**
 * EverybodyVotesGameModule - Simple MVP implementation
 * Players vote between two options, predict the winner, then see results
 */
class EverybodyVotesGameModule extends GameModule {
    constructor() {
        super();
        this.currentPhase = 'waiting'; // waiting, voting, prediction, results
        this.currentQuestion = null;
        this.myVote = null;
        this.myPrediction = null;
        this.votesCount = 0;
        this.totalPlayers = 0;
        this.predictionsCount = 0;
        this.results = null;
    }

    /**
     * Initialize the game
     */
    init(gameAreaElement, players, initialState, onPlayerAction, onStateChange, rulesElement) {
        super.init(gameAreaElement, players, initialState, onPlayerAction, onStateChange, rulesElement);
        
        // Set initial state if provided
        if (initialState) {
            this.currentPhase = initialState.phase || 'waiting';
            this.currentQuestion = initialState.currentQuestion || null;
            if (initialState.votes && initialState.votes[this.localPlayerId]) {
                this.myVote = initialState.votes[this.localPlayerId];
            }
            if (initialState.predictions && initialState.predictions[this.localPlayerId]) {
                this.myPrediction = initialState.predictions[this.localPlayerId];
            }
            this.results = initialState.results || null;
        }
        
        this.render();
    }

    /**
     * Get game rules HTML
     */
    getRules() {
        return `
            <h3>How to Play Everybody Votes!</h3>
            <ol>
                <li><strong>Vote:</strong> Choose your favorite option between two choices</li>
                <li><strong>Predict:</strong> Guess which option will be more popular</li>
                <li><strong>Results:</strong> See how everyone voted and who predicted correctly!</li>
            </ol>
            <p><em>Simple and fun - just like the Wii channel!</em></p>
        `;
    }

    /**
     * Render the game UI based on current phase
     */
    render() {
        if (!this.gameAreaElement) return;
        
        let content = '';
        
        switch (this.currentPhase) {
            case 'waiting':
                content = this.renderWaitingPhase();
                break;
            case 'voting':
                content = this.renderVotingPhase();
                break;
            case 'prediction':
                content = this.renderPredictionPhase();
                break;
            case 'results':
                content = this.renderResultsPhase();
                break;
            default:
                content = this.renderWaitingPhase();
        }
        
        this.gameAreaElement.innerHTML = content;
        this.attachEventListeners();
    }

    /**
     * Render waiting phase
     */
    renderWaitingPhase() {
        const isHost = this.localPlayerId === this.gameState?.hostId;
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
                <h2 style="font-size: 2.5rem; margin-bottom: 1rem;">🗳️ Everybody Votes! 🗳️</h2>
                <p style="font-size: 1.2rem; opacity: 0.9; margin-bottom: 2rem;">Get ready to vote and predict!</p>
                ${isHost ? `
                    <button class="start-game-btn" style="
                        background: white;
                        color: #667eea;
                        border: none;
                        padding: 1rem 2rem;
                        font-size: 1.2rem;
                        font-weight: bold;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        Start Game
                    </button>
                ` : `
                    <p style="font-size: 1rem; opacity: 0.8;">Waiting for host to start the game...</p>
                `}
            </div>
        `;
    }

    /**
     * Render voting phase
     */
    renderVotingPhase() {
        if (!this.currentQuestion) return this.renderWaitingPhase();
        
        const hasVoted = this.myVote !== null;
        
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
                    <h3 style="font-size: 1.5rem; margin: 0;">${this.currentQuestion.text}</h3>
                </div>
                
                ${hasVoted ? `
                    <div style="text-align: center;">
                        <p style="font-size: 1.2rem; margin-bottom: 1rem;">You voted for:</p>
                        <div style="
                            background: rgba(255, 255, 255, 0.2);
                            padding: 1rem 2rem;
                            border-radius: 8px;
                            font-size: 1.5rem;
                            font-weight: bold;
                        ">
                            ${this.myVote === 'A' ? this.currentQuestion.choiceA : this.currentQuestion.choiceB}
                        </div>
                        <p style="margin-top: 1rem; opacity: 0.8;">
                            Waiting for others to vote... (${this.votesCount}/${this.totalPlayers})
                        </p>
                    </div>
                ` : `
                    <div style="
                        display: flex;
                        gap: 2rem;
                        flex-wrap: wrap;
                        justify-content: center;
                    ">
                        <button class="vote-btn" data-choice="A" style="
                            background: white;
                            color: #667eea;
                            border: none;
                            padding: 2rem;
                            font-size: 1.5rem;
                            font-weight: bold;
                            border-radius: 12px;
                            cursor: pointer;
                            transition: all 0.3s;
                            min-width: 200px;
                            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                            ${this.currentQuestion.choiceA}
                        </button>
                        
                        <button class="vote-btn" data-choice="B" style="
                            background: white;
                            color: #764ba2;
                            border: none;
                            padding: 2rem;
                            font-size: 1.5rem;
                            font-weight: bold;
                            border-radius: 12px;
                            cursor: pointer;
                            transition: all 0.3s;
                            min-width: 200px;
                            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                            ${this.currentQuestion.choiceB}
                        </button>
                    </div>
                `}
            </div>
        `;
    }

    /**
     * Render prediction phase
     */
    renderPredictionPhase() {
        if (!this.currentQuestion) return this.renderWaitingPhase();
        
        const hasPredicted = this.myPrediction !== null;
        
        return `
            <div class="everybody-votes-container" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 2rem;
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                border-radius: 12px;
                color: white;
            ">
                <h2 style="font-size: 2rem; margin-bottom: 1rem;">🔮 Prediction Time!</h2>
                <div style="
                    background: rgba(255, 255, 255, 0.1);
                    padding: 1rem;
                    border-radius: 8px;
                    margin-bottom: 2rem;
                    backdrop-filter: blur(10px);
                ">
                    <p style="font-size: 1.2rem; margin: 0;">Which option do you think will be more popular?</p>
                </div>
                
                ${hasPredicted ? `
                    <div style="text-align: center;">
                        <p style="font-size: 1.2rem; margin-bottom: 1rem;">You predicted:</p>
                        <div style="
                            background: rgba(255, 255, 255, 0.2);
                            padding: 1rem 2rem;
                            border-radius: 8px;
                            font-size: 1.5rem;
                            font-weight: bold;
                        ">
                            ${this.myPrediction === 'A' ? this.currentQuestion.choiceA : this.currentQuestion.choiceB}
                        </div>
                        <p style="margin-top: 1rem; opacity: 0.8;">
                            Waiting for others to predict... (${this.predictionsCount}/${this.totalPlayers})
                        </p>
                    </div>
                ` : `
                    <div style="
                        display: flex;
                        gap: 2rem;
                        flex-wrap: wrap;
                        justify-content: center;
                    ">
                        <button class="predict-btn" data-prediction="A" style="
                            background: white;
                            color: #f093fb;
                            border: none;
                            padding: 2rem;
                            font-size: 1.5rem;
                            font-weight: bold;
                            border-radius: 12px;
                            cursor: pointer;
                            transition: all 0.3s;
                            min-width: 200px;
                            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                            ${this.currentQuestion.choiceA}
                        </button>
                        
                        <button class="predict-btn" data-prediction="B" style="
                            background: white;
                            color: #f5576c;
                            border: none;
                            padding: 2rem;
                            font-size: 1.5rem;
                            font-weight: bold;
                            border-radius: 12px;
                            cursor: pointer;
                            transition: all 0.3s;
                            min-width: 200px;
                            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                            ${this.currentQuestion.choiceB}
                        </button>
                    </div>
                `}
            </div>
        `;
    }

    /**
     * Render results phase
     */
    renderResultsPhase() {
        if (!this.currentQuestion || !this.results) return this.renderWaitingPhase();
        
        const myPredictionCorrect = this.myPrediction === this.results.winner || this.results.winner === 'tie';
        const aWidth = Math.max(10, this.results.aPercentage);
        const bWidth = Math.max(10, this.results.bPercentage);
        
        return `
            <div class="everybody-votes-container" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 2rem;
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                border-radius: 12px;
                color: white;
            ">
                <h2 style="font-size: 2rem; margin-bottom: 1rem;">📊 Results!</h2>
                
                <div style="
                    background: rgba(255, 255, 255, 0.1);
                    padding: 1.5rem;
                    border-radius: 8px;
                    margin-bottom: 2rem;
                    backdrop-filter: blur(10px);
                    width: 100%;
                    max-width: 600px;
                ">
                    <h3 style="margin: 0 0 1rem 0;">${this.currentQuestion.text}</h3>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span>${this.currentQuestion.choiceA}</span>
                            <span>${this.results.aPercentage}%</span>
                        </div>
                        <div style="
                            background: rgba(255, 255, 255, 0.2);
                            border-radius: 4px;
                            height: 30px;
                            overflow: hidden;
                        ">
                            <div style="
                                background: ${this.results.winner === 'A' ? '#4CAF50' : '#ff9800'};
                                height: 100%;
                                width: ${aWidth}%;
                                transition: width 0.5s ease;
                            "></div>
                        </div>
                    </div>
                    
                    <div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span>${this.currentQuestion.choiceB}</span>
                            <span>${this.results.bPercentage}%</span>
                        </div>
                        <div style="
                            background: rgba(255, 255, 255, 0.2);
                            border-radius: 4px;
                            height: 30px;
                            overflow: hidden;
                        ">
                            <div style="
                                background: ${this.results.winner === 'B' ? '#4CAF50' : '#ff9800'};
                                height: 100%;
                                width: ${bWidth}%;
                                transition: width 0.5s ease;
                            "></div>
                        </div>
                    </div>
                </div>
                
                <div style="
                    background: rgba(255, 255, 255, 0.2);
                    padding: 1rem;
                    border-radius: 8px;
                    text-align: center;
                ">
                    <p style="font-size: 1.2rem; margin: 0;">
                        Your prediction was: 
                        <strong style="color: ${myPredictionCorrect ? '#4CAF50' : '#f44336'};">
                            ${myPredictionCorrect ? '✅ Correct!' : '❌ Wrong'}
                        </strong>
                    </p>
                    ${this.myVote ? `
                        <p style="margin: 0.5rem 0 0 0; opacity: 0.9;">
                            You voted for: ${this.myVote === 'A' ? this.currentQuestion.choiceA : this.currentQuestion.choiceB}
                        </p>
                    ` : ''}
                </div>
                
                ${this.results.winner === 'tie' ? `
                    <p style="margin-top: 1rem; font-size: 1.5rem; font-weight: bold;">It's a tie! 🤝</p>
                ` : ''}
            </div>
        `;
    }

    /**
     * Attach event listeners after rendering
     */
    attachEventListeners() {
        // Start game button
        const startBtn = this.gameAreaElement.querySelector('.start-game-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                if (this.onPlayerAction) {
                    this.onPlayerAction('START_GAME', {});
                }
            });
        }
        
        // Vote buttons
        const voteBtns = this.gameAreaElement.querySelectorAll('.vote-btn');
        voteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const choice = e.target.dataset.choice;
                if (choice && this.onPlayerAction) {
                    this.myVote = choice;
                    this.onPlayerAction('submit_vote', { choice });
                    this.render();
                }
            });
        });
        
        // Prediction buttons
        const predictBtns = this.gameAreaElement.querySelectorAll('.predict-btn');
        predictBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prediction = e.target.dataset.prediction;
                if (prediction && this.onPlayerAction) {
                    this.myPrediction = prediction;
                    this.onPlayerAction('submit_prediction', { prediction });
                    this.render();
                }
            });
        });
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
        
        // Update question
        if (gameSpecificState.currentQuestion) {
            this.currentQuestion = gameSpecificState.currentQuestion;
        }
        
        // Update results
        if (gameSpecificState.results) {
            this.results = gameSpecificState.results;
        }
        
        // Update vote/prediction counts for progress display
        if (gameSpecificState.votes) {
            this.votesCount = Object.keys(gameSpecificState.votes).length;
        }
        if (gameSpecificState.predictions) {
            this.predictionsCount = Object.keys(gameSpecificState.predictions).length;
        }
        if (gameSpecificState.players) {
            this.totalPlayers = Object.keys(gameSpecificState.players).length;
        }
        
        this.render();
    }

    /**
     * Handle WebSocket messages
     */
    handleMessage(message) {
        switch (message.type) {
            case 'game_started':
                if (message.data) {
                    this.currentPhase = message.data.phase || 'voting';
                    this.currentQuestion = message.data.question;
                    this.myVote = null;
                    this.myPrediction = null;
                    this.results = null;
                    this.render();
                }
                break;
                
            case 'phase_changed':
                if (message.data) {
                    this.currentPhase = message.data.phase;
                    if (message.data.question) {
                        this.currentQuestion = message.data.question;
                    }
                    this.render();
                }
                break;
                
            case 'vote_submitted':
                if (message.data) {
                    this.votesCount = message.data.votesCount;
                    this.totalPlayers = message.data.totalPlayers;
                    this.render();
                }
                break;
                
            case 'prediction_submitted':
                if (message.data) {
                    this.predictionsCount = message.data.predictionsCount;
                    this.totalPlayers = message.data.totalPlayers;
                    this.render();
                }
                break;
                
            case 'game_results':
                if (message.data) {
                    this.currentPhase = 'results';
                    this.results = message.data.results;
                    this.render();
                }
                break;
        }
    }

    /**
     * Clean up game resources
     */
    cleanup() {
        super.cleanup();
        this.currentPhase = 'waiting';
        this.currentQuestion = null;
        this.myVote = null;
        this.myPrediction = null;
        this.results = null;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EverybodyVotesGameModule;
} else {
    window.EverybodyVotesGameModule = EverybodyVotesGameModule;
}