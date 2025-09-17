const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
    session: true
});

client.on('qr', (qr) => {
    console.log('QR RECEIVED, Scan this code with your WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', async (msg) => {
    console.log(`Received message: ${msg.body}`);
    if (msg.body) {
        await msg.reply('Hello! I\'m Levi-md bot.');
    }
});

client.initialize();
