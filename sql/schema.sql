-- =====================================================================
--  Library Book Reservation System  -  database schema
--  Contains: 4 tables, 1 stored procedure (with CASE / switch-case),
--            3 triggers.
--  Run with:  mysql -u root -p < sql/schema.sql
-- =====================================================================

CREATE DATABASE IF NOT EXISTS LibraryDB;
USE LibraryDB;

-- ---------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name    VARCHAR(100) NOT NULL,
    email   VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Books (
    book_id   INT PRIMARY KEY AUTO_INCREMENT,
    title     VARCHAR(100) NOT NULL,
    author    VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    available BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS Reservations (
    res_id   INT PRIMARY KEY AUTO_INCREMENT,
    user_id  INT NOT NULL,
    book_id  INT NOT NULL,
    res_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status   ENUM('ACTIVE', 'CANCELLED', 'RETURNED') NOT NULL DEFAULT 'ACTIVE',
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (book_id) REFERENCES Books(book_id)
);

CREATE TABLE IF NOT EXISTS ReservationHistory (
    history_id  INT PRIMARY KEY AUTO_INCREMENT,
    res_id      INT NOT NULL,
    action      VARCHAR(50) NOT NULL,
    action_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (res_id) REFERENCES Reservations(res_id)
);

-- ---------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS BeforeReservationInsert;
DROP TRIGGER IF EXISTS AfterReservationInsert;
DROP TRIGGER IF EXISTS AfterReservationUpdate;

DELIMITER $$

-- 1) BEFORE INSERT: a member may hold at most 3 active reservations.
CREATE TRIGGER BeforeReservationInsert
BEFORE INSERT ON Reservations
FOR EACH ROW
BEGIN
    DECLARE active_count INT;

    SELECT COUNT(*) INTO active_count
    FROM Reservations
    WHERE user_id = NEW.user_id AND status = 'ACTIVE';

    IF active_count >= 3 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Limit reached: a member can hold at most 3 active reservations';
    END IF;
END$$

-- 2) AFTER INSERT: log every new reservation.
CREATE TRIGGER AfterReservationInsert
AFTER INSERT ON Reservations
FOR EACH ROW
BEGIN
    INSERT INTO ReservationHistory (res_id, action)
    VALUES (NEW.res_id, 'RESERVED');
END$$

-- 3) AFTER UPDATE: log every status change (CANCELLED / RETURNED).
CREATE TRIGGER AfterReservationUpdate
AFTER UPDATE ON Reservations
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO ReservationHistory (res_id, action)
        VALUES (NEW.res_id, NEW.status);
    END IF;
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- STORED PROCEDURE  (uses CASE = SQL's switch-case)
--   CALL ManageReservation('RESERVE', user_id, book_id);
--   CALL ManageReservation('CANCEL',  user_id, book_id);
--   CALL ManageReservation('RETURN',  user_id, book_id);
-- ---------------------------------------------------------------------
DROP PROCEDURE IF EXISTS ManageReservation;

DELIMITER $$

CREATE PROCEDURE ManageReservation(
    IN p_action  VARCHAR(20),
    IN p_user_id INT,
    IN p_book_id INT
)
BEGIN
    DECLARE v_available BOOLEAN DEFAULT NULL;
    DECLARE v_res_id    INT     DEFAULT NULL;

    -- If anything fails, undo the whole transaction and pass the error on.
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Validate the member and the book first
    IF NOT EXISTS (SELECT 1 FROM Users WHERE user_id = p_user_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Member not found';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM Books WHERE book_id = p_book_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Book not found';
    END IF;

    -- The switch-case
    CASE UPPER(p_action)

        WHEN 'RESERVE' THEN
            SELECT available INTO v_available
            FROM Books WHERE book_id = p_book_id FOR UPDATE;

            IF v_available = FALSE THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Book is not available';
            END IF;

            -- BeforeReservationInsert checks the 3-book limit,
            -- AfterReservationInsert writes the history row.
            INSERT INTO Reservations (user_id, book_id) VALUES (p_user_id, p_book_id);
            UPDATE Books SET available = FALSE WHERE book_id = p_book_id;

        WHEN 'CANCEL' THEN
            SELECT res_id INTO v_res_id
            FROM Reservations
            WHERE user_id = p_user_id AND book_id = p_book_id AND status = 'ACTIVE'
            LIMIT 1 FOR UPDATE;

            IF v_res_id IS NULL THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No active reservation found to cancel';
            END IF;

            UPDATE Reservations SET status = 'CANCELLED' WHERE res_id = v_res_id;
            UPDATE Books SET available = TRUE WHERE book_id = p_book_id;

        WHEN 'RETURN' THEN
            SELECT res_id INTO v_res_id
            FROM Reservations
            WHERE user_id = p_user_id AND book_id = p_book_id AND status = 'ACTIVE'
            LIMIT 1 FOR UPDATE;

            IF v_res_id IS NULL THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No active reservation found to return';
            END IF;

            UPDATE Reservations SET status = 'RETURNED' WHERE res_id = v_res_id;
            UPDATE Books SET available = TRUE WHERE book_id = p_book_id;

        ELSE
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid action. Use RESERVE, CANCEL or RETURN';

    END CASE;

    COMMIT;
END$$

DELIMITER ;
