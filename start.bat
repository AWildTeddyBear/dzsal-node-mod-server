set MODS="..\testmods\@DisableUnmountBarbedWire"
set PORT="2302"

node ./node-mod-server.js "-port=%PORT%" "-mod=%MODS%"