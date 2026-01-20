require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_TOKEN;

if (!token) {
    console.error('Ошибка: Не найден токен в файле .env');
    process.exit(1);
}

const bot = new TelegramBot(token, {polling: true});

console.log('Бот запущен и ждет команд...');



bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const text = `
Вот список доступных команд:
/help - Показать это сообщение
/site - Ссылка на сайт Октагона
/creator - Узнать, кто мой создатель
    `;
    bot.sendMessage(chatId, text);
});

bot.onText(/\/site/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Сайт школы: https://octagon-students.ru/");
});

bot.onText(/\/creator/, (msg) => {
    const chatId = msg.chat.id;
    const myName = "Паздников Алексчандр Олегович"; 
    bot.sendMessage(chatId, `Мой создатель: ${myName}`);
});


bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Привет, октагон! Напиши /help, чтобы узнать, что я умею.");
});