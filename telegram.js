const TelegramBot = require('node-telegram-bot-api');

let bot = null;

function initBot(token) {
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN not set — Telegram disabled');
    return null;
  }
  bot = new TelegramBot(token, { polling: false });
  return bot;
}

function getBot() {
  return bot;
}

async function kirimPesan(chatId, text) {
  if (!bot) throw new Error('Bot not initialized');
  return bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
}

module.exports = { initBot, getBot, kirimPesan };
