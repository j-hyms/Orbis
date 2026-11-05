const fs = require('node:fs');
const path = require('node:path');

function loadCommands() {
  const commandsDir = path.join(__dirname, '..', 'commands');
  const commands = [];

  for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith('.js'))) {
    const command = require(path.join(commandsDir, file));
    if (!command.data || typeof command.execute !== 'function') {
      console.warn(`[commandes] ${file} ignoré : il doit exporter "data" et "execute".`);
      continue;
    }
    commands.push(command);
  }

  return commands;
}

module.exports = { loadCommands };
