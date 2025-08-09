import { GamePortal } from './GamePortal';
import { GameRoom } from './GameRoom';

// WebSocket connection manager
class WebSocketManager {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private messageHandlers: Map<string, (data: any) => void> = new Map();
    private connectionListeners: Set<(connected: boolean) => void> = new Set();

    constructor() {
        // WebSocket connection disabled for now
        // this.connect();
    }

    private connect(): void {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            this.setupEventHandlers();
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.scheduleReconnect();
        }
    }

    private setupEventHandlers(): void {
        if (!this.ws) return;

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
            this.updateConnectionStatus(true);
        };

        this.ws.onclose = (event) => {
            console.log('WebSocket disconnected:', event.code, event.reason);
            this.updateConnectionStatus(false);
            if (!event.wasClean) {
                this.scheduleReconnect();
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };
    }

    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        setTimeout(() => {
            console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.connect();
        }, delay);
    }

    private handleMessage(message: any): void {
        const { type, data } = message;
        const handler = this.messageHandlers.get(type);
        if (handler) {
            handler(data);
        } else {
            console.warn('No handler for message type:', type);
        }
    }

    private updateConnectionStatus(connected: boolean): void {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.textContent = connected ? 'Connected' : 'Disconnected';
            statusElement.className = connected ? 'status-connected' : 'status-disconnected';
        }

        this.connectionListeners.forEach(listener => listener(connected));
    }

    public send(type: string, data?: any): boolean {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket not connected');
            return false;
        }

        try {
            this.ws.send(JSON.stringify({ type, data }));
            return true;
        } catch (error) {
            console.error('Failed to send WebSocket message:', error);
            return false;
        }
    }

    public onMessage(type: string, handler: (data: any) => void): void {
        this.messageHandlers.set(type, handler);
    }

    public onConnectionChange(listener: (connected: boolean) => void): void {
        this.connectionListeners.add(listener);
    }

    public removeMessageHandler(type: string): void {
        this.messageHandlers.delete(type);
    }

    public isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    public close(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

// Application state manager
class App {
    private wsManager: WebSocketManager;
    private gamePortal: GamePortal;
    private gameRoom: GameRoom;
    private currentView: 'portal' | 'room' = 'portal';

    constructor() {
        this.wsManager = new WebSocketManager();
        this.gamePortal = new GamePortal(this.wsManager, this);
        this.gameRoom = new GameRoom(this.wsManager, this);
        
        this.setupGlobalMessageHandlers();
        this.hideLoadingOverlay();
        
        // Update connection status to show no WebSocket
        this.updateConnectionStatus();
    }
    
    private updateConnectionStatus(): void {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.textContent = 'No WebSocket';
            statusElement.className = 'status-disconnected';
        }
    }

    private setupGlobalMessageHandlers(): void {
        this.wsManager.onMessage('error', (data) => {
            this.showError(data.message || 'An error occurred');
        });

        this.wsManager.onMessage('room_joined', (data) => {
            this.switchToGameRoom(data.roomCode, data.gameType);
        });

        this.wsManager.onConnectionChange((connected) => {
            if (!connected && this.currentView === 'room') {
                this.showError('Connection lost. Returning to game portal.');
                setTimeout(() => this.switchToGamePortal(), 2000);
            }
        });
    }

    public switchToGameRoom(roomCode: string, gameType: string): void {
        this.currentView = 'room';
        this.hideView('game-portal');
        this.showView('game-room');
        this.gameRoom.initialize(roomCode, gameType);
    }

    public switchToGamePortal(): void {
        this.currentView = 'portal';
        this.hideView('game-room');
        this.showView('game-portal');
        this.gameRoom.cleanup();
    }

    private showView(viewId: string): void {
        const view = document.getElementById(viewId);
        if (view) {
            view.classList.add('active');
        }
    }

    private hideView(viewId: string): void {
        const view = document.getElementById(viewId);
        if (view) {
            view.classList.remove('active');
        }
    }

    public showError(message: string, duration: number = 5000): void {
        const container = document.getElementById('error-container');
        if (!container) return;

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;

        container.appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.classList.add('fade-out');
            setTimeout(() => {
                container.removeChild(errorDiv);
            }, 300);
        }, duration);
    }

    private hideLoadingOverlay(): void {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
});

export { App, WebSocketManager };