/**
 * EverybodyVotesGameModule - Multi-round implementation
 * Simple voting game: Pizza or Burgers? (and more!)
 */
class EverybodyVotesGameModule extends GameModule {
    constructor() {
        super();
        this.currentPhase = 'WAITING'; // WAITING, VOTING, PREDICTING, RESULTS, ENDED
        this.question = 'Pizza or Burgers?';
        this.options = ['Pizza', 'Burgers'];
        this.myVote = null;
        this.myPrediction = null;
        this.votesCount = 0;
        this.totalPlayers = 0;
        this.results = null;
        this.timeRemaining = 0;
        this.timerInterval = null;
        this.lastVoterName = null;
        this.allVoted = false;
        
        // Multi-round state
        this.currentRound = 1;
        this.totalRounds = 3;
        this.roundResults = [];
        this.playerScores = {};
        this.finalScores = [];
        this.isHost = false;
    }

    /**
     * Initialize the game
     */
    init(gameAreaElement, players, initialState, onPlayerAction, onStateChange, rulesElement) {
        super.init(gameAreaElement, players, initialState, onPlayerAction, onStateChange, rulesElement);
        
        
        // Set initial state if provided
        if (initialState) {
            this.currentPhase = initialState.phase || 'WAITING'; // Respect server phase
            this.question = initialState.question || 'Pizza or Burgers?';
            this.options = initialState.options || ['Pizza', 'Burgers'];
            this.results = initialState.results || null;
            
            // Multi-round state
            this.currentRound = initialState.currentRound || 1;
            this.totalRounds = initialState.totalRounds || 3;
            this.roundResults = initialState.roundResults || [];
            this.playerScores = initialState.playerScores || {};
            this.finalScores = initialState.finalScores || [];
            this.isHost = initialState.isHost || false;
            
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
            <p><strong>Multi-round voting game with predictions!</strong></p>
            <ol>
                <li>Vote for your favorite option</li>
                <li>Predict what the majority will vote for</li>
                <li>Get points for correct predictions</li>
                <li>Play ${this.totalRounds} rounds total</li>
                <li>Player with most points wins!</li>
            </ol>
            <p><em>You have time limits for both voting and predicting!</em></p>
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
            case 'PREDICTING':
                content = this.renderPredictingPhase();
                break;
            case 'RESULTS':
                content = this.renderResultsPhase();
                break;
            case 'ENDED':
                content = this.renderFinalResultsPhase();
                break;
            default:
                content = this.renderWaitingPhase();
        }
        
        this.gameAreaElement.innerHTML = content;
        this.attachEventListeners();
    }

