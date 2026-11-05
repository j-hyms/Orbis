// Vérifie que toutes les commandes se chargent et sont valides, sans se connecter à Discord.
const { loadCommands } = require('./utils/loadCommands');
const { parseDuration } = require('./utils/duration');

const commands = loadCommands();
for (const command of commands) {
  const json = command.data.toJSON();
  const subs = (json.options ?? []).filter((o) => o.type === 1).map((o) => o.name);
  console.log(`OK  /${json.name}${subs.length ? ` (${subs.join(', ')})` : ''}`);
}

const samples = { '10m': 600000, '1h30m': 5400000, '2j': 172800000, abc: null };
for (const [input, expected] of Object.entries(samples)) {
  if (parseDuration(input) !== expected) throw new Error(`parseDuration("${input}") incorrect`);
}

console.log(`\n${commands.length} commandes valides. Tout est prêt.`);
