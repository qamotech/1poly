import fs from 'fs';
const file = fs.readFileSync('src/App.tsx', 'utf8');

const funcsPatch = `
  const handleMortgage = (playerId: string, propertyId: string) => {
    socket.emit('mortgage_property', { playerId, propertyId });
  };
  const handleUnmortgage = (playerId: string, propertyId: string) => {
    socket.emit('unmortgage_property', { playerId, propertyId });
  };
  const handlePayBail = (playerId: string) => {
    socket.emit('pay_bail', { playerId });
  };
`;

let newFile = file.replace("const handleBuildHouse = (playerId: string, propertyId: string) => {", funcsPatch + "\n  const handleBuildHouse = (playerId: string, propertyId: string) => {");

newFile = newFile.replace(
  "onBuildHouse={handleBuildHouse}",
  "onBuildHouse={handleBuildHouse}\n          onMortgage={handleMortgage}\n          onUnmortgage={handleUnmortgage}"
);

newFile = newFile.replace(
  "onEndTurn={handleEndTurn}",
  "onEndTurn={handleEndTurn}\n              onPayBail={() => currentPlayer && handlePayBail(currentPlayer.id)}"
);

newFile = newFile.replace(
  "lg:flex-row min-h-screen lg:h-screen p-2 sm:p-4 gap-4 max-w-[1600px] mx-auto overflow-y-auto lg:overflow-hidden",
  "lg:flex-row min-h-screen lg:h-screen p-0 sm:p-4 gap-0 sm:gap-4 max-w-[1600px] mx-auto overflow-y-auto lg:overflow-hidden"
);

newFile = newFile.replace(
  "p-2 sm:p-4 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl relative",
  "p-0 sm:p-4 bg-slate-900 sm:rounded-3xl border-0 sm:border border-slate-800 sm:shadow-2xl relative"
);


fs.writeFileSync('src/App.tsx', newFile);
