-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Padrão',
    rights ENUM('ADMIN', 'Master', 'Padrão') DEFAULT 'Padrão',
    public_ID VARCHAR(21) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Clients Table
CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(36) PRIMARY KEY,
    cnpj VARCHAR(18) NOT NULL UNIQUE,
    nome_hospital VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    email1 VARCHAR(100) NOT NULL,
    email2 VARCHAR(100),
    contato1 VARCHAR(20) NOT NULL,
    contato2 VARCHAR(20),
    public_ID VARCHAR(21) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cnpj (cnpj),
    INDEX idx_nome_hospital (nome_hospital)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Equipments Table
CREATE TABLE IF NOT EXISTS equipments (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36) NOT NULL,
    equipamento VARCHAR(100) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    numero_serie VARCHAR(100),
    data_nota VARCHAR(10),
    tipo_instalacao ENUM('CEMIG', 'CIRURTEC', 'BAUMER') DEFAULT 'CEMIG',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_client_id (client_id),
    INDEX idx_numero_serie (numero_serie)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user (Password: admin123)
-- You should change this password immediately after first login!
-- This is just a placeholder, the actual insertion will be handled by the application or manual script with hashed password.
