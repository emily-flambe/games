// Minimal Games Platform - Cloudflare Worker
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Serve main page
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(HTML_TEMPLATE, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Serve CSS
    if (url.pathname === '/styles.css') {
      return new Response(CSS_STYLES, {
        headers: { 'Content-Type': 'text/css' }
      });
    }
    
    return new Response('Not Found', { status: 404 });
  }
};

const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Games Platform</title>
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <div class="container">
        <h1>Games Platform</h1>
        <p class="status">Ready</p>
        
        <div class="games">
            <button onclick="alert('Coming soon!')">Tic Tac Toe</button>
            <button onclick="alert('Coming soon!')">Connect Four</button>
        </div>
    </div>
</body>
</html>`;

const CSS_STYLES = `
body {
    font-family: system-ui, sans-serif;
    margin: 0;
    padding: 20px;
    background: #f0f0f0;
}

.container {
    max-width: 600px;
    margin: 0 auto;
    background: white;
    padding: 40px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

h1 {
    text-align: center;
    margin-bottom: 10px;
}

.status {
    text-align: center;
    color: green;
    font-weight: bold;
    margin-bottom: 30px;
}

.games {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

button {
    padding: 20px;
    border: none;
    border-radius: 4px;
    background: #007bff;
    color: white;
    font-size: 16px;
    cursor: pointer;
    transition: background 0.2s;
}

button:hover {
    background: #0056b3;
}
`;