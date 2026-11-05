const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  InteractionContextType,
  ChannelType,
} = require('discord.js');
const storage = require('../utils/storage');
const { replyEphemeral } = require('../utils/checks');

const data = new SlashCommandBuilder()
  .setName('config')
  .setDescription('Configuration du bot sur ce serveur')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((sub) =>
    sub
      .setName('logs')
      .setDescription('Définir le salon où sont envoyés les logs de modération')
      .addChannelOption((o) =>
        o
          .setName('salon')
          .setDescription('Salon de logs')
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) => sub.setName('desactiver-logs').setDescription('Désactiver les logs de modération'))
  .addSubcommand((sub) => sub.setName('voir').setDescription('Voir la configuration actuelle'));

module.exports = {
  data,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'logs') {
      const channel = interaction.options.getChannel('salon', true);
      const me = interaction.guild.members.me;
      if (!channel.permissionsFor(me).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
        return replyEphemeral(interaction, `Je ne peux pas envoyer de messages (avec embeds) dans ${channel}.`);
      }
      storage.setLogChannel(guildId, channel.id);
      return replyEphemeral(interaction, `Les logs de modération seront envoyés dans ${channel}.`);
    }

    if (sub === 'desactiver-logs') {
      storage.setLogChannel(guildId, null);
      return replyEphemeral(interaction, 'Logs de modération désactivés.');
    }

    const logChannelId = storage.getLogChannel(guildId);
    return replyEphemeral(
      interaction,
      `**Configuration actuelle**\nSalon de logs : ${logChannelId ? `<#${logChannelId}>` : 'non défini'}`,
    );
  },
};
