// Game Shell Architecture - New Main Application
// Replaces monolithic GameClient with modular GameShell + GameModules

/**
 * Main Application class that coordinates the GameShell
 */
class GameApp {
    constructor() {
        this.gameShell = null;
        this.init();
    }

    init() {
        // Initialize the game shell
        this.gameShell = new GameShell();
        
        // Integrate active rooms functionality with shell
        this.integrateActiveRooms();
        
        // Load and display version information
        this.loadVersionInfo();
        
        // Initialize the shell
        this.gameShell.init();
    }

    /**
     * Integrate active rooms functionality with GameShell
     */
    integrateActiveRooms() {
        // Override shell's loadActiveRooms with existing functionality
        this.gameShell.loadActiveRooms = () => {
            this.loadActiveRooms();
        };

        // Override shell's refresh methods
        this.gameShell.startActiveRoomsRefresh = () => {
            this.startActiveRoomsRefresh();
        };

        this.gameShell.stopActiveRoomsRefresh = () => {
            this.stopActiveRoomsRefresh();
        };

        // Add refresh button handler
        const refreshBtn = document.getElementById('refresh-rooms-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadActiveRooms();
            });
        }
    }

    /**
     * Load active rooms from server
     */
    async loadActiveRooms() {
        if (this.gameShell.isRefreshing) return;
        
        this.gameShell.isRefreshing = true;
        const roomsList = document.getElementById('active-rooms-list');
        
        try {
            if (roomsList) {
                roomsList.innerHTML = '<div class="loading-rooms">Loading rooms...</div>';
            }
            
            const response = await fetch('/api/active-rooms');
            const data = await response.json();
            
            if (roomsList) {
                this.displayActiveRooms(data.rooms || []);
            }
        } catch (error) {
            console.error('Failed to load active rooms:', error);
            if (roomsList) {
                roomsList.innerHTML = '<div class="error-rooms">Failed to load rooms</div>';
            }
        } finally {
            this.gameShell.isRefreshing = false;
        }
    }

    /**
     * Display active rooms in the UI
     */
    displayActiveRooms(rooms) {
        const roomsList = document.getElementById('active-rooms-list');
        if (!roomsList) return;

        if (rooms.length === 0) {
            roomsList.innerHTML = '<div class="no-rooms">No active rooms</div>';
            return;
        }

        roomsList.innerHTML = '';
        
        rooms.forEach(room => {
            const roomDiv = document.createElement('div');
            roomDiv.className = 'room-item';
            
            const playerCount = room.playerCount || 0;
            const maxPlayers = room.maxPlayers || 8;
            const gameType = this.formatGameName(room.gameType || 'Unknown');
            const status = room.status || 'waiting';
            
            roomDiv.innerHTML = `
                <div class="room-info">
                    <div class="room-code">${room.sessionId}</div>
                    <div class="room-details">
                        <span class="game-type">${gameType}</span>
                        <span class="player-count">${playerCount}/${maxPlayers} players</span>
                        <span class="room-status status-${status}">${this.formatStatus(status)}</span>
                    </div>
                </div>
                <button class="join-room-button" data-room-code="${room.sessionId}">
                    Join
                </button>
            `;
            
            // Add click handler for join button
            const joinBtn = roomDiv.querySelector('.join-room-button');
            if (joinBtn) {
                joinBtn.addEventListener('click', () => {
                    this.gameShell.joinExistingRoom(room.sessionId);
                });
            }
            
            roomsList.appendChild(roomDiv);
        });
    }

    /**
     * Format game name for display
     */
    formatGameName(gameType) {
        return gameType
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Format room status for display
     */
    formatStatus(status) {
        switch (status) {
            case 'waiting': return 'Waiting';
            case 'playing': return 'In Progress';
            case 'finished': return 'Finished';
            default: return status;
        }
    }

    /**
     * Start auto-refresh for active rooms
     */
    startActiveRoomsRefresh() {
        // Clear any existing interval
        this.stopActiveRoomsRefresh();
        
        this.gameShell.refreshInterval = setInterval(() => {
            // Only refresh if on portal view and not in a game
            const portalView = document.getElementById('game-portal');
            if (portalView && portalView.classList.contains('active') && !this.gameShell.sessionId) {
                this.loadActiveRooms();
            }
        }, 5000); // Refresh every 5 seconds
    }

    /**
     * Stop auto-refresh
     */
    stopActiveRoomsRefresh() {
        if (this.gameShell.refreshInterval) {
            clearInterval(this.gameShell.refreshInterval);
            this.gameShell.refreshInterval = null;
        }
    }

    /**
     * Load and display version information
     */
    async loadVersionInfo() {
        try {
            const response = await fetch('/static/version.json');
            const versionInfo = await response.json();
            
            const versionDisplay = document.getElementById('version-display');
            if (versionDisplay) {
                versionDisplay.textContent = `running version ${versionInfo.version}, last deployed on ${versionInfo.deployedAt}`;
            }
        } catch (error) {
            console.warn('Could not load version info:', error);
            const versionDisplay = document.getElementById('version-display');
            if (versionDisplay) {
                versionDisplay.textContent = 'version info unavailable';
            }
        }
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Initializing Game Shell Architecture...');
    window.gameApp = new GameApp();
    console.log('✅ Game Shell Architecture initialized successfully');
});