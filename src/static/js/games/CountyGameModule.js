/**
 * CountyGameModule
 * A silly game where players submit county names and celebrate together
 */
class CountyGameModule extends GameModule {
    constructor() {
        super();
        this.currentPhase = 'WAITING'; // WAITING, COUNTY_SUBMISSION, COUNTY_ANNOUNCEMENT, GAME_OVER
        this.myCounty = null;
        this.submittedCount = 0;
        this.totalPlayers = 0;
        this.timeRemaining = 0;
        this.timerInterval = null;
        this.counties = {};
        this.currentAnnouncement = null;
        this.canConclude = false;
        this.isHost = false;
    }

    /**
     * Initialize the game
     */
    init(gameAreaElement, players, initialState, onPlayerAction, onStateChange, rulesElement) {
        super.init(gameAreaElement, players, initialState, onPlayerAction, onStateChange, rulesElement);
        
        // Check if current player is host
        if (initialState && initialState.hostId) {
            this.isHost = (this.currentPlayerId === initialState.hostId);
        }
        
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
     * Update submission status without re-rendering the entire UI
     */
    updateSubmissionStatus() {
        // Update all submission status elements (both in form and in submitted view)
        const statusElements = this.gameAreaElement?.querySelectorAll('.submission-status');
        if (statusElements) {
            statusElements.forEach(element => {
                element.textContent = `${this.submittedCount} of ${this.totalPlayers} players submitted`;
            });
        }
    }

    /**
     * Render the game UI based on current phase
     */
    render() {
        if (!this.gameAreaElement) return;
        
        // Preserve current input value if it exists
        const existingInput = this.gameAreaElement.querySelector('#county-input');
        const preservedValue = existingInput ? existingInput.value : '';
        
        let content = '';
        
        switch (this.currentPhase) {
            case 'WAITING':
                content = this.renderWaitingPhase();
                break;
            case 'COUNTY_SUBMISSION':
                content = this.renderSubmissionPhase();
                break;
            case 'COUNTY_ANNOUNCEMENT':
                content = this.renderAnnouncementPhase();
                break;
            case 'GAME_OVER':
                // Game over is handled by the shell's win screen
                content = '';
                break;
            default:
                content = this.renderWaitingPhase();
        }
        
        this.gameAreaElement.innerHTML = content;
        
        // Restore input value if we're still in submission phase and haven't submitted yet
        if (this.currentPhase === 'COUNTY_SUBMISSION' && !this.myCounty && preservedValue) {
            const newInput = this.gameAreaElement.querySelector('#county-input');
            if (newInput) {
                newInput.value = preservedValue;
            }
        }
        
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
                        <div class="submission-status">
                            ${this.submittedCount} of ${this.totalPlayers} players submitted
                        </div>
                    </div>
                `}
            </div>
        `;
    }

    /**
     * Render announcement phase
     */
    renderAnnouncementPhase() {
        let content = `
            <div class="county-game-announcement">
                <h2>County Announcements</h2>
        `;

        if (this.currentAnnouncement) {
            content += `
                <div class="announcement-display">
                    <div class="player-number">PLAYER ${this.currentAnnouncement.playerNumber}</div>
                    <div class="player-info">
                        <span class="player-emoji">${this.currentAnnouncement.playerEmoji}</span>
                        <span class="player-name">${this.currentAnnouncement.playerName}</span>
                    </div>
                    <div class="county-name">"${this.currentAnnouncement.county}"</div>
                </div>
            `;
        } else {
            // Show different message for host vs other players
            if (this.isHost) {
                content += `
                    <div class="announcement-waiting">
                        <p>Click BEGIN to start the excitement!</p>
                    </div>
                `;
            } else {
                content += `
                    <div class="announcement-waiting">
                        <p>Waiting for host to begin announcements...</p>
                    </div>
                `;
            }
        }

        // Show controls for host
        if (this.isHost) {
            content += '<div class="host-controls">';
            
            if (!this.currentAnnouncement) {
                content += '<button id="begin-btn" class="control-btn">BEGIN</button>';
            } else if (this.canConclude) {
                content += '<button id="conclude-btn" class="control-btn">CONCLUDE</button>';
            } else if (!this.currentAnnouncement.isLast) {
                content += '<button id="next-btn" class="control-btn">NEXT</button>';
            } else {
                content += '<p>All players announced!</p>';
                content += '<button id="conclude-btn" class="control-btn">CONCLUDE</button>';
            }
            
            content += '</div>';
        }

        content += '</div>';
        return content;
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

        // Announcement phase buttons (host only)
        const beginBtn = this.gameAreaElement?.querySelector('#begin-btn');
        const nextBtn = this.gameAreaElement?.querySelector('#next-btn');
        const concludeBtn = this.gameAreaElement?.querySelector('#conclude-btn');

        if (beginBtn) {
            beginBtn.addEventListener('click', () => {
                if (this.onPlayerAction) {
                    this.onPlayerAction({
                        type: 'begin_announcements'
                    });
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.onPlayerAction) {
                    this.onPlayerAction({
                        type: 'next_announcement'
                    });
                }
            });
        }

        if (concludeBtn) {
            concludeBtn.addEventListener('click', () => {
                if (this.onPlayerAction) {
                    this.onPlayerAction({
                        type: 'conclude_announcements'
                    });
                }
            });
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
        // Update game state without calling super to control rendering
        this.gameState = { ...this.gameState, ...gameSpecificState };
        
        // Track if phase changed to determine if we need to re-render
        const previousPhase = this.currentPhase;
        
        // Check if we have the full gameState to determine host
        if (gameSpecificState.hostId) {
            this.isHost = (this.currentPlayerId === gameSpecificState.hostId);
        }
        
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
        
        // Only render if phase changed or we're not in submission phase
        // This prevents re-rendering (and clearing inputs) during submission updates
        if (previousPhase !== this.currentPhase || this.currentPhase !== 'COUNTY_SUBMISSION') {
            this.render();
        }
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
                } else if (message.phase === 'COUNTY_ANNOUNCEMENT') {
                    // Reset announcement state
                    this.currentAnnouncement = null;
                    this.canConclude = false;
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
                // Only update the submission status display, don't re-render the whole UI
                this.updateSubmissionStatus();
                break;
                
            case 'player_announcement':
                // Display the current player's county
                this.currentAnnouncement = message.data;
                this.canConclude = false;
                this.render();
                break;
                
            case 'all_announced':
                // All players have been announced, can now conclude
                this.canConclude = true;
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