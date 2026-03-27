// controllers/salaController.js
const { pool } = require('../config/db');

const TIPOS_SALA_VALIDOS = ['2D', '3D', 'VIP', 'IMAX', '4DX'];

function normalizarTexto(valor) {
    if (valor === undefined || valor === null) {
        return '';
    }

    return String(valor).trim().replace(/\s+/g, ' ');
}

function convertirDolby(valor) {
    return valor === true || valor === 1 || valor === '1' || valor === 'true' ? 1 : 0;
}

function validarSala(payload) {
    const nombre = normalizarTexto(payload.nombre);
    const tipo = normalizarTexto(payload.tipo);
    const capacidad = Number.parseInt(payload.capacidad, 10);
    const tiene_dolby = convertirDolby(payload.tiene_dolby);

    if (!nombre || !payload.capacidad || !tipo) {
        return { ok: false, message: 'Nombre, capacidad y tipo son obligatorios' };
    }

    if (nombre.length < 2 || nombre.length > 100) {
        return { ok: false, message: 'El nombre debe tener entre 2 y 100 caracteres' };
    }

    if (Number.isNaN(capacidad) || capacidad <= 0 || capacidad > 1000) {
        return { ok: false, message: 'La capacidad debe ser un número entre 1 y 1000' };
    }

    if (!TIPOS_SALA_VALIDOS.includes(tipo)) {
        return { ok: false, message: 'El tipo de sala no es válido' };
    }

    return {
        ok: true,
        data: {
            nombre,
            capacidad,
            tipo,
            tiene_dolby
        }
    };
}

class SalaController {
    
