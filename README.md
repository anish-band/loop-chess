# loop-chess

Browser-only chess game analyzer. Enter a Chess.com username, pick a game, step through moves. Stockfish evaluates each position and classifies moves. Click the best move for a Claude explanation.

## Features

- Fetch recent games from Chess.com by username
- Navigate moves with buttons or arrow keys
- Stockfish (WASM) evaluates each position — eval score, best move arrow, depth
- Move classification: Blunder / Miss / Good / Great with board color highlight
- Click the best move label to get a 2-3 sentence explanation from Claude

## Setup

```bash
npm install
```

Create a `.env` file in the project root:

```
VITE_ANTHROPIC_API_KEY=your-key-here
```

```bash
npm run dev
```

The Claude explanation requires the API key. Everything else works without it.
