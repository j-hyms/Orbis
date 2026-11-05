require('dotenv').config();

const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  ActivityType,
  MessageFlags,
  OAuth2Scopes,
  PermissionFlagsBits,
} = require('discord.js');
const { loadCommands } = require('./utils/loadCommands');

const { DISCORD_TOKEN } = process.env;
if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN manquant. Copiez .env.example en .env et renseignez votre token.');
  process.exit(1);
}

// Seul l'intent "Guilds" est nécessaire : aucun intent privilégié à activer.
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
for (const command of loadCommands()) {
  client.commands.set(command.data.name, command);
}

const INVITE_PERMISSIONS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageNicknames,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.ModerateMembers,
];

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Connecté en tant que ${readyClient.user.tag} sur ${readyClient.guilds.cache.size} serveur(s).`);
  console.log(`${client.commands.size} commandes chargées : ${[...client.commands.keys()].join(', ')}`);
  console.log(
    'Lien d’invitation :',
    readyClient.generateInvite({
      scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
      permissions: INVITE_PERMISSIONS,
    }),
  );
  readyClient.user.setActivity('/aide', { type: ActivityType.Watching });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (!interaction.inCachedGuild()) {
    await interaction
      .reply({ content: 'Les commandes ne fonctionnent que sur un serveur.', flags: MessageFlags.Ephemeral })
      .catch(() => {});
    return;
  }

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`[/${interaction.commandName}] Erreur :`, error);
    const content =
      error?.code === 50013
        ? "Je n'ai pas les permissions nécessaires pour faire cela. Vérifiez la position et les permissions de mon rôle."
        : 'Une erreur est survenue lors de l’exécution de la commande.';
    const payload = { content, flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
  }
});

client.on(Events.Error, (error) => console.error('[client] Erreur :', error));
process.on('unhandledRejection', (error) => console.error('[process] Promesse rejetée :', error));

function shutdown() {
  console.log('Arrêt du bot...');
  client.destroy().finally(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

client.login(DISCORD_TOKEN);
