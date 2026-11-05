const { SlashCommandBuilder, InteractionContextType, EmbedBuilder, MessageFlags } = require('discord.js');
const { COLORS } = require('../utils/logger');

const data = new SlashCommandBuilder()
  .setName('aide')
  .setDescription('Afficher la liste des commandes du bot')
  .setContexts(InteractionContextType.Guild);

module.exports = {
  data,
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('Commandes disponibles')
      .setColor(COLORS.info)
      .addFields(
        {
          name: 'Modération — /mod',
          value: [
            '`ban` `unban` `kick` — bannir, débannir, expulser',
            '`timeout` `untimeout` — rendre muet / retirer le muet',
            '`warn` `warnings` `clearwarns` — avertissements',
            '`purge` — supprimer jusqu’à 100 messages',
          ].join('\n'),
        },
        {
          name: 'Rôles — /role',
          value: '`creer` `supprimer` `modifier` `ajouter` `retirer` `info` `liste`',
        },
        {
          name: 'Salons — /salon',
          value: '`creer` `supprimer` `renommer` `verrouiller` `deverrouiller` `lent` `sujet`',
        },
        {
          name: 'Membres — /membre',
          value: '`info` `pseudo` `avatar` `serveur`',
        },
        {
          name: 'Configuration — /config',
          value: '`logs` `desactiver-logs` `voir`',
        },
      )
      .setFooter({ text: 'Les commandes sont visibles selon vos permissions sur le serveur.' });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
