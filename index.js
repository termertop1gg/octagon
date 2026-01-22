require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mysql = require('mysql2');

// --- НАСТРОЙКИ ---
const token = process.env.TELEGRAM_TOKEN; 
const bot = new TelegramBot(token, {polling: true});

const ITEMS_PER_PAGE = 15;

const selection = {}; 
const updateTimers = {}; 

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ChatBotTests'
});

connection.connect(err => {
    if (err) console.error('Ошибка БД: ', err);
    else console.log('Бот V7.1 (Красивые имена IMG_...) запущен...');
});

// --- ВСПОМОГАТЕЛЬНАЯ: ПОЛУЧИТЬ ПАПКУ ---
function getUserState(userId) {
    return new Promise((resolve) => {
        const sql = "INSERT IGNORE INTO Users (id, current_folder_id) VALUES (?, 0)";
        connection.query(sql, [userId], () => {
            connection.query("SELECT current_folder_id FROM Users WHERE id = ?", [userId], (err, res) => {
                resolve(res && res[0] ? res[0].current_folder_id : 0);
            });
        });
    });
}

// --- ВСПОМОГАТЕЛЬНАЯ: ГЕНЕРАЦИЯ ИМЕНИ ФАЙЛА ---
function generateAutoName(prefix) {
    const date = new Date();
    
    const Y = date.getFullYear();
    const M = String(date.getMonth() + 1).padStart(2, '0');
    const D = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');

    const rand = Math.floor(Math.random() * 999);

    return `${prefix}_${Y}${M}${D}_${h}${m}${s}_${rand}`;
}

