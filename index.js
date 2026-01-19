const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 3000;

// Настройка подключения к БД
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',      // Стандартный пользователь XAMPP
  password: '',      // Стандартный пароль XAMPP (пустой)
  database: 'ChatBotTests'
});

// Проверка подключения
connection.connect(err => {
  if (err) {
    console.error('Ошибка подключения к БД: ' + err.stack);
    return;
  }
  console.log('Подключено к MySQL (ID ' + connection.threadId + ')');
});

// 1. GET /getAllItems - Получить все записи
app.get('/getAllItems', (req, res) => {
  const sql = 'SELECT * FROM Items';
  
  connection.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.json({ header: "Error", message: "DB Error" });
    }
    res.json(results); // Возвращаем массив объектов
  });
});

// 2. POST /addItem - Добавить запись
app.post('/addItem', (req, res) => {
  // Получаем параметры из строки запроса (?name=...&desc=...)
  const { name, desc } = req.query;

  // Проверка на некорректные данные (null по заданию)
  if (!name || !desc) {
    return res.json(null);
  }

  // Обратите внимание на `desc` в кавычках, это спец. слово SQL
  const sql = "INSERT INTO Items (name, `desc`) VALUES (?, ?)";
  
  connection.query(sql, [name, desc], (err, result) => {
    if (err) {
      console.error(err);
      return res.json(null);
    }
    
    // Возвращаем созданный объект
    res.json({
      id: result.insertId,
      name: name,
      desc: desc
    });
  });
});

// 3. POST /deleteItem - Удалить запись
app.post('/deleteItem', (req, res) => {
  const { id } = req.query;

  if (!id) return res.json(null);

  const sql = "DELETE FROM Items WHERE id = ?";

  connection.query(sql, [id], (err, result) => {
    if (err) return res.json(null);

    // Если ни одна строка не удалена (объект не найден) -> пустой объект {}
    if (result.affectedRows === 0) {
      return res.json({});
    }

    // По заданию при успехе возвращаем обновленный (или удаленный) объект.
    // Обычно при удалении возвращают статус, но вернем ID удаленного.
    res.json({ status: "deleted", id: id });
  });
});

// 4. POST /updateItem - Обновить запись
app.post('/updateItem', (req, res) => {
  const { id, name, desc } = req.query;

  if (!id || !name || !desc) return res.json(null);

  const sql = "UPDATE Items SET name = ?, `desc` = ? WHERE id = ?";

  connection.query(sql, [name, desc, id], (err, result) => {
    if (err) return res.json(null);

    // Если ничего не обновилось (не нашли ID) -> пустой объект {}
    if (result.affectedRows === 0) {
      return res.json({});
    }

    // Возвращаем обновленный объект
    res.json({
      id: Number(id),
      name: name,
      desc: desc
    });
  });
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});