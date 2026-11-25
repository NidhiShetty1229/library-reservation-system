const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// GET /api/reservations - all reservations with member and book names
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT r.res_id, u.name AS member, b.title AS book, r.res_date, r.status
      FROM Reservations r
      JOIN Users u ON u.user_id = r.user_id
      JOIN Books b ON b.book_id = r.book_id
      ORDER BY r.res_id DESC`);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/reservations/history - rows written automatically by the triggers
router.get('/history', async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT h.history_id, h.res_id, u.name AS member, b.title AS book, h.action, h.action_time
      FROM ReservationHistory h
      JOIN Reservations r ON r.res_id = h.res_id
      JOIN Users u ON u.user_id = r.user_id
      JOIN Books b ON b.book_id = r.book_id
      ORDER BY h.history_id DESC`);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/reservations - body: { action, user_id, book_id }
router.post('/', async (req, res, next) => {
  try {
    const action = String(req.body.action || '').toUpperCase();
    const userId = Number(req.body.user_id);
    const bookId = Number(req.body.book_id);

    if (!Number.isInteger(userId) || !Number.isInteger(bookId) || userId < 1 || bookId < 1) {
      return res.status(400).json({ error: 'Choose a member and a book' });
    }

    // Switch-case in JavaScript: pick the success message for each action.
    let message;
    switch (action) {
      case 'RESERVE':
        message = 'Book reserved successfully';
        break;
      case 'CANCEL':
        message = 'Reservation cancelled';
        break;
      case 'RETURN':
        message = 'Book returned';
        break;
      default:
        return res.status(400).json({ error: 'Invalid action. Use RESERVE, CANCEL or RETURN' });
    }

    // The stored procedure does the real work (and has its own CASE statement).
    await db.query('CALL ManageReservation(?, ?, ?)', [action, userId, bookId]);
    res.json({ message });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