// --- 1. СОХРАНЕНИЕ ФАЙЛОВ ---
bot.on('message', async (msg) => {
    if (msg.text && msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (msg.text && !msg.photo && !msg.video && !msg.document && !msg.audio && !msg.voice && !msg.animation) {
        return bot.sendMessage(chatId, "⚠️ Я сохраняю только файлы.");
    }

    const currentFolderId = await getUserState(userId);

    let type = 'text';
    let fileId = null;
    let caption = msg.caption;

    // --- ОПРЕДЕЛЕНИЕ ТИПА И ИМЕНИ ---
    if (msg.photo) { 
        type = 'photo'; 
        fileId = msg.photo[msg.photo.length - 1].file_id; 
        if (!caption) caption = generateAutoName('IMG');
    }
    else if (msg.animation) { 
        type = 'animation';
        fileId = msg.animation.file_id;
        if (!caption) caption = generateAutoName('GIF');
    }
    else if (msg.video) { 
        type = 'video'; 
        fileId = msg.video.file_id; 
        if (!caption) caption = msg.video.file_name || generateAutoName('VID'); 
    }
    else if (msg.voice) { 
        type = 'voice'; 
        fileId = msg.voice.file_id; 
        if (!caption) caption = generateAutoName('VOICE'); 
    }
    else if (msg.audio) { 
        type = 'audio'; 
        fileId = msg.audio.file_id; 
        if (!caption) {
            if (msg.audio.performer && msg.audio.title) caption = `${msg.audio.performer} - ${msg.audio.title}`;
            else if (msg.audio.title) caption = msg.audio.title;
            else if (msg.audio.file_name) caption = msg.audio.file_name;
            else caption = generateAutoName('AUDIO');
        }
    }
    else if (msg.document) { 
        type = 'document'; 
        fileId = msg.document.file_id; 
        if (!caption) caption = msg.document.file_name || generateAutoName('DOC'); 
    }
    else return;

    const sql = "INSERT INTO Storage (user_id, type, file_id, caption, folder_id) VALUES (?, ?, ?, ?, ?)";
    connection.query(sql, [userId, type, fileId, caption, currentFolderId], (err) => {
        if (!err) {
            if (updateTimers[userId]) clearTimeout(updateTimers[userId]);
            updateTimers[userId] = setTimeout(() => {
                bot.sendMessage(chatId, `✅ Сохранено`);
                sendDirContent(chatId, userId, currentFolderId, 1);
                delete updateTimers[userId];
            }, 1500); 
        }
    });
});

// --- 2. ОТОБРАЖЕНИЕ СПИСКА ---
async function sendDirContent(chatId, userId, folderId, page = 1) {
    let folderName = "Главная";
    
    if (folderId !== 0) {
        const folderInfo = await new Promise(r => {
            connection.query("SELECT * FROM Folders WHERE id = ?", [folderId], (err, res) => r(res && res[0] ? res[0] : null));
        });
        if (folderInfo) folderName = folderInfo.name;
        else return sendDirContent(chatId, userId, 0, 1);
    }

    connection.query("SELECT * FROM Folders WHERE user_id = ? AND parent_id = ?", [userId, folderId], (err, folders) => {
        connection.query("SELECT * FROM Storage WHERE user_id = ? AND folder_id = ?", [userId, folderId], (err, files) => {
            
            const allFolders = folders.map(f => ({ ...f, isFolder: true }));
            const allFiles = files.map(f => ({ ...f, isFolder: false }));
            const allItems = [...allFolders, ...allFiles];

            const totalItems = allItems.length;
            const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
            if (page > totalPages && totalPages > 0) page = totalPages;
            if (page < 1) page = 1;

            const startIndex = (page - 1) * ITEMS_PER_PAGE;
            const endIndex = startIndex + ITEMS_PER_PAGE;
            const itemsOnPage = allItems.slice(startIndex, endIndex);

            let message = `📂 ${folderName}`;
            if (totalPages > 1) message += ` (Стр ${page}/${totalPages})`;
            message += `\n➖➖➖➖➖➖➖➖\n`;

            const selectedFiles = selection[userId] || [];
            if (selectedFiles.length > 0) {
                message += `📦 **Выбрано: ${selectedFiles.length}**\n`;
                message += `📥 Вставить: /paste_all\n`;
                message += `🚫 Сброс: /clear_sel\n`;
                message += `➖➖➖➖➖➖➖➖\n`;
            }

            if (folderId !== 0) message += `⤴️ /up — Наверх\n`;

            if (itemsOnPage.length === 0) {
                message += `Пусто...\n`;
            } else {
                itemsOnPage.forEach(item => {
                    if (item.isFolder) {
                        message += `📁 /open_${item.id} — ${item.name} (❌ /rmdir_${item.id})\n`;
                    } else {
                        let icon = '📄';
                        if (item.type === 'photo') icon = '🖼';
                        if (item.type === 'video') icon = '🎥';
                        if (item.type === 'audio') icon = '🎵';
                        if (item.type === 'animation') icon = '👾';

                        const isSelected = selectedFiles.includes(item.id);
                        const checkMark = isSelected ? `✅ /unsel_${item.id}` : `⬜ /sel_${item.id}`;
                        
                        message += `/get_${item.id} ${icon} ${item.caption} (❌ /del_${item.id}) ${checkMark}\n`;
                    }
                });
            }

            message += `➖➖➖➖➖➖➖➖\n`;

            if (totalPages > 1) {
                let nav = "";
                if (page > 1) nav += `⬅️ /p_${page - 1}  `;
                if (page < totalPages) nav += `  ➡️ /p_${page + 1}`;
                if (nav) message += `${nav}\n\n`;
            }

            message += `Создать папку: /mkdir Имя`;

            bot.sendMessage(chatId, message);
        });
    });
}

// --- 3. КОМАНДЫ ---

bot.onText(/\/sel_(\d+)/, async (msg, match) => {
    const userId = msg.from.id;
    const fileId = parseInt(match[1]);
    if (!selection[userId]) selection[userId] = [];
    if (!selection[userId].includes(fileId)) selection[userId].push(fileId);
    const fid = await getUserState(userId);
    sendDirContent(msg.chat.id, userId, fid, 1);
});

bot.onText(/\/unsel_(\d+)/, async (msg, match) => {
    const userId = msg.from.id;
    const fileId = parseInt(match[1]);
    if (selection[userId]) selection[userId] = selection[userId].filter(id => id !== fileId);
    const fid = await getUserState(userId);
    sendDirContent(msg.chat.id, userId, fid, 1);
});

bot.onText(/\/clear_sel/, async (msg) => {
    const userId = msg.from.id;
    selection[userId] = [];
    const fid = await getUserState(userId);
    bot.sendMessage(msg.chat.id, "Выбор сброшен.");
    sendDirContent(msg.chat.id, userId, fid, 1);
});

bot.onText(/\/paste_all/, async (msg) => {
    const userId = msg.from.id;
    const currentFolderId = await getUserState(userId);
    const filesToMove = selection[userId];

    if (!filesToMove || filesToMove.length === 0) {
        return bot.sendMessage(msg.chat.id, "Ничего не выбрано.");
    }

    const sql = "UPDATE Storage SET folder_id = ? WHERE user_id = ? AND id IN (?)";
    connection.query(sql, [currentFolderId, userId, filesToMove], (err) => {
        if (!err) {
            bot.sendMessage(msg.chat.id, `✅ Перемещено файлов: ${filesToMove.length}`);
            selection[userId] = []; 
            sendDirContent(msg.chat.id, userId, currentFolderId, 1);
        } else {
            bot.sendMessage(msg.chat.id, "Ошибка.");
        }
    });
});

bot.onText(/\/p_(\d+)/, async (msg, match) => {
    const userId = msg.from.id;
    const page = parseInt(match[1]);
    const currentFolderId = await getUserState(userId);
    sendDirContent(msg.chat.id, userId, currentFolderId, page);
});

bot.onText(/\/open_(\d+)/, (msg, match) => {
    const userId = msg.from.id;
    const newFolderId = parseInt(match[1]);
    connection.query("UPDATE Users SET current_folder_id = ? WHERE id = ?", [newFolderId, userId], () => {
        sendDirContent(msg.chat.id, userId, newFolderId, 1);
    });
});

bot.onText(/\/get_(\d+)/, (msg, match) => {
    const fileId = match[1];
    connection.query("SELECT * FROM Storage WHERE id = ?", [fileId], (err, res) => {
        if (res && res[0]) {
            const item = res[0];
            const opts = { caption: item.caption };
            const chatId = msg.chat.id;

            if (item.type === 'photo') bot.sendPhoto(chatId, item.file_id, opts);
            else if (item.type === 'video') bot.sendVideo(chatId, item.file_id, opts);
            else if (item.type === 'animation') bot.sendAnimation(chatId, item.file_id, opts);
            else if (item.type === 'document') bot.sendDocument(chatId, item.file_id, opts);
            else if (item.type === 'audio') bot.sendAudio(chatId, item.file_id, opts);
            else if (item.type === 'voice') bot.sendVoice(chatId, item.file_id, opts);
            else bot.sendMessage(chatId, item.caption);
        } else {
            bot.sendMessage(msg.chat.id, "Файл не найден.");
        }
    });
});

bot.onText(/\/del_(\d+)/, async (msg, match) => {
    const fileId = parseInt(match[1]);
    const userId = msg.from.id;
    const currentFolderId = await getUserState(userId);
    
    if (selection[userId]) {
        selection[userId] = selection[userId].filter(id => id !== fileId);
    }

    connection.query("DELETE FROM Storage WHERE id = ? AND user_id = ?", [fileId, userId], () => {
        bot.sendMessage(msg.chat.id, "🗑 Удалено");
        sendDirContent(msg.chat.id, userId, currentFolderId, 1); 
    });
});

bot.onText(/\/rmdir_(\d+)/, async (msg, match) => {
    const folderId = match[1];
    const userId = msg.from.id;
    const currentFolderId = await getUserState(userId);

    connection.query("DELETE FROM Storage WHERE folder_id = ? AND user_id = ?", [folderId, userId], () => {
        connection.query("DELETE FROM Folders WHERE id = ? AND user_id = ?", [folderId, userId], () => {
            bot.sendMessage(msg.chat.id, "🗑 Папка удалена");
            sendDirContent(msg.chat.id, userId, currentFolderId, 1);
        });
    });
});

bot.onText(/\/up/, async (msg) => {
    const userId = msg.from.id;
    const currentFolderId = await getUserState(userId);
    if (currentFolderId === 0) return bot.sendMessage(msg.chat.id, "Ты и так в корне.");

    connection.query("SELECT parent_id FROM Folders WHERE id = ?", [currentFolderId], (err, res) => {
        const parentId = (res && res[0]) ? res[0].parent_id : 0;
        connection.query("UPDATE Users SET current_folder_id = ? WHERE id = ?", [parentId, userId], () => {
            sendDirContent(msg.chat.id, userId, parentId, 1);
        });
    });
});

bot.onText(/\/mkdir (.+)/, async (msg, match) => {
    const userId = msg.from.id;
    const folderName = match[1];
    const parentId = await getUserState(userId);

    connection.query("INSERT INTO Folders (user_id, name, parent_id) VALUES (?, ?, ?)", [userId, folderName, parentId], (err) => {
        if (err) return bot.sendMessage(msg.chat.id, "Ошибка.");
        bot.sendMessage(msg.chat.id, `📁 Папка "${folderName}" создана!`);
        sendDirContent(msg.chat.id, userId, parentId, 1);
    });
});

// --- СТАРТ И HELP ---
bot.onText(/\/start/, (msg) => {
    const userId = msg.from.id;
    getUserState(userId).then(fid => {
        bot.sendMessage(msg.chat.id, 
`👋 **Файловый Менеджер**
Сохраняй файлы, создавай папки.

📁 **Команды:**
\`/mkdir Имя\` — Создать папку
\`/list\` — Обновить список

Отправь мне файлы, я их сохраню.`, { parse_mode: 'Markdown' });
        sendDirContent(msg.chat.id, userId, fid, 1);
    });
});

bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id, 
`🛠 **Помощь**

\`/mkdir Имя\` — Создать папку
\`/rmdir_ID\` — Удалить папку
\`/get_ID\` — Скачать файл
\`/del_ID\` — Удалить файл
\`/sel_ID\` — Выбрать файл
\`/paste_all\` — Переместить выбранные`, { parse_mode: 'Markdown' });
});

bot.onText(/\/list/, (msg) => {
    getUserState(msg.from.id).then(fid => sendDirContent(msg.chat.id, msg.from.id, fid, 1));
});