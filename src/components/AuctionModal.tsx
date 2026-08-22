import React from 'react';
import { motion } from 'motion/react';
import { GameState, Player, PlayerType } from '../types';
import { SPACES } from '../engine/board';
import { audio } from '../audio';
import { Gavel, Check, X, Flame, ShieldAlert, Award } from 'lucide-react';

interface AuctionModalProps {
  gameState: GameState;
  onPlaceBid: (playerId: string, bidAmount: number) => void;
  onPassAuction: (playerId: string) => void;
}

export const AuctionModal: React.FC<AuctionModalProps> = ({
  gameState,
  onPlaceBid,
  onPassAuction
}) => {
  const auction = gameState.auction;
  if (!auction) return null;

  const property = SPACES.find(s => s.id === auction.propertyId);
  if (!property) return null;

  const currentBid = auction.currentBid;
  const highestBidder = gameState.players.find(p => p.id === auction.highestBidderId);
  const activeHumanPlayers = gameState.players.filter(p => !p.isBankrupt && p.type === PlayerType.USER);
  const currentHuman = activeHumanPlayers.find(p => !auction.passedBidderIds.includes(p.id)) || activeHumanPlayers[0];

  const minNextBid = currentBid === 0 ? 10 : currentBid + 10;
  const canAffordMin = currentHuman && currentHuman.money >= minNextBid;
  const hasPassed = currentHuman && auction.passedBidderIds.includes(currentHuman.id);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900/60 to-yellow-900/60 p-4 border-b border-amber-500/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-xl shadow-inner">
              <Gavel size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                Property Auction
                <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                  Official Rule
                </span>
              </h2>
              <p className="text-xs text-amber-200/80">The Banker is auctioning {property.name} to the highest bidder</p>
            </div>
          </div>
        </div>

        {/* Property Card & Bid Status */}
        <div className="p-5 space-y-5">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch">
            {/* Deed Card */}
            <div className="w-full sm:w-48 bg-slate-950 rounded-2xl border-2 border-slate-700 overflow-hidden shadow-lg flex flex-col shrink-0">
              <div 
                className="h-10 w-full flex items-center justify-center font-black text-xs uppercase tracking-wider text-white shadow-md"
                style={{ backgroundColor: property.groupColor || '#444' }}
              >
                Title Deed
              </div>
              <div className="p-3 flex-1 flex flex-col justify-between text-center space-y-2">
                <div>
                  <h3 className="font-extrabold text-white text-sm leading-tight">{property.name}</h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">List Price: ${property.price}</p>
                </div>
                {property.rent && (
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-[10px] text-slate-300 font-mono">
                    Base Rent: <span className="font-bold text-emerald-400">${property.rent[0]}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Current Highest Bid */}
            <div className="flex-1 bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Current Highest Bid</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-black text-amber-400 font-mono">
                    ${currentBid}
                  </span>
                  {currentBid === 0 && (
                    <span className="text-xs text-slate-500 font-medium">(Starting bid $10)</span>
                  )}
                </div>
                
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-slate-400">Leader:</span>
                  {highestBidder ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-bold text-xs">
                      <span>{highestBidder.token}</span>
                      <span>{highestBidder.name}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 italic">No bids yet</span>
                  )}
                </div>
              </div>

              {/* Remaining Bidders */}
              <div className="mt-4 pt-3 border-t border-slate-800">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                  Participants ({auction.activeBidderIds.length - auction.passedBidderIds.length} Active)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {gameState.players.filter(p => !p.isBankrupt).map(p => {
                    const isPassed = auction.passedBidderIds.includes(p.id);
                    const isLeader = p.id === auction.highestBidderId;
                    return (
                      <span 
                        key={p.id}
                        className={`text-xs px-2 py-1 rounded-lg font-bold flex items-center gap-1 border transition-all ${
                          isLeader 
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300' 
                            : isPassed 
                            ? 'bg-slate-900 border-slate-800 text-slate-600 line-through' 
                            : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        <span>{p.token}</span>
                        <span>{p.name}</span>
                        {isLeader && <Award size={12} className="text-amber-400 ml-0.5" />}
                        {isPassed && <span className="text-[9px] text-red-400 ml-1">OUT</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Player Actions */}
          {currentHuman && !hasPassed ? (
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">
                  Your Balance ({currentHuman.name}): <span className="font-bold text-emerald-400 font-mono">${currentHuman.money}</span>
                </span>
                <span className="text-slate-500">Minimum bid: ${minNextBid}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => {
                    audio.playBuy(0);
                    onPlaceBid(currentHuman.id, minNextBid);
                  }}
                  disabled={!canAffordMin}
                  className="py-2.5 px-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Flame size={15} /> +$10 (${minNextBid})
                </button>

                <button
                  onClick={() => {
                    audio.playBuy(0);
                    onPlaceBid(currentHuman.id, currentBid + 50);
                  }}
                  disabled={currentHuman.money < currentBid + 50}
                  className="py-2.5 px-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Flame size={15} /> +$50 (${currentBid + 50})
                </button>

                <button
                  onClick={() => {
                    audio.playBuy(0);
                    onPlaceBid(currentHuman.id, currentBid + 100);
                  }}
                  disabled={currentHuman.money < currentBid + 100}
                  className="py-2.5 px-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Flame size={15} /> +$100 (${currentBid + 100})
                </button>

                <button
                  onClick={() => {
                    audio.playUiClick();
                    onPassAuction(currentHuman.id);
                  }}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs sm:text-sm rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <X size={15} /> Pass / Drop Out
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-center">
              <p className="text-xs text-slate-400">
                {hasPassed 
                  ? "You have passed on this auction. Waiting for remaining bidders to conclude..." 
                  : "CPUs and other players are resolving bids..."}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
