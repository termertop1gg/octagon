require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mysql = require('mysql2');

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, {polling: true});

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ChatBotTests'
});

connection.connect(err => console.log(err ? 'Ошибка БД: ' + err : 'БД подключена!'));

console.log('Бот-хранилище V4.0 (Final Gold) запущен...');

const ITEMS_PER_PAGE = 10;

bot.on('message', (msg) => {
    if (msg.text && msg.text.startsWith('/')) return;
    
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    let type = 'text';
    let fileId = null;
    let caption = msg.caption || msg.text || 'Без названия';

    if (msg.photo) { type = 'photo'; fileId = msg.photo[msg.photo.length - 1].file_id; }
    else if (msg.video) { type = 'video'; fileId = msg.video.file_id; if(caption=='Без названия') caption='Видео'; }
    else if (msg.audio) { 
        type = 'audio'; fileId = msg.audio.file_id; 
        if(caption=='Без названия') caption = `${msg.audio.performer||''} - ${msg.audio.title||''}`; 
    }
    else if (msg.voice) { type = 'voice'; fileId = msg.voice.file_id; if(caption=='Без названия') caption='Голосовое'; }
    else if (msg.document) { type = 'document'; fileId = msg.document.file_id; if(caption=='Без названия') caption=msg.document.file_name; }
    else if (msg.text) { type = 'text'; }
    else { return; }

    const sql = "INSERT INTO Storage (user_id, type, file_id, caption) VALUES (?, ?, ?, ?)";
    connection.query(sql, [userId, type, fileId, caption], (err, result) => {
        if (!err) {
            let icon = type === 'video' ? '🎥' : (type === 'audio' ? '🎵' : '✅');
            bot.sendMessage(chatId, `${icon} Сохранено! ID: ${result.insertId}`);
        }
    });
});

function sendHistoryPage(chatId, userId, page = 1, messageIdToEdit = null) {
    const offset = (page - 1) * ITEMS_PER_PAGE;

    connection.query("SELECT COUNT(*) as count FROM Storage WHERE user_id = ?", [userId], (err, countResult) => {
        if (err) return;
        const totalItems = countResult[0].count;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

        if (totalItems === 0) {
            bot.sendMessage(chatId, "Пусто. Сначала пришли мне файл или текст!");
            return;
        }

        const sql = "SELECT * FROM Storage WHERE user_id = ? ORDER BY id ASC LIMIT ? OFFSET ?";
        connection.query(sql, [userId, ITEMS_PER_PAGE, offset], (err, results) => {
            if (err) return;

            let response = `📂 Хранилище (Стр. ${page}/${totalPages}):\n\n`;
            
            results.forEach(item => {
                let icon = '❓';
                if (item.type === 'text') icon = '📝';
                else if (item.type === 'photo') icon = '🖼';
                else if (item.type === 'video') icon = '🎥';
                else if (item.type === 'audio') icon = '🎵';
                else if (item.type === 'voice') icon = '🎤';
                else if (item.type === 'document') icon = '📄';

                let shortCaption = item.caption.length > 25 ? item.caption.substring(0, 25) + '..' : item.caption;
                response += `${icon} /get_${item.id} — ${shortCaption}\n`; 
            });

            const keyboard = [];
            const row = [];
            if (page > 1) row.push({ text: "⬅️ Назад", callback_data: `page_${page - 1}` });
            if (page < totalPages) row.push({ text: "Вперед ➡️", callback_data: `page_${page + 1}` });
            if (row.length > 0) keyboard.push(row);

            const options = { reply_markup: { inline_keyboard: keyboard } };

            if (messageIdToEdit) {
                bot.editMessageText(response, {
                    chat_id: chatId,
                    message_id: messageIdToEdit,
                    reply_markup: { inline_keyboard: keyboard }
                }).catch(e => {});
            } else {
                bot.sendMessage(chatId, response, options);
            }
        });
    });
}

bot.onText(/\/list/, (msg) => sendHistoryPage(msg.chat.id, msg.from.id, 1));

bot.on('callback_query', (query) => {
    if (query.data.startsWith('page_')) {
        const newPage = parseInt(query.data.split('_')[1]);
        sendHistoryPage(query.message.chat.id, query.from.id, newPage, query.message.message_id);
        bot.answerCallbackQuery(query.id);
    }
});

bot.onText(/\/get[ _](.+)/, (msg, match) => {
    const noteId = match[1];
    connection.query("SELECT * FROM Storage WHERE id = ?", [noteId], (err, results) => {
        if (err || results.length === 0) return bot.sendMessage(msg.chat.id, "❌ Файл не найден.");
        const item = results[0];
        const opts = {caption: item.caption};
        
        switch (item.type) {
            case 'text': bot.sendMessage(msg.chat.id, item.caption); break;
            case 'photo': bot.sendPhoto(msg.chat.id, item.file_id, opts); break;
            case 'video': bot.sendVideo(msg.chat.id, item.file_id, opts); break;
            case 'audio': bot.sendAudio(msg.chat.id, item.file_id, opts); break;
            case 'voice': bot.sendVoice(msg.chat.id, item.file_id, opts); break;
            case 'document': bot.sendDocument(msg.chat.id, item.file_id, opts); break;
        }
    });
});

bot.onText(/\/delete (.+)/, (msg, match) => {
    connection.query("DELETE FROM Storage WHERE id = ?", [match[1]], (err, res) => {
        bot.sendMessage(msg.chat.id, res.affectedRows > 0 ? "🗑 Удалено" : "❌ Ошибка ID");
    });
});

bot.onText(/\/clear_all/, (msg) => {
    connection.query("TRUNCATE TABLE Storage", () => bot.sendMessage(msg.chat.id, "💥 База полностью очищена!"));
});



bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 
`👋 *Привет! Я твой Бот-Хранилище.*

Я как флешка, только в Телеграме. 
Просто перешли мне любое сообщение, фото или файл, и я сохраню его навсегда.

Попробуй скинуть мне что-нибудь прямо сейчас!
А если забудешь команды — пиши /help.`, 
    { parse_mode: 'Markdown' });
});

bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id, 
`📋 *Справка по командам:*

/list — Показать мои файлы
/get\\_ID — Скачать файл (например /get\\_5)
/delete ID — Удалить файл
/clear\\_all — Очистить всё

💡 *Совет: Чтобы сохранить файл, команды не нужны. Просто отправь его мне.*`, 
    { parse_mode: 'Markdown' });
});