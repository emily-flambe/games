/**
 * Games Platform - Cloudflare Worker Entry Point
 * Serves the games platform with WebSocket support
 */

import { staticAssets } from './lib/static';
import { GameSession } from './durable-objects/GameSession';
import { CheckboxGameSession } from './durable-objects/CheckboxGameSession';
import { EverybodyVotesGameSession } from './durable-objects/EverybodyVotesGameSession';
import { CountyGameSession } from './durable-objects/CountyGameSession';
import { GameSessionRegistry } from './durable-objects/GameSessionRegistry';
import { Env } from './types';


export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle WebSocket upgrade requests
    if (request.headers.get("Upgrade") === "websocket") {
      return handleWebSocket(request, env);
    }

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Handle API routes
    if (path === '/api/active-rooms' && request.method === 'GET') {
      return handleActiveRoomsAPI(env);
    }

    // Handle favicon.ico requests - redirect to PNG
    if (path === '/favicon.ico') {
      return Response.redirect(new URL('/static/favicon.png', request.url), 301);
    }

    // Serve static assets
    try {
      const asset = getStaticAsset(path);
      if (asset) {
        return new Response(asset.content, {
          headers: {
            'Content-Type': asset.contentType,
            'Cache-Control': 'public, max-age=86400',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Check if this is a room URL (6 character alphanumeric code)
      const roomMatch = path.match(/^\/([A-Z0-9]{6})$/);
      if (roomMatch) {
        // Serve the main HTML page for room URLs
        const htmlAsset = staticAssets['/static/index.html'];
        if (htmlAsset) {
          return new Response(htmlAsset, {
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
              'Cache-Control': 'public, max-age=3600',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }

      // Default to serving the main HTML page
      const htmlAsset = staticAssets['/static/index.html'];
      if (htmlAsset) {
        return new Response(htmlAsset, {
          headers: {
            'Content-Type': 'text/html; charset=UTF-8',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};

/**
 * Handle WebSocket connections
 */
async function handleWebSocket(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const pathMatch = url.pathname.match(/^\/api\/game\/([A-Z0-9]+)\/ws$/);
  
  if (!pathMatch) {
    return new Response('Invalid WebSocket path', { status: 400 });
  }
  
  const sessionId = pathMatch[1];
  const gameType = url.searchParams.get('gameType') || 'checkbox-game';
  
  // Route to appropriate Durable Object based on game type
  let gameSession;
  if (gameType === 'everybody-votes') {
    const id = env.EVERYBODY_VOTES_SESSIONS.idFromName(sessionId);
    gameSession = env.EVERYBODY_VOTES_SESSIONS.get(id);
  } else if (gameType === 'checkbox-game') {
    const id = env.CHECKBOX_SESSIONS.idFromName(sessionId);
    gameSession = env.CHECKBOX_SESSIONS.get(id);
  } else if (gameType === 'county-game') {
    const id = env.COUNTY_GAME_SESSIONS.idFromName(sessionId);
    gameSession = env.COUNTY_GAME_SESSIONS.get(id);
  } else {
    // Default to base GameSession for other games
    const id = env.GAME_SESSIONS.idFromName(sessionId);
    gameSession = env.GAME_SESSIONS.get(id);
  }
  
  // Forward the WebSocket request to the Durable Object
  return gameSession.fetch(request);
}

/**
 * Handle Active Rooms API requests
 */
async function handleActiveRoomsAPI(env: Env): Promise<Response> {
  try {
    const registry = env.GAME_REGISTRY.get(
      env.GAME_REGISTRY.idFromName('singleton')
    );
    
    const response = await registry.fetch(
      new Request('http://internal/list', { method: 'GET' })
    );
    
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Active rooms API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch active rooms',
      rooms: [] 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

/**
 * Get static asset by path
 */
function getStaticAsset(path: string): { content: string | ArrayBuffer; contentType: string } | null {
  // Normalize path
  if (path === '/' || path === '') {
    path = '/static/index.html';
  }

  const asset = staticAssets[path];
  if (!asset) {
    return null;
  }

  // Determine content type
  let contentType = 'text/plain';
  if (path.endsWith('.html')) {
    contentType = 'text/html; charset=UTF-8';
  } else if (path.endsWith('.css')) {
    contentType = 'text/css; charset=UTF-8';
  } else if (path.endsWith('.js')) {
    contentType = 'application/javascript; charset=UTF-8';
  } else if (path.endsWith('.json')) {
    contentType = 'application/json; charset=UTF-8';
  } else if (path.endsWith('.png')) {
    contentType = 'image/png';
  } else if (path.endsWith('.ico')) {
    contentType = 'image/x-icon';
  }

  // Handle base64 encoded binary assets
  if (typeof asset === 'object' && 'encoding' in asset && asset.encoding === 'base64') {
    // Convert base64 to ArrayBuffer for binary files
    const binaryString = atob(asset.content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return {
      content: bytes.buffer,
      contentType,
    };
  }

  return {
    content: asset as string,
    contentType,
  };
}

// Export Durable Objects for wrangler
export { GameSession, CheckboxGameSession, EverybodyVotesGameSession, CountyGameSession, GameSessionRegistry };