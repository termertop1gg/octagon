# ☁️ Telegram Personal Cloud Bot

**Личный Бот-Хранилище.**
Это полноценный облачный сервис в Telegram, который позволяет сохранять файлы, заметки и медиа в локальную базу данных MySQL и управлять ими через удобный интерфейс с пагинацией.

![NodeJS](https://img.shields.io/badge/Node.js-LTS-green) ![MySQL](https://img.shields.io/badge/MySQL-Database-blue)

---

## 🚀 Возможности

*   **Всеядность:** Сохраняет Текст, Фото, Видео, Аудио, Голосовые сообщения и Документы.
*   **База данных:** Все записи хранятся в MySQL (таблица `Storage`).
*   **Умный список:** Пагинация страниц (по 10 файлов) с кнопками "Вперед/Назад".
*   **Удобство:** Кликабельные команды для скачивания (например `/get_5`).
*   **Безопасность:** Токен скрыт в переменных окружения (`.env`).

---

## 🛠 Технологии

*   **Node.js** — Серверная платформа.
*   **MySQL (XAMPP)** — База данных.
*   **Библиотеки:**
    *   `node-telegram-bot-api` — Работа с Telegram API.
    *   `mysql2` — Драйвер для базы данных.
    *   `dotenv` — Защита конфигурации.

---

## ⚙️ Установка и Запуск

### 1. Предварительные требования
*   Установлен [Node.js](https://nodejs.org/)
*   Установлен и запущен [XAMPP](https://www.apachefriends.org/) (модуль MySQL)

### 2. Установка зависимостей
Откройте терминал в папке проекта:
```bash
npm install
npm install mysql2 node-telegram-bot-api dotenv
npm install --save-dev nodemon
```

3. Настройка Базы Данных
Откройте PHPMyAdmin (обычно http://localhost/phpmyadmin).
Создайте базу данных с именем ChatBotTests.
Во вкладке SQL выполните этот запрос:
```bash
CREATE TABLE Storage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL,
    file_id TEXT,
    caption TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
4. Настройка окружения
Создайте в корне проекта файл .env и вставьте туда токен вашего бота:
```bash
TELEGRAM_TOKEN=ВАШ_ТОКЕН_ОТ_BOTFATHER
```
5. Запуск бота
```bash
node index.js
```
💡 Как пользоваться?
1. Запустите бота.
2. Просто перешлите ему любое сообщение, картинку, музыку или документ.
3. Бот сохранит файл и присвоит ему ID.
4. Напишите /list, чтобы увидеть список.
5. Нажмите на команду (синий текст) рядом с файлом, чтобы получить его обратно.
