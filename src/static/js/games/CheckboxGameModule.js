/**
 * CheckboxGameModule - Implements the checkbox game as a GameModule
 * Manages a 3x3 grid of checkboxes where players collaborate to check all boxes
 */
class CheckboxGameModule extends GameModule {
    constructor() {
        super();
        this.checkboxStates = new Array(9).fill(false); // 3x3 grid
        this.checkboxPlayers = {}; // Track which player checked each box
        this.playerScores = {}; // Track player scores
    }

    /**
     * Initialize the checkbox game
     */
    init(gameAreaElement, players, initialState, onPlayerAction, onStateChange) {
        super.init(gameAreaElement, players, initialState, onPlayerAction, onStateChange);
        
        // Initialize game state
        if (initialState) {
            this.checkboxStates = initialState.checkboxStates || new Array(9).fill(false);
            this.checkboxPlayers = initialState.checkboxPlayers || {};
            this.playerScores = initialState.playerScores || {};
        }
        
        this.render();
    }

    /**
     * Handle state updates from server
     */
    handleStateUpdate(gameSpecificState) {
        super.handleStateUpdate(gameSpecificState);
        
        if (gameSpecificState.checkboxStates) {
            this.checkboxStates = gameSpecificState.checkboxStates;
        }
        if (gameSpecificState.checkboxPlayers) {
            this.checkboxPlayers = gameSpecificState.checkboxPlayers;
        }
        if (gameSpecificState.playerScores) {
            this.playerScores = gameSpecificState.playerScores;
        }
        
        this.render();
    }

    /**
     * Handle player actions from WebSocket messages
     */
    handlePlayerAction(playerId, action) {
        switch (action.type) {
            case 'checkbox_toggled':
                if (action.data) {
                    const { checkboxIndex, newState } = action.data;
                    this.checkboxStates[checkboxIndex] = newState;
                    if (newState) {
                        this.checkboxPlayers[checkboxIndex] = playerId;
                    } else {
                        delete this.checkboxPlayers[checkboxIndex];
                    }
                    this.updateCheckboxUI(checkboxIndex, newState, playerId);
                    this.updateScoreboard();
                }
                break;
        }
    }

    /**
     * Check win condition - all checkboxes must be checked
     */
    getWinCondition() {
        const allChecked = this.checkboxStates.every(state => state === true);
        if (allChecked) {
            // Calculate final scores
            const finalScores = {};
            Object.values(this.players).forEach(player => {
                finalScores[player.id] = this.getPlayerScore(player.id);
            });
            
            // Find winner (player with most checkboxes)
            let winnerId = null;
            let maxScore = -1;
            Object.entries(finalScores).forEach(([playerId, score]) => {
                if (score > maxScore) {
                    maxScore = score;
                    winnerId = playerId;
                }
            });

            return {
                winnerId,
                points: finalScores
            };
        }
        return null;
    }

    /**
     * Render the checkbox game UI
     */
    render() {
        if (!this.gameAreaElement) return;

        this.gameAreaElement.innerHTML = `
            <div class="checkbox-game-container">
                <div class="game-info">
                    <h3>Shared Checkbox Grid</h3>
                    <p>Click any checkbox to toggle it. Changes are shared with all players in real-time!</p>
                </div>
                
                <div class="game-layout">
                    <!-- Scoreboard on the left -->
                    <div id="scoreboard" class="scoreboard">
                        <h4>Scoreboard</h4>
                        <div id="score-list" class="score-list">
                            <!-- Scores will be populated -->
                        </div>
                    </div>
                    
                    <!-- Checkbox grid in the center -->
                    <div id="checkbox-grid" class="checkbox-grid">
                        <!-- 3x3 checkbox grid will be generated -->
                    </div>
                </div>
            </div>
        `;

        this.initializeCheckboxGrid();
        this.updateScoreboard();
    }

