require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/users', require('./routes/users'));
app.use('/api/books', require('./routes/books'));
app.use('/api/reservations', require('./routes/reservations'));

// Central error handler: turns MySQL errors into friendly JSON messages.
app.use((err, req, res, next) => {
  // 45000 = errors we raise ourselves with SIGNAL in the procedure/triggers
  if (err.sqlState === '45000') {
    return res.status(400).json({ error: err.sqlMessage });
  }
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'That email is already registered' });
  }
  console.error(err);
  res.status(500).json({ error: 'Server error. Check the terminal and your database connection.' });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
