-- Sample data. Run AFTER schema.sql:  mysql -u root -p < sql/sample_data.sql
USE LibraryDB;

INSERT INTO Users (name, email) VALUES
('Alice Johnson', 'alice@example.com'),
('Bob Smith', 'bob@example.com'),
('Charlie Davis', 'charlie@example.com');

INSERT INTO Books (title, author, available) VALUES
('The Great Gatsby', 'F. Scott Fitzgerald', TRUE),
('To Kill a Mockingbird', 'Harper Lee', TRUE),
('1984', 'George Orwell', TRUE),
('The Catcher in the Rye', 'J. D. Salinger', TRUE),
('Pride and Prejudice', 'Jane Austen', TRUE);
