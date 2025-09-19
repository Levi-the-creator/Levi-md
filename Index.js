// index.js
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from "@whiskeysockets/baileys"
import pino from "pino"

// === CONFIG ===
const OWNER_NUMBER = "2348012345678" // <-- put your WhatsApp number here (with country code, no +)
const SESSION_FOLDER = "./session"   // folder for auth/session data
// ==============

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER)
    const { version } = await fetchLatestBaileysVersion()
    
    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: true,  // shows QR in console
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"], // spoofed client
    })

    // Listen for auth updates
    sock.ev.on("creds.update", saveCreds)

    // Pairing Code login (alternative to QR)
    if (!sock.authState.creds.registered) {
        const code = await sock.requestPairingCode(OWNER_NUMBER)
        console.log(`Pairing code sent: ${code}`)
    }

    // Connection handling
    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update
        if (connection === "close") {
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                startBot()
            } else {
                console.log("Logged out. Delete session and re-run.")
            }
        } else if (connection === "open") {
            console.log("✅ Bot connected to WhatsApp!")
        }
    })

    // Message handling
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message) return
        const from = msg.key.remoteJid
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || ""

        if (body.startsWith("!ping")) {
            await sock.sendMessage(from, { text: "pong 🏓" })
        }

        if (body.startsWith("!owner")) {
            await sock.sendMessage(from, { text: `My owner is wa.me/${OWNER_NUMBER}` })
        }
    })
}

startBot()
