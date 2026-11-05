# Bot Discord de modération — Guide complet

Bot multifonction en **Node.js + discord.js v14** pour gérer simplement la modération, les rôles, les salons et les membres d'un serveur Discord, entièrement via des **commandes slash** (`/`).

---

## 1. Fonctionnalités

| Commande | Sous-commandes | Rôle |
|---|---|---|
| `/mod` | `ban`, `unban`, `kick`, `timeout`, `untimeout`, `warn`, `warnings`, `clearwarns`, `purge` | Modération des membres |
| `/role` | `creer`, `supprimer`, `modifier`, `ajouter`, `retirer`, `info`, `liste` | Création et gestion des rôles |
| `/salon` | `creer`, `supprimer`, `renommer`, `verrouiller`, `deverrouiller`, `lent`, `sujet` | Gestion des salons |
| `/membre` | `info`, `pseudo`, `avatar`, `serveur` | Informations et gestion des membres |
| `/config` | `logs`, `desactiver-logs`, `voir` | Salon de logs de modération |
| `/aide` | — | Liste des commandes |

**Sécurités intégrées :**
- Les commandes ne sont visibles que par les membres ayant la permission adéquate (ex. `/role` → « Gérer les rôles »).
- Respect de la **hiérarchie des rôles** : impossible de sanctionner un membre plus haut placé que soi, le propriétaire, ou le bot lui-même.
- Vérification des permissions du bot avant chaque action, avec un message clair si elles manquent.
- Chaque action est enregistrée dans un **salon de logs** (optionnel) et le membre sanctionné est prévenu en MP.
- Les avertissements sont sauvegardés dans `data/db.json` (créé automatiquement).

---

## 2. Structure du projet

```
discord-bot/
├── src/
│   ├── index.js              # Démarrage du bot
│   ├── deploy-commands.js    # Enregistre les commandes slash auprès de Discord
│   ├── check.js              # Vérifie le code sans se connecter
│   ├── commands/             # moderation, role, channel, member, config, help
│   └── utils/                # stockage, logs, vérifications, durées
├── .env.example              # Modèle de configuration
├── Dockerfile                # Hébergement Docker
├── ecosystem.config.js       # Hébergement avec PM2
└── package.json
```

---

## 3. Créer le bot sur Discord

1. Allez sur **https://discord.com/developers/applications** et cliquez sur **New Application**. Donnez-lui un nom.
2. Onglet **General Information** : copiez l'**Application ID** → ce sera votre `CLIENT_ID`.
3. Onglet **Bot** :
   - Cliquez sur **Reset Token** puis **Copy** → ce sera votre `DISCORD_TOKEN`.
   - **Ne partagez jamais ce token.** S'il fuit, régénérez-le immédiatement.
   - Aucun « Privileged Gateway Intent » n'est nécessaire : laissez-les désactivés.
4. Onglet **OAuth2 → URL Generator** :
   - Scopes : cochez `bot` et `applications.commands`.
   - Permissions : `View Channels`, `Send Messages`, `Embed Links`, `Read Message History`, `Manage Messages`, `Manage Channels`, `Manage Roles`, `Manage Nicknames`, `Kick Members`, `Ban Members`, `Moderate Members`.
   - Copiez l'URL générée, ouvrez-la et ajoutez le bot à votre serveur.

   Vous pouvez aussi utiliser directement ce lien (remplacez `VOTRE_CLIENT_ID`) :
   ```
   https://discord.com/oauth2/authorize?client_id=VOTRE_CLIENT_ID&scope=bot+applications.commands&permissions=1099914374166
   ```
5. **Important :** dans *Paramètres du serveur → Rôles*, faites glisser le rôle du bot **au-dessus** des rôles qu'il doit gérer. Un bot ne peut jamais agir sur un rôle placé au-dessus du sien.

6. Pour récupérer l'ID de votre serveur (`GUILD_ID`) : *Paramètres utilisateur → Avancés → Mode développeur* activé, puis clic droit sur le serveur → **Copier l'identifiant du serveur**.

---

## 4. Installation en local (Windows, macOS, Linux)

### Prérequis
- **Node.js 18 ou plus récent** (version LTS recommandée) : https://nodejs.org
- Vérifiez avec : `node -v`

### Étapes

```bash
# 1. Se placer dans le dossier du bot
cd discord-bot

# 2. Installer les dépendances
npm install

# 3. Créer le fichier de configuration
cp .env.example .env        # sous Windows : copy .env.example .env
```

Ouvrez `.env` et remplissez :

```env
DISCORD_TOKEN=votre_token_du_bot
CLIENT_ID=id_de_votre_application
GUILD_ID=id_de_votre_serveur
```

