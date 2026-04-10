const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

let bot = null;

function initializeClient() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not found in environment variables');
    return;
  }

  bot = new TelegramBot(token, { polling: false });
  console.log('Telegram client initialized');
}

async function sendMessage(message) {
  if (!bot) {
    throw new Error('Telegram client not initialized');
  }

  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    throw new Error('TELEGRAM_CHAT_ID not found in environment variables');
  }

  try {
    await bot.sendMessage(chatId, message);
    console.log('Telegram message sent successfully');
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    throw error;
  }
}

module.exports = {
  initializeClient,
  sendMessage
};