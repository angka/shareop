const { makeWASocket, useSingleFileAuthState, Browsers, delay } = require('baileys');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

let sock = null;
const authStatePath = path.join(__dirname, 'auth_info.json');

function initializeClient() {
  const { state, saveCreds } = useSingleFileAuthState(authStatePath);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    browser: Browsers.macOS('Desktop'),
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      console.log('WhatsApp client connected!');
    } else if (connection === 'close' && lastDisconnect.error) {
      console.log('Connection closed due to error:', lastDisconnect.error);
      // Reconnect after delay
      delay(5000).then(() => initializeClient());
    }
  });

  sock.ev.on('messages.upsert', (m) => {
    console.log('Received message:', m);
  });
}

async function sendMessage(message) {
  if (!sock) {
    throw new Error('WhatsApp client not initialized');
  }

  // Wait for connection to be ready
  if (sock.connectionState !== 'open') {
    await new Promise((resolve) => {
      const interval = setInterval(() => {
        if (sock.connectionState === 'open') {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
  }

  // Get the group ID from environment or use a placeholder
  // In a real scenario, you would get this from where the bot was initially logged in
  const groupId = process.env.WHATSAPP_GROUP_ID || '1234567890@g.us';

  try {
    await sock.sendMessage(groupId, { text: message });
    console.log('WhatsApp message sent successfully');
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

module.exports = {
  initializeClient,
  sendMessage
};