require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_TOKEN;

if (!token) {
    console.error('Ошибка: Токен не найден! Проверьте файл .env');
    process.exit(1);
}

const bot = new TelegramBot(token, {polling: true});

console.log('Бот запущен...');

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Привет, октагон!");
});

bot.on("polling_error", console.log);