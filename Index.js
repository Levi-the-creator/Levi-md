import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from "@whiskeysockets/baileys"
import pino from "pino"
import fs from "fs"
import readlineSync from "readline-sync"

// === LOAD CONFIG ===
const CONFIG_FILE = "./config.json"
let config = { owner: "" }

if (fs.existsSync(CONFIG_FILE)) {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE))
}

// If no owner number, ask user once and save
if (!config.owner) {
    const number = readlineSync.question("2348162332857")
    config.owner = number
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
    console.log(`✅ Owner number saved: ${config.owner}`)
}

const OWNER_NUMBER = config.owner
const SESSION_FOLDER = "./session"

// === START BOT ===
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER)
    const { version } = await fetchLatestBaileysVersion()
    
    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: true,
        auth: state,
        browser: ["BOOGIEMAN", "Chrome", "20.0.04"],
    })

    sock.ev.on("creds.update", saveCreds)

    // Pairing Code login
    if (!sock.authState.creds.registered) {
        const code = await sock.requestPairingCode(OWNER_NUMBER)
        console.log(`📲 Pairing code for ${OWNER_NUMBER}: ${code}`)
    }

    // Connection handling
    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update
        if (connection === "close") {
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                startBot()
            } else {
                console.log("❌ Logged out. Delete /session and re-run.")
            }
        } else if (connection === "open") {
            console.log("🤖 BOOGIEMAN is online!")
        }
    })

    // Basic commands
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message) return
        const from = msg.key.remoteJid
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || ""

        if (body.startsWith("!ping")) {
            await sock.sendMessage(from, { text: "pong 🏓" })
        }

        if (body.startsWith("!owner")) {
            await sock.sendMessage(from, { text: `My master is wa.me/${OWNER_NUMBER}` })
        }
    })
}

startBot()
