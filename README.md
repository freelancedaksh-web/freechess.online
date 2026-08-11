# FreeChess.Online

An open-source, ultra-lightweight, 0-bug chess engine and analysis board built purely with HTML, CSS, and Vanilla JavaScript. Designed specifically with a nostalgic early-2000s web aesthetic.

## Features
- **Grandmaster AI**: Powered by Stockfish.js running seamlessly in a Web Worker (No server latency).
- **Typing / Blindfold Blitz**: Type moves in standard algebraic notation (e.g., `e4`, `Nf3`, `O-O`) and press Enter for ultra-fast blitz play.
- **FIDE Compliant**: 100% bug-free rule validation using `chess.js` (Castling, En Passant, Stalemate, 50-move rule, Threefold Repetition).
- **Multi-mode**: Human vs AI (White/Black), Local Multiplayer (P1 vs P2), and Real-time Live Engine Analysis.
- **Zero Forms / Zero Tracking**: Brutally minimal interface. No trackers, no bloat.

## Usage
Simply open `index.html` in any modern web browser. No compilation, no Node.js required. Ensure you are connected to the internet the first time you load it so the secure CDNs can cache the engine and piece images.

## Contribute
Contributions are welcome. Please respect the minimal architecture constraint: No heavy JS frameworks (React/Vue/Angular) are permitted.

© 2026 FreeChess.Online Open Source Project.
