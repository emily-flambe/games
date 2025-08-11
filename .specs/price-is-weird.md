# Price Is Wrong - Etsy API Integration Specification

## Executive Summary
A multiplayer web-based guessing game where players estimate prices of real Etsy products. The game leverages the Etsy Open API v3 to fetch live product data, creating an engaging experience that combines entertainment with e-commerce discovery.

## Table of Contents
1. [API Setup & Authentication](#api-setup--authentication)
2. [Core API Endpoints](#core-api-endpoints)
3. [Data Models](#data-models)
4. [Game Architecture](#game-architecture)
5. [Implementation Details](#implementation-details)
6. [Security Considerations](#security-considerations)
7. [Performance Optimization](#performance-optimization)

---

## API Setup & Authentication

### Prerequisites
1. **Etsy Developer Account**
   - Register at https://www.etsy.com/developers
   - Enable two-factor authentication (required)
   - Create a new application to obtain API Key

2. **OAuth 2.0 Configuration**
   ```javascript
   const ETSY_API_CONFIG = {
     apiKey: process.env.ETSY_API_KEY,
     apiUrl: 'https://api.etsy.com/v3/application',
     oauthUrl: 'https://api.etsy.com/v3/public/oauth',
     redirectUri: 'https://yourdomain.com/auth/callback',
     scopes: ['listings_r'] // Read-only access to listings
   };
   ```

3. **Required Headers**
   ```javascript
   const headers = {
     'x-api-key': ETSY_API_KEY,
     'Authorization': `Bearer ${accessToken}`, // For authenticated endpoints
     'Content-Type': 'application/json'
   };
   ```

### Authentication Flow
Since the game only needs to read public listing data, you can use API key authentication for most endpoints:

```javascript
// Simple API key authentication for public endpoints
const fetchEtsyData = async (endpoint, params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await fetch(
    `${ETSY_API_CONFIG.apiUrl}${endpoint}?${queryString}`,
    {
      headers: {
        'x-api-key': ETSY_API_CONFIG.apiKey
      }
    }
  );
  return response.json();
};
```

---

## Core API Endpoints

### 1. Search Active Listings
**Endpoint:** `GET /listings/active`

```javascript
const searchListings = async (options = {}) => {
  const params = {
    limit: 100,                    // Max 100 per request
    offset: options.offset || 0,
    keywords: options.keywords,
    taxonomy_id: options.categoryId,
    min_price: options.minPrice || 500,    // $5 minimum (in cents)
    max_price: options.maxPrice || 50000,  // $500 maximum
    sort_on: 'score',              // Relevance sorting
    shop_location: 'US'            // Optional location filter
  };
  
  return fetchEtsyData('/listings/active', params);
};
```

**Note:** Etsy limits offset to 12,000 results maximum for any search query.

### 2. Get Listing Details
**Endpoint:** `GET /listings/{listing_id}`

```javascript
const getListingDetails = async (listingId) => {
  return fetchEtsyData(`/listings/${listingId}`, {
    includes: 'Images,Shop'  // Include images and shop info
  });
};
```

### 3. Get Listings by IDs (Batch)
**Endpoint:** `GET /listings/batch`

```javascript
const getMultipleListings = async (listingIds) => {
  return fetchEtsyData('/listings/batch', {
    listing_ids: listingIds.join(','),
    includes: 'Images'
  });
};
```

### 4. Get Category Taxonomies
**Endpoint:** `GET /buyer-taxonomy/nodes`

```javascript
const getCategories = async () => {
  return fetchEtsyData('/buyer-taxonomy/nodes');
};
```

---

## Data Models

### Product Data Structure
```typescript
interface EtsyListing {
  listing_id: number;
  title: string;
  description: string;
  price: {
    amount: number;        // Price in cents
    divisor: number;       // Usually 100
    currency_code: string; // e.g., "USD"
  };
  url: string;
  images: Array<{
    url_570xN: string;     // Medium size image
    url_fullxfull: string; // Full size image
    url_75x75: string;     // Thumbnail
  }>;
  shop: {
    shop_id: number;
    shop_name: string;
    url: string;
  };
  tags: string[];
  materials: string[];
  taxonomy_id: number;
  state: 'active' | 'inactive' | 'sold_out';
  quantity: number;
  views: number;
  num_favorers: number;
}
```

### Game Product Model
```typescript
interface GameProduct {
  id: string;
  etsyListingId: number;
  name: string;
  imageUrl: string;
  actualPrice: number;      // In dollars
  currencySymbol: string;
  etsyUrl: string;
  shopName: string;
  category: string;
  // Metadata for game mechanics
  difficulty: 'easy' | 'medium' | 'hard';
  priceRange: string;       // e.g., "$10-50", "$50-100"
}
```

### Game Session Model
```typescript
interface GameSession {
  id: string;
  hostId: string;
  settings: {
    rounds: number;
    timePerRound: number;    // seconds
    categories: number[];     // Taxonomy IDs
    priceRange: {
      min: number;
      max: number;
    };
    difficulty: string;
  };
  currentRound: number;
  products: GameProduct[];
  players: Player[];
  state: 'lobby' | 'playing' | 'round_end' | 'game_over';
}
```

---

## Game Architecture

### Backend Services

#### 1. Product Fetching Service
```javascript
class EtsyProductService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.cache = new Map(); // Simple in-memory cache
    this.cacheExpiry = 3600000; // 1 hour
  }

  async fetchProductsForGame(settings) {
    const products = [];
    const seenIds = new Set();
    
    // Fetch products from different categories
    for (const categoryId of settings.categories) {
      const listings = await this.searchListings({
        taxonomy_id: categoryId,
        min_price: settings.priceRange.min * 100, // Convert to cents
        max_price: settings.priceRange.max * 100,
        limit: 50
      });
      
      // Filter and process listings
      for (const listing of listings.results) {
        if (!seenIds.has(listing.listing_id) && 
            listing.images && listing.images.length > 0) {
          seenIds.add(listing.listing_id);
          products.push(this.transformToGameProduct(listing));
        }
      }
    }
    
    // Shuffle and select required number
    return this.shuffleArray(products).slice(0, settings.rounds);
  }

  transformToGameProduct(listing) {
    return {
      id: `etsy-${listing.listing_id}`,
      etsyListingId: listing.listing_id,
      name: this.truncateTitle(listing.title, 60),
      imageUrl: listing.images[0].url_570xN,
      actualPrice: listing.price.amount / listing.price.divisor,
      currencySymbol: this.getCurrencySymbol(listing.price.currency_code),
      etsyUrl: listing.url,
      shopName: listing.shop?.shop_name || 'Unknown Shop',
      category: this.getCategoryName(listing.taxonomy_id),
      difficulty: this.calculateDifficulty(listing.price.amount / 100),
      priceRange: this.getPriceRange(listing.price.amount / 100)
    };
  }

  calculateDifficulty(price) {
    if (price < 20) return 'easy';
    if (price < 100) return 'medium';
    return 'hard';
  }

  getPriceRange(price) {
    if (price < 10) return '$0-10';
    if (price < 50) return '$10-50';
    if (price < 100) return '$50-100';
    if (price < 500) return '$100-500';
    return '$500+';
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  truncateTitle(title, maxLength) {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength - 3) + '...';
  }

  getCurrencySymbol(code) {
    const symbols = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'CAD': 'C$',
      'AUD': 'A$'
    };
    return symbols[code] || code;
  }
}
```

#### 2. Scoring Algorithm
```javascript
class ScoringSystem {
  calculateScore(actualPrice, guessedPrice, timeRemaining, maxTime) {
    // Calculate accuracy percentage
    const difference = Math.abs(actualPrice - guessedPrice);
    const accuracy = Math.max(0, 100 - (difference / actualPrice * 100));
    
    // Base points from accuracy (max 1000)
    let points = Math.round(accuracy * 10);
    
    // Bonus points for exact or very close guesses
    if (difference === 0) {
      points += 500; // Perfect guess bonus
    } else if (accuracy >= 95) {
      points += 200; // Within 5% bonus
    } else if (accuracy >= 90) {
      points += 100; // Within 10% bonus
    }
    
    // Time bonus (max 200 points)
    const timeBonus = Math.round((timeRemaining / maxTime) * 200);
    points += timeBonus;
    
    // Difficulty multiplier
    const difficultyMultiplier = {
      'easy': 1.0,
      'medium': 1.5,
      'hard': 2.0
    };
    
    return Math.round(points * (difficultyMultiplier[difficulty] || 1));
  }
}
```

### Frontend Components

#### 1. Product Display Component
```javascript
const ProductDisplay = ({ product, onGuessSubmit }) => {
  const [guess, setGuess] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(30);

  return (
    <div className="product-display">
      <div className="product-image">
        <img 
          src={product.imageUrl} 
          alt={product.name}
          loading="lazy"
        />
      </div>
      <div className="product-info">
        <h2>{product.name}</h2>
        <p className="shop-name">from {product.shopName}</p>
        <p className="category">{product.category}</p>
      </div>
      <div className="guess-input">
        <input
          type="number"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          placeholder="Enter your price guess"
          min="0"
          step="0.01"
        />
        <button onClick={() => onGuessSubmit(guess)}>
          Submit Guess
        </button>
      </div>
      <div className="timer">
        Time: {timeRemaining}s
      </div>
    </div>
  );
};
```

#### 2. Results Visualization
```javascript
const ResultsDisplay = ({ product, guesses, actualPrice }) => {
  return (
    <div className="results-display">
      <div className="price-reveal">
        <h2>Actual Price: {product.currencySymbol}{actualPrice}</h2>
        <a href={product.etsyUrl} target="_blank" rel="noopener">
          View on Etsy →
        </a>
      </div>
      <div className="price-line">
        <PriceLine 
          min={0}
          max={actualPrice * 2}
          actualPrice={actualPrice}
          guesses={guesses}
        />
      </div>
      <div className="leaderboard">
        {guesses
          .sort((a, b) => b.points - a.points)
          .map(guess => (
            <div key={guess.playerId} className="player-result">
              <span>{guess.playerName}</span>
              <span>{product.currencySymbol}{guess.value}</span>
              <span>{guess.accuracy}% accurate</span>
              <span>+{guess.points} pts</span>
            </div>
          ))}
      </div>
    </div>
  );
};
```

---

## Implementation Details

### Rate Limiting & Caching Strategy
```javascript
class RateLimiter {
  constructor() {
    this.requests = [];
    this.maxRequestsPerSecond = 10;
    this.maxRequestsPerDay = 10000;
  }

  async throttle() {
    const now = Date.now();
    // Remove requests older than 1 second
    this.requests = this.requests.filter(t => now - t < 1000);
    
    if (this.requests.length >= this.maxRequestsPerSecond) {
      const oldestRequest = this.requests[0];
      const waitTime = 1000 - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(now);
  }
}

class ProductCache {
  constructor() {
    this.cache = new Map();
    this.maxAge = 3600000; // 1 hour
  }

  set(key, value) {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
}
```

### WebSocket Integration for Real-time Updates
```javascript
// Server-side (Socket.io example)
io.on('connection', (socket) => {
  socket.on('join-game', ({ gameId, playerId }) => {
    socket.join(gameId);
    socket.to(gameId).emit('player-joined', { playerId });
  });

  socket.on('submit-guess', async ({ gameId, playerId, guess }) => {
    const game = await gameService.getGame(gameId);
    const result = scoringSystem.calculateScore(
      game.currentProduct.actualPrice,
      guess,
      game.timeRemaining,
      game.settings.timePerRound
    );
    
    io.to(gameId).emit('guess-submitted', {
      playerId,
      guess,
      points: result
    });
  });

  socket.on('reveal-price', ({ gameId }) => {
    io.to(gameId).emit('price-revealed', {
      actualPrice: game.currentProduct.actualPrice,
      productUrl: game.currentProduct.etsyUrl
    });
  });
});
```

### Database Schema (PostgreSQL)
```sql
-- Game sessions table
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id VARCHAR(255) NOT NULL,
  settings JSONB NOT NULL,
  current_round INTEGER DEFAULT 0,
  state VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products used in games
CREATE TABLE game_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID REFERENCES game_sessions(id),
  etsy_listing_id BIGINT NOT NULL,
  round_number INTEGER NOT NULL,
  product_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player scores
CREATE TABLE player_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID REFERENCES game_sessions(id),
  player_id VARCHAR(255) NOT NULL,
  player_name VARCHAR(255) NOT NULL,
  total_score INTEGER DEFAULT 0,
  guesses JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_game_sessions_state ON game_sessions(state);
CREATE INDEX idx_game_products_session ON game_products(game_session_id);
CREATE INDEX idx_player_scores_session ON player_scores(game_session_id);
CREATE INDEX idx_player_scores_player ON player_scores(player_id);
```

---

## Security Considerations

### 1. API Key Protection
```javascript
// Never expose API keys to the frontend
// Use environment variables and server-side proxy

// .env file
ETSY_API_KEY=your_api_key_here
ETSY_API_SECRET=your_secret_here

// Server endpoint
app.get('/api/products/search', authenticate, async (req, res) => {
  try {
    const data = await etsyService.searchProducts(req.query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});
```

### 2. Input Validation
```javascript
const validateGameSettings = (settings) => {
  const errors = [];
  
  if (settings.rounds < 1 || settings.rounds > 20) {
    errors.push('Rounds must be between 1 and 20');
  }
  
  if (settings.timePerRound < 10 || settings.timePerRound > 120) {
    errors.push('Time per round must be between 10 and 120 seconds');
  }
  
  if (settings.priceRange.min < 0 || settings.priceRange.max > 10000) {
    errors.push('Invalid price range');
  }
  
  if (!Array.isArray(settings.categories) || settings.categories.length === 0) {
    errors.push('At least one category must be selected');
  }
  
  return errors;
};
```

### 3. Rate Limiting Protection
```javascript
const rateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  message: 'Too many requests, please try again later'
});

app.use('/api/', rateLimitMiddleware);
```

---

## Performance Optimization

### 1. Prefetching Strategy
```javascript
class GamePrefetcher {
  async prefetchProducts(settings) {
    // Fetch extra products in background
    const products = await this.fetchProducts({
      ...settings,
      rounds: settings.rounds * 2 // Fetch double for backup
    });
    
    // Store in cache for quick access
    await this.cacheProducts(products);
    
    return products.slice(0, settings.rounds);
  }
  
  async warmCache(categories) {
    // Pre-warm cache with popular categories
    const promises = categories.map(categoryId => 
      this.fetchProducts({ 
        taxonomy_id: categoryId, 
        limit: 20 
      })
    );
    
    await Promise.all(promises);
  }
}
```

### 2. Image Optimization
```javascript
const optimizeImage = (imageUrl) => {
  // Use appropriate image size based on display needs
  const sizes = {
    thumbnail: 'url_75x75',
    display: 'url_570xN',
    full: 'url_fullxfull'
  };
  
  // Implement lazy loading
  return {
    src: imageUrl,
    loading: 'lazy',
    srcSet: `
      ${imageUrl.replace('570xN', '75x75')} 75w,
      ${imageUrl.replace('570xN', '340x270')} 340w,
      ${imageUrl} 570w
    `
  };
};
```

### 3. Response Compression
```javascript
// Enable gzip compression for API responses
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

---

## Error Handling

### API Error Handling
```javascript
class EtsyAPIError extends Error {
  constructor(message, statusCode, details) {
    super(message);
    this.name = 'EtsyAPIError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const handleEtsyAPIError = async (response) => {
  if (!response.ok) {
    const error = await response.json();
    
    switch (response.status) {
      case 400:
        throw new EtsyAPIError('Invalid request parameters', 400, error);
      case 401:
        throw new EtsyAPIError('Authentication failed', 401, error);
      case 403:
        throw new EtsyAPIError('Access forbidden', 403, error);
      case 404:
        throw new EtsyAPIError('Resource not found', 404, error);
      case 429:
        throw new EtsyAPIError('Rate limit exceeded', 429, error);
      case 500:
        throw new EtsyAPIError('Etsy server error', 500, error);
      default:
        throw new EtsyAPIError('Unknown error', response.status, error);
    }
  }
  
  return response;
};
```

### Fallback Mechanisms
```javascript
class ProductFallbackService {
  constructor() {
    this.fallbackProducts = []; // Pre-loaded backup products
  }
  
  async getProducts(settings) {
    try {
      // Try to fetch fresh products
      return await etsyService.fetchProducts(settings);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      
      // Use cached products if available
      const cached = await cache.getProducts(settings);
      if (cached && cached.length >= settings.rounds) {
        return cached;
      }
      
      // Use fallback products as last resort
      if (this.fallbackProducts.length >= settings.rounds) {
        return this.shuffleArray(this.fallbackProducts)
          .slice(0, settings.rounds);
      }
      
      throw new Error('Unable to load products for game');
    }
  }
}
```

---

## Testing Strategy

### Unit Tests
```javascript
describe('ScoringSystem', () => {
  const scorer = new ScoringSystem();
  
  test('perfect guess receives maximum points', () => {
    const score = scorer.calculateScore(100, 100, 30, 30);
    expect(score).toBeGreaterThan(1500);
  });
  
  test('close guess receives partial points', () => {
    const score = scorer.calculateScore(100, 95, 15, 30);
    expect(score).toBeGreaterThan(800);
    expect(score).toBeLessThan(1500);
  });
  
  test('wrong guess receives minimal points', () => {
    const score = scorer.calculateScore(100, 200, 5, 30);
    expect(score).toBeLessThan(100);
  });
});
```

### Integration Tests
```javascript
describe('Etsy API Integration', () => {
  test('fetches active listings successfully', async () => {
    const listings = await etsyService.searchListings({
      keywords: 'vintage',
      limit: 10
    });
    
    expect(listings).toHaveProperty('count');
    expect(listings).toHaveProperty('results');
    expect(listings.results).toBeInstanceOf(Array);
    expect(listings.results.length).toBeLessThanOrEqual(10);
  });
  
  test('handles rate limiting gracefully', async () => {
    const promises = Array(15).fill(null).map(() => 
      etsyService.searchListings({ limit: 1 })
    );
    
    await expect(Promise.all(promises)).resolves.toBeDefined();
  });
});
```

---

## Deployment Considerations

### Environment Variables
```bash
# Production environment variables
NODE_ENV=production
ETSY_API_KEY=your_production_key
ETSY_API_SECRET=your_production_secret
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://localhost:6379
WEBSOCKET_PORT=3001
SESSION_SECRET=your_session_secret
```

### Docker Configuration
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000 3001

CMD ["node", "server.js"]
```

### Monitoring & Analytics
```javascript
// Track API usage and game metrics
const analytics = {
  trackAPICall: (endpoint, responseTime, status) => {
    metrics.increment('api.calls', {
      endpoint,
      status
    });
    metrics.histogram('api.response_time', responseTime);
  },
  
  trackGameEvent: (event, data) => {
    metrics.increment('game.events', {
      type: event
    });
    
    if (event === 'game_completed') {
      metrics.gauge('game.players', data.playerCount);
      metrics.gauge('game.rounds', data.rounds);
    }
  }
};
```

---

## Compliance & Legal

### Etsy API Terms of Use Compliance
1. **Attribution**: Display "The term 'Etsy' is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy, Inc." prominently in the application.

2. **Caching Policy**: Follow Section 1 of the API Terms of Use for caching policies.

3. **Rate Limits**: Respect the API rate limits (10 requests/second, 10,000 requests/day).

4. **Data Usage**: 
   - Do not screen-scrape Etsy data
   - Only use API-provided data
   - Do not store sensitive user data
   - Respect seller privacy

### GDPR Compliance
```javascript
// Data retention policy
const dataRetentionPolicy = {
  gameData: 30, // days
  playerScores: 90, // days
  cachedProducts: 1, // days
  
  async cleanupOldData() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.gameData);
    
    await db.query(
      'DELETE FROM game_sessions WHERE created_at < $1',
      [cutoffDate]
    );
  }
};
```

---

## Conclusion

This specification provides a comprehensive guide for implementing the "Price Is Wrong" game using the Etsy API v3. The architecture prioritizes performance through caching and prefetching, ensures fair gameplay through robust scoring algorithms, and maintains compliance with Etsy's API terms of use.

Key success factors:
- Efficient API usage with caching and rate limiting
- Engaging user experience with real-time updates
- Scalable architecture supporting multiple concurrent games
- Compliance with all API terms and data protection regulations

For questions or support during implementation, consult the [Etsy API Documentation](https://developers.etsy.com/documentation) and the [API Reference](https://developers.etsy.com/documentation/reference).