    /**
     * Initialize the 3x3 checkbox grid
     */
    initializeCheckboxGrid() {
        const checkboxGrid = this.gameAreaElement.querySelector('#checkbox-grid');
        if (!checkboxGrid) {
            console.error('Checkbox grid element not found!');
            return;
        }

        // Clear any existing content
        checkboxGrid.innerHTML = '';
        
        // Create 3x3 grid of checkboxes (9 total)
        for (let i = 0; i < 9; i++) {
            const checkboxItem = document.createElement('div');
            checkboxItem.className = 'checkbox-item';
            checkboxItem.dataset.index = i;
            
            const checkboxIcon = document.createElement('span');
            checkboxIcon.className = 'checkbox-icon';
            
            // Determine the icon to show (player emoji or checkmark)
            if (this.checkboxStates[i]) {
                const playerId = this.checkboxPlayers[i];
                if (playerId && this.players[playerId]) {
                    const player = this.players[playerId];
                    checkboxIcon.textContent = player.emoji || '✓';
                } else {
                    checkboxIcon.textContent = '✓';
                }
            } else {
                checkboxIcon.textContent = '';
            }
            
            checkboxItem.appendChild(checkboxIcon);
            
            // Add click handler
            checkboxItem.addEventListener('click', () => {
                this.toggleCheckbox(i);
            });
            
            checkboxGrid.appendChild(checkboxItem);
            
            // Update visual state
            if (this.checkboxStates[i]) {
                checkboxItem.classList.add('checked');
            }
        }
    }

    /**
     * Toggle a checkbox (send action to server)
     */
    toggleCheckbox(checkboxIndex) {
        // Prevent spectators from taking actions
        if (this.isSpectator) {
            this.showError?.('Spectators cannot interact with the game');
            return;
        }

        if (this.onPlayerAction) {
            // Add visual feedback
            const checkboxItem = this.gameAreaElement.querySelector(`.checkbox-item[data-index="${checkboxIndex}"]`);
            if (checkboxItem) {
                checkboxItem.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    checkboxItem.style.transform = '';
                }, 150);
            }
            
            // Send toggle action to server via shell
            this.onPlayerAction('checkbox_toggle', {
                type: 'toggle_checkbox',
                data: { checkboxIndex: checkboxIndex }
            });
        }
    }

    /**
     * Update the UI for a specific checkbox
     */
    updateCheckboxUI(checkboxIndex, newState, playerId = null) {
        const checkboxItem = this.gameAreaElement.querySelector(`.checkbox-item[data-index="${checkboxIndex}"]`);
        if (!checkboxItem) return;
        
        const checkboxIcon = checkboxItem.querySelector('.checkbox-icon');
        if (!checkboxIcon) return;
        
        if (newState) {
            checkboxItem.classList.add('checked');
            
            // Show the player's emoji if we know who checked it
            if (playerId && this.players[playerId]) {
                const player = this.players[playerId];
                checkboxIcon.textContent = player.emoji || '✓';
            } else {
                checkboxIcon.textContent = '✓';
            }
        } else {
            checkboxItem.classList.remove('checked');
            checkboxIcon.textContent = '';
        }
    }

    /**
     * Update the scoreboard display
     */
    updateScoreboard() {
        const scoreList = this.gameAreaElement.querySelector('#score-list');
        if (!scoreList) return;
        
        scoreList.innerHTML = '';
        
        // Sort players by score (descending)
        const sortedPlayers = Object.values(this.players)
            .filter(player => !player.isSpectator)
            .sort((a, b) => this.getPlayerScore(b.id) - this.getPlayerScore(a.id));
        
        sortedPlayers.forEach(player => {
            const score = this.getPlayerScore(player.id);
            const scoreItem = document.createElement('div');
            scoreItem.className = 'score-item';
            scoreItem.innerHTML = `
                <span class="score-player">${player.emoji} ${player.name}</span>
                <span class="score-points">${score}</span>
            `;
            scoreList.appendChild(scoreItem);
        });
    }

    /**
     * Get score for a specific player
     */
    getPlayerScore(playerId) {
        let score = 0;
        for (let i = 0; i < this.checkboxStates.length; i++) {
            if (this.checkboxStates[i] && this.checkboxPlayers[i] === playerId) {
                score++;
            }
        }
        return score;
    }

    /**
     * Game-specific methods
     */
    getDisplayName() {
        return 'Checkbox Game';
    }

    getGameType() {
        return 'checkbox-game';
    }

    /**
     * Clean up checkbox game resources
     */
    cleanup() {
        this.checkboxStates = new Array(9).fill(false);
        this.checkboxPlayers = {};
        this.playerScores = {};
        super.cleanup();
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CheckboxGameModule;
} else {
    window.CheckboxGameModule = CheckboxGameModule;
}