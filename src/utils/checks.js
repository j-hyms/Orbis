const { MessageFlags, PermissionsBitField } = require('discord.js');

function replyEphemeral(interaction, content) {
  const payload = { content, flags: MessageFlags.Ephemeral };
  if (interaction.deferred || interaction.replied) return interaction.editReply({ content });
  return interaction.reply(payload);
}

function permissionNames(perms) {
  return new PermissionsBitField(perms).toArray().join(', ');
}

/**
 * Vérifie que l'utilisateur ET le bot possèdent les permissions requises.
 * Répond automatiquement avec un message d'erreur et renvoie false sinon.
 */
async function requirePermissions(interaction, userPerms, botPerms = userPerms) {
  if (!interaction.memberPermissions.has(userPerms)) {
    await replyEphemeral(interaction, `Vous avez besoin de la permission : **${permissionNames(userPerms)}**.`);
    return false;
  }
  if (!interaction.appPermissions.has(botPerms)) {
    await replyEphemeral(
      interaction,
      `Il me manque la permission : **${permissionNames(botPerms)}**. Vérifiez mon rôle dans les paramètres du serveur.`,
    );
    return false;
  }
  return true;
}

/**
 * Empêche d'agir sur un membre plus haut placé que soi (ou que le bot).
 * Renvoie un message d'erreur, ou null si l'action est autorisée.
 */
function checkMemberHierarchy(interaction, target, { allowSelf = false } = {}) {
  const { guild, member: moderator } = interaction;
  const me = guild.members.me;

  if (!allowSelf && target.id === interaction.user.id) {
    return 'Vous ne pouvez pas effectuer cette action sur vous-même.';
  }
  if (target.id === interaction.client.user.id) {
    return 'Je ne peux pas effectuer cette action sur moi-même.';
  }
  if (target.id === guild.ownerId) {
    return 'Impossible de cibler le propriétaire du serveur.';
  }
  if (
    moderator.id !== guild.ownerId &&
    target.id !== moderator.id &&
    target.roles.highest.comparePositionTo(moderator.roles.highest) >= 0
  ) {
    return 'Ce membre possède un rôle supérieur ou égal au vôtre.';
  }
  if (target.roles.highest.comparePositionTo(me.roles.highest) >= 0) {
    return 'Ce membre possède un rôle supérieur ou égal au mien. Placez mon rôle plus haut dans la liste des rôles.';
  }
  return null;
}

/**
 * Empêche de gérer un rôle plus haut placé que soi (ou que le bot).
 */
function checkRoleHierarchy(interaction, role) {
  const { guild, member: moderator } = interaction;
  const me = guild.members.me;

  if (role.id === guild.id) return 'Le rôle @everyone ne peut pas être géré de cette façon.';
  if (role.managed) return 'Ce rôle est géré par une intégration (bot, boost...) et ne peut pas être modifié.';
  if (role.comparePositionTo(me.roles.highest) >= 0) {
    return 'Ce rôle est au-dessus (ou au même niveau) que mon rôle le plus haut. Placez mon rôle plus haut.';
  }
  if (moderator.id !== guild.ownerId && role.comparePositionTo(moderator.roles.highest) >= 0) {
    return 'Ce rôle est supérieur ou égal à votre rôle le plus haut.';
  }
  return null;
}

module.exports = { replyEphemeral, requirePermissions, checkMemberHierarchy, checkRoleHierarchy };
