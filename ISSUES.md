# Current Issues

## Critical Build Error - router.ts Syntax Problem
- **Status**: ACTIVE BUG
- **Priority**: P0 - BLOCKING
- **Description**: Duplicate JavaScript code in router.ts causing "Unterminated string literal" build failures
- **Root Cause**: TypeScript bundle ends at line 1342 but duplicate/conflicting JavaScript continues after
- **Current Error**: Build fails with unterminated string literal at line 1343
- **Impact**: Development server won't start, Hello World game testing blocked

## Missing Name/Emoji Change UI Controls
- **Status**: NEEDS VERIFICATION
- **Priority**: P1 - HIGH  
- **Description**: User reported inability to see name/emoji change controls in Hello World game
- **Root Cause**: Frontend serving wrong JavaScript (hardcoded vs TypeScript bundle)
- **Dependencies**: Blocked by router.ts build error above

## Player Disconnect Handling
- **Status**: IMPLEMENTED - NEEDS TESTING
- **Priority**: P2 - MEDIUM
- **Description**: Player list should update when players leave room
- **Implementation**: Added handlePlayerDisconnected() method and broadcast
- **Dependencies**: Blocked by router.ts build error for testing

## Port Configuration
- **Status**: RESOLVED
- **Priority**: P3 - LOW
- **Description**: Must always use port 8777 for development
- **Resolution**: Added permanent reminders to .project/ config files