const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('<h1>Привет, Октагон!</h1>');
});

app.get('/static', (req, res) => {
  res.json({
    header: "Hello",
    body: "Octagon NodeJS Test"
  });
});

app.get('/dynamic', (req, res) => {
  let { a, b, c } = req.query;

  if (!a || !b || !c || isNaN(a) || isNaN(b) || isNaN(c)) {
    return res.json({ header: "Error" });
  }

  a = Number(a);
  b = Number(b);
  c = Number(c);
  
  const result = (a * b * c) / 3;

  res.json({
    header: "Calculated",
    body: String(result)
  });
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});