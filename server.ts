import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import { createInitialGameState, addPlayer, updatePlayer, removePlayer, startGame, rollDice, endTurn, buyProperty, proposeTrade, resolveTrade, buildHouse, sellHouse, useGetOutOfJailCard, takeLoan, repayLoan, updateHouseRules, mortgageProperty, unmortgageProperty, payBail, dismissRecentBankruptcy, startAuction, placeBid, passAuction, declineProperty, setGameSpeed } from './src/engine/engine.js';
import { processAITurn } from './src/engine/ai.js';
import { evaluateTradeForAI } from './src/engine/trade.js';
import { GamePhase, PlayerType } from './src/types.js';
import type { GameState } from './src/types.js';

// Render (and most PaaS hosts) assign the port via $PORT; 3000 is the local default.
const PORT = Number(process.env.PORT) || 3000;

// ---------------------------------------------------------------------------
// Multiplayer rooms
//
// The server used to hold ONE global game that every connected browser
// shared (and anyone could drive). Now each game lives in a room keyed by a
// 4-letter code. The host creates the room and builds the roster; family
// members join with the code and CLAIM a seat ("I am <player>") from their
// own phone. A seat is bound to a persistent per-browser playerToken, so a
// refresh or reconnect reclaims the same seat automatically.
//
// Every gameplay handler authorizes against the caller's seat before it is
// allowed to mutate state — the client also locks its own controls, but the
// server is the real referee.
// ---------------------------------------------------------------------------

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // unambiguous: no I, no O

interface Room {
  code: string;
  state: GameState;
  hostToken: string;
  seats: Map<string, string>; // playerToken -> playerId
  seatOwners: Map<string, string>; // playerId -> playerToken
  sockets: Map<string, string>; // socketId -> playerToken
}

const rooms = new Map<string, Room>();
const socketRoom = new Map<string, string>(); // socketId -> roomCode

