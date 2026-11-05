const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  InteractionContextType,
  EmbedBuilder,
  MessageFlags,
  time,
} = require('discord.js');
const storage = require('../utils/storage');
const { sendLog, COLORS } = require('../utils/logger');
const { replyEphemeral, requirePermissions, checkMemberHierarchy } = require('../utils/checks');

const data = new SlashCommandBuilder()
  .setName('membre')
  .setDescription('Gestion et informations des membres')
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((sub) =>
    sub
      .setName('info')
      .setDescription("Afficher les informations d'un membre")
      .addUserOption((o) => o.setName('membre').setDescription('Membre (vous par défaut)')),
  )
  .addSubcommand((sub) =>
    sub
      .setName('pseudo')
      .setDescription("Changer le pseudo d'un membre (vide pour réinitialiser)")
      .addUserOption((o) => o.setName('membre').setDescription('Membre').setRequired(true))
      .addStringOption((o) => o.setName('pseudo').setDescription('Nouveau pseudo').setMaxLength(32)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('avatar')
      .setDescription("Afficher l'avatar d'un membre")
      .addUserOption((o) => o.setName('membre').setDescription('Membre (vous par défaut)')),
  )
  .addSubcommand((sub) => sub.setName('serveur').setDescription('Afficher les informations du serveur'));

async function info(interaction) {
  const member = interaction.options.getMember('membre') ?? interaction.member;
  const user = member.user;

  const roles = member.roles.cache
    .filter((r) => r.id !== interaction.guild.id)
    .sort((a, b) => b.position - a.position)
    .map((r) => r.toString());

  const warnings = storage.getWarnings(interaction.guild.id, user.id).length;
  const timeoutUntil = member.communicationDisabledUntil;

  const embed = new EmbedBuilder()
    .setTitle(user.tag)
    .setColor(member.displayColor || COLORS.info)
    .setThumbnail(member.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: 'ID', value: user.id, inline: true },
      { name: 'Pseudo', value: member.nickname ?? 'Aucun', inline: true },
      { name: 'Bot', value: user.bot ? 'Oui' : 'Non', inline: true },
      { name: 'Compte créé', value: time(user.createdAt, 'R'), inline: true },
      { name: 'A rejoint', value: member.joinedAt ? time(member.joinedAt, 'R') : 'Inconnu', inline: true },
      { name: 'Avertissements', value: String(warnings), inline: true },
      {
        name: 'Muet',
        value: member.isCommunicationDisabled() && timeoutUntil ? `Jusqu'à ${time(timeoutUntil, 'f')}` : 'Non',
        inline: true,
      },
      {
        name: `Rôles (${roles.length})`,
        value: roles.length ? roles.join(' ').slice(0, 1024) : 'Aucun',
      },
    );

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function pseudo(interaction) {
  if (!(await requirePermissions(interaction, PermissionFlagsBits.ManageNicknames))) return;

  const member = interaction.options.getMember('membre');
  const nickname = interaction.options.getString('pseudo') || null;
  if (!member) return replyEphemeral(interaction, "Ce membre n'est pas sur le serveur.");

  const error = checkMemberHierarchy(interaction, member, { allowSelf: true });
  if (error) return replyEphemeral(interaction, error);
  if (!member.manageable) return replyEphemeral(interaction, 'Je ne peux pas modifier le pseudo de ce membre.');

  const before = member.displayName;
  await member.setNickname(nickname, `Par ${interaction.user.tag}`);
  await interaction.reply({
    content: nickname ? `Pseudo de ${member} changé en **${nickname}**.` : `Pseudo de ${member} réinitialisé.`,
    allowedMentions: { parse: [] },
  });
  await sendLog(interaction.guild, {
    title: 'Pseudo modifié',
    color: COLORS.info,
    fields: [
      { name: 'Membre', value: `${member.user.tag} (${member.id})`, inline: true },
      { name: 'Avant', value: before, inline: true },
      { name: 'Après', value: nickname ?? member.user.username, inline: true },
      { name: 'Par', value: interaction.user.tag },
    ],
  });
}

async function avatar(interaction) {
  const user = interaction.options.getUser('membre') ?? interaction.user;
  const embed = new EmbedBuilder()
    .setTitle(`Avatar de ${user.tag}`)
    .setColor(COLORS.info)
    .setImage(user.displayAvatarURL({ size: 1024 }));
  await interaction.reply({ embeds: [embed] });
}

async function serveur(interaction) {
  const { guild } = interaction;
  const owner = await guild.fetchOwner().catch(() => null);

  const embed = new EmbedBuilder()
    .setTitle(guild.name)
    .setColor(COLORS.info)
    .setThumbnail(guild.iconURL({ size: 256 }))
    .addFields(
      { name: 'ID', value: guild.id, inline: true },
      { name: 'Propriétaire', value: owner ? owner.user.tag : 'Inconnu', inline: true },
      { name: 'Créé', value: time(guild.createdAt, 'R'), inline: true },
      { name: 'Membres', value: String(guild.memberCount), inline: true },
      { name: 'Rôles', value: String(guild.roles.cache.size - 1), inline: true },
      { name: 'Salons', value: String(guild.channels.cache.size), inline: true },
      { name: 'Boosts', value: String(guild.premiumSubscriptionCount ?? 0), inline: true },
    );

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

const handlers = { info, pseudo, avatar, serveur };

module.exports = {
  data,
  async execute(interaction) {
    return handlers[interaction.options.getSubcommand()](interaction);
  },
};
