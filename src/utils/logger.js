const { EmbedBuilder } = require('discord.js');
const storage = require('./storage');

const COLORS = {
  danger: 0xed4245,
  warning: 0xfee75c,
  success: 0x57f287,
  info: 0x5865f2,
};

function truncate(text, max = 1024) {
  const value = String(text ?? '—') || '—';
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

/**
 * Envoie un embed dans le salon de logs configuré avec /config logs.
 * Ne fait rien si aucun salon n'est configuré.
 */
async function sendLog(guild, { title, color = COLORS.info, fields = [] }) {
  const channelId = storage.getLogChannel(guild.id);
  if (!channelId) return;

  const channel =
    guild.channels.cache.get(channelId) ?? (await guild.channels.fetch(channelId).catch(() => null));
  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .addFields(fields.map((f) => ({ name: f.name, value: truncate(f.value), inline: f.inline ?? false })))
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch((error) => {
    console.warn(`[logs] Impossible d'envoyer le log sur ${guild.name} :`, error.message);
  });
}

module.exports = { sendLog, COLORS, truncate };