function generateRoomCode(): string {
  let code = '';
  do {
    code = Array.from(
      { length: 4 },
      () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
    ).join('');
  } while (rooms.has(code));
  return code;
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  // Set up Socket.IO
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  function broadcastState(room: Room) {
    io.to(room.code).emit('game_state_update', room.state);
  }

  function broadcastSeats(room: Room) {
    const seats = room.state.players.map((p) => ({
      playerId: p.id,
      taken: room.seatOwners.has(p.id),
    }));
    io.to(room.code).emit('seat_update', { seats });
  }

  interface Ctx {
    room: Room;
    token: string;
    myId: string | null;
    isHost: boolean;
  }

  function ctxOf(socket: any): Ctx | null {
    const code = socketRoom.get(socket.id);
    if (!code) return null;
    const room = rooms.get(code);
    if (!room) return null;
    const token = room.sockets.get(socket.id);
    if (!token) return null;
    return {
      room,
      token,
      myId: room.seats.get(token) ?? null,
      isHost: token === room.hostToken,
    };
  }

  function deny(socket: any, message = 'Not your turn') {
    socket.emit('action_denied', { message });
  }

  function isTurnPlayer(c: Ctx): boolean {
    if (!c.myId) return false;
    const current = c.room.state.players[c.room.state.currentPlayerIndex];
    return current?.id === c.myId;
  }

  function cleanupRoomIfEmpty(room: Room) {
    if (room.sockets.size > 0) return;
    // Safe to delete: an untouched lobby, or a room nobody ever sat in.
    // A mid-game room with claimed seats persists so players can reconnect.
    if (room.state.phase === GamePhase.LOBBY || room.seats.size === 0) {
      rooms.delete(room.code);
      console.log(`Room ${room.code} cleaned up`);
    }
  }

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    const joinSocketToRoom = (room: Room, token: string) => {
      room.sockets.set(socket.id, token);
      socketRoom.set(socket.id, room.code);
      socket.join(room.code);
    };

    const sendRoomHello = (room: Room, token: string) => {
      socket.emit('room_joined', {
        code: room.code,
        isHost: token === room.hostToken,
        myPlayerId: room.seats.get(token) ?? null,
      });
      socket.emit('game_state_update', room.state);
      const seats = room.state.players.map((p) => ({
        playerId: p.id,
        taken: room.seatOwners.has(p.id),
      }));
      socket.emit('seat_update', { seats });
    };

    // -- Room lifecycle -----------------------------------------------------

    socket.on('create_room', ({ token }: { token?: string } = {}) => {
      const hostToken = typeof token === 'string' && token.length >= 8 ? token : `guest-${socket.id}`;
      const room: Room = {
        code: generateRoomCode(),
        state: createInitialGameState(),
        hostToken,
        seats: new Map(),
        seatOwners: new Map(),
        sockets: new Map(),
      };
      rooms.set(room.code, room);
      joinSocketToRoom(room, hostToken);
      console.log(`Room ${room.code} created by ${socket.id}`);
      sendRoomHello(room, hostToken);
    });

    socket.on('join_room', ({ code, token }: { code?: string; token?: string } = {}) => {
      const normalized = typeof code === 'string' ? code.trim().toUpperCase() : '';
      const room = rooms.get(normalized);
      const playerToken = typeof token === 'string' && token.length >= 8 ? token : `guest-${socket.id}`;
      if (!room) {
        socket.emit('room_error', {
          message: `Room ${normalized || '????'} not found — check the code and try again.`,
        });
        return;
      }
      joinSocketToRoom(room, playerToken);
      console.log(`Client ${socket.id} joined room ${room.code}`);
      sendRoomHello(room, playerToken);
      broadcastSeats(room);
    });

    socket.on('leave_room', () => {
      const c = ctxOf(socket);
      if (!c) return;
      c.room.sockets.delete(socket.id);
      socketRoom.delete(socket.id);
      socket.leave(c.room.code);
      // The seat binding survives leaving (token can reclaim on rejoin).
      cleanupRoomIfEmpty(c.room);
    });

    socket.on('close_room', () => {
      const c = ctxOf(socket);
      if (!c) return;
      if (!c.isHost) return deny(socket, 'Only the host can close the room');
      io.to(c.room.code).emit('room_closed', {});
      for (const sid of c.room.sockets.keys()) {
        socketRoom.delete(sid);
        io.sockets.sockets.get(sid)?.leave(c.room.code);
      }
      rooms.delete(c.room.code);
      console.log(`Room ${c.room.code} closed by host`);
    });

    socket.on('claim_seat', ({ playerId }: { playerId?: string } = {}) => {
      const c = ctxOf(socket);
      if (!c) return;
      const player = c.room.state.players.find((p) => p.id === playerId);
      if (!player || player.type !== PlayerType.USER) {
        socket.emit('seat_rejected', { message: 'That seat is not available.' });
        return;
      }
      const owner = c.room.seatOwners.get(player.id);
      if (owner && owner !== c.token) {
        // Steal-proof only while the owner is actually connected; a dead
        // phone must not brick the game for everyone else.
        const ownerLive = [...c.room.sockets.values()].includes(owner);
        if (ownerLive) {
          socket.emit('seat_rejected', { message: `${player.name} is already playing on another phone.` });
          return;
        }
      }
      // One seat per token: release any previous seat first.
      const previous = c.room.seats.get(c.token);
      if (previous && previous !== player.id) {
        c.room.seatOwners.delete(previous);
      }
      c.room.seats.set(c.token, player.id);
      c.room.seatOwners.set(player.id, c.token);
      socket.emit('seat_claimed', { playerId: player.id });
      broadcastSeats(c.room);
    });

    // Clients ask for state on (re)connect: covers the race where an emit
    // fires before the client attached its listener. Scoped to their room.
    socket.on('request_state', () => {
      const c = ctxOf(socket);
      if (c) socket.emit('game_state_update', c.room.state);
    });

    // -- Lobby (host only) --------------------------------------------------

    socket.on('add_player', ({ name, type, token }) => {
      const c = ctxOf(socket);
      if (!c) return;
      if (!c.isHost) return deny(socket, 'Only the host can edit players');
      c.room.state = addPlayer(c.room.state, name, type, token);
      broadcastState(c.room);
      broadcastSeats(c.room);
    });

    socket.on('update_player', ({ playerId, updates }) => {
      const c = ctxOf(socket);
      if (!c) return;
      if (!c.isHost) return deny(socket, 'Only the host can edit players');
      c.room.state = updatePlayer(c.room.state, playerId, updates);
      broadcastState(c.room);
      broadcastSeats(c.room);
    });

    socket.on('remove_player', ({ playerId }) => {
      const c = ctxOf(socket);
      if (!c) return;
      if (!c.isHost) return deny(socket, 'Only the host can edit players');
      const owner = c.room.seatOwners.get(playerId);
      if (owner) {
        c.room.seats.delete(owner);
        c.room.seatOwners.delete(playerId);
      }
      c.room.state = removePlayer(c.room.state, playerId);
      broadcastState(c.room);
      broadcastSeats(c.room);
      checkAITurn(c.room);
    });

    socket.on('start_game', () => {
      const c = ctxOf(socket);
      if (!c) return;
      if (!c.isHost) return deny(socket, 'Only the host can start the game');
      c.room.state = startGame(c.room.state);
      broadcastState(c.room);
      checkAITurn(c.room);
    });

    socket.on('restart_game', () => {
      const c = ctxOf(socket);
      if (!c) return;
      if (!c.isHost) return deny(socket, 'Only the host can restart the game');
      c.room.state = createInitialGameState();
      // Back to a fresh lobby: the roster is rebuilt, so seats reset too.
      c.room.seats.clear();
      c.room.seatOwners.clear();
      broadcastState(c.room);
      broadcastSeats(c.room);
      // Re-hello each socket individually so isHost/myPlayerId stay personal
      // (seats were just cleared, so everyone re-picks a seat in the lobby).
      for (const [sid, tok] of c.room.sockets) {
        io.sockets.sockets.get(sid)?.emit('room_joined', {
          code: c.room.code,
          isHost: tok === c.room.hostToken,
          myPlayerId: null,
        });
      }
    });

    socket.on('update_rules', (rules) => {
      const c = ctxOf(socket);
      if (!c) return;
      if (!c.isHost) return deny(socket, 'Only the host can change house rules');
      c.room.state = updateHouseRules(c.room.state, rules);
      broadcastState(c.room);
    });

    // -- Turn actions (current player only) ---------------------------------

    socket.on('roll', () => {
      const c = ctxOf(socket);
      if (!c) return;
      if (!isTurnPlayer(c)) return deny(socket);
      c.room.state = rollDice(c.room.state);
      broadcastState(c.room);
      checkAITurn(c.room);
    });

    socket.on('buy', () => {
      const c = ctxOf(socket);
      if (!c) return;
      if (!isTurnPlayer(c)) return deny(socket);
      c.room.state = buyProperty(c.room.state);
      broadcastState(c.room);
      checkAITurn(c.room);
    });

    socket.on('decline_property', () => {
      const c = ctxOf(socket);
      if (!c) return;
      if (!isTurnPlayer(c)) return deny(socket);
      c.room.state = declineProperty(c.room.state);
      broadcastState(c.room);
      checkAITurn(c.room);
    });

    socket.on('start_auction', ({ propertyId }) => {
      const c = ctxOf(socket);
      if (!c) return;
      if (!isTurnPlayer(c)) return deny(socket);
      c.room.state = startAuction(c.room.state, propertyId);
      broadcastState(c.room);
      checkAITurn(c.room);
    });

    socket.on('end_turn', () => {
      const c = ctxOf(socket);
      if (!c) return;
      if (!isTurnPlayer(c)) return deny(socket);
      c.room.state = endTurn(c.room.state);
      broadcastState(c.room);
      checkAITurn(c.room);
    });

    socket.on('set_game_speed', ({ speed }) => {
      const c = ctxOf(socket);
      if (!c) return;
      if (!isTurnPlayer(c)) return deny(socket);
      c.room.state = setGameSpeed(c.room.state, speed);
      broadcastState(c.room);
    });

    // -- Auctions (seated players, acting as themselves) --------------------

    socket.on('place_bid', ({ playerId, bidAmount }) => {
      const c = ctxOf(socket);
      if (!c) return;
      if (!c.myId || playerId !== c.myId) return deny(socket, 'You can only bid as yourself');
      c.room.state = placeBid(c.room.state, playerId, bidAmount);
      broadcastState(c.room);
      checkAITurn(c.room);
    });

    socket.on('pass_auction', ({ playerId }) => {
      const c = ctxOf(socket);
      if (!c) return;
      if (!c.myId || playerId !== c.myId) return deny(socket, 'You can only pass as yourself');
      c.room.state = passAuction(c.room.state, playerId);
      broadcastState(c.room);
      checkAITurn(c.room);
    });

    // -- Trades ---------------------------------------------------------------

    socket.on('propose_trade', (offer) => {
      const c = ctxOf(socket);
      if (!c) return;
      if (!c.myId || !offer || offer.fromPlayerId !== c.myId) {
        return deny(socket, 'You can only propose trades as yourself');
      }
      const room = c.room;
      room.state = proposeTrade(room.state, offer);
      broadcastState(room);

      // If a human proposes a trade to a CPU, the CPU evaluates it dynamically
      const targetPlayer = room.state.players.find((p) => p.id === offer.toPlayerId);
      if (targetPlayer?.type === PlayerType.CPU) {
        const tradeDelay =
          room.state.gameSpeed === 'max' ? 100 : room.state.gameSpeed === 'fast' ? 400 : 1000;
        setTimeout(() => {
          if (rooms.get(room.code) !== room) return;
          const pending = room.state.pendingTrade;
          if (
            room.state.phase !== GamePhase.TRADING ||
            !pending ||
            pending.fromPlayerId !== offer.fromPlayerId ||
            pending.toPlayerId !== offer.toPlayerId
          ) {
            return;
          }
          const accepted = evaluateTradeForAI(room.state, offer);
          room.state = resolveTrade(room.state, accepted);
          broadcastState(room);
          checkAITurn(room);
        }, tradeDelay);
      }
    });

    socket.on('resolve_trade', ({ accepted }) => {
      const c = ctxOf(socket);
      if (!c) return;
      const pending = c.room.state.pendingTrade;
      if (!pending || !c.myId || pending.toPlayerId !== c.myId) {
        return deny(socket, 'Only the player who received the trade can answer it');
      }
      c.room.state = resolveTrade(c.room.state, accepted);
      broadcastState(c.room);
      checkAITurn(c.room);
    });

    // -- Own-player management (your seat only) -------------------------------

    const asSelf =
      (fn: (state: GameState, playerId: string, arg: any) => GameState) =>
      (payload: { playerId?: string; propertyId?: string; amount?: number }) => {
        const c = ctxOf(socket);
        if (!c) return;
        if (!c.myId || !payload || payload.playerId !== c.myId) {
          return deny(socket, 'You can only manage your own player');
        }
        c.room.state = fn(c.room.state, payload.playerId, payload.propertyId ?? payload.amount);
        broadcastState(c.room);
        checkAITurn(c.room);
      };

    socket.on('mortgage_property', asSelf((s, pid, prop) => mortgageProperty(s, pid, prop)));
    socket.on('unmortgage_property', asSelf((s, pid, prop) => unmortgageProperty(s, pid, prop)));
    socket.on('build_house', asSelf((s, pid, prop) => buildHouse(s, pid, prop)));
    socket.on('sell_house', asSelf((s, pid, prop) => sellHouse(s, pid, prop)));
    socket.on('take_loan', asSelf((s, pid, amt) => takeLoan(s, pid, amt)));
    socket.on('repay_loan', asSelf((s, pid, amt) => repayLoan(s, pid, amt)));

    socket.on('pay_bail', ({ playerId }) => {
      const c = ctxOf(socket);
      if (!c) return;
      if (!c.myId || playerId !== c.myId) return deny(socket, 'You can only manage your own player');
      c.room.state = payBail(c.room.state, playerId);
      broadcastState(c.room);
      checkAITurn(c.room);
    });

    socket.on('use_jail_card', ({ playerId }) => {
      const c = ctxOf(socket);
      if (!c) return;
      if (!c.myId || playerId !== c.myId) return deny(socket, 'You can only manage your own player');
      c.room.state = useGetOutOfJailCard(c.room.state, playerId);
      broadcastState(c.room);
      checkAITurn(c.room);
    });

    socket.on('dismiss_bankruptcy', () => {
      const c = ctxOf(socket);
      if (!c) return;
      if (!c.isHost && !c.myId) return deny(socket);
      c.room.state = dismissRecentBankruptcy(c.room.state);
      broadcastState(c.room);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      const code = socketRoom.get(socket.id);
      socketRoom.delete(socket.id);
      if (code) {
        const room = rooms.get(code);
        if (room) {
          room.sockets.delete(socket.id);
          cleanupRoomIfEmpty(room);
        }
      }
    });
  });

  // Server-side AI Turn Loop with dynamic speed (per room)
  function checkAITurn(room: Room) {
    if (rooms.get(room.code) !== room) return;
    const gameState = room.state;
    if (gameState.phase !== GamePhase.LOBBY && gameState.phase !== GamePhase.GAME_OVER) {
      // Check for CPU turn or CPU auction participant
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      const isCpuTurn = currentPlayer?.type === PlayerType.CPU;
      const isCpuAuction =
        gameState.phase === GamePhase.AUCTION &&
        gameState.auction &&
        gameState.players.some(
          (p) =>
            p.type === PlayerType.CPU &&
            !p.isBankrupt &&
            !gameState.auction!.passedBidderIds.includes(p.id) &&
            p.id !== gameState.auction!.highestBidderId
        );

      if (isCpuTurn || isCpuAuction) {
        const delay =
          gameState.gameSpeed === 'max' ? 80 : gameState.gameSpeed === 'fast' ? 500 : 1500;
        setTimeout(() => {
          if (rooms.get(room.code) !== room) return;
          room.state = processAITurn(room.state);
          broadcastState(room);

          // Check if subsequent AI turn is needed
          const nextPlayer = room.state.players[room.state.currentPlayerIndex];
          const nextAuctionCpu =
            room.state.phase === GamePhase.AUCTION &&
            room.state.auction &&
            room.state.players.some(
              (p) =>
                p.type === PlayerType.CPU &&
                !p.isBankrupt &&
                !room.state.auction!.passedBidderIds.includes(p.id) &&
                p.id !== room.state.auction!.highestBidderId
            );

          if ((nextPlayer?.type === PlayerType.CPU && !nextPlayer.isBankrupt) || nextAuctionCpu) {
            checkAITurn(room);
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
    app.get('/*splat', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
