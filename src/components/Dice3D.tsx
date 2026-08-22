import React from 'react';
import { motion } from 'motion/react';

export const Dice3D: React.FC<{ rolling: boolean, face: number }> = ({ rolling, face }) => {
  const faceRotations = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },         // 1
    { x: 0, y: -90 },       // 2
    { x: 0, y: 90 },        // 3
    { x: -90, y: 0 },       // 4
    { x: 90, y: 0 },        // 5
    { x: 180, y: 0 }        // 6
  ];

  const rot = faceRotations[face] || faceRotations[1];

  return (
    <div className="w-16 h-16 relative" style={{ perspective: '1000px' }}>
      <motion.div
        className="w-full h-full relative"
        style={{ transformStyle: 'preserve-3d' }}
        initial={false}
        animate={
          rolling 
            ? { rotateX: 1440, rotateY: 1440, rotateZ: 720 } 
            : { rotateX: rot.x, rotateY: rot.y, rotateZ: 0 }
        }
        transition={
          rolling 
            ? { duration: 1.5, ease: "linear", repeat: Infinity }
            : { type: 'spring', stiffness: 200, damping: 15 }
        }
      >
        {/* Face 1 */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-amber-100/80 border-2 border-amber-200/90 rounded-2xl shadow-[inset_0_0_12px_rgba(217,119,6,0.15),0_8px_16px_rgba(0,0,0,0.35)] flex items-center justify-center" style={{ transform: 'translateZ(32px)' }}>
          <div className="w-4 h-4 bg-gradient-to-br from-red-500 to-red-800 rounded-full shadow-inner border border-red-900" />
        </div>
        {/* Face 2 */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-amber-100/80 border-2 border-amber-200/90 rounded-2xl shadow-[inset_0_0_12px_rgba(217,119,6,0.15),0_8px_16px_rgba(0,0,0,0.35)] flex flex-col items-center justify-between p-2.5" style={{ transform: 'rotateY(90deg) translateZ(32px)' }}>
          <div className="w-3.5 h-3.5 bg-gradient-to-br from-slate-700 to-slate-950 rounded-full self-start shadow-inner border border-slate-900" />
          <div className="w-3.5 h-3.5 bg-gradient-to-br from-slate-700 to-slate-950 rounded-full self-end shadow-inner border border-slate-900" />
        </div>
        {/* Face 3 */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-amber-100/80 border-2 border-amber-200/90 rounded-2xl shadow-[inset_0_0_12px_rgba(217,119,6,0.15),0_8px_16px_rgba(0,0,0,0.35)] flex flex-col items-center justify-between p-2.5" style={{ transform: 'rotateY(-90deg) translateZ(32px)' }}>
          <div className="w-3.5 h-3.5 bg-gradient-to-br from-slate-700 to-slate-950 rounded-full self-start shadow-inner border border-slate-900" />
          <div className="w-3.5 h-3.5 bg-gradient-to-br from-slate-700 to-slate-950 rounded-full shadow-inner border border-slate-900" />
          <div className="w-3.5 h-3.5 bg-gradient-to-br from-slate-700 to-slate-950 rounded-full self-end shadow-inner border border-slate-900" />
        </div>
        {/* Face 4 */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-amber-100/80 border-2 border-amber-200/90 rounded-2xl shadow-[inset_0_0_12px_rgba(217,119,6,0.15),0_8px_16px_rgba(0,0,0,0.35)] p-2.5 flex flex-col justify-between" style={{ transform: 'rotateX(90deg) translateZ(32px)' }}>
          <div className="flex justify-between w-full"><div className="w-3.5 h-3.5 bg-gradient-to-br from-slate-700 to-slate-950 rounded-full shadow-inner border border-slate-900"/><div className="w-3.5 h-3.5 bg-gradient-to-br from-slate-700 to-slate-950 rounded-full shadow-inner border border-slate-900"/></div>
          <div className="flex justify-between w-full"><div className="w-3.5 h-3.5 bg-gradient-to-br from-slate-700 to-slate-950 rounded-full shadow-inner border border-slate-900"/><div className="w-3.5 h-3.5 bg-gradient-to-br from-slate-700 to-slate-950 rounded-full shadow-inner border border-slate-900"/></div>
        </div>
        {/* Face 5 */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-amber-100/80 border-2 border-amber-200/90 rounded-2xl shadow-[inset_0_0_12px_rgba(217,119,6,0.15),0_8px_16px_rgba(0,0,0,0.35)] p-2.5 flex flex-col justify-between" style={{ transform: 'rotateX(-90deg) translateZ(32px)' }}>
          <div className="flex justify-between w-full"><div className="w-3.5 h-3.5 bg-gradient-to-br from-slate-700 to-slate-950 rounded-full shadow-inner border border-slate-900"/><div className="w-3.5 h-3.5 bg-gradient-to-br from-slate-700 to-slate-950 rounded-full shadow-inner border border-slate-900"/></div>
          <div className="flex justify-center w-full"><div className="w-3.5 h-3.5 bg-gradient-to-br from-slate-700 to-slate-950 rounded-full shadow-inner border border-slate-900"/></div>
          <div className="flex justify-between w-full"><div className="w-3.5 h-3.5 bg-gradient-to-br from-slate-700 to-slate-950 rounded-full shadow-inner border border-slate-900"/><div className="w-3.5 h-3.5 bg-gradient-to-br from-slate-700 to-slate-950 rounded-full shadow-inner border border-slate-900"/></div>
        </div>
        {/* Face 6 */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-amber-100/80 border-2 border-amber-200/90 rounded-2xl shadow-[inset_0_0_12px_rgba(217,119,6,0.15),0_8px_16px_rgba(0,0,0,0.35)] p-2.5 flex flex-col justify-between" style={{ transform: 'rotateY(180deg) translateZ(32px)' }}>
          <div className="flex justify-between w-full"><div className="w-3.5 h-3.5 bg-gradient-to-br from-slate-700 to-slate-950 rounded-full shadow-inner border border-slate-900"/><div className="w-3.5 h-3.5 bg-gradient-to-br from-slate-700 to-slate-950 rounded-full shadow-inner border border-slate-900"/></div>
          <div className="flex justify-between w-full"><div className="w-3.5 h-3.5 bg-gradient-to-br from-slate-700 to-slate-950 rounded-full shadow-inner border border-slate-900"/><div className="w-3.5 h-3.5 bg-gradient-to-br from-slate-700 to-slate-950 rounded-full shadow-inner border border-slate-900"/></div>
          <div className="flex justify-between w-full"><div className="w-3.5 h-3.5 bg-gradient-to-br from-slate-700 to-slate-950 rounded-full shadow-inner border border-slate-900"/><div className="w-3.5 h-3.5 bg-gradient-to-br from-slate-700 to-slate-950 rounded-full shadow-inner border border-slate-900"/></div>
        </div>
      </motion.div>
    </div>
  );
}
