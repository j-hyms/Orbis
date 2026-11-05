const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  InteractionContextType,
  EmbedBuilder,
  MessageFlags,
  time,
} = require('discord.js');
const { sendLog, COLORS } = require('../utils/logger');
const { replyEphemeral, requirePermissions, checkRoleHierarchy, checkMemberHierarchy } = require('../utils/checks');

const data = new SlashCommandBuilder()
  .setName('role')
  .setDescription('Gestion des rôles')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((sub) =>
    sub
      .setName('creer')
      .setDescription('Créer un nouveau rôle')
      .addStringOption((o) => o.setName('nom').setDescription('Nom du rôle').setMaxLength(100).setRequired(true))
      .addStringOption((o) => o.setName('couleur').setDescription('Couleur hexadécimale, ex : #ff5733'))
      .addBooleanOption((o) => o.setName('separe').setDescription('Afficher séparément dans la liste des membres'))
      .addBooleanOption((o) => o.setName('mentionnable').setDescription('Tout le monde peut mentionner ce rôle')),
  )
  .addSubcommand((sub) =>
    sub
      .setName('supprimer')
      .setDescription('Supprimer un rôle')
      .addRoleOption((o) => o.setName('role').setDescription('Rôle à supprimer').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('modifier')
      .setDescription('Modifier le nom ou la couleur d’un rôle')
      .addRoleOption((o) => o.setName('role').setDescription('Rôle à modifier').setRequired(true))
      .addStringOption((o) => o.setName('nom').setDescription('Nouveau nom').setMaxLength(100))
      .addStringOption((o) => o.setName('couleur').setDescription('Nouvelle couleur hexadécimale, ex : #ff5733')),
  )
  .addSubcommand((sub) =>
    sub
      .setName('ajouter')
      .setDescription('Donner un rôle à un membre')
      .addUserOption((o) => o.setName('membre').setDescription('Membre').setRequired(true))
      .addRoleOption((o) => o.setName('role').setDescription('Rôle à donner').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('retirer')
      .setDescription('Retirer un rôle à un membre')
      .addUserOption((o) => o.setName('membre').setDescription('Membre').setRequired(true))
      .addRoleOption((o) => o.setName('role').setDescription('Rôle à retirer').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('info')
      .setDescription("Afficher les informations d'un rôle")
      .addRoleOption((o) => o.setName('role').setDescription('Rôle').setRequired(true)),
  )
  .addSubcommand((sub) => sub.setName('liste').setDescription('Lister tous les rôles du serveur'));

function parseColor(input) {
  if (!input) return undefined;
  const match = input.trim().match(/^#?([0-9a-f]{6})$/i);
  return match ? parseInt(match[1], 16) : null;
}

async function creer(interaction) {
  if (!(await requirePermissions(interaction, PermissionFlagsBits.ManageRoles))) return;

  const name = interaction.options.getString('nom', true);
  const color = parseColor(interaction.options.getString('couleur'));
  if (color === null) return replyEphemeral(interaction, 'Couleur invalide. Utilisez le format `#ff5733`.');

  const role = await interaction.guild.roles.create({
    name,
    ...(color !== undefined && { colors: { primaryColor: color } }),
    hoist: interaction.options.getBoolean('separe') ?? false,
    mentionable: interaction.options.getBoolean('mentionnable') ?? false,
    permissions: [],
    reason: `Créé par ${interaction.user.tag}`,
  });

  await interaction.reply(`Le rôle ${role} a été créé.`);
  await sendLog(interaction.guild, {
    title: 'Rôle créé',
    color: COLORS.success,
    fields: [
      { name: 'Rôle', value: `${role.name} (${role.id})`, inline: true },
      { name: 'Par', value: interaction.user.tag, inline: true },
    ],
  });
}

async function supprimer(interaction) {
  if (!(await requirePermissions(interaction, PermissionFlagsBits.ManageRoles))) return;

  const role = interaction.options.getRole('role', true);
  const error = checkRoleHierarchy(interaction, role);
  if (error) return replyEphemeral(interaction, error);

  const name = role.name;
  await role.delete(`Supprimé par ${interaction.user.tag}`);
  await interaction.reply(`Le rôle **${name}** a été supprimé.`);
  await sendLog(interaction.guild, {
    title: 'Rôle supprimé',
    color: COLORS.danger,
    fields: [
      { name: 'Rôle', value: `${name} (${role.id})`, inline: true },
      { name: 'Par', value: interaction.user.tag, inline: true },
    ],
  });
}

async function modifier(interaction) {
  if (!(await requirePermissions(interaction, PermissionFlagsBits.ManageRoles))) return;

  const role = interaction.options.getRole('role', true);
  const name = interaction.options.getString('nom');
  const color = parseColor(interaction.options.getString('couleur'));

  if (!name && color === undefined) return replyEphemeral(interaction, 'Indiquez au moins un nom ou une couleur.');
  if (color === null) return replyEphemeral(interaction, 'Couleur invalide. Utilisez le format `#ff5733`.');

  const error = checkRoleHierarchy(interaction, role);
  if (error) return replyEphemeral(interaction, error);

  await role.edit({
    ...(name && { name }),
    ...(color !== undefined && { colors: { primaryColor: color } }),
    reason: `Modifié par ${interaction.user.tag}`,
  });

  await interaction.reply(`Le rôle ${role} a été modifié.`);
  await sendLog(interaction.guild, {
    title: 'Rôle modifié',
    color: COLORS.info,
    fields: [
      { name: 'Rôle', value: `${role.name} (${role.id})`, inline: true },
      { name: 'Par', value: interaction.user.tag, inline: true },
    ],
  });
}

async function changeMemberRole(interaction, action) {
  if (!(await requirePermissions(interaction, PermissionFlagsBits.ManageRoles))) return;

  const member = interaction.options.getMember('membre');
  const role = interaction.options.getRole('role', true);
  if (!member) return replyEphemeral(interaction, "Ce membre n'est pas sur le serveur.");

  const roleError = checkRoleHierarchy(interaction, role);
  if (roleError) return replyEphemeral(interaction, roleError);

  const hasRole = member.roles.cache.has(role.id);
  if (action === 'add' && hasRole) return replyEphemeral(interaction, `${member} possède déjà ce rôle.`);
  if (action === 'remove' && !hasRole) return replyEphemeral(interaction, `${member} ne possède pas ce rôle.`);

  // On autorise un modérateur à se donner/retirer un rôle inférieur au sien,
  // mais pas à agir sur un membre plus haut placé.
  const memberError = checkMemberHierarchy(interaction, member, { allowSelf: true });
  if (memberError && member.id !== interaction.client.user.id) return replyEphemeral(interaction, memberError);

  const reason = `Par ${interaction.user.tag}`;
  if (action === 'add') await member.roles.add(role, reason);
  else await member.roles.remove(role, reason);

  await interaction.reply({
    content: action === 'add' ? `Rôle ${role} donné à ${member}.` : `Rôle ${role} retiré à ${member}.`,
    allowedMentions: { parse: [] },
  });
  await sendLog(interaction.guild, {
    title: action === 'add' ? 'Rôle attribué' : 'Rôle retiré',
    color: action === 'add' ? COLORS.success : COLORS.warning,
    fields: [
      { name: 'Membre', value: `${member.user.tag} (${member.id})`, inline: true },
      { name: 'Rôle', value: role.name, inline: true },
      { name: 'Par', value: interaction.user.tag, inline: true },
    ],
  });
}

async function info(interaction) {
  const role = interaction.options.getRole('role', true);
  const permissions = role.permissions.toArray();

  const embed = new EmbedBuilder()
    .setTitle(`Rôle : ${role.name}`)
    .setColor(role.colors?.primaryColor || COLORS.info)
    .addFields(
      { name: 'ID', value: role.id, inline: true },
      { name: 'Couleur', value: role.hexColor, inline: true },
      { name: 'Position', value: String(role.position), inline: true },
      { name: 'Affiché séparément', value: role.hoist ? 'Oui' : 'Non', inline: true },
      { name: 'Mentionnable', value: role.mentionable ? 'Oui' : 'Non', inline: true },
      { name: 'Géré par une intégration', value: role.managed ? 'Oui' : 'Non', inline: true },
      { name: 'Créé', value: time(role.createdAt, 'R'), inline: true },
      {
        name: `Permissions (${permissions.length})`,
        value: permissions.length ? permissions.join(', ').slice(0, 1024) : 'Aucune',
      },
    );

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function liste(interaction) {
  const roles = interaction.guild.roles.cache
    .filter((r) => r.id !== interaction.guild.id)
    .sort((a, b) => b.position - a.position)
    .map((r) => `${r} — \`${r.id}\``);

  const description = roles.length ? roles.join('\n') : 'Aucun rôle.';
  const embed = new EmbedBuilder()
    .setTitle(`Rôles de ${interaction.guild.name} (${roles.length})`)
    .setColor(COLORS.info)
    .setDescription(description.length > 4000 ? `${description.slice(0, 3990)}\n...` : description);

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

const handlers = {
  creer,
  supprimer,
  modifier,
  ajouter: (i) => changeMemberRole(i, 'add'),
  retirer: (i) => changeMemberRole(i, 'remove'),
  info,
  liste,
};

module.exports = {
  data,
  async execute(interaction) {
    return handlers[interaction.options.getSubcommand()](interaction);
  },
};
