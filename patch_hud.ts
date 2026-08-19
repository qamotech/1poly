import fs from 'fs';
const file = fs.readFileSync('src/components/HUD.tsx', 'utf8');

let newFile = file;

// Add rent preview calculation
const rentLogic = `
  // Edge case logic for Buy button
  const currentSpace = currentPlayer ? SPACES[currentPlayer.position] : null;
  const propertyState = currentSpace ? gameState.propertyStates[currentSpace.id] : null;

  let currentRent = 0;
  if (currentSpace && propertyState && propertyState.ownerId && propertyState.ownerId !== currentPlayer?.id && !propertyState.isMortgaged) {
    if (currentSpace.type === SpaceType.PROPERTY && currentSpace.rent) {
      const groupProps = SPACES.filter(s => s.groupColor === currentSpace.groupColor);
      const ownsAll = groupProps.every(s => gameState.propertyStates[s.id]?.ownerId === propertyState.ownerId);
      if (propertyState.houses === 0 && ownsAll) {
        currentRent = currentSpace.rent[0] * 2;
      } else {
        currentRent = currentSpace.rent[propertyState.houses];
      }
    } else if (currentSpace.type === SpaceType.RAILROAD) {
      const owner = gameState.players.find(p => p.id === propertyState.ownerId);
      const rrCount = owner ? owner.properties.filter(propId => SPACES.find(s => s.id === propId)?.type === SpaceType.RAILROAD).length : 1;
      currentRent = 25 * Math.pow(2, rrCount - 1);
    } else if (currentSpace.type === SpaceType.UTILITY) {
      currentRent = '4x or 10x Dice'; // Special case display
    }
    
    if (gameState.houseRules.rentControl && typeof currentRent === 'number' && currentRent > 1000) {
      currentRent = 1000;
    }
  }
`;

newFile = newFile.replace(
  "// Edge case logic for Buy button\n  const currentSpace = currentPlayer ? SPACES[currentPlayer.position] : null;\n  const propertyState = currentSpace ? gameState.propertyStates[currentSpace.id] : null;",
  rentLogic
);

// Add Rent Preview UI
const rentPreviewUI = `
        {/* Dynamic Rent Preview */}
        {currentRent !== 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-900/40 border border-red-500/50 p-3 rounded-xl flex justify-between items-center shadow-lg"
          >
            <span className="text-red-200 font-bold flex items-center gap-2">
              <span>⚠️</span> RENT DUE
            </span>
            <span className="text-red-400 font-mono font-black text-lg">
              {typeof currentRent === 'number' ? \`$\${currentRent}\` : currentRent}
            </span>
          </motion.div>
        )}
`;

newFile = newFile.replace(
  "{/* Action Buttons */}",
  rentPreviewUI + "\n        {/* Action Buttons */}"
);

// Ticking Audio in HUD
const audioTickLogic = `
  const TURN_TIME_LIMIT = 15;
  const [timeLeft, setTimeLeft] = useState(TURN_TIME_LIMIT);
  
  useEffect(() => {
    if (timeLeft <= 5 && timeLeft > 0 && !isCpuTurn && gameState.phase === GamePhase.TURN_START) {
      audio.playUiClick(); // Ticking sound
    }
  }, [timeLeft, isCpuTurn, gameState.phase]);
`;

newFile = newFile.replace(
  "const [timeLeft, setTimeLeft] = useState(TURN_TIME_LIMIT);",
  audioTickLogic
);

fs.writeFileSync('src/components/HUD.tsx', newFile);
