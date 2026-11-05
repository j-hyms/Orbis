// Configuration PM2 : garde le bot allumé 24h/24 et le redémarre en cas de crash.
module.exports = {
  apps: [
    {
      name: 'discord-bot',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '300M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