    // API METHODS
    listarApi = async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM salas ORDER BY nombre');
            res.json({
                success: true,
                data: rows,
                total: rows.length
            });
        } catch (error) {
            console.error('Error en listarApi:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    obtenerPorIdApi = async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM salas WHERE id = ?', [req.params.id]);
            if (rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Sala no encontrada' });
            }
            res.json({ success: true, data: rows[0] });
        } catch (error) {
            console.error('Error en obtenerPorIdApi:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    crearApi = async (req, res) => {
        try {
            const validacion = validarSala(req.body);
            if (!validacion.ok) {
                return res.status(400).json({
                    success: false,
                    error: validacion.message
                });
            }

            const { nombre, capacidad, tipo, tiene_dolby } = validacion.data;
            
            const [result] = await pool.query(
                'INSERT INTO salas (nombre, capacidad, tipo, tiene_dolby) VALUES (?, ?, ?, ?)',
                [nombre, capacidad, tipo, tiene_dolby]
            );
            
            const [nueva] = await pool.query('SELECT * FROM salas WHERE id = ?', [result.insertId]);
            
            res.status(201).json({ 
                success: true, 
                message: 'Sala creada exitosamente',
                data: nueva[0] 
            });
        } catch (error) {
            console.error('Error en crearApi:', error);
            res.status(400).json({ success: false, error: error.message });
        }
    };

    actualizarApi = async (req, res) => {
        try {
            const [existente] = await pool.query('SELECT * FROM salas WHERE id = ?', [req.params.id]);
            if (existente.length === 0) {
                return res.status(404).json({ success: false, error: 'Sala no encontrada' });
            }

            const validacion = validarSala(req.body);
            if (!validacion.ok) {
                return res.status(400).json({
                    success: false,
                    error: validacion.message
                });
            }

            const { nombre, capacidad, tipo, tiene_dolby } = validacion.data;
            
            await pool.query(
                'UPDATE salas SET nombre = ?, capacidad = ?, tipo = ?, tiene_dolby = ? WHERE id = ?',
                [nombre, capacidad, tipo, tiene_dolby, req.params.id]
            );
            
            const [actualizada] = await pool.query('SELECT * FROM salas WHERE id = ?', [req.params.id]);
            
            res.json({ 
                success: true, 
                message: 'Sala actualizada exitosamente',
                data: actualizada[0] 
            });
        } catch (error) {
            console.error('Error en actualizarApi:', error);
            res.status(400).json({ success: false, error: error.message });
        }
    };

    eliminarApi = async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM salas WHERE id = ?', [req.params.id]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, error: 'Sala no encontrada' });
            }
            
            res.json({ success: true, message: 'Sala eliminada exitosamente' });
        } catch (error) {
            console.error('Error en eliminarApi:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    // WEB METHODS
    listarWeb = async (req, res) => {
        try {
            const [salas] = await pool.query('SELECT * FROM salas ORDER BY nombre');
            res.render('salas/index', { 
                title: 'Salas',
                salas,
                active: 'salas',
                success_msg: req.query.success,
                error_msg: req.query.error
            });
        } catch (error) {
            console.error('Error en listarWeb:', error);
            res.status(500).render('error', { 
                title: 'Error', 
                message: error.message 
            });
        }
    };

    mostrarFormularioNuevo = (req, res) => {
        res.render('salas/nueva', { 
            title: 'Nueva Sala', 
            active: 'salas',
            error_msg: req.query.error || null,
            sala: {}
        });
    };

    guardarNuevo = async (req, res) => {
        try {
            const validacion = validarSala(req.body);
            if (!validacion.ok) {
                return res.render('salas/nueva', {
                    title: 'Nueva Sala',
                    active: 'salas',
                    error_msg: validacion.message,
                    sala: req.body
                });
            }

            const { nombre, capacidad, tipo, tiene_dolby } = validacion.data;
            
            await pool.query(
                'INSERT INTO salas (nombre, capacidad, tipo, tiene_dolby) VALUES (?, ?, ?, ?)',
                [nombre, capacidad, tipo, tiene_dolby]
            );

            res.redirect('/salas?success=' + encodeURIComponent('Sala creada exitosamente'));
            
        } catch (error) {
            console.error('Error al guardar sala:', error);
            res.render('salas/nueva', {
                title: 'Nueva Sala',
                active: 'salas',
                error_msg: 'Error en la base de datos: ' + error.message,
                sala: req.body
            });
        }
    };

    mostrarFormularioEditar = async (req, res) => {
        try {
            const [sala] = await pool.query('SELECT * FROM salas WHERE id = ?', [req.params.id]);
            
            if (sala.length === 0) {
                return res.redirect('/salas?error=' + encodeURIComponent('Sala no encontrada'));
            }
            
            res.render('salas/editar', { 
                title: 'Editar Sala', 
                sala: sala[0], 
                active: 'salas',
                error_msg: req.query.error || null
            });
        } catch (error) {
            console.error('Error en mostrarFormularioEditar:', error);
            res.redirect('/salas?error=' + encodeURIComponent(error.message));
        }
    };

    actualizarWeb = async (req, res) => {
        try {
            // Verificar que la sala existe
            const [existente] = await pool.query('SELECT * FROM salas WHERE id = ?', [req.params.id]);
            if (existente.length === 0) {
                return res.redirect('/salas?error=' + encodeURIComponent('Sala no encontrada'));
            }

            const validacion = validarSala(req.body);
            if (!validacion.ok) {
                return res.redirect('/salas/' + req.params.id + '/editar?error=' + encodeURIComponent(validacion.message));
            }

            const { nombre, capacidad, tipo, tiene_dolby } = validacion.data;
            
            // Actualizar la sala
            const [result] = await pool.query(
                'UPDATE salas SET nombre = ?, capacidad = ?, tipo = ?, tiene_dolby = ? WHERE id = ?',
                [nombre, capacidad, tipo, tiene_dolby, req.params.id]
            );
            
            if (result.affectedRows === 0) {
                return res.redirect('/salas/' + req.params.id + '/editar?error=' + encodeURIComponent('No se pudo actualizar la sala'));
            }
            
            res.redirect('/salas?success=' + encodeURIComponent('Sala actualizada exitosamente'));
            
        } catch (error) {
            console.error('Error en actualizarWeb:', error);
            res.redirect('/salas/' + req.params.id + '/editar?error=' + encodeURIComponent(error.message));
        }
    };

    eliminarWeb = async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM salas WHERE id = ?', [req.params.id]);
            
            if (result.affectedRows === 0) {
                return res.redirect('/salas?error=' + encodeURIComponent('Sala no encontrada'));
            }
            
            res.redirect('/salas?success=' + encodeURIComponent('Sala eliminada exitosamente'));
        } catch (error) {
            console.error('Error en eliminarWeb:', error);
            res.redirect('/salas?error=' + encodeURIComponent(error.message));
        }
    };
}

module.exports = SalaController;
