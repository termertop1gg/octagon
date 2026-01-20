require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mysql = require('mysql2');

const token = process.env.TELEGRAM_TOKEN;
if (!token) {
    console.error('Ошибка: Токен не найден в .env');
    process.exit(1);
}
const bot = new TelegramBot(token, {polling: true});

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ChatBotTests'
});

connection.connect(err => {
    if (err) console.error('Ошибка БД: ' + err.stack);
    else console.log('Успешное подключение к MySQL');
});

console.log('Бот запущен...');



bot.onText(/\/randomItem/, (msg) => {
    const chatId = msg.chat.id;

    connection.query('SELECT * FROM Items ORDER BY RAND() LIMIT 1', (err, results) => {
        if (err) {
            bot.sendMessage(chatId, "Ошибка базы данных.");
            return;
        }
        
        if (results.length === 0) {
            bot.sendMessage(chatId, "База данных пуста.");
            return;
        }

        const item = results[0];
        const response = `(${item.id}) - ${item.name}: ${item.desc}`;
        bot.sendMessage(chatId, response);
    });
});

bot.onText(/\/getItemByID (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const id = match[1];

    connection.query('SELECT * FROM Items WHERE id = ?', [id], (err, results) => {
        if (err) {
            bot.sendMessage(chatId, "Ошибка базы данных.");
            return;
        }

        if (results.length === 0) {
            bot.sendMessage(chatId, "Предмет с таким ID не найден.");
        } else {
            const item = results[0];
            const response = `(${item.id}) - ${item.name}: ${item.desc}`;
            bot.sendMessage(chatId, response);
        }
    });
});

bot.onText(/\/deleteItem (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const id = match[1];

    connection.query('DELETE FROM Items WHERE id = ?', [id], (err, result) => {
        if (err) {
            bot.sendMessage(chatId, "Ошибка при удалении.");
            return;
        }

        if (result.affectedRows > 0) {
            bot.sendMessage(chatId, "Удачно");
        } else {
            bot.sendMessage(chatId, "Ошибка (предмет с таким ID не найден)");
        }
    });
});

bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id, `
Доступные команды:
/randomItem - Случайный предмет
/getItemByID 1 - Получить предмет с ID 1
/deleteItem 1 - Удалить предмет с ID 1
    `);
});