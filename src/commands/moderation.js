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
const { parseDuration, formatDuration } = require('../utils/duration');

const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;
const DEFAULT_REASON = 'Aucune raison fournie';

const reasonOption = (opt) => opt.setName('raison').setDescription('Raison de la sanction').setMaxLength(400);

const data = new SlashCommandBuilder()
  .setName('mod')
  .setDescription('Commandes de modération')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((sub) =>
    sub
      .setName('ban')
      .setDescription('Bannir un utilisateur du serveur')
      .addUserOption((o) => o.setName('membre').setDescription('Utilisateur à bannir').setRequired(true))
      .addStringOption(reasonOption)
      .addIntegerOption((o) =>
        o
          .setName('supprimer_messages')
          .setDescription('Supprimer ses messages des X derniers jours (0-7)')
          .setMinValue(0)
          .setMaxValue(7),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('unban')
      .setDescription("Débannir un utilisateur via son ID")
      .addStringOption((o) => o.setName('id').setDescription("ID de l'utilisateur").setRequired(true))
      .addStringOption(reasonOption),
  )
  .addSubcommand((sub) =>
    sub
      .setName('kick')
      .setDescription('Expulser un membre du serveur')
      .addUserOption((o) => o.setName('membre').setDescription('Membre à expulser').setRequired(true))
      .addStringOption(reasonOption),
  )
  .addSubcommand((sub) =>
    sub
      .setName('timeout')
      .setDescription('Rendre un membre muet temporairement')
      .addUserOption((o) => o.setName('membre').setDescription('Membre à rendre muet').setRequired(true))
      .addStringOption((o) =>
        o.setName('duree').setDescription('Durée : 30s, 10m, 1h30m, 2j, 1w (max 28 j)').setRequired(true),
      )
      .addStringOption(reasonOption),
  )
  .addSubcommand((sub) =>
    sub
      .setName('untimeout')
      .setDescription("Retirer le mode muet d'un membre")
      .addUserOption((o) => o.setName('membre').setDescription('Membre concerné').setRequired(true))
      .addStringOption(reasonOption),
  )
  .addSubcommand((sub) =>
    sub
      .setName('warn')
      .setDescription('Avertir un membre')
      .addUserOption((o) => o.setName('membre').setDescription('Membre à avertir').setRequired(true))
      .addStringOption((o) => reasonOption(o).setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('warnings')
      .setDescription("Voir les avertissements d'un membre")
      .addUserOption((o) => o.setName('membre').setDescription('Membre concerné').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('clearwarns')
      .setDescription("Effacer tous les avertissements d'un membre")
      .addUserOption((o) => o.setName('membre').setDescription('Membre concerné').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('purge')
      .setDescription('Supprimer des messages en masse dans ce salon')
      .addIntegerOption((o) =>
        o.setName('nombre').setDescription('Nombre de messages (1-100)').setMinValue(1).setMaxValue(100).setRequired(true),
      )
      .addUserOption((o) => o.setName('membre').setDescription('Uniquement les messages de ce membre')),
  );

async function notifyUser(user, text) {
  await user.send(text).catch(() => {
    // MP fermés : on ignore, la sanction est appliquée quand même.
  });
}

async function ban(interaction) {
  if (!(await requirePermissions(interaction, PermissionFlagsBits.BanMembers))) return;

  const user = interaction.options.getUser('membre', true);
  const member = interaction.options.getMember('membre');
  const reason = interaction.options.getString('raison') ?? DEFAULT_REASON;
  const days = interaction.options.getInteger('supprimer_messages') ?? 0;

  if (member) {
    const error = checkMemberHierarchy(interaction, member);
    if (error) return replyEphemeral(interaction, error);
    if (!member.bannable) return replyEphemeral(interaction, 'Je ne peux pas bannir ce membre.');
    await notifyUser(user, `Vous avez été banni de **${interaction.guild.name}**.\nRaison : ${reason}`);
  } else if (user.id === interaction.user.id) {
    return replyEphemeral(interaction, 'Vous ne pouvez pas vous bannir vous-même.');
  }

  await interaction.guild.members.ban(user, {
    reason: `${interaction.user.tag} : ${reason}`,
    deleteMessageSeconds: days * 24 * 60 * 60,
  });

  await interaction.reply(`**${user.tag}** a été banni. Raison : ${reason}`);
  await sendLog(interaction.guild, {
    title: 'Membre banni',
    color: COLORS.danger,
    fields: [
      { name: 'Membre', value: `${user.tag} (${user.id})`, inline: true },
      { name: 'Modérateur', value: interaction.user.tag, inline: true },
      { name: 'Raison', value: reason },
    ],
  });
}

async function unban(interaction) {
  if (!(await requirePermissions(interaction, PermissionFlagsBits.BanMembers))) return;

  const userId = interaction.options.getString('id', true).trim();
  const reason = interaction.options.getString('raison') ?? DEFAULT_REASON;

  if (!/^\d{17,20}$/.test(userId)) {
    return replyEphemeral(interaction, "Cet ID n'est pas valide (17 à 20 chiffres).");
  }

  const banEntry = await interaction.guild.bans.fetch(userId).catch(() => null);
  if (!banEntry) return replyEphemeral(interaction, "Cet utilisateur n'est pas banni.");

  await interaction.guild.members.unban(userId, `${interaction.user.tag} : ${reason}`);
  await interaction.reply(`**${banEntry.user.tag}** a été débanni.`);
  await sendLog(interaction.guild, {
    title: 'Membre débanni',
    color: COLORS.success,
    fields: [
      { name: 'Utilisateur', value: `${banEntry.user.tag} (${userId})`, inline: true },
      { name: 'Modérateur', value: interaction.user.tag, inline: true },
      { name: 'Raison', value: reason },
    ],
  });
}

async function kick(interaction) {
  if (!(await requirePermissions(interaction, PermissionFlagsBits.KickMembers))) return;

  const member = interaction.options.getMember('membre');
  const reason = interaction.options.getString('raison') ?? DEFAULT_REASON;
  if (!member) return replyEphemeral(interaction, "Ce membre n'est pas sur le serveur.");

  const error = checkMemberHierarchy(interaction, member);
  if (error) return replyEphemeral(interaction, error);
  if (!member.kickable) return replyEphemeral(interaction, "Je ne peux pas expulser ce membre.");

  await notifyUser(member.user, `Vous avez été expulsé de **${interaction.guild.name}**.\nRaison : ${reason}`);
  await member.kick(`${interaction.user.tag} : ${reason}`);

  await interaction.reply(`**${member.user.tag}** a été expulsé. Raison : ${reason}`);
  await sendLog(interaction.guild, {
    title: 'Membre expulsé',
    color: COLORS.danger,
    fields: [
      { name: 'Membre', value: `${member.user.tag} (${member.id})`, inline: true },
      { name: 'Modérateur', value: interaction.user.tag, inline: true },
      { name: 'Raison', value: reason },
    ],
  });
}

async function timeout(interaction) {
  if (!(await requirePermissions(interaction, PermissionFlagsBits.ModerateMembers))) return;

  const member = interaction.options.getMember('membre');
  const rawDuration = interaction.options.getString('duree', true);
  const reason = interaction.options.getString('raison') ?? DEFAULT_REASON;
  if (!member) return replyEphemeral(interaction, "Ce membre n'est pas sur le serveur.");

  const duration = parseDuration(rawDuration);
  if (!duration) {
    return replyEphemeral(interaction, 'Durée invalide. Exemples : `30s`, `10m`, `1h30m`, `2j`, `1w`.');
  }
  if (duration > MAX_TIMEOUT_MS) {
    return replyEphemeral(interaction, 'La durée maximale imposée par Discord est de 28 jours.');
  }

  const error = checkMemberHierarchy(interaction, member);
  if (error) return replyEphemeral(interaction, error);
  if (!member.moderatable) return replyEphemeral(interaction, 'Je ne peux pas rendre ce membre muet.');

  await member.timeout(duration, `${interaction.user.tag} : ${reason}`);
  const endsAt = new Date(Date.now() + duration);

  await interaction.reply(
    `**${member.user.tag}** est muet pendant **${formatDuration(duration)}** (fin ${time(endsAt, 'R')}). Raison : ${reason}`,
  );
  await notifyUser(
    member.user,
    `Vous avez été rendu muet sur **${interaction.guild.name}** pendant ${formatDuration(duration)}.\nRaison : ${reason}`,
  );
  await sendLog(interaction.guild, {
    title: 'Membre rendu muet',
    color: COLORS.warning,
    fields: [
      { name: 'Membre', value: `${member.user.tag} (${member.id})`, inline: true },
      { name: 'Modérateur', value: interaction.user.tag, inline: true },
      { name: 'Durée', value: formatDuration(duration), inline: true },
      { name: 'Raison', value: reason },
    ],
  });
}

async function untimeout(interaction) {
  if (!(await requirePermissions(interaction, PermissionFlagsBits.ModerateMembers))) return;

  const member = interaction.options.getMember('membre');
  const reason = interaction.options.getString('raison') ?? DEFAULT_REASON;
  if (!member) return replyEphemeral(interaction, "Ce membre n'est pas sur le serveur.");
  if (!member.isCommunicationDisabled()) return replyEphemeral(interaction, "Ce membre n'est pas muet.");

  const error = checkMemberHierarchy(interaction, member);
  if (error) return replyEphemeral(interaction, error);

  await member.timeout(null, `${interaction.user.tag} : ${reason}`);
  await interaction.reply(`**${member.user.tag}** n'est plus muet.`);
  await sendLog(interaction.guild, {
    title: 'Mode muet retiré',
    color: COLORS.success,
    fields: [
      { name: 'Membre', value: `${member.user.tag} (${member.id})`, inline: true },
      { name: 'Modérateur', value: interaction.user.tag, inline: true },
      { name: 'Raison', value: reason },
    ],
  });
}

async function warn(interaction) {
  const member = interaction.options.getMember('membre');
  const reason = interaction.options.getString('raison', true);
  if (!member) return replyEphemeral(interaction, "Ce membre n'est pas sur le serveur.");
  if (member.user.bot) return replyEphemeral(interaction, 'Impossible d’avertir un bot.');

  const error = checkMemberHierarchy(interaction, member);
  if (error) return replyEphemeral(interaction, error);

  const count = storage.addWarning(interaction.guild.id, member.id, {
    moderatorId: interaction.user.id,
    reason,
    date: Date.now(),
  });

  await interaction.reply(`**${member.user.tag}** a reçu un avertissement (total : **${count}**). Raison : ${reason}`);
  await notifyUser(
    member.user,
    `Vous avez reçu un avertissement sur **${interaction.guild.name}** (total : ${count}).\nRaison : ${reason}`,
  );
  await sendLog(interaction.guild, {
    title: 'Avertissement',
    color: COLORS.warning,
    fields: [
      { name: 'Membre', value: `${member.user.tag} (${member.id})`, inline: true },
      { name: 'Modérateur', value: interaction.user.tag, inline: true },
      { name: 'Total', value: String(count), inline: true },
      { name: 'Raison', value: reason },
    ],
  });
}

async function warnings(interaction) {
  const user = interaction.options.getUser('membre', true);
  const list = storage.getWarnings(interaction.guild.id, user.id);

  if (list.length === 0) {
    return replyEphemeral(interaction, `**${user.tag}** n'a aucun avertissement.`);
  }

  const lines = list
    .slice(-15)
    .map((w, index) => `**${list.length - Math.min(list.length, 15) + index + 1}.** ${time(new Date(w.date), 'd')} par <@${w.moderatorId}> — ${w.reason}`);

  const embed = new EmbedBuilder()
    .setTitle(`Avertissements de ${user.tag}`)
    .setColor(COLORS.warning)
    .setThumbnail(user.displayAvatarURL())
    .setDescription(lines.join('\n').slice(0, 4000))
    .setFooter({ text: `Total : ${list.length}${list.length > 15 ? ' (15 derniers affichés)' : ''}` });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function clearwarns(interaction) {
  const user = interaction.options.getUser('membre', true);
  const count = storage.clearWarnings(interaction.guild.id, user.id);

  await replyEphemeral(interaction, `${count} avertissement(s) supprimé(s) pour **${user.tag}**.`);
  if (count > 0) {
    await sendLog(interaction.guild, {
      title: 'Avertissements effacés',
      color: COLORS.info,
      fields: [
        { name: 'Membre', value: `${user.tag} (${user.id})`, inline: true },
        { name: 'Modérateur', value: interaction.user.tag, inline: true },
        { name: 'Nombre', value: String(count), inline: true },
      ],
    });
  }
}

async function purge(interaction) {
  if (!(await requirePermissions(interaction, PermissionFlagsBits.ManageMessages))) return;

  const amount = interaction.options.getInteger('nombre', true);
  const target = interaction.options.getUser('membre');
  const channel = interaction.channel;

  if (!channel || typeof channel.bulkDelete !== 'function') {
    return replyEphemeral(interaction, 'Cette commande ne fonctionne pas dans ce type de salon.');
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  let deleted;
  if (target) {
    const recent = await channel.messages.fetch({ limit: 100 });
    const toDelete = [...recent.filter((m) => m.author.id === target.id).values()].slice(0, amount);
    deleted = await channel.bulkDelete(toDelete, true);
  } else {
    deleted = await channel.bulkDelete(amount, true);
  }

  await interaction.editReply(
    `${deleted.size} message(s) supprimé(s).${deleted.size < amount ? ' (Les messages de plus de 14 jours ne peuvent pas être supprimés en masse.)' : ''}`,
  );
  await sendLog(interaction.guild, {
    title: 'Messages supprimés',
    color: COLORS.info,
    fields: [
      { name: 'Salon', value: `<#${channel.id}>`, inline: true },
      { name: 'Modérateur', value: interaction.user.tag, inline: true },
      { name: 'Nombre', value: String(deleted.size), inline: true },
      ...(target ? [{ name: 'Filtre', value: target.tag }] : []),
    ],
  });
}

const handlers = { ban, unban, kick, timeout, untimeout, warn, warnings, clearwarns, purge };

module.exports = {
  data,
  async execute(interaction) {
    return handlers[interaction.options.getSubcommand()](interaction);
  },
};
