import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import { createInitialGameState, addPlayer, updatePlayer, removePlayer, startGame, rollDice, endTurn, buyProperty, proposeTrade, resolveTrade, buildHouse, sellHouse, useGetOutOfJailCard, takeLoan, repayLoan, updateHouseRules, mortgageProperty, unmortgageProperty, payBail, dismissRecentBankruptcy, startAuction, placeBid, passAuction, declineProperty, setGameSpeed } from './src/engine/engine.js';
import { GAME_TOKENS } from './src/engine/board.js';
import { processAITurn } from './src/engine/ai.js';
import { evaluateTradeForAI } from './src/engine/trade.js';
import { GamePhase, PlayerType } from './src/types.js';
import type { GameState } from './src/types.js';
import {
  createInitialDealGame,
  playCardToBank,
  playCardToProperty,
  playActionCard,
  respondWithJustSayNo,
  payDebtWithCards,
  discardCardFromHand,
  endDealTurn,
  moveWildcard,
} from './src/deal/dealEngine.js';
import { processAIDealStep } from './src/deal/dealAI.js';
import { DealGamePhase, DealCardType } from './src/deal/dealTypes.js';
import type { DealGameState, DealCard } from './src/deal/dealTypes.js';

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
  // A 1poly Cards match hosted inside this room (null = none running).
  deal: { state: DealGameState; gen: number; aiPending: boolean } | null;
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

  // -- 1poly Cards (Deal) matches ------------------------------------------
  // A match runs on the same room + seats as the classic game. Hands and the
  // deck are secret: every socket receives its OWN redacted view (other
  // players' hands and the draw pile are stub cards of the right count).

  function dealViewerId(room: Room, token: string): string | null {
    if (!room.deal) return null;
    const seatId = room.seats.get(token) ?? null;
    return seatId && room.deal.state.players.some((p) => p.id === seatId) ? seatId : null;
  }

  const hiddenCard = (owner: string, i: number): DealCard => ({
    id: `hidden-${owner}-${i}`,
    name: 'Hidden Card',
    type: DealCardType.MONEY,
    value: 0,
    description: '',
  });

  function dealViewFor(state: DealGameState, viewerId: string | null): DealGameState {
    const view = JSON.parse(JSON.stringify(state)) as DealGameState;
    view.deck = state.deck.map((_, i) => hiddenCard('deck', i));
    for (const p of view.players) {
      if (p.id !== viewerId) p.hand = p.hand.map((_, i) => hiddenCard(p.id, i));
    }
    if (view.winner && view.winner.id !== viewerId) {
      view.winner.hand = view.winner.hand.map((_, i) => hiddenCard(view.winner!.id, i));
    }
    return view;
  }

  function sendDealViews(room: Room) {
    if (!room.deal) return;
    for (const [sid, tok] of room.sockets) {
      const s = io.sockets.sockets.get(sid);
      if (!s) continue;
      s.emit('deal_state', { state: dealViewFor(room.deal.state, dealViewerId(room, tok)) });
    }
  }

  // A player is human-driven only while their seat owner is connected;
  // CPUs and empty seats are driven by the shared AI so a match never stalls.
  function dealControl(room: Room, player: { id: string; type: 'USER' | 'CPU' }): 'human' | 'ai' {
    if (player.type === 'CPU') return 'ai';
    const owner = room.seatOwners.get(player.id);
    if (owner && [...room.sockets.values()].includes(owner)) return 'human';
    return 'ai';
  }

  function dealNeedsAI(room: Room): boolean {
    const st = room.deal?.state;
    if (!st || st.phase === DealGamePhase.GAME_OVER) return false;
    if (st.phase === DealGamePhase.AWAITING_JUST_SAY_NO && st.pendingAction) {
      const responder = st.players.find(
        (p) =>
          st.pendingAction!.pendingPaymentPlayerIds.includes(p.id) ||
          p.id === st.pendingAction!.targetPlayerId ||
          (st.pendingAction!.lastJustSayNoPlayerId && p.id === st.pendingAction!.sourcePlayerId)
      );
      return !!responder && dealControl(room, responder) === 'ai';
    }
    if (st.phase === DealGamePhase.AWAITING_PAYMENT && st.pendingAction) {
      return st.players.some(
        (p) => st.pendingAction!.pendingPaymentPlayerIds.includes(p.id) && dealControl(room, p) === 'ai'
      );
    }
    const current = st.players[st.currentPlayerIndex];
    return !!current && dealControl(room, current) === 'ai';
  }

  function scheduleDealAI(room: Room) {
    if (!room.deal || room.deal.aiPending) return;
    if (!dealNeedsAI(room)) return;
    const gen = room.deal.gen;
    room.deal.aiPending = true;
    setTimeout(() => {
      if (rooms.get(room.code) !== room || !room.deal || room.deal.gen !== gen) return;
      room.deal.aiPending = false;
      if (!dealNeedsAI(room)) return;
      try {
        // Present AI-driven USER seats as CPU inside a scratch copy so the
        // shared AI driver will step them; restore real types on the result.
        const before = room.deal.state;
        const flipped = JSON.parse(JSON.stringify(before)) as DealGameState;
        for (const p of flipped.players) {
          if (p.type === 'USER' && dealControl(room, p) === 'ai') p.type = 'CPU';
        }
        const next = processAIDealStep(flipped);
        if (next !== flipped) {
          const types = new Map(before.players.map((p) => [p.id, p.type]));
          for (const p of next.players) p.type = types.get(p.id) ?? p.type;
          if (next.winner) next.winner.type = types.get(next.winner.id) ?? next.winner.type;
          room.deal.state = next;
          sendDealViews(room);
        }
      } catch (e) {
        console.error('deal AI step failed', e);
      }
      scheduleDealAI(room);
    }, 1000);
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
    // A mid-game room (classic or Cards) with claimed seats persists so
    // players can reconnect.
    const dealLive = !!room.deal && room.deal.state.phase !== DealGamePhase.GAME_OVER;
    if ((room.state.phase === GamePhase.LOBBY && !dealLive) || room.seats.size === 0) {
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
      // A Cards match may already be running in this room: send this
      // socket its (redacted) view, and pull seated players straight back
      // into the match — that's what makes refresh/reconnect seamless.
      if (room.deal) {
        const viewerId = dealViewerId(room, token);
        socket.emit('deal_state', { state: dealViewFor(room.deal.state, viewerId) });
        if (viewerId) socket.emit('deal_started', {});
      }
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
        deal: null,
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

    // -- Self-join: everyone picks their OWN name + character token --------
    // Nobody is pre-seeded into the roster (and nobody starts as "N8"): each
    // person in the room adds themselves here, which creates their player
    // and binds their seat in one step. Calling it again while seated just
    // updates your own name/token. Starting the game is NOT host-only —
    // see start_game / start_deal_match below.
    socket.on('join_game', ({ name, token }: { name?: string; token?: string } = {}) => {
      const c = ctxOf(socket);
      if (!c) return;
      const reject = (message: string) => socket.emit('seat_rejected', { message });
      if (c.room.state.phase !== GamePhase.LOBBY) {
        return reject('The game already started — you can join the next one.');
      }
      if (c.room.deal && c.room.deal.state.phase !== DealGamePhase.GAME_OVER) {
        return reject('A Cards match is running — you can join the next one.');
      }
      const cleanName = typeof name === 'string' ? name.trim().slice(0, 24) : '';
      if (!cleanName) return reject('Type your name first.');
      if (typeof token !== 'string' || !GAME_TOKENS.includes(token)) {
        return reject('Pick a character token.');
      }
      const others = c.room.state.players.filter((p) => p.id !== c.myId);
      if (others.some((p) => p.name.toLowerCase() === cleanName.toLowerCase())) {
        return reject(`The name "${cleanName}" is already taken — pick another.`);
      }
      if (others.some((p) => p.token === token)) {
        return reject('That character token is already taken — pick another.');
      }
      if (c.myId) {
        // Already in the game: this is a rename / re-pick, not a new seat.
        c.room.state = updatePlayer(c.room.state, c.myId, { name: cleanName, token });
        socket.emit('seat_claimed', { playerId: c.myId });
      } else {
        if (c.room.state.players.length >= 8) return reject('This game is full (8 players).');
        const before = new Set(c.room.state.players.map((p) => p.id));
        c.room.state = addPlayer(c.room.state, cleanName, PlayerType.USER, token);
        const me = c.room.state.players.find((p) => !before.has(p.id));
        if (!me) return reject('Could not join the game.');
        c.room.seats.set(c.token, me.id);
        c.room.seatOwners.set(me.id, c.token);
        socket.emit('seat_claimed', { playerId: me.id });
      }
      broadcastState(c.room);
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
      // Anyone IN the game (or the host) can start it — no host bottleneck.
      if (!c.isHost && !c.myId) return deny(socket, 'Join the game first — then you can start it');
      c.room.state = startGame(c.room.state);
      const starter = c.myId ? c.room.state.players.find((p) => p.id === c.myId)?.name : 'The host';
      io.to(c.room.code).emit('game_starting', { by: starter || 'The host', mode: 'classic' });
      broadcastState(c.room);
      checkAITurn(c.room);
    });

    socket.on('restart_game', () => {
      const c = ctxOf(socket);
      if (!c) return;
      if (!c.isHost) return deny(socket, 'Only the host can restart the game');
      c.room.state = createInitialGameState();
      // A roster rebuild invalidates any running Cards match too.
      if (c.room.deal) {
        c.room.deal = null;
        io.to(c.room.code).emit('deal_ended', {});
      }
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

    // -- 1poly Cards match (host starts; seats drive; server referees) -------

    socket.on('start_deal_match', () => {
      const c = ctxOf(socket);
      if (!c) return;
      // Anyone IN the game (or the host) can start the Cards match.
      if (!c.isHost && !c.myId) return deny(socket, 'Join the game first — then you can start it');
      if (c.room.state.players.length < 2) return deny(socket, 'Add at least 2 players first');
      if (c.room.deal && c.room.deal.state.phase !== DealGamePhase.GAME_OVER) {
        return deny(socket, 'A Cards match is already running');
      }
      const roster = c.room.state.players.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        token: p.token,
      }));
      c.room.deal = {
        state: createInitialDealGame(roster),
        gen: (c.room.deal?.gen ?? 0) + 1,
        aiPending: false,
      };
      const dealStarter = c.myId ? c.room.state.players.find((p) => p.id === c.myId)?.name : 'The host';
      io.to(c.room.code).emit('game_starting', { by: dealStarter || 'The host', mode: 'deal' });
      io.to(c.room.code).emit('deal_started', {});
      sendDealViews(c.room);
      scheduleDealAI(c.room);
    });

    socket.on('deal_action', ({ action }: { action?: any } = {}) => {
      const c = ctxOf(socket);
      if (!c || !c.room.deal || !action || typeof action.type !== 'string') return;
      const room = c.room;
      const st = room.deal.state;
      const me = c.myId;
      const current = st.players[st.currentPlayerIndex];
      const isCurrent = !!me && current?.id === me;
      try {
        switch (action.type) {
          case 'restart': {
            // Once a match is over, anyone who played in it can run it back;
            // mid-match restarts stay host-only so a game can't be wiped.
            if (!c.isHost && !(c.myId && st.phase === DealGamePhase.GAME_OVER)) {
              return deny(socket, 'Only the host can restart mid-match');
            }
            const roster = st.players.map((p) => ({
              id: p.id,
              name: p.name,
              type: p.type,
              token: p.token,
            }));
            room.deal = {
              state: createInitialDealGame(roster),
              gen: room.deal.gen + 1,
              aiPending: false,
            };
            io.to(room.code).emit('deal_started', {});
            sendDealViews(room);
            scheduleDealAI(room);
            return;
          }
          case 'end_match': {
            if (!c.isHost && !(c.myId && st.phase === DealGamePhase.GAME_OVER)) {
              return deny(socket, 'Only the host can end the match mid-game');
            }
            room.deal = null;
            io.to(room.code).emit('deal_ended', {});
            return;
          }
          case 'bank':
            if (!isCurrent) return deny(socket);
            room.deal.state = playCardToBank(st, action.cardId);
            break;
          case 'property':
            if (!isCurrent) return deny(socket);
            room.deal.state = playCardToProperty(st, action.cardId, action.targetColor);
            break;
          case 'action':
            if (!isCurrent) return deny(socket);
            room.deal.state = playActionCard(st, action.cardId, action.payload);
            break;
          case 'move_wildcard':
            if (!isCurrent) return deny(socket);
            room.deal.state = moveWildcard(st, action.cardId, action.fromColor, action.toColor);
            break;
          case 'end_turn':
            if (!isCurrent) return deny(socket);
            room.deal.state = endDealTurn(st);
            break;
          case 'discard':
            if (!isCurrent) return deny(socket);
            room.deal.state = discardCardFromHand(st, action.cardId);
            break;
          case 'just_say_no': {
            const pa = st.pendingAction;
            if (!pa || !me) return deny(socket);
            const canRespond =
              pa.pendingPaymentPlayerIds.includes(me) ||
              pa.targetPlayerId === me ||
              (!!pa.lastJustSayNoPlayerId && pa.sourcePlayerId === me);
            if (!canRespond) return deny(socket);
            room.deal.state = respondWithJustSayNo(st, me, !!action.useNo);
            break;
          }
          case 'pay_debt': {
            const pa = st.pendingAction;
            if (!pa || !me || !pa.pendingPaymentPlayerIds.includes(me)) {
              return deny(socket, 'Not your payment to make');
            }
            room.deal.state = payDebtWithCards(st, me, action.bankCardIds || [], action.propertyCards || []);
            break;
          }
          default:
            return;
        }
      } catch (e) {
        console.error('deal_action failed', e);
        return;
      }
      sendDealViews(room);
      scheduleDealAI(room);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      const code = socketRoom.get(socket.id);
      socketRoom.delete(socket.id);
      if (code) {
        const room = rooms.get(code);
        if (room) {
          room.sockets.delete(socket.id);
          // A phone leaving mid-match hands its seat to the AI until it's back.
          if (room.deal) scheduleDealAI(room);
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
