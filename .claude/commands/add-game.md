---
allowed-tools:
  - Bash
  - Read
  - Edit
  - Write
  - Glob
  - Grep
description: Scaffold a new game type
---

# Add New Game

Create scaffolding for a new game called: $ARGUMENTS

## Steps

1. **Validate game name**
   - Convert to kebab-case for file names (e.g., "my-game")
   - Convert to PascalCase for class names (e.g., "MyGame")

2. **Create Durable Object** at `src/durable-objects/${PascalCase}GameSession.ts`
   - Extend `GameSession` base class
   - Override `createInitialGameState()` with game-specific state
   - Override `handleGameSpecificMessage()` for game actions
   - Export the class

3. **Update wrangler.toml**
   - Add binding under `[[durable_objects.bindings]]`
   - Add same binding under `[[env.staging.durable_objects.bindings]]`
   - Add same binding under `[[env.preview.durable_objects.bindings]]`
   - Add migration under `[[migrations]]` with new tag

4. **Create frontend module** at `src/static/js/games/${PascalCase}GameModule.js`
   - Extend `GameModule` base class
   - Implement `init()`, `render()`, `handleMessage()`, `cleanup()`
   - Implement `getRules()` returning HTML for rules display

5. **Update index.html**
   - Add script tag for the new game module
   - Add game card in the game selection area

6. **Wire up routing**
   - Update `src/index.ts` `handleWebSocket()` to route to new DO
   - Update `src/static/js/GameShell.js` `loadGameModule()` to instantiate new module

7. **Update exports** in `src/index.ts`
   - Export the new Durable Object class

8. **Verify build**
   ```bash
   npm run build
   npm run test:unit
   ```

9. **Report created files and next steps**
   - List all files created/modified
   - Note that game logic still needs implementation
   - Suggest adding tests
