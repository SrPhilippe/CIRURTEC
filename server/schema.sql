-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Padrão',
    rights ENUM('ADMIN', 'Master', 'Padrão') DEFAULT 'Padrão',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user (Password: admin123)
-- You should change this password immediately after first login!
-- This is just a placeholder, the actual insertion will be handled by the application or manual script with hashed password.
