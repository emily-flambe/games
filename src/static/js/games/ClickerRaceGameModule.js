/**
 * ClickerRaceGameModule - Race to click 10 times first
 */
class ClickerRaceGameModule extends GameModule {
    constructor() {
        super();
        this.playerClicks = {};
        this.targetScore = 10;
        this.currentPlayerId = null;
    }

    /**
     * Initialize the clicker race game
     */
    init(gameAreaElement, players, initialState, onPlayerAction, onStateChange, rulesElement) {
        super.init(gameAreaElement, players, initialState, onPlayerAction, onStateChange, rulesElement);

        if (initialState) {
            this.playerClicks = initialState.playerClicks || {};
            this.targetScore = initialState.targetScore || 10;
        }

        this.render();
    }

    /**
     * Handle state updates from server
     */
    handleStateUpdate(gameSpecificState) {
        super.handleStateUpdate(gameSpecificState);

        if (gameSpecificState.playerClicks) {
            this.playerClicks = gameSpecificState.playerClicks;
        }
        if (gameSpecificState.targetScore) {
            this.targetScore = gameSpecificState.targetScore;
        }
        if (gameSpecificState.players) {
            this.players = gameSpecificState.players;
        }

        this.render();
    }

    /**
     * Handle player actions from WebSocket messages
     */
    handlePlayerAction(playerId, action) {
        switch (action.type) {
            case 'click_registered':
                if (action.data) {
                    this.playerClicks = action.data.playerClicks || this.playerClicks;
                    this.render();
                }
                break;
        }
    }

    /**
     * Get game rules HTML
     */
    getRules() {
        return `
            <ul>
                <li>Click the button as fast as you can</li>
                <li>First to ${this.targetScore} clicks wins!</li>
            </ul>
        `;
    }

    /**
     * Handle click button press
     */
    handleClick() {
        if (this.onPlayerAction) {
            this.onPlayerAction({
                type: 'click'
            });
        }
    }

    /**
     * Render the game UI using DOM methods for safety
     */
    render() {
        if (!this.gameAreaElement) return;

        // Clear existing content
        this.gameAreaElement.textContent = '';

        const myClicks = this.playerClicks[this.currentPlayerId] || 0;

        // Create container
        const container = document.createElement('div');
        container.className = 'clicker-race-container';

        // Main section with button
        const main = document.createElement('div');
        main.className = 'clicker-main';

        const btn = document.createElement('button');
        btn.className = 'clicker-button';
        btn.id = 'clicker-btn';
        btn.textContent = 'CLICK!';
        btn.addEventListener('click', () => this.handleClick());

        const countDiv = document.createElement('div');
        countDiv.className = 'clicker-my-count';
        countDiv.textContent = `${myClicks} / ${this.targetScore}`;

        main.appendChild(btn);
        main.appendChild(countDiv);

        // Scoreboard
        const scoreboard = document.createElement('div');
        scoreboard.className = 'clicker-scoreboard';

        const title = document.createElement('h3');
        title.textContent = 'Race Progress';
        scoreboard.appendChild(title);

        const playerEntries = Object.entries(this.players);
        let hasPlayers = false;

        for (const [playerId, player] of playerEntries) {
            if (player.isSpectator) continue;
            hasPlayers = true;

            const clicks = this.playerClicks[playerId] || 0;
            const progress = Math.min(100, (clicks / this.targetScore) * 100);
            const isMe = playerId === this.currentPlayerId;

            const row = document.createElement('div');
            row.className = 'clicker-player-row' + (isMe ? ' is-me' : '');

            const nameSpan = document.createElement('span');
            nameSpan.className = 'clicker-player-name';
            nameSpan.textContent = `${player.emoji || ''} ${player.name || 'Player'}`;

            const progressBar = document.createElement('div');
            progressBar.className = 'clicker-progress-bar';

            const progressFill = document.createElement('div');
            progressFill.className = 'clicker-progress-fill';
            progressFill.style.width = `${progress}%`;

            const progressText = document.createElement('span');
            progressText.className = 'clicker-progress-text';
            progressText.textContent = `${clicks} / ${this.targetScore}`;

            progressBar.appendChild(progressFill);
            progressBar.appendChild(progressText);

            row.appendChild(nameSpan);
            row.appendChild(progressBar);
            scoreboard.appendChild(row);
        }

        if (!hasPlayers) {
            const waiting = document.createElement('p');
            waiting.textContent = 'Waiting for players...';
            scoreboard.appendChild(waiting);
        }

        container.appendChild(main);
        container.appendChild(scoreboard);

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .clicker-race-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 2rem;
                padding: 1rem;
            }
            .clicker-main {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1rem;
            }
            .clicker-button {
                width: 200px;
                height: 200px;
                border-radius: 50%;
                font-size: 2rem;
                font-weight: bold;
                cursor: pointer;
                background: linear-gradient(145deg, #4CAF50, #45a049);
                color: white;
                border: 4px solid #2E7D32;
                box-shadow: 0 6px 0 #1B5E20, 0 8px 20px rgba(0,0,0,0.3);
                transition: all 0.1s ease;
                user-select: none;
            }
            .clicker-button:hover {
                background: linear-gradient(145deg, #5CBF60, #4CAF50);
            }
            .clicker-button:active {
                transform: translateY(4px);
                box-shadow: 0 2px 0 #1B5E20, 0 4px 10px rgba(0,0,0,0.3);
            }
            .clicker-my-count {
                font-size: 1.5rem;
                font-weight: bold;
                color: #333;
            }
            .clicker-scoreboard {
                width: 100%;
                max-width: 400px;
                background: rgba(255,255,255,0.9);
                border-radius: 8px;
                padding: 1rem;
            }
            .clicker-scoreboard h3 {
                margin: 0 0 1rem 0;
                text-align: center;
            }
            .clicker-player-row {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 0.5rem;
            }
            .clicker-player-row.is-me {
                font-weight: bold;
            }
            .clicker-player-name {
                min-width: 100px;
                font-size: 0.9rem;
            }
            .clicker-progress-bar {
                flex: 1;
                height: 24px;
                background: #ddd;
                border-radius: 12px;
                position: relative;
                overflow: hidden;
            }
            .clicker-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #4CAF50, #8BC34A);
                border-radius: 12px;
                transition: width 0.2s ease;
            }
            .clicker-progress-text {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 0.8rem;
                font-weight: bold;
                color: #333;
            }
        `;

        this.gameAreaElement.appendChild(style);
        this.gameAreaElement.appendChild(container);
    }

    /**
     * Get the game's display name
     */
    getDisplayName() {
        return 'Clicker Race';
    }

    /**
     * Get the game's unique identifier
     */
    getGameType() {
        return 'clicker-race';
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClickerRaceGameModule;
} else {
    window.ClickerRaceGameModule = ClickerRaceGameModule;
}
