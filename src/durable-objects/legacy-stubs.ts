/**
 * Legacy Durable Object Stubs
 * 
 * These classes are required for Cloudflare DO migration chain compatibility.
 * They are no longer instantiated - all games use the unified GameSession with
 * handler registry. These stubs exist solely to satisfy the migration requirements
 * in wrangler.toml (v3, v4 migrations created these classes).
 * 
 * DO NOT USE THESE CLASSES - they redirect to GameSession for safety.
 */

import { GameSession } from './GameSession';

export class CheckboxGameSession extends GameSession {}
export class EverybodyVotesGameSession extends GameSession {}
export class CountyGameSession extends GameSession {}
