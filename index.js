const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 3000;


const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',      
  password: '',      
  database: 'ChatBotTests'
});


connection.connect(err => {
  if (err) {
    console.error('Ошибка подключения к БД: ' + err.stack);
    return;
  }
  console.log('Подключено к MySQL (ID ' + connection.threadId + ')');
});


app.get('/getAllItems', (req, res) => {
  const sql = 'SELECT * FROM Items';
  
  connection.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.json({ header: "Error", message: "DB Error" });
    }
    res.json(results); 
  });
});

app.post('/addItem', (req, res) => {
  const { name, desc } = req.query;

  if (!name || !desc) {
    return res.json(null);
  }

  const sql = "INSERT INTO Items (name, `desc`) VALUES (?, ?)";
  
  connection.query(sql, [name, desc], (err, result) => {
    if (err) {
      console.error(err);
      return res.json(null);
    }
    
    res.json({
      id: result.insertId,
      name: name,
      desc: desc
    });
  });
});

app.post('/deleteItem', (req, res) => {
  const { id } = req.query;

  if (!id) return res.json(null);

  const sql = "DELETE FROM Items WHERE id = ?";

  connection.query(sql, [id], (err, result) => {
    if (err) return res.json(null);

    if (result.affectedRows === 0) {
      return res.json({});
    }

    res.json({ status: "deleted", id: id });
  });
});

app.post('/updateItem', (req, res) => {
  const { id, name, desc } = req.query;

  if (!id || !name || !desc) return res.json(null);

  const sql = "UPDATE Items SET name = ?, `desc` = ? WHERE id = ?";

  connection.query(sql, [name, desc, id], (err, result) => {
    if (err) return res.json(null);

    if (result.affectedRows === 0) {
      return res.json({});
    }

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