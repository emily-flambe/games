# Requirements Document

## Introduction

The Price Is Wrong game is a multiplayer guessing game where players view product images and names, then guess the actual price to earn points based on accuracy. The game integrates with external product APIs (like Etsy) to provide real product data, creating an engaging and educational experience about market pricing. Players compete across multiple rounds with different product categories, and points are awarded based on how close their guesses are to the actual prices.

## Requirements

### Requirement 1

**User Story:** As a host, I want to configure game settings and control the game flow, so that I can create an engaging experience for all participants.

#### Acceptance Criteria

1. WHEN the host creates a new Price Is Wrong game THEN the system SHALL provide options to select product categories (vintage, handmade, electronics, etc.)
2. WHEN the host configures the game THEN the system SHALL allow setting the number of rounds (minimum 3, maximum 20)
3. WHEN the host starts a round THEN the system SHALL control the pace of revealing prices after all guesses are submitted
4. WHEN players are guessing THEN the host SHALL be able to view a real-time leaderboard showing current scores and rankings
5. WHEN the game ends THEN the host SHALL see final rankings with detailed scoring breakdown
6. WHEN the host selects a category THEN the system SHALL fetch and display available products from that category

### Requirement 2

**User Story:** As a player, I want to participate in price guessing with clear product information and intuitive input, so that I can make informed guesses and track my performance.

#### Acceptance Criteria

1. WHEN a product is displayed THEN the system SHALL show a clear, high-quality product image and complete product name
2. WHEN entering a price guess THEN the system SHALL provide an input field with automatic currency formatting (e.g., $XX.XX)
3. WHEN I submit a guess THEN the system SHALL validate the input is a positive number within reasonable bounds ($0.01 to $10,000)
4. WHEN the actual price is revealed THEN the system SHALL show how close my guess was to the actual price (percentage difference)
5. WHEN points are calculated THEN the system SHALL award points based on accuracy using a scoring algorithm (closer guesses earn more points)
6. WHEN viewing my progress THEN the system SHALL display my current score and ranking among all players
7. WHEN the results are shown THEN the system SHALL provide a link to view the actual product listing
8. WHEN all guesses are revealed THEN the system SHALL display all players' guesses compared to the actual price on a visual scale

### Requirement 3

**User Story:** As a spectator, I want to observe the game and participate in unofficial guessing, so that I can enjoy the experience without affecting the official competition.

#### Acceptance Criteria

1. WHEN I join as a spectator THEN the system SHALL allow me to enter price guesses that don't affect the official scoring
2. WHEN viewing the game THEN the system SHALL show live leaderboard updates for official players
3. WHEN results are revealed THEN the system SHALL display the range of all official guesses versus the actual price
4. WHEN prices are revealed THEN the system SHALL show interesting statistics like closest guess, furthest guess, and average guess
5. WHEN spectating THEN the system SHALL provide the same visual experience as players including product images and price reveals

### Requirement 4

**User Story:** As a system administrator, I want the game to integrate reliably with external product APIs and handle data securely, so that the game provides accurate product information and maintains performance.

#### Acceptance Criteria

1. WHEN fetching product data THEN the system SHALL integrate with Etsy API (or similar product APIs) to retrieve real product information
2. WHEN API requests are made THEN the system SHALL implement proper rate limiting and error handling
3. WHEN product data is unavailable THEN the system SHALL have fallback mechanisms or cached product data
4. WHEN storing API data THEN the system SHALL comply with API terms of service regarding data usage and caching
5. WHEN handling product images THEN the system SHALL optimize image loading and provide fallback images for broken links
6. WHEN processing multiple concurrent games THEN the system SHALL maintain performance and not exceed API rate limits

### Requirement 5

**User Story:** As a player, I want a fair and transparent scoring system, so that I can understand how points are awarded and compete effectively.

#### Acceptance Criteria

1. WHEN calculating scores THEN the system SHALL use a percentage-based accuracy algorithm (e.g., 100 points for exact guess, decreasing based on percentage error)
2. WHEN a guess is within 5% of actual price THEN the player SHALL receive 90-100 points
3. WHEN a guess is within 10% of actual price THEN the player SHALL receive 75-89 points
4. WHEN a guess is within 25% of actual price THEN the player SHALL receive 50-74 points
5. WHEN a guess is within 50% of actual price THEN the player SHALL receive 25-49 points
6. WHEN a guess is more than 50% off THEN the player SHALL receive 1-24 points based on accuracy
7. WHEN displaying scores THEN the system SHALL show both round scores and cumulative totals
8. WHEN the game ends THEN the system SHALL declare a winner based on highest cumulative score

### Requirement 6

**User Story:** As a user, I want the game to have proper game flow and timing controls, so that all participants have fair opportunities to guess and the game maintains good pacing.

#### Acceptance Criteria

1. WHEN a round starts THEN the system SHALL display the product for a minimum of 30 seconds before accepting guesses
2. WHEN the guessing phase begins THEN the system SHALL provide a countdown timer (configurable, default 60 seconds)
3. WHEN the timer expires THEN the system SHALL automatically submit any entered guesses and lock out late submissions
4. WHEN all players have submitted guesses THEN the host SHALL have the option to end the guessing phase early
5. WHEN revealing results THEN the system SHALL show a dramatic reveal sequence with actual price, all guesses, and point awards
6. WHEN a round ends THEN the system SHALL automatically advance to the next round after a brief pause (10 seconds)
7. WHEN the final round completes THEN the system SHALL display comprehensive final results and winner announcement