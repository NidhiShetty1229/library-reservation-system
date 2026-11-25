const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// GET /api/users - list all members
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT user_id, name, email FROM Users ORDER BY user_id');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/users - add a member  (INSERT into Users table)
router.post('/', async (req, res, next) => {
  try {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim();

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const [result] = await db.query('INSERT INTO Users (name, email) VALUES (?, ?)', [name, email]);
    res.status(201).json({ message: 'Member added', user_id: result.insertId });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
