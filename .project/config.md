# Games Platform Project Configuration

## Project Overview
A multiplayer games platform built on Cloudflare Workers with real-time WebSocket communication using Durable Objects. The platform hosts four interactive games with a focus on simplicity and performance.

## Architecture
- **Runtime**: Cloudflare Workers
- **Real-time Communication**: WebSocket connections via Durable Objects
- **Frontend**: Vanilla TypeScript (no React framework)
- **Deployment**: Single Worker deployment with bundled static assets
- **State Management**: Durable Objects for session persistence

## Games Portfolio
1. **Drawing Game**: Collaborative real-time drawing with shared canvas
2. **Bracket Tournament**: Tournament-style elimination brackets
3. **Voting System**: Real-time voting with live result updates
4. **Price Guessing**: Price estimation game with scoring

## Technical Stack
- **Language**: TypeScript
- **Platform**: Cloudflare Workers
- **WebSocket Management**: Durable Objects
- **Frontend**: Vanilla TypeScript + HTML5 Canvas (for drawing)
- **Build Tool**: Wrangler CLI
- **Asset Bundling**: Workers Sites or direct asset embedding

## Key Features
- Real-time multiplayer functionality
- WebSocket-based communication
- Session persistence via Durable Objects
- Responsive web interface
- Cross-game user sessions
- Live game state synchronization

## Development Approach
- Simplicity over complexity
- Minimal dependencies
- Edge-first architecture
- TypeScript throughout
- WebSocket-native communication

## Performance Requirements
- Sub-100ms WebSocket message handling
- Global edge deployment
- Minimal cold start times
- Efficient memory usage within Workers limits

## Security Considerations
- WebSocket connection validation
- Rate limiting per session
- Input sanitization for all user data
- CORS configuration for cross-origin requests