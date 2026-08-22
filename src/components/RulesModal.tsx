import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BookOpen, Layers, Trophy, DollarSign, Home, Shield, Swords, Sparkles, HelpCircle, CheckCircle2 } from 'lucide-react';
import { audio } from '../audio';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'classic' | 'deal';
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose, defaultTab = 'classic' }) => {
  const [activeTab, setActiveTab] = useState<'classic' | 'deal'>(defaultTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-slate-900 border-2 border-amber-400/60 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative"
      >
        {/* Header with Game Tabs */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <BookOpen size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Official Game Rules</h2>
              <p className="text-xs text-slate-400">Complete rulebooks & strategic guides for all game modes</p>
            </div>
          </div>

          <button
            onClick={() => {
              audio.playUiClick();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-950/60 p-2 gap-2 border-b border-slate-800">
          <button
            onClick={() => {
              audio.playUiClick();
              setActiveTab('classic');
            }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'classic'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers size={16} />
            <span>Classic 1poly Rules</span>
          </button>

          <button
            onClick={() => {
              audio.playUiClick();
              setActiveTab('deal');
            }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'deal'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles size={16} />
            <span>1poly Cards Rules</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar text-slate-300 text-sm leading-relaxed">
          {activeTab === 'classic' ? (
            <div className="space-y-6">
              {/* Objective */}
              <section className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-xs">
                  <Trophy size={16} />
                  <span>Object of the Game</span>
                </div>
                <p>
                  Become the wealthiest player through buying, renting, and trading real estate properties. Drive all opponents into bankruptcy or achieve victory by dominating the board!
                </p>
              </section>

              {/* Turn Flow */}
              <section className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <DollarSign size={18} className="text-emerald-400" />
                  Turn Structure & Movement
                </h3>
                <ul className="space-y-2 pl-2">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span><strong>Rolling & Moving:</strong> Roll two 3D dice to move your token clockwise around the 40-space board. Rolling doubles gives an extra turn; rolling doubles 3 times in a row sends you directly to Jail!</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span><strong>Passing GO:</strong> Collect $200 from the Bank each time you pass or land on GO (or $400 if Double GO house rule is active).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span><strong>Unowned Properties:</strong> When you land on an unowned property, railroad, or utility, you can purchase it for the listed price or decline to send it to live public auction.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span><strong>Paying Rent:</strong> Landing on an owned property requires paying rent to the owner. Rent increases significantly when the owner holds all properties in that color group (Full Color Monopoly / Complete Empire).</span>
                  </li>
                </ul>
              </section>

              {/* Building & Development */}
              <section className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Home size={18} className="text-blue-400" />
                  Houses, Hotels & Mortgages
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider mb-1 text-emerald-400">Houses & Hotels</h4>
                    <p className="text-xs text-slate-400 leading-normal">
                      Once you own all properties in a color group, build up to 4 houses per property evenly. Build a 5th house to upgrade into a red Hotel for maximum rent.
                    </p>
                  </div>
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider mb-1 text-amber-400">Mortgages & Loans</h4>
                    <p className="text-xs text-slate-400 leading-normal">
                      Need emergency cash? Mortgage unimproved properties to the Bank for 50% face value. Unmortgaging costs 50% plus 10% bank interest.
                    </p>
                  </div>
                </div>
              </section>

              {/* Jail & Bail */}
              <section className="space-y-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Shield size={18} className="text-purple-400" />
                  Jail Rules
                </h3>
                <p className="text-xs text-slate-400">
                  You go to Jail by landing on "Go to Jail", drawing a Go to Jail card, or rolling 3 consecutive doubles. To escape: roll doubles on your turn, pay $50 bail before rolling, or use a Get Out of Jail Free card. After 3 failed attempts, you must pay $50 and move forward.
                </p>
              </section>

              {/* Trades & Bankruptcy */}
              <section className="space-y-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Swords size={18} className="text-red-400" />
                  Trading & Bankruptcy
                </h3>
                <p className="text-xs text-slate-400">
                  Trade cash and unimproved properties with any player at any time on your turn. If you owe more money than your total cash and liquidated assets can pay, you must declare Bankruptcy, transferring your assets to your creditor or the Bank.
                </p>
              </section>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Objective */}
              <section className="bg-gradient-to-r from-blue-950/60 to-indigo-950/60 p-4 rounded-2xl border border-blue-800/60 space-y-2">
                <div className="flex items-center gap-2 text-blue-300 font-bold uppercase tracking-wider text-xs">
                  <Trophy size={16} />
                  <span>Object of the Game</span>
                </div>
                <p className="font-semibold text-white">
                  Be the FIRST player to collect <span className="text-amber-300 font-bold">3 COMPLETE PROPERTY SETS</span> of different colors in front of you!
                </p>
              </section>

              {/* Turn Flow */}
              <section className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-400" />
                  Turn Structure (Fast & Fierce)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-xs font-black text-amber-400 uppercase tracking-widest block mb-1">Step 1: Draw</span>
                    <p className="text-xs text-slate-300">
                      Draw <strong>2 cards</strong> from the draw pile on your turn (draw <strong>5 cards</strong> if starting with an empty hand).
                    </p>
                  </div>
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-xs font-black text-blue-400 uppercase tracking-widest block mb-1">Step 2: Play Up to 3</span>
                    <p className="text-xs text-slate-300">
                      Play up to <strong>3 cards</strong> into your Bank, Property collection, or Action pile.
                    </p>
                  </div>
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-widest block mb-1">Step 3: Discard</span>
                    <p className="text-xs text-slate-300">
                      End your turn. If holding more than <strong>7 cards</strong> in hand, discard extras to the pile.
                    </p>
                  </div>
                </div>
              </section>

              {/* 3 Ways to Play Cards */}
              <section className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers size={18} className="text-indigo-400" />
                  3 Ways to Play Any Card
                </h3>
                <ul className="space-y-2 pl-2 text-xs">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span><strong>1. Bank It (Money):</strong> Put Money cards or Action cards into your Bank pile. Banked cards can ONLY be used to pay debts to other players. Banked action cards cannot be played for actions later!</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 font-bold">•</span>
                    <span><strong>2. Build Properties:</strong> Lay down property cards or wildcards in color sets. Move wildcards between valid sets anytime on your turn without using a play.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span><strong>3. Play Action Cards:</strong> Play Action cards into the center pile to trigger their powerful effects (Rent, Stealing, Charging fees, etc.).</span>
                  </li>
                </ul>
              </section>

              {/* Action Cards Reference */}
              <section className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Swords size={18} className="text-red-400" />
                  Power Action Cards Guide
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                    <strong className="text-red-400 block mb-0.5">💥 Deal Breaker ($5M)</strong>
                    <span>Steal an entire completed property set (including houses/hotels) from any opponent!</span>
                  </div>
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                    <strong className="text-indigo-400 block mb-0.5">🛡️ Just Say No ($4M)</strong>
                    <span>Block ANY action card played against you! Can even counter an opponent's Just Say No!</span>
                  </div>
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                    <strong className="text-amber-400 block mb-0.5">🕵️ Sly Deal ($3M)</strong>
                    <span>Steal 1 property card from an opponent (cannot be from a completed set).</span>
                  </div>
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                    <strong className="text-sky-400 block mb-0.5">🤝 Forced Deal ($3M)</strong>
                    <span>Swap 1 of your properties with 1 property of an opponent (neither can be from full sets).</span>
                  </div>
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                    <strong className="text-emerald-400 block mb-0.5">💰 Debt Collector ($3M) & Birthday ($2M)</strong>
                    <span>Demand $5M from one player (Debt Collector) or $2M from EVERY player (Birthday).</span>
                  </div>
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                    <strong className="text-yellow-400 block mb-0.5">🏠 Rent & Double The Rent</strong>
                    <span>Charge players rent on your sets. Combine with Double Rent to multiply by 2x!</span>
                  </div>
                </div>
              </section>

              {/* Debt Rules */}
              <section className="bg-slate-950/70 p-4 rounded-2xl border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                  <HelpCircle size={15} />
                  <span>Crucial Rules to Remember</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Cards in Hand are Safe:</strong> Opponents cannot touch cards in your hand. You only pay debts with cards already in your Bank and Property zones!</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>No Change Given:</strong> If you owe $2M and only have a $5M bill in your bank, you must pay the $5M with no change returned.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>No Negative Debt:</strong> If you have no cards in your Bank or Property zones, you pay nothing!</span>
                  </li>
                </ul>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => {
              audio.playUiClick();
              onClose();
            }}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl transition-all shadow-md cursor-pointer"
          >
            Got It!
          </button>
        </div>
      </motion.div>
    </div>
  );
};