> Avec `GUILD_ID`, les commandes apparaissent **instantanément** sur ce serveur (idéal pour tester). Laissez-le vide pour des commandes **globales** sur tous les serveurs (jusqu'à 1 heure de délai).

```bash
# 4. (Optionnel) Vérifier que tout est correct
npm run check

# 5. Enregistrer les commandes slash auprès de Discord
npm run deploy

# 6. Lancer le bot
npm start
```

Vous devez voir dans le terminal :
```
Connecté en tant que MonBot#1234 sur 1 serveur(s).
6 commandes chargées : salon, config, aide, membre, mod, role
```

> Relancez `npm run deploy` **uniquement** quand vous ajoutez ou modifiez une commande.

---

## 5. Utilisation

1. Configurez d'abord le salon de logs : `/config logs salon:#logs-moderation`
2. Tapez `/` dans Discord pour voir toutes les commandes et leurs options.

**Exemples :**

| Action | Commande |
|---|---|
| Créer un rôle rouge affiché à part | `/role creer nom:VIP couleur:#e74c3c separe:True` |
| Donner un rôle | `/role ajouter membre:@Jean role:@VIP` |
| Créer un salon privé dans une catégorie | `/salon creer nom:staff type:Textuel categorie:Administration prive:True` |
| Verrouiller le salon actuel | `/salon verrouiller` |
| Mode lent de 10 secondes | `/salon lent secondes:10` |
| Rendre muet 1 h 30 | `/mod timeout membre:@Jean duree:1h30m raison:Spam` |
| Avertir | `/mod warn membre:@Jean raison:Langage inapproprié` |
| Voir les avertissements | `/mod warnings membre:@Jean` |
| Supprimer 50 messages | `/mod purge nombre:50` |
| Bannir et effacer 1 jour de messages | `/mod ban membre:@Jean supprimer_messages:1 raison:Raid` |
| Débannir | `/mod unban id:123456789012345678` |

**Formats de durée acceptés :** `30s`, `10m`, `2h`, `1h30m`, `3j` (ou `3d`), `1w`. Maximum 28 jours (limite Discord).

---

## 6. Mettre le bot en ligne 24h/24

Un bot Discord doit tourner **en permanence**. Il ne s'héberge pas sur un service « serverless » (Vercel, Netlify…) : il faut un serveur qui fait tourner un processus Node.js en continu.

### Option A — Railway (le plus simple, sans ligne de commande)

1. Créez un dépôt GitHub et envoyez-y le dossier du bot (le fichier `.env` est ignoré grâce à `.gitignore`, c'est voulu).
2. Sur **https://railway.app**, connectez-vous avec GitHub → **New Project → Deploy from GitHub repo** → choisissez votre dépôt.
3. Onglet **Variables** : ajoutez `DISCORD_TOKEN`, `CLIENT_ID` et éventuellement `GUILD_ID`.
4. Onglet **Settings → Deploy → Custom Start Command** : `npm run deploy && npm start`
5. Pour conserver les avertissements entre les redéploiements : **Add Volume** monté sur `/app/data`.
6. Railway déploie automatiquement à chaque `git push`.

> Le Dockerfile fourni est détecté automatiquement par Railway et lance déjà `deploy` puis `start`.

### Option B — Serveur VPS (Ubuntu/Debian) avec PM2

Recommandé pour un contrôle total (OVH, Hetzner, Scaleway, Oracle Cloud gratuit…).

```bash
# Installer Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

# Récupérer le bot
git clone https://github.com/VOTRE_PSEUDO/discord-bot.git
cd discord-bot
npm install --omit=dev
cp .env.example .env && nano .env      # remplir le token, puis Ctrl+O, Entrée, Ctrl+X

# Enregistrer les commandes
npm run deploy

# Lancer en arrière-plan avec redémarrage automatique
sudo npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup        # exécutez la commande affichée pour démarrer au boot
```

**Commandes PM2 utiles :**

| Commande | Effet |
|---|---|
| `pm2 logs discord-bot` | Voir les logs en direct |
| `pm2 restart discord-bot` | Redémarrer |
| `pm2 stop discord-bot` | Arrêter |
| `pm2 status` | État du bot |

**Mettre à jour le bot :**
```bash
git pull && npm install --omit=dev && npm run deploy && pm2 restart discord-bot
```

### Option C — Docker (n'importe quel serveur)

```bash
docker build -t discord-bot .
docker run -d --name discord-bot --restart unless-stopped \
  --env-file .env -v discord-bot-data:/app/data discord-bot
```

Logs : `docker logs -f discord-bot`

### Option D — Hébergeurs spécialisés bots

Des hébergeurs comme **Pterodactyl / panels « bot hosting »** fonctionnent aussi : envoyez les fichiers (sans `node_modules`), définissez les variables d'environnement, et utilisez `npm run deploy && npm start` comme commande de démarrage.

---

## 7. Dépannage

| Problème | Solution |
|---|---|
| `DISCORD_TOKEN manquant` | Le fichier `.env` n'existe pas ou est mal rempli. |
| `TokenInvalid` | Token erroné : régénérez-le dans l'onglet **Bot**. |
| Les commandes n'apparaissent pas | Lancez `npm run deploy`. Avec commandes globales, attendez jusqu'à 1 h, ou renseignez `GUILD_ID`. Redémarrez Discord (Ctrl+R). |
| « Je n'ai pas les permissions nécessaires » | Le bot n'a pas la permission, ou son rôle est **sous** le rôle ciblé. Remontez son rôle dans la liste. |
| « Ce membre a un rôle supérieur ou égal au mien » | Hiérarchie Discord : placez le rôle du bot plus haut. |
| `/mod purge` supprime moins de messages | Discord interdit la suppression en masse des messages de plus de 14 jours. |
| Une commande n'est pas visible pour un modérateur | Il lui manque la permission associée, ou elle a été restreinte dans *Paramètres du serveur → Intégrations*. |
| Les avertissements disparaissent après un déploiement | Montez un volume persistant sur `/app/data` (Railway/Docker). |

---

## 8. Personnaliser

- **Ajouter une commande :** créez un fichier dans `src/commands/` qui exporte `data` (un `SlashCommandBuilder`) et `execute(interaction)`. Elle est chargée automatiquement. Lancez ensuite `npm run deploy`.
- **Changer les permissions par défaut :** modifiez `.setDefaultMemberPermissions(...)` dans le fichier de la commande.
- **Couleurs des logs :** `src/utils/logger.js`.

Documentation officielle : https://discord.js.org et https://discordjs.guide
