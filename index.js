const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
} = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');
const readlineSync = require('readline-sync');

const SESSION_DIR = './session';
const CONFIG_FILE = './config.json';

// Ensure session folder exists
if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR);

// Load or create config.json
let config = {};
if (fs.existsSync(CONFIG_FILE)) {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE));
}
if (!config.owner) {
    const owner = readlineSync.question('Enter your WhatsApp number (with country code): ');
    config.owner = owner;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log(`✅ Owner number saved: ${config.owner}`);
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: P({ level: 'info' }),
        auth: state,
        browser: ['BOOGIEMAN', 'Chrome', '1.0']
    });

    // Save session
    sock.ev.on('creds.update', saveCreds);

    // Handle connection updates
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, pairingCode } = update;

        if (connection === 'open') {
            console.log('✅ Connected to WhatsApp as', config.owner);
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
                console.log('❌ Logged out. Delete session and restart.');
                process.exit();
            } else {
                console.log('⚠️ Connection closed. Reconnecting...');
                startBot();
            }
        }

        // Show pairing code if available
        if (pairingCode) {
            console.log('🔑 Your WhatsApp Pairing Code:', pairingCode);
            console.log('👉 Open WhatsApp > Linked devices > Link with phone number, then enter this code.');
        }
    });

    // Message handler
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            '';

        if (text === '!ping') {
            await sock.sendMessage(msg.key.remoteJid, { text: 'Pong!' });
        }
    });
}

startBot();
