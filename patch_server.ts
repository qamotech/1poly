import fs from 'fs';
const file = fs.readFileSync('server.ts', 'utf8');
const patch = `
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
`;
const idx = file.indexOf("socket.on('build_house'");
const newFile = file.slice(0, idx) + patch + file.slice(idx);
fs.writeFileSync('server.ts', newFile);
