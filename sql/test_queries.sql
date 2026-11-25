-- Handy queries to demonstrate the procedure and triggers in MySQL Workbench / CLI
USE LibraryDB;

CALL ManageReservation('RESERVE', 1, 1);   -- Alice reserves book 1
CALL ManageReservation('RESERVE', 2, 1);   -- ERROR: Book is not available
CALL ManageReservation('CANCEL',  1, 1);   -- Alice cancels
CALL ManageReservation('RESERVE', 1, 1);
CALL ManageReservation('RETURN',  1, 1);   -- Alice returns
CALL ManageReservation('BORROW',  1, 1);   -- ERROR: Invalid action

SELECT * FROM Reservations;
SELECT * FROM ReservationHistory;          -- filled automatically by the triggers
SELECT book_id, title, available FROM Books;
