// controllers/peliculaController.js
const { pool } = require('../config/db');

const CLASIFICACIONES_VALIDAS = ['G', 'PG', 'PG-13', 'R', 'NC-17'];

function normalizarTexto(valor) {
    if (valor === undefined || valor === null) {
        return '';
    }

    return String(valor).trim().replace(/\s+/g, ' ');
}

function validarPelicula(payload) {
    const titulo = normalizarTexto(payload.titulo || payload.nombre);
    const genero = normalizarTexto(payload.genero);
    const clasificacion = normalizarTexto(payload.clasificacion);
    const duracion = Number.parseInt(payload.duracion, 10);

    if (!titulo || !genero || !payload.duracion || !clasificacion) {
        return { ok: false, message: 'Todos los campos son obligatorios' };
    }

    if (Number.isNaN(duracion) || duracion <= 0 || duracion > 500) {
        return { ok: false, message: 'La duración debe ser un número entre 1 y 500' };
    }

    if (!CLASIFICACIONES_VALIDAS.includes(clasificacion)) {
        return { ok: false, message: 'La clasificación no es válida' };
    }

    return {
        ok: true,
        data: {
            titulo,
            genero,
            duracion,
            clasificacion
        }
    };
}

class PeliculaController {
    
    // API METHODS
    listarApi = async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM peliculas ORDER BY created_at DESC');
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
            const [rows] = await pool.query('SELECT * FROM peliculas WHERE id = ?', [req.params.id]);
            if (rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Película no encontrada' });
            }
            res.json({ success: true, data: rows[0] });
        } catch (error) {
            console.error('Error en obtenerPorIdApi:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    crearApi = async (req, res) => {
        try {
            const validacion = validarPelicula(req.body);
            if (!validacion.ok) {
                return res.status(400).json({
                    success: false,
                    error: validacion.message
                });
            }

            const { titulo, genero, duracion, clasificacion } = validacion.data;
            
            const [result] = await pool.query(
                'INSERT INTO peliculas (titulo, genero, duracion, clasificacion) VALUES (?, ?, ?, ?)',
                [titulo, genero, duracion, clasificacion]
            );
            
            const [nueva] = await pool.query('SELECT * FROM peliculas WHERE id = ?', [result.insertId]);
            
            res.status(201).json({ 
                success: true, 
                message: 'Película creada exitosamente',
                data: nueva[0] 
            });
        } catch (error) {
            console.error('Error en crearApi:', error);
            res.status(400).json({ success: false, error: error.message });
        }
    };

    actualizarApi = async (req, res) => {
        try {
            const [existente] = await pool.query('SELECT * FROM peliculas WHERE id = ?', [req.params.id]);
            if (existente.length === 0) {
                return res.status(404).json({ success: false, error: 'Película no encontrada' });
            }

            const validacion = validarPelicula(req.body);
            if (!validacion.ok) {
                return res.status(400).json({
                    success: false,
                    error: validacion.message
                });
            }

            const { titulo, genero, duracion, clasificacion } = validacion.data;
            
            await pool.query(
                'UPDATE peliculas SET titulo = ?, genero = ?, duracion = ?, clasificacion = ? WHERE id = ?',
                [titulo, genero, duracion, clasificacion, req.params.id]
            );
            
            const [actualizada] = await pool.query('SELECT * FROM peliculas WHERE id = ?', [req.params.id]);
            
            res.json({ 
                success: true, 
                message: 'Película actualizada exitosamente',
                data: actualizada[0] 
            });
        } catch (error) {
            console.error('Error en actualizarApi:', error);
            res.status(400).json({ success: false, error: error.message });
        }
    };

    eliminarApi = async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM peliculas WHERE id = ?', [req.params.id]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, error: 'Película no encontrada' });
            }
            
            res.json({ success: true, message: 'Película eliminada exitosamente' });
        } catch (error) {
            console.error('Error en eliminarApi:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    };

    // WEB METHODS
    listarWeb = async (req, res) => {
        try {
            const [peliculas] = await pool.query('SELECT * FROM peliculas ORDER BY created_at DESC');
            res.render('peliculas/index', { 
                title: 'Películas',
                peliculas,
                active: 'peliculas',
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
        res.render('peliculas/nueva', { 
            title: 'Nueva Película', 
            active: 'peliculas',
            error_msg: null,
            pelicula: {}
        });
    };

    guardarNuevo = async (req, res) => {
        try {
            const validacion = validarPelicula(req.body);
            if (!validacion.ok) {
                return res.render('peliculas/nueva', {
                    title: 'Nueva Película',
                    active: 'peliculas',
                    error_msg: validacion.message,
                    pelicula: req.body
                });
            }

            const { titulo, genero, duracion, clasificacion } = validacion.data;
            
            await pool.query(
                'INSERT INTO peliculas (titulo, genero, duracion, clasificacion) VALUES (?, ?, ?, ?)',
                [titulo, genero, duracion, clasificacion]
            );

            res.redirect('/peliculas?success=' + encodeURIComponent('Película creada exitosamente'));
            
        } catch (error) {
            console.error('Error al guardar película:', error);
            res.render('peliculas/nueva', {
                title: 'Nueva Película',
                active: 'peliculas',
                error_msg: 'Error en la base de datos: ' + error.message,
                pelicula: req.body
            });
        }
    };

    mostrarFormularioEditar = async (req, res) => {
        try {
            const [pelicula] = await pool.query('SELECT * FROM peliculas WHERE id = ?', [req.params.id]);
            
            if (pelicula.length === 0) {
                return res.redirect('/peliculas?error=' + encodeURIComponent('Película no encontrada'));
            }
            
            res.render('peliculas/editar', { 
                title: 'Editar Película', 
                pelicula: pelicula[0], 
                active: 'peliculas',
                error_msg: null
            });
        } catch (error) {
            console.error('Error en mostrarFormularioEditar:', error);
            res.redirect('/peliculas?error=' + encodeURIComponent(error.message));
        }
    };

    actualizarWeb = async (req, res) => {
        try {
            const [existente] = await pool.query('SELECT id FROM peliculas WHERE id = ?', [req.params.id]);
            if (existente.length === 0) {
                return res.redirect('/peliculas?error=' + encodeURIComponent('Película no encontrada'));
            }

            const validacion = validarPelicula(req.body);
            if (!validacion.ok) {
                return res.redirect('/peliculas/' + req.params.id + '/editar?error=' + encodeURIComponent(validacion.message));
            }

            const { titulo, genero, duracion, clasificacion } = validacion.data;
            
            await pool.query(
                'UPDATE peliculas SET titulo = ?, genero = ?, duracion = ?, clasificacion = ? WHERE id = ?',
                [titulo, genero, duracion, clasificacion, req.params.id]
            );
            
            res.redirect('/peliculas?success=' + encodeURIComponent('Película actualizada exitosamente'));
        } catch (error) {
            console.error('Error en actualizarWeb:', error);
            res.redirect('/peliculas/' + req.params.id + '/editar?error=' + encodeURIComponent(error.message));
        }
    };

    eliminarWeb = async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM peliculas WHERE id = ?', [req.params.id]);

            if (result.affectedRows === 0) {
                return res.redirect('/peliculas?error=' + encodeURIComponent('Película no encontrada'));
            }

            res.redirect('/peliculas?success=' + encodeURIComponent('Película eliminada exitosamente'));
        } catch (error) {
            console.error('Error en eliminarWeb:', error);
            res.redirect('/peliculas?error=' + encodeURIComponent(error.message));
        }
    };
}

module.exports = PeliculaController;


