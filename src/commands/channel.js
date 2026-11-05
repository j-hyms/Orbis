const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  InteractionContextType,
  ChannelType,
} = require('discord.js');
const { sendLog, COLORS } = require('../utils/logger');
const { replyEphemeral, requirePermissions } = require('../utils/checks');

const MANAGEABLE_TYPES = [
  ChannelType.GuildText,
  ChannelType.GuildVoice,
  ChannelType.GuildCategory,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildForum,
  ChannelType.GuildStageVoice,
];

const TYPE_MAP = {
  texte: ChannelType.GuildText,
  vocal: ChannelType.GuildVoice,
  categorie: ChannelType.GuildCategory,
};

const LOCK_PERMISSIONS = [
  'SendMessages',
  'SendMessagesInThreads',
  'CreatePublicThreads',
  'CreatePrivateThreads',
  'AddReactions',
];

const channelOption = (o, required = true) =>
  o.setName('salon').setDescription('Salon concerné').addChannelTypes(...MANAGEABLE_TYPES).setRequired(required);

const data = new SlashCommandBuilder()
  .setName('salon')
  .setDescription('Gestion des salons')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((sub) =>
    sub
      .setName('creer')
      .setDescription('Créer un salon')
      .addStringOption((o) => o.setName('nom').setDescription('Nom du salon').setMaxLength(100).setRequired(true))
      .addStringOption((o) =>
        o
          .setName('type')
          .setDescription('Type de salon')
          .addChoices(
            { name: 'Textuel', value: 'texte' },
            { name: 'Vocal', value: 'vocal' },
            { name: 'Catégorie', value: 'categorie' },
          ),
      )
      .addChannelOption((o) =>
        o.setName('categorie').setDescription('Catégorie parente').addChannelTypes(ChannelType.GuildCategory),
      )
      .addStringOption((o) => o.setName('sujet').setDescription('Sujet du salon textuel').setMaxLength(1024))
      .addBooleanOption((o) => o.setName('prive').setDescription('Caché pour @everyone')),
  )
  .addSubcommand((sub) =>
    sub
      .setName('supprimer')
      .setDescription('Supprimer un salon')
      .addChannelOption((o) => channelOption(o)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('renommer')
      .setDescription('Renommer un salon')
      .addChannelOption((o) => channelOption(o))
      .addStringOption((o) => o.setName('nom').setDescription('Nouveau nom').setMaxLength(100).setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('verrouiller')
      .setDescription('Empêcher @everyone d’écrire dans un salon')
      .addChannelOption((o) => channelOption(o, false)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('deverrouiller')
      .setDescription('Rouvrir un salon verrouillé')
      .addChannelOption((o) => channelOption(o, false)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('lent')
      .setDescription('Définir le mode lent (0 pour désactiver)')
      .addIntegerOption((o) =>
        o.setName('secondes').setDescription('Délai entre deux messages (0-21600)').setMinValue(0).setMaxValue(21600).setRequired(true),
      )
      .addChannelOption((o) => channelOption(o, false)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('sujet')
      .setDescription("Changer le sujet d'un salon textuel")
      .addStringOption((o) => o.setName('texte').setDescription('Nouveau sujet').setMaxLength(1024).setRequired(true))
      .addChannelOption((o) => channelOption(o, false)),
  );

function targetChannel(interaction) {
  return interaction.options.getChannel('salon') ?? interaction.channel;
}

async function creer(interaction) {
  if (!(await requirePermissions(interaction, PermissionFlagsBits.ManageChannels))) return;

  const name = interaction.options.getString('nom', true);
  const type = TYPE_MAP[interaction.options.getString('type') ?? 'texte'];
  const parent = interaction.options.getChannel('categorie');
  const topic = interaction.options.getString('sujet');
  const isPrivate = interaction.options.getBoolean('prive') ?? false;

  const options = { name, type, reason: `Créé par ${interaction.user.tag}` };
  if (parent && type !== ChannelType.GuildCategory) options.parent = parent.id;
  if (topic && type === ChannelType.GuildText) options.topic = topic;
  if (isPrivate) {
    options.permissionOverwrites = [
      { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel] },
    ];
  }

  const channel = await interaction.guild.channels.create(options);
  await interaction.reply(`Salon ${channel} créé.`);
  await sendLog(interaction.guild, {
    title: 'Salon créé',
    color: COLORS.success,
    fields: [
      { name: 'Salon', value: `${channel.name} (${channel.id})`, inline: true },
      { name: 'Par', value: interaction.user.tag, inline: true },
    ],
  });
}

async function supprimer(interaction) {
  if (!(await requirePermissions(interaction, PermissionFlagsBits.ManageChannels))) return;

  const channel = interaction.options.getChannel('salon', true);
  if (!channel.deletable) return replyEphemeral(interaction, 'Je ne peux pas supprimer ce salon.');

  const { name, id } = channel;
  const isCurrent = id === interaction.channelId;

  await interaction.reply(`Le salon **${name}** va être supprimé.`);
  await channel.delete(`Supprimé par ${interaction.user.tag}`);
  if (!isCurrent) await interaction.editReply(`Le salon **${name}** a été supprimé.`);

  await sendLog(interaction.guild, {
    title: 'Salon supprimé',
    color: COLORS.danger,
    fields: [
      { name: 'Salon', value: `${name} (${id})`, inline: true },
      { name: 'Par', value: interaction.user.tag, inline: true },
    ],
  });
}

async function renommer(interaction) {
  if (!(await requirePermissions(interaction, PermissionFlagsBits.ManageChannels))) return;

  const channel = interaction.options.getChannel('salon', true);
  const name = interaction.options.getString('nom', true);
  if (!channel.manageable) return replyEphemeral(interaction, 'Je ne peux pas modifier ce salon.');

  const oldName = channel.name;
  await channel.setName(name, `Renommé par ${interaction.user.tag}`);
  await interaction.reply(`Salon **${oldName}** renommé en ${channel}.`);
  await sendLog(interaction.guild, {
    title: 'Salon renommé',
    color: COLORS.info,
    fields: [
      { name: 'Avant', value: oldName, inline: true },
      { name: 'Après', value: channel.name, inline: true },
      { name: 'Par', value: interaction.user.tag, inline: true },
    ],
  });
}

async function setLock(interaction, locked) {
  // Modifier les permissions d'un salon nécessite "Gérer les rôles" côté bot.
  const botPerms = [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles];
  if (!(await requirePermissions(interaction, PermissionFlagsBits.ManageChannels, botPerms))) return;

  const channel = targetChannel(interaction);
  if (!channel?.permissionOverwrites) return replyEphemeral(interaction, 'Ce salon ne peut pas être verrouillé.');
  if (!channel.manageable) return replyEphemeral(interaction, 'Je ne peux pas modifier ce salon.');

  const value = locked ? false : null;
  const overwrite = Object.fromEntries(LOCK_PERMISSIONS.map((perm) => [perm, value]));
  if (channel.isVoiceBased()) {
    overwrite.Connect = value;
    overwrite.Speak = value;
  }

  await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, overwrite, {
    reason: `${locked ? 'Verrouillé' : 'Déverrouillé'} par ${interaction.user.tag}`,
  });

  await interaction.reply(locked ? `${channel} est maintenant verrouillé.` : `${channel} est maintenant déverrouillé.`);
  await sendLog(interaction.guild, {
    title: locked ? 'Salon verrouillé' : 'Salon déverrouillé',
    color: locked ? COLORS.warning : COLORS.success,
    fields: [
      { name: 'Salon', value: `<#${channel.id}>`, inline: true },
      { name: 'Par', value: interaction.user.tag, inline: true },
    ],
  });
}

async function lent(interaction) {
  if (!(await requirePermissions(interaction, PermissionFlagsBits.ManageChannels))) return;

  const seconds = interaction.options.getInteger('secondes', true);
  const channel = targetChannel(interaction);
  if (!channel || typeof channel.setRateLimitPerUser !== 'function') {
    return replyEphemeral(interaction, 'Le mode lent ne peut pas être appliqué à ce salon.');
  }

  await channel.setRateLimitPerUser(seconds, `Par ${interaction.user.tag}`);
  await interaction.reply(
    seconds === 0 ? `Mode lent désactivé dans ${channel}.` : `Mode lent réglé à **${seconds} s** dans ${channel}.`,
  );
}

async function sujet(interaction) {
  if (!(await requirePermissions(interaction, PermissionFlagsBits.ManageChannels))) return;

  const text = interaction.options.getString('texte', true);
  const channel = targetChannel(interaction);
  if (!channel || typeof channel.setTopic !== 'function') {
    return replyEphemeral(interaction, 'Ce salon ne possède pas de sujet modifiable.');
  }

  await channel.setTopic(text, `Par ${interaction.user.tag}`);
  await interaction.reply(`Sujet de ${channel} mis à jour.`);
}

const handlers = {
  creer,
  supprimer,
  renommer,
  verrouiller: (i) => setLock(i, true),
  deverrouiller: (i) => setLock(i, false),
  lent,
  sujet,
};

module.exports = {
  data,
  async execute(interaction) {
    return handlers[interaction.options.getSubcommand()](interaction);
  },
};
