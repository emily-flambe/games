import { defineConfig } from 'vitest/config';
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    include: ['tests/vitest/**/*.test.{ts,js}'],
    exclude: ['tests/unit/**', 'tests/e2e/**', 'tests/visual/**', 'node_modules/**'],
    poolOptions: {
      workers: {
        main: './src/index.ts',
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          compatibilityDate: '2024-01-01',
          compatibilityFlags: ['nodejs_compat'],
          bindings: {
            ASSETS: {
              type: 'service',
              service: 'assets'
            }
          },
          durableObjects: {
            GAME_SESSIONS: 'GameSession',
            CHECKBOX_SESSIONS: 'CheckboxGameSession', 
            EVERYBODY_VOTES_SESSIONS: 'EverybodyVotesGameSession',
            COUNTY_GAME_SESSIONS: 'CountyGameSession',
            GAME_REGISTRY: 'GameSessionRegistry'
          }
        },
      },
    },
  },
});