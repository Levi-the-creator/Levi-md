import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";
import P from "pino";
import { Boom } from "@hapi/boom";

const ownerNumber = "2348162332857"; // <-- replace with your number with country code

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: P({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "close") {
            const statusCode = lastDisconnect?.error
                ? new Boom(lastDisconnect.error).output?.statusCode
                : 0;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log("Connection closed. Reconnecting:", shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === "open") {
            console.log("✅ Connected to WhatsApp as BOOGIEMAN");

            // Automatically send a pairing code to owner on first connection
            const code = Math.floor(100000 + Math.random() * 900000);
            await sock.sendMessage(ownerNumber + "@s.whatsapp.net", {
                text: `🔑 Your pairing code: ${code}`
            });
        }
    });

    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid;

        if (msg.message.conversation) {
            const text = msg.message.conversation.toLowerCase();

            // Reply to ping
            if (text === "ping") {
                await sock.sendMessage(from, { text: "Pong!" });
            }

            // Owner can request a new code
            if (from === ownerNumber + "@s.whatsapp.net" && text === "code") {
                const code = Math.floor(100000 + Math.random() * 900000);
                await sock.sendMessage(from, { text: `🔑 Your code is: ${code}` });
            }
        }
    });
}

startBot();
