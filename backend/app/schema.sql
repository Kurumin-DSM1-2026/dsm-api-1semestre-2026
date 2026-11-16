CREATE DATABASE IF NOT EXISTS credito_inclusivo
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE credito_inclusivo;

CREATE TABLE IF NOT EXISTS comentarios (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    tipo ENUM('pergunta', 'sugestao', 'critica') NOT NULL,
    mensagem TEXT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_comentarios_criado_em (criado_em)
) ENGINE=InnoDB;
