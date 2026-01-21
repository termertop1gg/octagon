require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mysql = require('mysql2');
const cron = require('node-cron');

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, {polling: true});

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ChatBotTests'
});

connection.connect(err => {
    if (err) console.error('Ошибка БД: ' + err);
    else console.log('Подключено к MySQL');
});

console.log('Бот запущен...');

bot.on('message', (msg) => {
    const userId = msg.from.id;
    
    const sql = "INSERT INTO Users (id, lastMessage) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE lastMessage = NOW()";
    
    connection.query(sql, [userId], (err) => {
        if (err) console.error("Ошибка обновления пользователя:", err);
    });
});

cron.schedule('0 13 * * *', () => {
    console.log('Запуск ежедневной проверки активности...');

    const checkSql = "SELECT id FROM Users WHERE lastMessage < (NOW() - INTERVAL 2 DAY)";

    connection.query(checkSql, (err, inactiveUsers) => {
        if (err) return console.error("Ошибка поиска молчунов:", err);

        if (inactiveUsers.length === 0) {
            console.log("Нет неактивных пользователей.");
            return;
        }

        console.log(`Найдено ${inactiveUsers.length} пользователей для рассылки.`);

        connection.query('SELECT * FROM Items ORDER BY RAND() LIMIT 1', (err, items) => {
            if (err || items.length === 0) return;

            const item = items[0];
            const message = `Давно тебя не было! Смотри, что у нас есть:\n\n(${item.id}) - ${item.name}: ${item.desc}`;

            inactiveUsers.forEach(user => {
                bot.sendMessage(user.id, message).catch(e => {
                    console.error(`Не удалось отправить пользователю ${user.id}:`, e.message);
                });
            });
        });
    });
}, {
    timezone: "Europe/Moscow"
});


bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Привет! Я запомнил тебя.");
});

bot.onText(/\/randomItem/, (msg) => {
    connection.query('SELECT * FROM Items ORDER BY RAND() LIMIT 1', (err, results) => {
        if (!err && results.length > 0) {
            const item = results[0];
            bot.sendMessage(msg.chat.id, `(${item.id}) - ${item.name}: ${item.desc}`);
        }
    });
});