    /**
     * Get round progress indicator HTML
     */
    getRoundProgressIndicator() {
        return `
            <div style="
                background: rgba(255, 255, 255, 0.2);
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 1.5rem;
                text-align: center;
                backdrop-filter: blur(10px);
            ">
                <h3 style="margin: 0; font-size: 1.5rem; font-weight: bold;">
                    Round ${this.currentRound} of ${this.totalRounds}
                </h3>
                <div style="
                    display: flex;
                    justify-content: center;
                    gap: 0.5rem;
                    margin-top: 0.5rem;
                ">
                    ${Array.from({length: this.totalRounds}, (_, i) => {
                        const roundNum = i + 1;
                        const isActive = roundNum === this.currentRound;
                        const isCompleted = roundNum < this.currentRound;
                        return `
                            <div style="
                                width: 20px;
                                height: 20px;
                                border-radius: 50%;
                                background: ${isCompleted ? '#4CAF50' : isActive ? '#FFF' : 'rgba(255,255,255,0.3)'};
                                color: ${isActive && !isCompleted ? '#667eea' : '#FFF'};
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 0.8rem;
                                font-weight: bold;
                                border: 2px solid ${isActive ? '#FFF' : 'transparent'};
                            ">
                                ${isCompleted ? '✓' : roundNum}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
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
                ${this.getRoundProgressIndicator()}
                <h2 style="font-size: 2rem; margin-bottom: 1rem;">Everybody Votes!</h2>
                <p style="font-size: 1.2rem;">Game is starting...</p>
            </div>
        `;
    }

    /**
     * Render voting phase
     */
    renderVotingPhase() {
        
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
                ${this.getRoundProgressIndicator()}
                <h2 style="font-size: 2rem; margin-bottom: 1rem;">Time to Vote!</h2>
                
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
                                    All players voted! Calculating results...
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
                    ${this.options.map((option, index) => {
                        const emojis = {
                            'Pizza': '🍕',
                            'Burgers': '🍔',
                            'Coffee': '☕',
                            'Tea': '🍵',
                            'Beach': '🏖️',
                            'Mountains': '⛰️'
                        };
                        const emoji = emojis[option] || '';
                        const color = index === 0 ? '#667eea' : '#764ba2';
                        return `
                            <button class="vote-btn" data-vote="${option}" style="
                                background: white;
                                color: ${color};
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
                                ${emoji} ${option}
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render predicting phase
     */
    renderPredictingPhase() {
        
        return `
            <div class="everybody-votes-container" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 2rem;
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                border-radius: 12px;
                color: white;
            ">
                ${this.getRoundProgressIndicator()}
                <h2 style="font-size: 2rem; margin-bottom: 1rem;">🔮 Make Your Prediction!</h2>
                
                <div style="
                    background: rgba(255, 255, 255, 0.1);
                    padding: 1.5rem;
                    border-radius: 8px;
                    margin-bottom: 2rem;
                    backdrop-filter: blur(10px);
                ">
                    <h3 style="font-size: 1.8rem; margin: 0 0 1rem 0;">${this.question}</h3>
                    <p style="font-size: 1.2rem; margin: 0;">
                        What do you think the majority voted for?
                    </p>
                    ${this.myVote ? `
                        <div style="
                            background: rgba(255, 255, 255, 0.2);
                            padding: 1rem;
                            border-radius: 6px;
                            margin-top: 1rem;
                        ">
                            <p style="margin: 0; font-size: 1rem;">
                                Your vote: <strong>${this.myVote}</strong>
                            </p>
                        </div>
                    ` : ''}
                </div>
                
                <div style="
                    display: flex;
                    gap: 2rem;
                    flex-wrap: wrap;
                    justify-content: center;
                ">
                    ${this.options.map((option, index) => {
                        const emojis = {
                            'Pizza': '🍕',
                            'Burgers': '🍔',
                            'Coffee': '☕',
                            'Tea': '🍵',
                            'Beach': '🏖️',
                            'Mountains': '⛰️'
                        };
                        const emoji = emojis[option] || '';
                        const color = index === 0 ? '#ff6b6b' : '#ee5a24';
                        return `
                            <button class="prediction-btn" data-prediction="${option}" style="
                                background: white;
                                color: ${color};
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
                                ${emoji} ${option}
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render results phase
     */
    renderResultsPhase() {
        
        if (!this.results) {
            return `<div class="everybody-votes-container">Loading results...</div>`;
        }
        
        const option1Votes = this.results[this.options[0]] || 0;
        const option2Votes = this.results[this.options[1]] || 0;
        const totalVotes = this.results.totalVotes || 0;
        
        const option1Percentage = totalVotes > 0 ? Math.round((option1Votes / totalVotes) * 100) : 0;
        const option2Percentage = totalVotes > 0 ? Math.round((option2Votes / totalVotes) * 100) : 0;
        
        const winner = option1Votes > option2Votes ? this.options[0] : 
                      option2Votes > option1Votes ? this.options[1] : 'Tie';
        
        const emojis = {
            'Pizza': '🍕',
            'Burgers': '🍔',
            'Coffee': '☕',
            'Tea': '🍵',
            'Beach': '🏖️',
            'Mountains': '⛰️'
        };
        
        const isLastRound = this.currentRound >= this.totalRounds;
        
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
                ${this.getRoundProgressIndicator()}
                <h2 style="font-size: 2.5rem; margin-bottom: 1rem;">📊 Round ${this.currentRound} Results</h2>
                
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
                            ${option1Votes >= option2Votes ? 'border: 3px solid #FFD700;' : ''}
                        ">
                            <span style="font-size: 1.5rem;">${emojis[this.options[0]] || ''} ${this.options[0]}</span>
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <div style="
                                    background: #ff6b6b;
                                    height: 20px;
                                    border-radius: 10px;
                                    width: ${Math.max(5, option1Percentage * 2)}px;
                                    max-width: 200px;
                                    transition: width 0.3s ease;
                                "></div>
                                <span style="font-weight: bold; min-width: 60px;">${option1Votes} (${option1Percentage}%)</span>
                                ${option1Votes >= option2Votes && option1Votes !== option2Votes ? '<span style="font-size: 1.5rem;">👑</span>' : ''}
                            </div>
                        </div>
                        
                        <div style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 1rem;
                            background: rgba(255, 255, 255, 0.2);
                            border-radius: 8px;
                            ${option2Votes >= option1Votes ? 'border: 3px solid #FFD700;' : ''}
                        ">
                            <span style="font-size: 1.5rem;">${emojis[this.options[1]] || ''} ${this.options[1]}</span>
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <div style="
                                    background: #4ecdc4;
                                    height: 20px;
                                    border-radius: 10px;
                                    width: ${Math.max(5, option2Percentage * 2)}px;
                                    max-width: 200px;
                                    transition: width 0.3s ease;
                                "></div>
                                <span style="font-weight: bold; min-width: 60px;">${option2Votes} (${option2Percentage}%)</span>
                                ${option2Votes >= option1Votes && option1Votes !== option2Votes ? '<span style="font-size: 1.5rem;">👑</span>' : ''}
                            </div>
                        </div>
                    </div>
                    
                    <p style="font-size: 1.4rem; margin: 1rem 0; font-weight: bold;">
                        Winner: ${winner === 'Tie' ? 'It\'s a tie!' : `${winner}`}
                    </p>
                    
                    <p style="font-size: 1.2rem; margin: 1rem 0;">
                        Total votes: ${totalVotes}
                    </p>
                    
                    ${this.myPrediction ? `
                        <div style="
                            background: rgba(255, 255, 255, 0.2);
                            padding: 1rem;
                            border-radius: 6px;
                            margin-top: 1rem;
                        ">
                            <p style="margin: 0; font-size: 1rem;">
                                Your prediction: <strong>${this.myPrediction}</strong>
                                ${this.myPrediction === winner && winner !== 'Tie' ? ' Correct!' : ' Wrong'}
                            </p>
                        </div>
                    ` : ''}
                </div>
                
                ${isLastRound ? `
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
                        margin-top: 1rem;
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        End Game
                    </button>
                ` : (this.isHost ? `
                    <button id="next-question-btn" style="
                        background: #FFD700;
                        color: #4CAF50;
                        border: none;
                        padding: 1rem 2rem;
                        font-size: 1.5rem;
                        font-weight: bold;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.3s;
                        min-width: 200px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        margin-top: 1rem;
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        ➡️ Next Question
                    </button>
                ` : `
                    <p style="font-size: 1.2rem; margin: 1rem 0; opacity: 0.8;">
                        Waiting for host to continue...
                    </p>
                `)}
            </div>
        `;
    }

    /**
     * Render round transition phase
     */
    renderRoundTransitionPhase() {
        
        // Get current scores display
        const scoresHtml = this.getPlayerScoresHtml();
        
        return `
            <div class="everybody-votes-container" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 2rem;
                background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
                border-radius: 12px;
                color: white;
                text-align: center;
            ">
                ${this.getRoundProgressIndicator()}
                <h2 style="font-size: 2.5rem; margin-bottom: 1rem;">Round ${this.currentRound} Complete!</h2>
                
                <div style="
                    background: rgba(255, 255, 255, 0.1);
                    padding: 1.5rem;
                    border-radius: 8px;
                    margin-bottom: 2rem;
                    backdrop-filter: blur(10px);
                    width: 100%;
                    max-width: 600px;
                ">
                    <h3 style="font-size: 1.5rem; margin: 0 0 1rem 0;">Current Standings</h3>
                    ${scoresHtml}
                </div>
                
                ${this.isHost ? `
                    <button id="continue-round-btn" style="
                        background: #FFD700;
                        color: #8e44ad;
                        border: none;
                        padding: 1.5rem 3rem;
                        font-size: 1.8rem;
                        font-weight: bold;
                        border-radius: 12px;
                        cursor: pointer;
                        transition: all 0.3s;
                        min-width: 250px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        🚀 Continue to Next Round
                    </button>
                ` : `
                    <p style="font-size: 1.2rem; margin: 1rem 0; opacity: 0.8;">
                        Waiting for host to continue...
                    </p>
                `}
            </div>
        `;
    }

    /**
     * Render final results phase
     */
    renderFinalResultsPhase() {
        
        const finalScoresHtml = this.getFinalScoresHtml();
        const roundSummaryHtml = this.getRoundSummaryHtml();
        
        return `
            <div class="everybody-votes-container" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 2rem;
                background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                border-radius: 12px;
                color: white;
                text-align: center;
            ">
                <h2 style="font-size: 3rem; margin-bottom: 1rem;">Game Complete!</h2>
                
                <div style="
                    background: rgba(255, 255, 255, 0.1);
                    padding: 1.5rem;
                    border-radius: 8px;
                    margin-bottom: 2rem;
                    backdrop-filter: blur(10px);
                    width: 100%;
                    max-width: 700px;
                ">
                    <h3 style="font-size: 2rem; margin: 0 0 1rem 0;">🥇 Final Leaderboard</h3>
                    ${finalScoresHtml}
                </div>
                
                <div style="
                    background: rgba(255, 255, 255, 0.1);
                    padding: 1.5rem;
                    border-radius: 8px;
                    margin-bottom: 2rem;
                    backdrop-filter: blur(10px);
                    width: 100%;
                    max-width: 700px;
                ">
                    <h3 style="font-size: 1.5rem; margin: 0 0 1rem 0;">📊 Round Summary</h3>
                    ${roundSummaryHtml}
                </div>
                
                <button id="new-game-btn" style="
                    background: #FFD700;
                    color: #c0392b;
                    border: none;
                    padding: 1.5rem 3rem;
                    font-size: 1.8rem;
                    font-weight: bold;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.3s;
                    min-width: 250px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    The End
                </button>
            </div>
        `;
    }

    /**
     * Get player scores HTML
     */
    getPlayerScoresHtml() {
        if (!this.playerScores || Object.keys(this.playerScores).length === 0) {
            return '<p>No scores available</p>';
        }
        
        const sortedScores = Object.entries(this.playerScores)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10); // Show top 10
        
        return `
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                ${sortedScores.map(([playerId, score], index) => `
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 0.75rem;
                        background: rgba(255, 255, 255, ${index === 0 ? '0.3' : '0.15'});
                        border-radius: 6px;
                        ${index === 0 ? 'border: 2px solid #FFD700;' : ''}
                    ">
                        <span style="font-weight: bold;">
                            ${index === 0 ? '1st' : index === 1 ? '2nd' : index === 2 ? '3rd' : `${index + 1}.`}
                            ${this.getPlayerName(playerId)}
                        </span>
                        <span style="font-weight: bold; font-size: 1.2rem;">
                            ${score} point${score !== 1 ? 's' : ''}
                        </span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Get final scores HTML with more details
     */
    getFinalScoresHtml() {
        if (!this.finalScores || this.finalScores.length === 0) {
            return this.getPlayerScoresHtml(); // Fallback to basic scores
        }
        
        return `
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                ${this.finalScores.slice(0, 10).map((player, index) => `
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 1rem;
                        background: rgba(255, 255, 255, ${index === 0 ? '0.3' : '0.15'});
                        border-radius: 8px;
                        ${index === 0 ? 'border: 3px solid #FFD700; box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);' : ''}
                    ">
                        <span style="font-weight: bold; font-size: 1.2rem;">
                            ${index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                            ${player.name}
                        </span>
                        <div style="text-align: right;">
                            <div style="font-weight: bold; font-size: 1.4rem;">
                                ${player.score} point${player.score !== 1 ? 's' : ''}
                            </div>
                            <div style="font-size: 0.9rem; opacity: 0.8;">
                                ${player.correctPredictions}/${this.totalRounds} correct
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Get round summary HTML
     */
    getRoundSummaryHtml() {
        if (!this.roundResults || this.roundResults.length === 0) {
            return '<p>No round data available</p>';
        }
        
        return `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${this.roundResults.map((round, index) => `
                    <div style="
                        padding: 1rem;
                        background: rgba(255, 255, 255, 0.15);
                        border-radius: 6px;
                        border-left: 4px solid #FFD700;
                    ">
                        <div style="font-weight: bold; margin-bottom: 0.5rem;">
                            Round ${index + 1}: ${round.question}
                        </div>
                        <div style="font-size: 0.9rem;">
                            Winner: <strong>${round.winner}</strong> 
                            (${round.winnerVotes}/${round.totalVotes} votes)
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Get player name from ID
     */
    getPlayerName(playerId) {
        if (this.players && this.players[playerId]) {
            return this.players[playerId].name || `Player ${playerId.slice(-4)}`;
        }
        return `Player ${playerId.slice(-4)}`;
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
                    this.myVote = vote; // Remember the vote
                    this.onPlayerAction({
                        type: 'submit_vote',
                        data: { vote: vote }
                    });
                }
            });
        });
        
        // Prediction buttons
        const predictionBtns = this.gameAreaElement.querySelectorAll('.prediction-btn');
        predictionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prediction = e.target.dataset.prediction;
                if (prediction && this.onPlayerAction) {
                    this.myPrediction = prediction; // Remember the prediction
                    this.onPlayerAction({
                        type: 'submit_prediction',
                        data: { prediction: prediction }
                    });
                }
            });
        });
        
        // Next Question button (host only, in results phase)
        const nextQuestionBtn = this.gameAreaElement.querySelector('#next-question-btn');
        if (nextQuestionBtn && this.onPlayerAction) {
            nextQuestionBtn.addEventListener('click', () => {
                this.onPlayerAction({
                    type: 'advance_round',
                    data: {}
                });
            });
        }
        
        // Continue to next round button (host only) - kept for backward compatibility
        const continueRoundBtn = this.gameAreaElement.querySelector('#continue-round-btn');
        if (continueRoundBtn && this.onPlayerAction) {
            continueRoundBtn.addEventListener('click', () => {
                this.onPlayerAction({
                    type: 'advance_round',
                    data: {}
                });
            });
        }
        
        // End Game button
        const endGameBtn = this.gameAreaElement.querySelector('#end-game-btn');
        if (endGameBtn && this.onPlayerAction) {
            endGameBtn.addEventListener('click', () => {
                this.onPlayerAction({
                    type: 'end_game',
                    data: {}
                });
            });
        }
        
        // New Game button
        const newGameBtn = this.gameAreaElement.querySelector('#new-game-btn');
        if (newGameBtn && this.onPlayerAction) {
            newGameBtn.addEventListener('click', () => {
                // Show everyone wins screen
                this.showEveryoneWins();
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
        
        // Update multi-round state
        if (gameSpecificState.currentRound !== undefined) {
            this.currentRound = gameSpecificState.currentRound;
        }
        if (gameSpecificState.totalRounds !== undefined) {
            this.totalRounds = gameSpecificState.totalRounds;
        }
        if (gameSpecificState.roundResults) {
            this.roundResults = gameSpecificState.roundResults;
        }
        if (gameSpecificState.playerScores) {
            this.playerScores = gameSpecificState.playerScores;
        }
        if (gameSpecificState.finalScores) {
            this.finalScores = gameSpecificState.finalScores;
        }
        // Update host status
        if (gameSpecificState.hostId !== undefined) {
            this.isHost = (this.currentPlayerId === gameSpecificState.hostId);
        }
        if (gameSpecificState.isHost !== undefined) {
            this.isHost = gameSpecificState.isHost;
        }
        
        // Update vote counts for progress display
        if (gameSpecificState.votes) {
            this.votesCount = Object.keys(gameSpecificState.votes).length;
            // Check if we already voted
            if (gameSpecificState.votes[this.currentPlayerId]) {
                this.myVote = gameSpecificState.votes[this.currentPlayerId];
            }
        }
        
        // Update predictions
        if (gameSpecificState.predictions) {
            // Check if we already predicted
            if (gameSpecificState.predictions[this.currentPlayerId]) {
                this.myPrediction = gameSpecificState.predictions[this.currentPlayerId];
            }
        }
        
        if (gameSpecificState.players) {
            this.totalPlayers = Object.keys(gameSpecificState.players).length;
            this.players = gameSpecificState.players; // Store for name lookup
        }
        
        // Handle voting timer
        if (gameSpecificState.votingEndTime && this.currentPhase === 'VOTING') {
            this.timeRemaining = Math.max(0, Math.floor((gameSpecificState.votingEndTime - Date.now()) / 1000));
            this.startTimer();
        }
        
        // Handle prediction timer
        if (gameSpecificState.predictionEndTime && this.currentPhase === 'PREDICTING') {
            this.timeRemaining = Math.max(0, Math.floor((gameSpecificState.predictionEndTime - Date.now()) / 1000));
            this.startTimer();
        }
        
        this.render();
    }

    /**
     * Handle WebSocket messages
     */
    handleMessage(message) {
        
        switch (message.type) {
            case 'game_started':
                if (message.data && message.data.phase) {
                    this.currentPhase = message.data.phase;
                    this.question = message.data.question || this.question;
                    this.options = message.data.options || this.options;
                    this.currentRound = message.data.currentRound || 1;
                    this.totalRounds = message.data.totalRounds || 3;
                    if (message.data.hostId) {
                        this.isHost = (this.currentPlayerId === message.data.hostId);
                    }
                }
                this.render();
                break;
                
            case 'phase_changed':
                this.currentPhase = message.phase;
                if (message.phase === 'PREDICTING') {
                    this.clearTimer();
                    if (message.timeLimit) {
                        this.timeRemaining = message.timeLimit;
                        this.startTimer();
                    }
                } else if (this.currentPhase !== 'VOTING' && this.currentPhase !== 'PREDICTING') {
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
                this.myPrediction = null; // Reset prediction for new round
                if (message.currentRound) this.currentRound = message.currentRound;
                if (message.totalRounds) this.totalRounds = message.totalRounds;
                this.startTimer();
                this.render();
                break;
                
            case 'predicting_started':
                this.currentPhase = 'PREDICTING';
                this.timeRemaining = message.data.timeLimit || 15;
                this.startTimer();
                this.render();
                break;
                
            case 'prediction_phase':
                if (message.data) {
                    this.currentPhase = message.data.phase || 'PREDICTING';
                    this.question = message.data.question || this.question;
                    this.options = message.data.options || this.options;
                    this.currentRound = message.data.currentRound || this.currentRound;
                    this.totalRounds = message.data.totalRounds || this.totalRounds;
                }
                this.render();
                break;
                
            case 'vote_confirmed':
                // Vote was successfully recorded
                this.render();
                break;
                
            case 'prediction_confirmed':
                // Prediction was successfully recorded
                this.render();
                break;
                
            case 'vote_count_update':
                this.votesCount = message.votesCount || 0;
                this.totalPlayers = message.totalPlayers || 0;
                this.render();
                break;
                
            case 'vote_progress':
                this.votesCount = message.data.votesCount || 0;
                this.totalPlayers = message.data.totalPlayers || 0;
                this.lastVoterName = message.data.voterName;
                this.allVoted = message.data.allVoted || false;
                this.render();
                break;
                
            case 'round_results':
                this.currentPhase = 'RESULTS';
                this.results = message.data.results;
                this.question = message.data.question;
                this.currentRound = message.data.currentRound;
                if (message.data.playerScores) {
                    this.playerScores = message.data.playerScores;
                }
                if (message.data.roundResults) {
                    this.roundResults = message.data.roundResults;
                }
                this.render();
                break;
                
            // Removed round_transition - we now auto-advance after results
                
            case 'host_assigned':
                this.isHost = (this.currentPlayerId === message.data.hostId);
                this.render();
                break;
                
            case 'voting_results':
                this.currentPhase = 'RESULTS';
                this.results = message.data.results;
                this.question = message.data.question;
                this.render();
                break;
                
            case 'final_summary':
                this.currentPhase = 'ENDED';
                if (message.data.finalScores) {
                    this.finalScores = message.data.finalScores;
                }
                if (message.data.roundResults) {
                    this.roundResults = message.data.roundResults;
                }
                if (message.data.playerScores) {
                    this.playerScores = message.data.playerScores;
                }
                this.render();
                break;
                
            case 'advance_round':
                // Server will send new_round message for the next round
                break;
                
            case 'new_round':
                if (message.data) {
                    this.currentPhase = message.data.phase || 'VOTING';
                    this.question = message.data.question || this.question;
                    this.options = message.data.options || this.options;
                    this.currentRound = message.data.currentRound || this.currentRound;
                    this.totalRounds = message.data.totalRounds || this.totalRounds;
                    this.myVote = null; // Reset vote for new round
                    this.myPrediction = null; // Reset prediction for new round
                    if (message.data.hostId) {
                        this.isHost = (this.currentPlayerId === message.data.hostId);
                    }
                }
                this.render();
                break;
                
            case 'game_results':
                this.currentPhase = 'RESULTS';
                this.results = message.results;
                this.question = message.question;
                this.render();
                break;
                
            case 'game_ended':
                // Don't handle game_ended here - let GameShell show the unified end screen
                // GameShell will call showGameEndScreen() which has the OK button to return to lobby
                break;
                
            case 'final_results':
                // Don't handle final_results here - let GameShell handle the game_ended message
                // to show the unified end screen with proper OK button functionality
                break;
                
            case 'error':
                console.error('Game error:', message.message);
                break;
                
            default:
                break;
        }
    }

    /**
     * Show everyone wins screen
     */
    showEveryoneWins() {
        // Hide the game area
        this.gameAreaElement.style.display = 'none';
        
        // Show the universal end game screen
        const endGameScreen = document.getElementById('end-game-screen');
        const resultMessage = document.getElementById('game-result-message');
        const finalScores = document.getElementById('final-scores');
        const okBtn = document.getElementById('ok-btn');
        
        if (endGameScreen && resultMessage && finalScores) {
            resultMessage.textContent = '🎉 Everyone Wins! 🎉';
            
            // Show player scores
            finalScores.innerHTML = this.getPlayerScoresHtml();
            
            // Show the screen
            endGameScreen.style.display = 'flex';
            
            // Handle OK button
            if (okBtn) {
                okBtn.onclick = () => {
                    if (this.onPlayerAction) {
                        this.onPlayerAction({
                            type: 'end_game',
                            data: {}
                        });
                    }
                };
            }
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
        this.myPrediction = null;
        this.results = null;
        this.votesCount = 0;
        this.totalPlayers = 0;
        this.timeRemaining = 0;
        this.lastVoterName = null;
        this.allVoted = false;
        
        // Reset multi-round state
        this.currentRound = 1;
        this.totalRounds = 3;
        this.roundResults = [];
        this.playerScores = {};
        this.finalScores = [];
        this.isHost = false;
        this.players = null;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EverybodyVotesGameModule;
} else {
    window.EverybodyVotesGameModule = EverybodyVotesGameModule;
}