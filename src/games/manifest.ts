/**
 * Game Manifest
 *
 * Single source of truth for all available games.
 * Add new games here to make them appear in the portal.
 */

import { GameDefinition } from './types';

export const games: GameDefinition[] = [
  {
    id: 'checkbox-game',
    name: 'Checkbox Game',
    description: 'Not really a game lol',
    enabled: true,
  },
  {
    id: 'everybody-votes',
    name: 'Everybody Votes',
    description: 'Vote, predict, and see who knows the crowd best!',
    enabled: true,
  },
  {
    id: 'thats-a-paddlin',
    name: "That's a Paddlin'",
    description: 'N-way pong with paddles around a shared arena',
    enabled: true,
    comingSoon: true,
  },
  {
    id: 'county-game',
    name: 'County Game',
    description: 'Say your county and celebrate together!',
    enabled: true,
  },
  {
    id: 'clicker-race',
    name: 'Clicker Race',
    description: 'Race to click 10 times first!',
    enabled: true,
  },
  {
    id: 'price-is-weird',
    name: 'The Price is Weird',
    description: 'Guess prices of real Etsy products without going over',
    enabled: true,
    comingSoon: true,
  },
];

/**
 * Get a game definition by ID
 */
export function getGameById(id: string): GameDefinition | undefined {
  return games.find(g => g.id === id);
}

/**
 * Get all enabled games (for portal display)
 */
export function getEnabledGames(): GameDefinition[] {
  return games.filter(g => g.enabled);
}

/**
 * Get all playable games (enabled and not coming soon)
 */
export function getPlayableGames(): GameDefinition[] {
  return games.filter(g => g.enabled && !g.comingSoon);
}
