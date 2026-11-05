require('dotenv').config();

const { REST, Routes } = require('discord.js');
const { loadCommands } = require('./utils/loadCommands');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('DISCORD_TOKEN et CLIENT_ID sont obligatoires dans le fichier .env.');
  process.exit(1);
}

const body = loadCommands().map((command) => command.data.toJSON());
const rest = new REST().setToken(DISCORD_TOKEN);

(async () => {
  try {
    const route = GUILD_ID
      ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
      : Routes.applicationCommands(CLIENT_ID);

    console.log(`Enregistrement de ${body.length} commandes ${GUILD_ID ? `sur le serveur ${GUILD_ID}` : 'globales'}...`);
    const result = await rest.put(route, { body });
    console.log(`${result.length} commandes enregistrées avec succès.`);
    if (!GUILD_ID) console.log('Les commandes globales peuvent mettre jusqu’à 1 heure à apparaître.');
  } catch (error) {
    console.error('Échec de l’enregistrement des commandes :', error);
    process.exit(1);
  }
})();
