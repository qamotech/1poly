import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import { createInitialGameState, addPlayer, startGame, rollDice, endTurn, buyProperty, proposeTrade, resolveTrade, buildHouse, takeLoan, repayLoan, updateHouseRules } from './src/engine/engine.js';
import { processAITurn } from './src/engine/ai.js';
import { GamePhase, PlayerType } from './src/types.js';

const PORT = 3000;

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  
  // Set up Socket.IO
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  // Global Game State (In-Memory Multiplayer)
  let gameState = createInitialGameState();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Send initial state to the new client
    socket.emit('game_state_update', gameState);

    socket.on('add_player', ({ name, type, token }) => {
      gameState = addPlayer(gameState, name, type, token);
      io.emit('game_state_update', gameState);
    });

    socket.on('start_game', () => {
      gameState = startGame(gameState);
      io.emit('game_state_update', gameState);
      checkAITurn();
    });

    socket.on('roll', () => {
      gameState = rollDice(gameState);
      io.emit('game_state_update', gameState);
      checkAITurn();
    });

    socket.on('buy', () => {
      gameState = buyProperty(gameState);
      io.emit('game_state_update', gameState);
      checkAITurn();
    });

    socket.on('end_turn', () => {
      gameState = endTurn(gameState);
      io.emit('game_state_update', gameState);
      checkAITurn();
    });

    socket.on('propose_trade', (offer) => {
      gameState = proposeTrade(gameState, offer);
      io.emit('game_state_update', gameState);
      
      // If a human proposes a trade to a CPU, the CPU should evaluate and reject it
      const targetPlayer = gameState.players.find(p => p.id === offer.toPlayerId);
      if (targetPlayer?.type === PlayerType.CPU) {
        setTimeout(() => {
          gameState = resolveTrade(gameState, false);
          io.emit('game_state_update', gameState);
          checkAITurn();
        }, 1500); // 1.5s delay so human can read the log
      }
    });

    socket.on('resolve_trade', ({ accepted }) => {
      gameState = resolveTrade(gameState, accepted);
      io.emit('game_state_update', gameState);
      checkAITurn();
    });

    socket.on('build_house', ({ playerId, propertyId }) => {
      gameState = buildHouse(gameState, playerId, propertyId);
      io.emit('game_state_update', gameState);
    });

    socket.on('take_loan', ({ playerId, amount }) => {
      gameState = takeLoan(gameState, playerId, amount);
      io.emit('game_state_update', gameState);
    });

    socket.on('repay_loan', ({ playerId, amount }) => {
      gameState = repayLoan(gameState, playerId, amount);
      io.emit('game_state_update', gameState);
    });

    socket.on('restart_game', () => {
      gameState = createInitialGameState();
      io.emit('game_state_update', gameState);
    });

    socket.on('update_rules', (rules) => {
      gameState = updateHouseRules(gameState, rules);
      io.emit('game_state_update', gameState);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Basic Server-side AI Turn Loop
  function checkAITurn() {
    if (gameState.phase !== GamePhase.LOBBY && gameState.phase !== GamePhase.GAME_OVER) {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (currentPlayer?.type === PlayerType.CPU) {
        setTimeout(() => {
          gameState = processAITurn(gameState);
          io.emit('game_state_update', gameState);
          
          // Recursively check if the AI's turn resulted in another AI's turn (or if they rolled doubles)
          if (gameState.players[gameState.currentPlayerIndex]?.type === PlayerType.CPU) {
             checkAITurn();
          }
        }, 5000); // 5s delay for realistic CPU pacing, allowing humans to read cards and logs
      }
    }
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
