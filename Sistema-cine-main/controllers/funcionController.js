const { pool } = require('../config/db');

class FuncionController {
    listarApi = async (req, res) => {
        try {
            const [rows] = await pool.query(
                `SELECT f.*, p.titulo AS pelicula_titulo, s.nombre AS sala_nombre
                 FROM funciones f
                 INNER JOIN peliculas p ON p.id = f.pelicula_id
                 INNER JOIN salas s ON s.id = f.sala_id
                 ORDER BY f.fecha DESC, f.hora DESC`
            );
            res.json({ success: true, data: rows, total: rows.length });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };

    obtenerPorIdApi = async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM funciones WHERE id = ?', [req.params.id]);
            if (rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Funcion no encontrada' });
            }
            res.json({ success: true, data: rows[0] });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };

    crearApi = async (req, res) => {
        try {
            const { pelicula_id, sala_id, fecha, hora, precio_base, estado } = req.body;
            const peliculaId = Number.parseInt(pelicula_id, 10);
            const salaId = Number.parseInt(sala_id, 10);
            const precioBase = Number.parseFloat(precio_base);

            if (Number.isNaN(peliculaId) || Number.isNaN(salaId) || !fecha || !hora || Number.isNaN(precioBase) || precioBase <= 0) {
                return res.status(400).json({ success: false, error: 'Datos de funcion invalidos' });
            }

            const [result] = await pool.query(
                'INSERT INTO funciones (pelicula_id, sala_id, fecha, hora, precio_base, estado) VALUES (?, ?, ?, ?, ?, ?)',
                [peliculaId, salaId, fecha, hora, precioBase, estado || 'PROGRAMADA']
            );

            const [nueva] = await pool.query('SELECT * FROM funciones WHERE id = ?', [result.insertId]);
            res.status(201).json({ success: true, message: 'Funcion creada', data: nueva[0] });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    };

    actualizarApi = async (req, res) => {
        try {
            const { pelicula_id, sala_id, fecha, hora, precio_base, estado } = req.body;
            const peliculaId = Number.parseInt(pelicula_id, 10);
            const salaId = Number.parseInt(sala_id, 10);
            const precioBase = Number.parseFloat(precio_base);

            if (Number.isNaN(peliculaId) || Number.isNaN(salaId) || !fecha || !hora || Number.isNaN(precioBase) || precioBase <= 0) {
                return res.status(400).json({ success: false, error: 'Datos de funcion invalidos' });
            }

            const [result] = await pool.query(
                'UPDATE funciones SET pelicula_id = ?, sala_id = ?, fecha = ?, hora = ?, precio_base = ?, estado = ? WHERE id = ?',
                [peliculaId, salaId, fecha, hora, precioBase, estado || 'PROGRAMADA', req.params.id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, error: 'Funcion no encontrada' });
            }

            const [actualizada] = await pool.query('SELECT * FROM funciones WHERE id = ?', [req.params.id]);
            res.json({ success: true, message: 'Funcion actualizada', data: actualizada[0] });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    };

    eliminarApi = async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM funciones WHERE id = ?', [req.params.id]);
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, error: 'Funcion no encontrada' });
            }
            res.json({ success: true, message: 'Funcion eliminada' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };

    listarWeb = async (req, res) => {
        try {
            const [funciones] = await pool.query(
                `SELECT f.*, p.titulo AS pelicula_titulo, s.nombre AS sala_nombre
                 FROM funciones f
                 INNER JOIN peliculas p ON p.id = f.pelicula_id
                 INNER JOIN salas s ON s.id = f.sala_id
                 ORDER BY f.fecha DESC, f.hora DESC`
            );

            res.render('funciones/index', {
                title: 'Funciones',
                active: 'funciones',
                funciones,
                success_msg: req.query.success,
                error_msg: req.query.error
            });
        } catch (error) {
            res.status(500).render('error', { title: 'Error', message: error.message });
        }
    };

    mostrarFormularioNuevo = async (req, res) => {
        try {
            const [peliculas] = await pool.query('SELECT id, titulo FROM peliculas ORDER BY titulo');
            const [salas] = await pool.query('SELECT id, nombre FROM salas ORDER BY nombre');

            res.render('funciones/nueva', {
                title: 'Nueva Funcion',
                active: 'funciones',
                error_msg: null,
                funcion: {},
                peliculas,
                salas
            });
        } catch (error) {
            res.redirect('/funciones?error=' + encodeURIComponent(error.message));
        }
    };

    guardarNuevo = async (req, res) => {
        try {
            const { pelicula_id, sala_id, fecha, hora, precio_base, estado } = req.body;
            const peliculaId = Number.parseInt(pelicula_id, 10);
            const salaId = Number.parseInt(sala_id, 10);
            const precioBase = Number.parseFloat(precio_base);

            if (Number.isNaN(peliculaId) || Number.isNaN(salaId) || !fecha || !hora || Number.isNaN(precioBase) || precioBase <= 0) {
                const [peliculas] = await pool.query('SELECT id, titulo FROM peliculas ORDER BY titulo');
                const [salas] = await pool.query('SELECT id, nombre FROM salas ORDER BY nombre');
                return res.render('funciones/nueva', {
                    title: 'Nueva Funcion',
                    active: 'funciones',
                    error_msg: 'Datos invalidos para la funcion',
                    funcion: req.body,
                    peliculas,
                    salas
                });
            }

            await pool.query(
                'INSERT INTO funciones (pelicula_id, sala_id, fecha, hora, precio_base, estado) VALUES (?, ?, ?, ?, ?, ?)',
                [peliculaId, salaId, fecha, hora, precioBase, estado || 'PROGRAMADA']
            );

            res.redirect('/funciones?success=' + encodeURIComponent('Funcion creada exitosamente'));
        } catch (error) {
            res.redirect('/funciones?error=' + encodeURIComponent(error.message));
        }
    };

    mostrarFormularioEditar = async (req, res) => {
        try {
            const [funcion] = await pool.query('SELECT * FROM funciones WHERE id = ?', [req.params.id]);
            if (funcion.length === 0) {
                return res.redirect('/funciones?error=' + encodeURIComponent('Funcion no encontrada'));
            }

            const [peliculas] = await pool.query('SELECT id, titulo FROM peliculas ORDER BY titulo');
            const [salas] = await pool.query('SELECT id, nombre FROM salas ORDER BY nombre');

            res.render('funciones/editar', {
                title: 'Editar Funcion',
                active: 'funciones',
                error_msg: req.query.error || null,
                funcion: funcion[0],
                peliculas,
                salas
            });
        } catch (error) {
            res.redirect('/funciones?error=' + encodeURIComponent(error.message));
        }
    };

    actualizarWeb = async (req, res) => {
        try {
            const { pelicula_id, sala_id, fecha, hora, precio_base, estado } = req.body;
            const peliculaId = Number.parseInt(pelicula_id, 10);
            const salaId = Number.parseInt(sala_id, 10);
            const precioBase = Number.parseFloat(precio_base);

            if (Number.isNaN(peliculaId) || Number.isNaN(salaId) || !fecha || !hora || Number.isNaN(precioBase) || precioBase <= 0) {
                return res.redirect('/funciones/' + req.params.id + '/editar?error=' + encodeURIComponent('Datos invalidos'));
            }

            const [result] = await pool.query(
                'UPDATE funciones SET pelicula_id = ?, sala_id = ?, fecha = ?, hora = ?, precio_base = ?, estado = ? WHERE id = ?',
                [peliculaId, salaId, fecha, hora, precioBase, estado || 'PROGRAMADA', req.params.id]
            );

            if (result.affectedRows === 0) {
                return res.redirect('/funciones?error=' + encodeURIComponent('Funcion no encontrada'));
            }

            res.redirect('/funciones?success=' + encodeURIComponent('Funcion actualizada exitosamente'));
        } catch (error) {
            res.redirect('/funciones/' + req.params.id + '/editar?error=' + encodeURIComponent(error.message));
        }
    };

    eliminarWeb = async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM funciones WHERE id = ?', [req.params.id]);
            if (result.affectedRows === 0) {
                return res.redirect('/funciones?error=' + encodeURIComponent('Funcion no encontrada'));
            }
            res.redirect('/funciones?success=' + encodeURIComponent('Funcion eliminada exitosamente'));
        } catch (error) {
            res.redirect('/funciones?error=' + encodeURIComponent(error.message));
        }
    };
}

module.exports = FuncionController;
