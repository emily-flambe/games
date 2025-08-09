# Deployment & Operations Guide

## Quick Deployment Checklist

### ✅ Initial Setup (One-time)
```bash
# 1. Install dependencies
npm install

# 2. Verify setup
npm run test:local

# 3. Build frontend
npm run build
```

### ✅ Development Testing
```bash
# 1. Start development server
npm run dev

# 2. In another terminal, test WebSocket connections
npm run test:integration
```

### ✅ Production Deployment
```bash
# 1. Authenticate with Cloudflare (one-time)
npx wrangler login

# 2. Deploy to development environment
npm run deploy

# 3. Deploy to production
npm run deploy:production
```

## Environment Requirements

### Local Development
- Node.js 18+
- npm or yarn
- Port 8777 available

### Production Requirements
- Cloudflare account with Workers enabled
- Wrangler CLI authenticated
- Environment variables configured (via Cloudflare dashboard):
  - `JWT_SECRET`: For session token signing
  - `API_KEY_SALT`: For API key generation

## Testing Status

All tests are passing ✅

### Local Tests
```bash
npm run test:local
# ✅ 5/5 tests passed
```

### Integration Tests
```bash
npm run test:integration
# ✅ 5/5 tests passed (100% success rate)
# ✅ WebSocket infrastructure working correctly
```

### Test Coverage
- ✅ Server startup and basic HTTP endpoints
- ✅ Game session creation and management
- ✅ WebSocket connection establishment
- ✅ WebSocket message exchange (bidirectional)
- ✅ Concurrent WebSocket connections (tested with 3 simultaneous)
- ✅ Durable Object structure validation
- ✅ TypeScript configuration
- ✅ Static asset serving

## API Endpoints

### HTTP API
- `GET /` - Health check
- `GET /api/sessions` - List game sessions
- `POST /api/sessions` - Create new session
- `POST /api/game/:sessionId` - Create/update specific game
- `GET /api/game/:sessionId` - Get game state

### WebSocket Endpoints
- `GET /ws` - Simple WebSocket endpoint (testing)
- `GET /api/game/:sessionId/ws` - Game-specific WebSocket

## Development Workflow

### Frontend Development
1. **Make Changes**: Edit files in `frontend-src/`
2. **Build Frontend**: `npm run build` or `npm run build:watch`
3. **Start Backend**: `npm run dev` 
4. **Test Integration**: `npm run test:integration`

### Backend Development
1. **Make Changes**: Edit files in `src/`
2. **Start Development**: `npm run dev` (with hot reload)
3. **Test Locally**: `npm run test:local`
4. **Deploy**: `npm run deploy`

### Build System Validation

#### Frontend Build Process
- **Input**: TypeScript files in `frontend-src/`
- **Output**: Single JavaScript bundle at `src/static/bundle.js`
- **Process**: Custom TypeScript compiler removes type annotations and bundles modules
- **Watch Mode**: Automatic rebuilding on file changes

#### Backend Build Process
- **Runtime**: Cloudflare Workers with TypeScript support
- **Durable Objects**: Persistent state management
- **WebSocket**: Real-time communication
- **Static Assets**: Served directly from Worker

## Performance Characteristics

- **WebSocket Connections**: Up to 1,000 concurrent per Worker
- **Durable Objects**: ~1,000 concurrent operations per instance
- **Latency**: Edge computing for low-latency gaming
- **Scalability**: Auto-scaling via Cloudflare's global network
- **Frontend Bundle**: Single 23KB JavaScript file

## Security Features

- Same-origin policy for WebSocket connections
- Secure token validation for game sessions
- Isolated game rooms via Durable Objects
- Rate limiting built into Cloudflare Workers
- Input validation for all user data
- CORS configuration for cross-origin requests

## Monitoring & Debugging

### Development Environment
- Console logging for WebSocket events
- Integration tests validate functionality
- Local server at `http://localhost:8777`
- Hot reload for rapid development

### Production Environment
- Cloudflare Workers analytics
- Real-time logs via `wrangler tail`
- Performance metrics in Cloudflare dashboard
- Error tracking and alerting

## Deployment Pipeline

### Continuous Integration
```bash
# Test before deployment
npm run test:local
npm run test:integration
npm run build

# Deploy if tests pass
npm run deploy
```

### Environment Management
- **Development**: Local development with hot reload
- **Staging**: Deploy to staging environment for testing
- **Production**: Deploy to production after validation

### Rollback Strategy
- **Wrangler Versions**: Maintain deployment versions for rollback
- **Configuration Backup**: Store environment variables securely
- **Database State**: Durable Objects provide automatic state persistence

## Troubleshooting

### Common Issues
- **Port 8777 in use**: Kill existing processes or change port in configuration
- **WebSocket connection failed**: Check network connectivity and firewall settings
- **Build failures**: Verify Node.js version and dependencies are installed
- **Deployment errors**: Ensure Wrangler authentication and permissions

### Debug Commands
```bash
# Check logs
wrangler tail

# Local debugging
npm run dev --verbose

# Test WebSocket connections
npm run test:integration

# Validate configuration
npm run test:local
```

## Ready for Production ✅

The Games Platform is fully configured with:
- ✅ Working development environment
- ✅ Comprehensive testing suite  
- ✅ Production deployment pipeline
- ✅ Real-time multiplayer infrastructure
- ✅ Scalable architecture
- ✅ Custom frontend build system
- ✅ WebSocket reconnection and error handling
- ✅ Performance monitoring and debugging tools

Start developing games by running `npm run dev` and connecting to the WebSocket endpoints!