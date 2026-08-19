import fs from 'fs';
const file = fs.readFileSync('src/components/HUD.tsx', 'utf8');

const doubleDef = `  const TURN_TIME_LIMIT = 15;
  const [timeLeft, setTimeLeft] = useState(TURN_TIME_LIMIT);
  
  useEffect(() => {
    if (timeLeft <= 5 && timeLeft > 0 && !isCpuTurn && gameState.phase === GamePhase.TURN_START) {
      audio.playUiClick(); // Ticking sound
    }
  }, [timeLeft, isCpuTurn, gameState.phase]);`;

const targetReplacement = `  const TURN_TIME_LIMIT = 15;
  
  const TURN_TIME_LIMIT = 15;
  const [timeLeft, setTimeLeft] = useState(TURN_TIME_LIMIT);
  
  useEffect(() => {
    if (timeLeft <= 5 && timeLeft > 0 && !isCpuTurn && gameState.phase === GamePhase.TURN_START) {
      audio.playUiClick(); // Ticking sound
    }
  }, [timeLeft, isCpuTurn, gameState.phase]);`;

let newFile = file.replace(targetReplacement, doubleDef);

fs.writeFileSync('src/components/HUD.tsx', newFile);
