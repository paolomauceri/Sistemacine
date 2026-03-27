-- database.sql
CREATE DATABASE IF NOT EXISTS sistema_cine;
USE sistema_cine;

DROP TABLE IF EXISTS ventas;
DROP TABLE IF EXISTS entradas;
DROP TABLE IF EXISTS funciones;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS clientes;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS salas;
DROP TABLE IF EXISTS peliculas;

CREATE TABLE peliculas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    genero VARCHAR(100) NOT NULL,
    duracion INT NOT NULL,
    clasificacion VARCHAR(10) NOT NULL,
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS salas;

CREATE TABLE salas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    capacidad INT NOT NULL,
    tipo ENUM('2D', '3D', 'VIP', 'IMAX', '4DX') NOT NULL,
    tiene_dolby BOOLEAN DEFAULT FALSE,
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    telefono VARCHAR(25),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    tipo ENUM('Snack', 'Bebida', 'Combo', 'Merch') NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE funciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pelicula_id INT NOT NULL,
    sala_id INT NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    precio_base DECIMAL(10,2) NOT NULL,
    estado ENUM('PROGRAMADA', 'CANCELADA', 'AGOTADA') DEFAULT 'PROGRAMADA',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pelicula_id) REFERENCES peliculas(id) ON DELETE CASCADE,
    FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE CASCADE
);

CREATE TABLE entradas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    funcion_id INT NOT NULL,
    cliente_id INT NULL,
    cantidad INT NOT NULL,
    asientos VARCHAR(100),
    total DECIMAL(10,2) NOT NULL,
    metodo_pago ENUM('EFECTIVO', 'TARJETA', 'TRANSFERENCIA') NOT NULL,
    estado ENUM('PAGADA', 'RESERVADA', 'CANCELADA') DEFAULT 'PAGADA',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (funcion_id) REFERENCES funciones(id) ON DELETE CASCADE,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
);

CREATE TABLE ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entrada_id INT NOT NULL,
    descripcion VARCHAR(255),
    subtotal DECIMAL(10,2) NOT NULL,
    descuento DECIMAL(10,2) DEFAULT 0,
    impuesto DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    metodo_pago ENUM('EFECTIVO', 'TARJETA', 'TRANSFERENCIA') NOT NULL,
    estado ENUM('CONFIRMADA', 'ANULADA') DEFAULT 'CONFIRMADA',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entrada_id) REFERENCES entradas(id) ON DELETE CASCADE
);

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'client', 'seller') NOT NULL DEFAULT 'client',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar datos de ejemplo
INSERT INTO peliculas (titulo, genero, duracion, clasificacion) VALUES
('Avatar: El camino del agua', 'Ciencia Ficción', 192, 'PG-13'),
('Oppenheimer', 'Drama', 180, 'R'),
('Barbie', 'Comedia', 114, 'PG-13'),
('Dune: Parte Dos', 'Ciencia Ficción', 166, 'PG-13');

INSERT INTO salas (nombre, capacidad, tipo, tiene_dolby) VALUES
('Sala 1 - 3D', 200, '3D', 1),
('Sala 2 - 2D', 150, '2D', 0),
('Sala VIP', 50, 'VIP', 1),
('Sala IMAX', 300, 'IMAX', 1);

INSERT INTO clientes (nombre, email, telefono) VALUES
('Carlos Rivera', 'carlos.rivera@mail.com', '555-1234'),
('Mariana Perez', 'mariana.perez@mail.com', '555-2233'),
('Luis Torres', 'luis.torres@mail.com', '555-3344');

INSERT INTO productos (nombre, tipo, precio, stock) VALUES
('Palomitas grandes', 'Snack', 75.00, 120),
('Refresco mediano', 'Bebida', 45.00, 180),
('Combo Nachos', 'Combo', 110.00, 60),
('Vaso coleccionable', 'Merch', 95.00, 40);

INSERT INTO funciones (pelicula_id, sala_id, fecha, hora, precio_base, estado) VALUES
(1, 1, CURDATE(), '18:00:00', 95.00, 'PROGRAMADA'),
(2, 4, CURDATE(), '20:30:00', 130.00, 'PROGRAMADA'),
(3, 2, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '16:00:00', 85.00, 'PROGRAMADA'),
(4, 3, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '21:00:00', 140.00, 'PROGRAMADA');

INSERT INTO entradas (funcion_id, cliente_id, cantidad, asientos, total, metodo_pago, estado) VALUES
(1, 1, 2, 'A5,A6', 190.00, 'TARJETA', 'PAGADA'),
(2, 2, 3, 'C1,C2,C3', 390.00, 'TRANSFERENCIA', 'PAGADA'),
(3, NULL, 1, 'B4', 85.00, 'EFECTIVO', 'RESERVADA');

INSERT INTO ventas (entrada_id, descripcion, subtotal, descuento, impuesto, total, metodo_pago, estado) VALUES
(1, 'Venta regular de taquilla', 190.00, 0, 0, 190.00, 'TARJETA', 'CONFIRMADA'),
(2, 'Venta de grupo', 390.00, 15.00, 0, 375.00, 'TRANSFERENCIA', 'CONFIRMADA'),
(3, 'Reserva pendiente de pago final', 85.00, 0, 0, 85.00, 'EFECTIVO', 'CONFIRMADA');

-- Password para admin@gmail.com y cliente@cine.local: admin123 / cliente123
INSERT INTO users (nombre, email, password_hash, role) VALUES
('Administrador', 'admin@gmail.com', '$2a$10$Ll.kohmCM6FrXR4kRxog0e.UgZQFcndxufwvFap48Opxl1vGuI6Wu', 'admin'),
('Cliente Demo', 'cliente@cine.local', '$2a$10$fnoqDO8SDylVU7wux65.K.WtUzRkuOWkpTjfu7iKhOvz6WfDLHnWa', 'client');
