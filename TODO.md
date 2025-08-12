# TODO - Everybody Votes MVP

## ✅ Completed
- [x] Refactored architecture to use modular Durable Objects
- [x] Created base GameSession class with shared functionality
- [x] Created CheckboxGameSession for checkbox game
- [x] Created EverybodyVotesGameSession for Everybody Votes
- [x] Extracted GameSessionRegistry to separate file
- [x] Updated routing to use appropriate Durable Object based on game type
- [x] Created frontend EverybodyVotesGameModule with full UI
- [x] Fixed game type mapping (everybody-votes instead of votes-game)
- [x] Built and deployed with wrangler
- [x] Verified backend creates rooms successfully

## 🔧 In Progress / Needs Testing
- [ ] **Multi-player Puppeteer test** - Create proper test with multiple browser windows to test full game flow:
  - Host creates room
  - 2+ players join
  - Host starts game
  - All players vote (different choices)
  - All players predict
  - Verify results display correctly
  - Verify prediction accuracy is calculated

## 🐛 Known Issues
1. **Start button not appearing in test** - The game module may not be initializing properly in the waiting room. Need to debug why the start button doesn't render for the host.

2. **Game module initialization** - The EverybodyVotesGameModule needs to properly receive the initial state and render the waiting phase with the start button for hosts.

## 📝 Next Steps

### Immediate fixes needed:
1. Debug why the start button isn't showing for the host in the waiting room
2. Ensure the game module properly initializes with the correct host ID
3. Write comprehensive multi-player Puppeteer test

### Future enhancements (after MVP is working):
1. Add multiple questions (question bank)
2. Add demographic collection (optional)
3. Add demographic breakdowns in results
4. Add cumulative scoring across multiple rounds
5. Add spectator view for live results
6. Add player-submitted questions
7. Add more visual polish and animations
8. Add sound effects
9. Add end-game summary with winners

## 📋 Test Checklist
- [ ] Single player can create room
- [ ] Host sees start button
- [ ] Multiple players can join room
- [ ] Host can start game
- [ ] All players can vote
- [ ] Game transitions to prediction phase after all votes
- [ ] All players can predict
- [ ] Results display correctly
- [ ] Prediction accuracy is shown
- [ ] Game completes successfully

## 🔍 Debug Notes
- Wrangler is running at `http://localhost:8777`
- Game successfully creates rooms with type 'everybody-votes'
- Backend Durable Object is working correctly
- Frontend module is loaded but may have initialization issues
- The test files `test-everybody-votes.js` and `test-simple.js` are available for debugging