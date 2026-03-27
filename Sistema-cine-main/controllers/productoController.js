const { pool } = require('../config/db');

class ProductoController {
    listarApi = async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM productos ORDER BY created_at DESC');
            res.json({ success: true, data: rows, total: rows.length });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };

    obtenerPorIdApi = async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM productos WHERE id = ?', [req.params.id]);
            if (rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Producto no encontrado' });
            }
            res.json({ success: true, data: rows[0] });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };

    crearApi = async (req, res) => {
        try {
            const { nombre, tipo, precio, stock } = req.body;
            const precioNum = Number.parseFloat(precio);
            const stockNum = Number.parseInt(stock, 10);

            if (!nombre || !tipo || Number.isNaN(precioNum) || precioNum <= 0 || Number.isNaN(stockNum) || stockNum < 0) {
                return res.status(400).json({ success: false, error: 'Datos de producto invalidos' });
            }

            const [result] = await pool.query(
                'INSERT INTO productos (nombre, tipo, precio, stock) VALUES (?, ?, ?, ?)',
                [String(nombre).trim(), String(tipo).trim(), precioNum, stockNum]
            );

            const [nuevo] = await pool.query('SELECT * FROM productos WHERE id = ?', [result.insertId]);
            res.status(201).json({ success: true, message: 'Producto creado', data: nuevo[0] });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    };

    actualizarApi = async (req, res) => {
        try {
            const { nombre, tipo, precio, stock } = req.body;
            const precioNum = Number.parseFloat(precio);
            const stockNum = Number.parseInt(stock, 10);

            const [existente] = await pool.query('SELECT id FROM productos WHERE id = ?', [req.params.id]);
            if (existente.length === 0) {
                return res.status(404).json({ success: false, error: 'Producto no encontrado' });
            }

            if (!nombre || !tipo || Number.isNaN(precioNum) || precioNum <= 0 || Number.isNaN(stockNum) || stockNum < 0) {
                return res.status(400).json({ success: false, error: 'Datos de producto invalidos' });
            }

            await pool.query(
                'UPDATE productos SET nombre = ?, tipo = ?, precio = ?, stock = ? WHERE id = ?',
                [String(nombre).trim(), String(tipo).trim(), precioNum, stockNum, req.params.id]
            );

            const [actualizado] = await pool.query('SELECT * FROM productos WHERE id = ?', [req.params.id]);
            res.json({ success: true, message: 'Producto actualizado', data: actualizado[0] });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    };

    eliminarApi = async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM productos WHERE id = ?', [req.params.id]);
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, error: 'Producto no encontrado' });
            }
            res.json({ success: true, message: 'Producto eliminado' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };

    listarWeb = async (req, res) => {
        try {
            const [productos] = await pool.query('SELECT * FROM productos ORDER BY created_at DESC');
            res.render('productos/index', {
                title: 'Productos',
                active: 'productos',
                productos,
                success_msg: req.query.success,
                error_msg: req.query.error
            });
        } catch (error) {
            res.status(500).render('error', { title: 'Error', message: error.message });
        }
    };

    mostrarFormularioNuevo = (req, res) => {
        res.render('productos/nueva', {
            title: 'Nuevo Producto',
            active: 'productos',
            error_msg: null,
            producto: {}
        });
    };

    guardarNuevo = async (req, res) => {
        try {
            const { nombre, tipo, precio, stock } = req.body;
            const precioNum = Number.parseFloat(precio);
            const stockNum = Number.parseInt(stock, 10);

            if (!nombre || !tipo || Number.isNaN(precioNum) || precioNum <= 0 || Number.isNaN(stockNum) || stockNum < 0) {
                return res.render('productos/nueva', {
                    title: 'Nuevo Producto',
                    active: 'productos',
                    error_msg: 'Revisa nombre, tipo, precio y stock',
                    producto: req.body
                });
            }

            await pool.query(
                'INSERT INTO productos (nombre, tipo, precio, stock) VALUES (?, ?, ?, ?)',
                [String(nombre).trim(), String(tipo).trim(), precioNum, stockNum]
            );

            res.redirect('/productos?success=' + encodeURIComponent('Producto creado exitosamente'));
        } catch (error) {
            res.render('productos/nueva', {
                title: 'Nuevo Producto',
                active: 'productos',
                error_msg: 'Error de base de datos: ' + error.message,
                producto: req.body
            });
        }
    };

    mostrarFormularioEditar = async (req, res) => {
        try {
            const [producto] = await pool.query('SELECT * FROM productos WHERE id = ?', [req.params.id]);
            if (producto.length === 0) {
                return res.redirect('/productos?error=' + encodeURIComponent('Producto no encontrado'));
            }

            res.render('productos/editar', {
                title: 'Editar Producto',
                active: 'productos',
                error_msg: req.query.error || null,
                producto: producto[0]
            });
        } catch (error) {
            res.redirect('/productos?error=' + encodeURIComponent(error.message));
        }
    };

    actualizarWeb = async (req, res) => {
        try {
            const { nombre, tipo, precio, stock } = req.body;
            const precioNum = Number.parseFloat(precio);
            const stockNum = Number.parseInt(stock, 10);

            if (!nombre || !tipo || Number.isNaN(precioNum) || precioNum <= 0 || Number.isNaN(stockNum) || stockNum < 0) {
                return res.redirect('/productos/' + req.params.id + '/editar?error=' + encodeURIComponent('Datos invalidos'));
            }

            const [result] = await pool.query(
                'UPDATE productos SET nombre = ?, tipo = ?, precio = ?, stock = ? WHERE id = ?',
                [String(nombre).trim(), String(tipo).trim(), precioNum, stockNum, req.params.id]
            );

            if (result.affectedRows === 0) {
                return res.redirect('/productos?error=' + encodeURIComponent('Producto no encontrado'));
            }

            res.redirect('/productos?success=' + encodeURIComponent('Producto actualizado exitosamente'));
        } catch (error) {
            res.redirect('/productos/' + req.params.id + '/editar?error=' + encodeURIComponent(error.message));
        }
    };

    eliminarWeb = async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM productos WHERE id = ?', [req.params.id]);
            if (result.affectedRows === 0) {
                return res.redirect('/productos?error=' + encodeURIComponent('Producto no encontrado'));
            }
            res.redirect('/productos?success=' + encodeURIComponent('Producto eliminado exitosamente'));
        } catch (error) {
            res.redirect('/productos?error=' + encodeURIComponent(error.message));
        }
    };

    comprarWeb = async (req, res) => {
        try {
            const cantidad = Number.parseInt(req.body.cantidad, 10);
            if (Number.isNaN(cantidad) || cantidad <= 0) {
                return res.redirect('/productos?error=' + encodeURIComponent('Cantidad invalida'));
            }

            const [rows] = await pool.query('SELECT id, stock FROM productos WHERE id = ?', [req.params.id]);
            if (rows.length === 0) {
                return res.redirect('/productos?error=' + encodeURIComponent('Producto no encontrado'));
            }

            if (rows[0].stock < cantidad) {
                return res.redirect('/productos?error=' + encodeURIComponent('Stock insuficiente para la compra'));
            }

            await pool.query('UPDATE productos SET stock = stock - ? WHERE id = ?', [cantidad, req.params.id]);
            return res.redirect('/productos?success=' + encodeURIComponent('Compra de comida registrada'));
        } catch (error) {
            return res.redirect('/productos?error=' + encodeURIComponent(error.message));
        }
    };
}

module.exports = ProductoController;
