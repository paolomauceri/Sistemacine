const { pool } = require('../config/db');

class ClienteController {
    listarApi = async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM clientes ORDER BY created_at DESC');
            res.json({ success: true, data: rows, total: rows.length });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };

    obtenerPorIdApi = async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
            if (rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
            }
            res.json({ success: true, data: rows[0] });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };

    crearApi = async (req, res) => {
        try {
            const { nombre, email, telefono } = req.body;
            if (!nombre || !email) {
                return res.status(400).json({ success: false, error: 'Nombre y email son obligatorios' });
            }

            const [result] = await pool.query(
                'INSERT INTO clientes (nombre, email, telefono) VALUES (?, ?, ?)',
                [String(nombre).trim(), String(email).trim(), telefono ? String(telefono).trim() : null]
            );

            const [nuevo] = await pool.query('SELECT * FROM clientes WHERE id = ?', [result.insertId]);
            res.status(201).json({ success: true, message: 'Cliente creado', data: nuevo[0] });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    };

    actualizarApi = async (req, res) => {
        try {
            const { nombre, email, telefono } = req.body;
            if (!nombre || !email) {
                return res.status(400).json({ success: false, error: 'Nombre y email son obligatorios' });
            }

            const [result] = await pool.query(
                'UPDATE clientes SET nombre = ?, email = ?, telefono = ? WHERE id = ?',
                [String(nombre).trim(), String(email).trim(), telefono ? String(telefono).trim() : null, req.params.id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
            }

            const [actualizado] = await pool.query('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
            res.json({ success: true, message: 'Cliente actualizado', data: actualizado[0] });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    };

    eliminarApi = async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM clientes WHERE id = ?', [req.params.id]);
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
            }
            res.json({ success: true, message: 'Cliente eliminado' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };

    listarWeb = async (req, res) => {
        try {
            const [clientes] = await pool.query('SELECT * FROM clientes ORDER BY created_at DESC');
            res.render('clientes/index', {
                title: 'Clientes',
                active: 'clientes',
                clientes,
                success_msg: req.query.success,
                error_msg: req.query.error
            });
        } catch (error) {
            res.status(500).render('error', { title: 'Error', message: error.message });
        }
    };

    mostrarFormularioNuevo = (req, res) => {
        res.render('clientes/nueva', {
            title: 'Nuevo Cliente',
            active: 'clientes',
            error_msg: null,
            cliente: {}
        });
    };

    guardarNuevo = async (req, res) => {
        try {
            const { nombre, email, telefono } = req.body;
            if (!nombre || !email) {
                return res.render('clientes/nueva', {
                    title: 'Nuevo Cliente',
                    active: 'clientes',
                    error_msg: 'Nombre y email son obligatorios',
                    cliente: req.body
                });
            }

            await pool.query(
                'INSERT INTO clientes (nombre, email, telefono) VALUES (?, ?, ?)',
                [String(nombre).trim(), String(email).trim(), telefono ? String(telefono).trim() : null]
            );

            res.redirect('/clientes?success=' + encodeURIComponent('Cliente creado exitosamente'));
        } catch (error) {
            res.render('clientes/nueva', {
                title: 'Nuevo Cliente',
                active: 'clientes',
                error_msg: 'Error de base de datos: ' + error.message,
                cliente: req.body
            });
        }
    };

    mostrarFormularioEditar = async (req, res) => {
        try {
            const [cliente] = await pool.query('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
            if (cliente.length === 0) {
                return res.redirect('/clientes?error=' + encodeURIComponent('Cliente no encontrado'));
            }

            res.render('clientes/editar', {
                title: 'Editar Cliente',
                active: 'clientes',
                error_msg: req.query.error || null,
                cliente: cliente[0]
            });
        } catch (error) {
            res.redirect('/clientes?error=' + encodeURIComponent(error.message));
        }
    };

    actualizarWeb = async (req, res) => {
        try {
            const { nombre, email, telefono } = req.body;
            if (!nombre || !email) {
                return res.redirect('/clientes/' + req.params.id + '/editar?error=' + encodeURIComponent('Nombre y email son obligatorios'));
            }

            const [result] = await pool.query(
                'UPDATE clientes SET nombre = ?, email = ?, telefono = ? WHERE id = ?',
                [String(nombre).trim(), String(email).trim(), telefono ? String(telefono).trim() : null, req.params.id]
            );

            if (result.affectedRows === 0) {
                return res.redirect('/clientes?error=' + encodeURIComponent('Cliente no encontrado'));
            }

            res.redirect('/clientes?success=' + encodeURIComponent('Cliente actualizado exitosamente'));
        } catch (error) {
            res.redirect('/clientes/' + req.params.id + '/editar?error=' + encodeURIComponent(error.message));
        }
    };

    eliminarWeb = async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM clientes WHERE id = ?', [req.params.id]);
            if (result.affectedRows === 0) {
                return res.redirect('/clientes?error=' + encodeURIComponent('Cliente no encontrado'));
            }
            res.redirect('/clientes?success=' + encodeURIComponent('Cliente eliminado exitosamente'));
        } catch (error) {
            res.redirect('/clientes?error=' + encodeURIComponent(error.message));
        }
    };
}

module.exports = ClienteController;
