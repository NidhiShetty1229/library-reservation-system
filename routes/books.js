const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// GET /api/books - list all books
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT book_id, title, author, available FROM Books ORDER BY book_id');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/books - add a book  (INSERT into Books table)
router.post('/', async (req, res, next) => {
  try {
    const title = (req.body.title || '').trim();
    const author = (req.body.author || '').trim() || 'Unknown';

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const [result] = await db.query('INSERT INTO Books (title, author) VALUES (?, ?)', [title, author]);
    res.status(201).json({ message: 'Book added', book_id: result.insertId });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
