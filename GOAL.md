Build a browser-only chess game analyzer.

Success condition: User types a Chess.com username, selects a game from their recent games, steps through moves on an interactive board, and sees Stockfish's best move and evaluation for each position.
Design: Minimal, functional. Dark background, clean monospace font. No animations, no gradients, no fancy UI library. Just the board, controls, and engine output readable at a glance.

Stack: React, react-chessboard, chess.js, stockfish.js (WASM, runs in browser)
Data: Chess.com public API (no auth needed)
No backend. No build-time API keys. Everything runs client-side.

Done when:
- Username input fetches real games from Chess.com API
- Game renders on a chessboard, navigable move by move
- Stockfish evaluates each position and surfaces best move + eval score
- No console errors in happy path