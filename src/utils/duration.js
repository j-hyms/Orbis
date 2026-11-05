const UNITS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  j: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
};

/**
 * Convertit "10m", "1h30m", "2j", "1w" en millisecondes. Renvoie null si invalide.
 */
function parseDuration(input) {
  const cleaned = String(input).replace(/\s+/g, '').toLowerCase();
  if (!/^(\d+[smhdjw])+$/.test(cleaned)) return null;

  let total = 0;
  for (const [, amount, unit] of cleaned.matchAll(/(\d+)([smhdjw])/g)) {
    total += Number(amount) * UNITS[unit];
  }
  return total > 0 ? total : null;
}

function formatDuration(ms) {
  const parts = [];
  const days = Math.floor(ms / UNITS.d);
  const hours = Math.floor((ms % UNITS.d) / UNITS.h);
  const minutes = Math.floor((ms % UNITS.h) / UNITS.m);
  const seconds = Math.floor((ms % UNITS.m) / UNITS.s);
  if (days) parts.push(`${days} j`);
  if (hours) parts.push(`${hours} h`);
  if (minutes) parts.push(`${minutes} min`);
  if (seconds) parts.push(`${seconds} s`);
  return parts.join(' ') || '0 s';
}

module.exports = { parseDuration, formatDuration };
