import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import { createInitialGameState, addPlayer, updatePlayer, removePlayer, startGame, rollDice, endTurn, buyProperty, proposeTrade, resolveTrade, buildHouse, sellHouse, useGetOutOfJailCard, takeLoan, repayLoan, updateHouseRules, mortgageProperty, unmortgageProperty, payBail, dismissRecentBankruptcy, startAuction, placeBid, passAuction, declineProperty, setGameSpeed } from './src/engine/engine.js';
import { processAITurn } from './src/engine/ai.js';
import { evaluateTradeForAI } from './src/engine/trade.js';
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

    socket.on('update_player', ({ playerId, updates }) => {
      gameState = updatePlayer(gameState, playerId, updates);
      io.emit('game_state_update', gameState);
    });

    socket.on('remove_player', ({ playerId }) => {
      gameState = removePlayer(gameState, playerId);
      io.emit('game_state_update', gameState);
      checkAITurn();
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

    socket.on('decline_property', () => {
      gameState = declineProperty(gameState);
      io.emit('game_state_update', gameState);
      checkAITurn();
    });

    socket.on('start_auction', ({ propertyId }) => {
      gameState = startAuction(gameState, propertyId);
      io.emit('game_state_update', gameState);
      checkAITurn();
    });

    socket.on('place_bid', ({ playerId, bidAmount }) => {
      gameState = placeBid(gameState, playerId, bidAmount);
      io.emit('game_state_update', gameState);
      checkAITurn();
    });

    socket.on('pass_auction', ({ playerId }) => {
      gameState = passAuction(gameState, playerId);
      io.emit('game_state_update', gameState);
      checkAITurn();
    });

    socket.on('set_game_speed', ({ speed }) => {
      gameState = setGameSpeed(gameState, speed);
      io.emit('game_state_update', gameState);
    });

    socket.on('end_turn', () => {
      gameState = endTurn(gameState);
      io.emit('game_state_update', gameState);
      checkAITurn();
    });

    socket.on('propose_trade', (offer) => {
      gameState = proposeTrade(gameState, offer);
      io.emit('game_state_update', gameState);
      
      // If a human proposes a trade to a CPU, the CPU evaluates it dynamically
      const targetPlayer = gameState.players.find(p => p.id === offer.toPlayerId);
      if (targetPlayer?.type === PlayerType.CPU) {
        const tradeDelay = gameState.gameSpeed === 'max' ? 100 : gameState.gameSpeed === 'fast' ? 400 : 1000;
        setTimeout(() => {
          const accepted = evaluateTradeForAI(gameState, offer);
          gameState = resolveTrade(gameState, accepted);
          io.emit('game_state_update', gameState);
          checkAITurn();
        }, tradeDelay);
      }
    });

    socket.on('resolve_trade', ({ accepted }) => {
      gameState = resolveTrade(gameState, accepted);
      io.emit('game_state_update', gameState);
      checkAITurn();
    });

    socket.on('dismiss_bankruptcy', () => {
      gameState = dismissRecentBankruptcy(gameState);
      io.emit('game_state_update', gameState);
    });

    
    socket.on('mortgage_property', ({ playerId, propertyId }) => {
      gameState = mortgageProperty(gameState, playerId, propertyId);
      io.emit('game_state_update', gameState);
    });

    socket.on('unmortgage_property', ({ playerId, propertyId }) => {
      gameState = unmortgageProperty(gameState, playerId, propertyId);
      io.emit('game_state_update', gameState);
    });

    socket.on('pay_bail', ({ playerId }) => {
      gameState = payBail(gameState, playerId);
      io.emit('game_state_update', gameState);
      checkAITurn();
    });

    socket.on('use_jail_card', ({ playerId }) => {
      gameState = useGetOutOfJailCard(gameState, playerId);
      io.emit('game_state_update', gameState);
      checkAITurn();
    });

    socket.on('build_house', ({ playerId, propertyId }) => {
      gameState = buildHouse(gameState, playerId, propertyId);
      io.emit('game_state_update', gameState);
    });

    socket.on('sell_house', ({ playerId, propertyId }) => {
      gameState = sellHouse(gameState, playerId, propertyId);
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

  // Server-side AI Turn Loop with dynamic speed
  function checkAITurn() {
    if (gameState.phase !== GamePhase.LOBBY && gameState.phase !== GamePhase.GAME_OVER) {
      // Check for CPU turn or CPU auction participant
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      const isCpuTurn = currentPlayer?.type === PlayerType.CPU;
      const isCpuAuction = gameState.phase === GamePhase.AUCTION && gameState.auction && 
        gameState.players.some(p => p.type === PlayerType.CPU && !p.isBankrupt && !gameState.auction!.passedBidderIds.includes(p.id) && p.id !== gameState.auction!.highestBidderId);

      if (isCpuTurn || isCpuAuction) {
        const delay = gameState.gameSpeed === 'max' ? 80 : gameState.gameSpeed === 'fast' ? 500 : 1500;
        setTimeout(() => {
          gameState = processAITurn(gameState);
          io.emit('game_state_update', gameState);
          
          // Check if subsequent AI turn is needed
          const nextPlayer = gameState.players[gameState.currentPlayerIndex];
          const nextAuctionCpu = gameState.phase === GamePhase.AUCTION && gameState.auction && 
            gameState.players.some(p => p.type === PlayerType.CPU && !p.isBankrupt && !gameState.auction!.passedBidderIds.includes(p.id) && p.id !== gameState.auction!.highestBidderId);
          
          if ((nextPlayer?.type === PlayerType.CPU && !nextPlayer.isBankrupt) || nextAuctionCpu) {
             checkAITurn();
          }
        }, delay);
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
