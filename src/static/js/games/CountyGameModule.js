/**
 * CountyGameModule
 * A silly game where players submit county names and celebrate together
 */
class CountyGameModule extends GameModule {
    constructor() {
        super();
        this.currentPhase = 'WAITING'; // WAITING, COUNTY_SUBMISSION, GAME_OVER
        this.myCounty = null;
        this.submittedCount = 0;
        this.totalPlayers = 0;
        this.timeRemaining = 0;
        this.timerInterval = null;
        this.counties = [];
    }

    /**
     * Initialize the game
     */
    init(gameAreaElement, players, initialState, onPlayerAction, onStateChange, rulesElement) {
        super.init(gameAreaElement, players, initialState, onPlayerAction, onStateChange, rulesElement);
        
        // Set initial state if provided
        if (initialState) {
            this.currentPhase = initialState.phase || 'WAITING';
            this.counties = initialState.counties || {};
            this.timeRemaining = initialState.timeLimit || 30;
            
            // Calculate time remaining from server end time
            if (initialState.submissionEndTime) {
                const now = Date.now();
                this.timeRemaining = Math.max(0, Math.floor((initialState.submissionEndTime - now) / 1000));
            }
        }
        
        this.totalPlayers = Object.keys(this.players).length;
        this.render();
    }

    /**
     * Get game rules HTML
     */
    getRules() {
        return `
            <h3>County Game</h3>
            <ul>
                <li>enter the name of a county</li>
                <li>everybody wins!</li>
            </ul>
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
            case 'COUNTY_SUBMISSION':
                content = this.renderSubmissionPhase();
                break;
            case 'GAME_OVER':
                // Game over is handled by the shell's win screen
                content = '';
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
        return `
            <div class="county-game-waiting">
                <h2>County Game</h2>
                <p>Waiting for the host to start the game...</p>
                <p>Get ready to share your county!</p>
            </div>
        `;
    }

    /**
     * Render submission phase
     */
    renderSubmissionPhase() {
        const hasSubmitted = this.myCounty !== null;
        
        return `
            <div class="county-game-submission">
                <h2>Submit Your County!</h2>
                <div class="timer-display">Time remaining: ${this.timeRemaining}s</div>
                
                ${hasSubmitted ? `
                    <div class="submission-complete">
                        <p>✅ County submitted!</p>
                        <p class="submitted-county">You submitted: <strong>${this.myCounty}</strong></p>
                        <p>Waiting for others...</p>
                        <div class="submission-status">
                            ${this.submittedCount} of ${this.totalPlayers} players submitted
                        </div>
                    </div>
                ` : `
                    <div class="submission-form">
                        <p>Enter a county name (where you're from, where you live, or any county!):</p>
                        <input 
                            type="text" 
                            id="county-input" 
                            placeholder="Enter a county name..." 
                            maxlength="100"
                            autocomplete="off"
                        />
                        <button id="submit-county-btn" class="submit-btn">Submit County</button>
                    </div>
                `}
            </div>
        `;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Submit county button
        const submitBtn = this.gameAreaElement?.querySelector('#submit-county-btn');
        const countyInput = this.gameAreaElement?.querySelector('#county-input');
        
        if (submitBtn && countyInput) {
            submitBtn.addEventListener('click', () => this.submitCounty());
            countyInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.submitCounty();
                }
            });
            
            // Focus the input
            countyInput.focus();
        }
    }

    /**
     * Submit county to server
     */
    submitCounty() {
        const countyInput = this.gameAreaElement?.querySelector('#county-input');
        if (!countyInput) return;
        
        const county = countyInput.value.trim();
        if (!county) {
            alert('Please enter a county name!');
            return;
        }
        
        // Send to server
        if (this.onPlayerAction) {
            this.onPlayerAction({
                type: 'submit_county',
                county: county
            });
        }
        
        // Store locally
        this.myCounty = county;
        this.render();
    }

    /**
     * Handle state updates from server
     */
    handleStateUpdate(gameSpecificState) {
        super.handleStateUpdate(gameSpecificState);
        
        if (gameSpecificState.phase) {
            this.currentPhase = gameSpecificState.phase;
        }
        
        if (gameSpecificState.counties) {
            this.counties = gameSpecificState.counties;
        }
        
        if (gameSpecificState.submissionEndTime) {
            const now = Date.now();
            this.timeRemaining = Math.max(0, Math.floor((gameSpecificState.submissionEndTime - now) / 1000));
            
            if (this.currentPhase === 'COUNTY_SUBMISSION' && this.timeRemaining > 0) {
                this.startTimer();
            }
        }
        
        this.render();
    }

    /**
     * Handle messages from server
     */
    handleMessage(message) {
        switch (message.type) {
            case 'phase_changed':
                this.currentPhase = message.phase;
                if (message.phase === 'COUNTY_SUBMISSION') {
                    // Clear previous submission
                    this.myCounty = null;
                    this.submittedCount = 0;
                }
                this.render();
                break;
                
            case 'county_submission_started':
                this.timeRemaining = message.timeLimit || 30;
                this.startTimer();
                this.render();
                break;
                
            case 'county_submitted':
                // Confirmation of our submission
                this.myCounty = message.county;
                this.render();
                break;
                
            case 'submission_update':
                this.submittedCount = message.submittedCount;
                this.totalPlayers = message.totalPlayers;
                this.render();
                break;
                
            case 'game_ended':
                // Game ended is handled by the shell - just cleanup
                this.clearTimer();
                break;
        }
    }

    /**
     * Cleanup when leaving game
     */
    cleanup() {
        this.clearTimer();
        super.cleanup();
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CountyGameModule;
} else {
    window.CountyGameModule = CountyGameModule;
}