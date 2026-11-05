const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return { guilds: {} };
  }
}

const db = load();

// Écriture atomique : on écrit dans un fichier temporaire puis on le renomme,
// pour ne jamais corrompre la base si le bot s'arrête pendant l'écriture.
function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

function guildData(guildId) {
  if (!db.guilds[guildId]) {
    db.guilds[guildId] = { logChannelId: null, warnings: {} };
  }
  return db.guilds[guildId];
}

module.exports = {
  getLogChannel(guildId) {
    return guildData(guildId).logChannelId;
  },

  setLogChannel(guildId, channelId) {
    guildData(guildId).logChannelId = channelId;
    save();
  },

  addWarning(guildId, userId, warning) {
    const data = guildData(guildId);
    if (!data.warnings[userId]) data.warnings[userId] = [];
    data.warnings[userId].push(warning);
    save();
    return data.warnings[userId].length;
  },

  getWarnings(guildId, userId) {
    return guildData(guildId).warnings[userId] ?? [];
  },

  clearWarnings(guildId, userId) {
    const data = guildData(guildId);
    const count = data.warnings[userId]?.length ?? 0;
    delete data.warnings[userId];
    save();
    return count;
  },
};
