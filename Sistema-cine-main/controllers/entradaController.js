const { pool } = require('../config/db');
const {
    parseAsientos,
    validarFormatoAsientos,
    obtenerConflictosAsientos,
    normalizarAsientosTexto
} = require('../utils/asientos');

async function cargarAsientosOcupados(db, funcionId, excludeEntradaId = null) {
    const params = [funcionId];
    let sql = "SELECT asientos FROM entradas WHERE funcion_id = ? AND estado IN ('PAGADA', 'RESERVADA')";

    if (excludeEntradaId !== null) {
        sql += ' AND id <> ?';
        params.push(excludeEntradaId);
    }

    const [rows] = await db.query(sql, params);
    return rows.flatMap((row) => parseAsientos(row.asientos));
}

class EntradaController {
    listarApi = async (req, res) => {
        try {
            const [rows] = await pool.query(
                `SELECT e.*, f.fecha, f.hora, p.titulo AS pelicula_titulo, c.nombre AS cliente_nombre
                 FROM entradas e
                 INNER JOIN funciones f ON f.id = e.funcion_id
                 INNER JOIN peliculas p ON p.id = f.pelicula_id
                 LEFT JOIN clientes c ON c.id = e.cliente_id
                 ORDER BY e.created_at DESC`
            );
            res.json({ success: true, data: rows, total: rows.length });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };

    obtenerPorIdApi = async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM entradas WHERE id = ?', [req.params.id]);
            if (rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Entrada no encontrada' });
            }
            res.json({ success: true, data: rows[0] });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };

    crearApi = async (req, res) => {
        try {
            const { funcion_id, cliente_id, cantidad, asientos, total, metodo_pago, estado } = req.body;
            const funcionId = Number.parseInt(funcion_id, 10);
            const clienteId = cliente_id ? Number.parseInt(cliente_id, 10) : null;
            const cantidadNum = Number.parseInt(cantidad, 10);
            const totalNum = Number.parseFloat(total);
            const estadoFinal = estado || 'PAGADA';
            const asientosNormalizados = parseAsientos(asientos);
            const formatoAsientos = validarFormatoAsientos(asientosNormalizados);

            if (Number.isNaN(funcionId) || Number.isNaN(cantidadNum) || cantidadNum <= 0 || Number.isNaN(totalNum) || totalNum <= 0 || !metodo_pago) {
                return res.status(400).json({ success: false, error: 'Datos de entrada invalidos' });
            }

            if (!formatoAsientos.valido) {
                return res.status(400).json({ success: false, error: 'Formato de asientos invalido. Usa formato como A1,B2,C3' });
            }

            if (asientosNormalizados.length > 0 && asientosNormalizados.length !== cantidadNum) {
                return res.status(400).json({ success: false, error: 'La cantidad debe coincidir con el numero de asientos' });
            }

            if (asientosNormalizados.length > 0 && ['PAGADA', 'RESERVADA'].includes(estadoFinal)) {
                const ocupados = await cargarAsientosOcupados(pool, funcionId);
                const conflictos = obtenerConflictosAsientos(asientosNormalizados, ocupados);

                if (conflictos.length > 0) {
                    return res.status(400).json({ success: false, error: 'Asientos ocupados: ' + conflictos.join(', ') });
                }
            }

            const [result] = await pool.query(
                'INSERT INTO entradas (funcion_id, cliente_id, cantidad, asientos, total, metodo_pago, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [funcionId, Number.isNaN(clienteId) ? null : clienteId, cantidadNum, normalizarAsientosTexto(asientosNormalizados), totalNum, metodo_pago, estadoFinal]
            );

            const [nueva] = await pool.query('SELECT * FROM entradas WHERE id = ?', [result.insertId]);
            res.status(201).json({ success: true, message: 'Entrada creada', data: nueva[0] });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    };

    actualizarApi = async (req, res) => {
        try {
            const { funcion_id, cliente_id, cantidad, asientos, total, metodo_pago, estado } = req.body;
            const funcionId = Number.parseInt(funcion_id, 10);
            const clienteId = cliente_id ? Number.parseInt(cliente_id, 10) : null;
            const cantidadNum = Number.parseInt(cantidad, 10);
            const totalNum = Number.parseFloat(total);
            const estadoFinal = estado || 'PAGADA';
            const asientosNormalizados = parseAsientos(asientos);
            const formatoAsientos = validarFormatoAsientos(asientosNormalizados);

            if (Number.isNaN(funcionId) || Number.isNaN(cantidadNum) || cantidadNum <= 0 || Number.isNaN(totalNum) || totalNum <= 0 || !metodo_pago) {
                return res.status(400).json({ success: false, error: 'Datos de entrada invalidos' });
            }

            if (!formatoAsientos.valido) {
                return res.status(400).json({ success: false, error: 'Formato de asientos invalido. Usa formato como A1,B2,C3' });
            }

            if (asientosNormalizados.length > 0 && asientosNormalizados.length !== cantidadNum) {
                return res.status(400).json({ success: false, error: 'La cantidad debe coincidir con el numero de asientos' });
            }

            if (asientosNormalizados.length > 0 && ['PAGADA', 'RESERVADA'].includes(estadoFinal)) {
                const ocupados = await cargarAsientosOcupados(pool, funcionId, Number.parseInt(req.params.id, 10));
                const conflictos = obtenerConflictosAsientos(asientosNormalizados, ocupados);

                if (conflictos.length > 0) {
                    return res.status(400).json({ success: false, error: 'Asientos ocupados: ' + conflictos.join(', ') });
                }
            }

            const [result] = await pool.query(
                'UPDATE entradas SET funcion_id = ?, cliente_id = ?, cantidad = ?, asientos = ?, total = ?, metodo_pago = ?, estado = ? WHERE id = ?',
                [funcionId, Number.isNaN(clienteId) ? null : clienteId, cantidadNum, normalizarAsientosTexto(asientosNormalizados), totalNum, metodo_pago, estadoFinal, req.params.id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, error: 'Entrada no encontrada' });
            }

            const [actualizada] = await pool.query('SELECT * FROM entradas WHERE id = ?', [req.params.id]);
            res.json({ success: true, message: 'Entrada actualizada', data: actualizada[0] });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    };

    eliminarApi = async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM entradas WHERE id = ?', [req.params.id]);
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, error: 'Entrada no encontrada' });
            }
            res.json({ success: true, message: 'Entrada eliminada' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };

    listarWeb = async (req, res) => {
        try {
            const [entradas] = await pool.query(
                `SELECT e.*, f.fecha, f.hora, p.titulo AS pelicula_titulo, c.nombre AS cliente_nombre
                 FROM entradas e
                 INNER JOIN funciones f ON f.id = e.funcion_id
                 INNER JOIN peliculas p ON p.id = f.pelicula_id
                 LEFT JOIN clientes c ON c.id = e.cliente_id
                 ORDER BY e.created_at DESC`
            );

            res.render('entradas/index', {
                title: 'Entradas',
                active: 'entradas',
                entradas,
                success_msg: req.query.success,
                error_msg: req.query.error
            });
        } catch (error) {
            res.status(500).render('error', { title: 'Error', message: error.message });
        }
    };

    mostrarFormularioNuevo = async (req, res) => {
        try {
            const [funciones] = await pool.query(
                `SELECT f.id, p.titulo, f.fecha, f.hora, f.precio_base
                 FROM funciones f
                 INNER JOIN peliculas p ON p.id = f.pelicula_id
                 ORDER BY f.fecha DESC, f.hora DESC`
            );
            const [clientes] = await pool.query('SELECT id, nombre FROM clientes ORDER BY nombre');

            res.render('entradas/nueva', {
                title: 'Nueva Entrada',
                active: 'entradas',
                error_msg: null,
                entrada: {},
                funciones,
                clientes
            });
        } catch (error) {
            res.redirect('/entradas?error=' + encodeURIComponent(error.message));
        }
    };

    guardarNuevo = async (req, res) => {
        try {
            const { funcion_id, cliente_id, cantidad, asientos, total, metodo_pago, estado } = req.body;
            const funcionId = Number.parseInt(funcion_id, 10);
            const clienteId = cliente_id ? Number.parseInt(cliente_id, 10) : null;
            const cantidadNum = Number.parseInt(cantidad, 10);
            const totalNum = Number.parseFloat(total);
            const estadoFinal = estado || 'PAGADA';
            const asientosNormalizados = parseAsientos(asientos);
            const formatoAsientos = validarFormatoAsientos(asientosNormalizados);

            if (Number.isNaN(funcionId) || Number.isNaN(cantidadNum) || cantidadNum <= 0 || Number.isNaN(totalNum) || totalNum <= 0 || !metodo_pago) {
                const [funciones] = await pool.query(
                    `SELECT f.id, p.titulo, f.fecha, f.hora, f.precio_base
                     FROM funciones f
                     INNER JOIN peliculas p ON p.id = f.pelicula_id
                     ORDER BY f.fecha DESC, f.hora DESC`
                );
                const [clientes] = await pool.query('SELECT id, nombre FROM clientes ORDER BY nombre');
                return res.render('entradas/nueva', {
                    title: 'Nueva Entrada',
                    active: 'entradas',
                    error_msg: 'Datos invalidos para la entrada',
                    entrada: req.body,
                    funciones,
                    clientes
                });
            }

            if (!formatoAsientos.valido) {
                const [funciones] = await pool.query(
                    `SELECT f.id, p.titulo, f.fecha, f.hora, f.precio_base
                     FROM funciones f
                     INNER JOIN peliculas p ON p.id = f.pelicula_id
                     ORDER BY f.fecha DESC, f.hora DESC`
                );
                const [clientes] = await pool.query('SELECT id, nombre FROM clientes ORDER BY nombre');
                return res.render('entradas/nueva', {
                    title: 'Nueva Entrada',
                    active: 'entradas',
                    error_msg: 'Formato de asientos invalido. Usa formato como A1,B2,C3',
                    entrada: req.body,
                    funciones,
                    clientes
                });
            }

            if (asientosNormalizados.length > 0 && asientosNormalizados.length !== cantidadNum) {
                const [funciones] = await pool.query(
                    `SELECT f.id, p.titulo, f.fecha, f.hora, f.precio_base
                     FROM funciones f
                     INNER JOIN peliculas p ON p.id = f.pelicula_id
                     ORDER BY f.fecha DESC, f.hora DESC`
                );
                const [clientes] = await pool.query('SELECT id, nombre FROM clientes ORDER BY nombre');
                return res.render('entradas/nueva', {
                    title: 'Nueva Entrada',
                    active: 'entradas',
                    error_msg: 'La cantidad debe coincidir con el numero de asientos',
                    entrada: req.body,
                    funciones,
                    clientes
                });
            }

            if (asientosNormalizados.length > 0 && ['PAGADA', 'RESERVADA'].includes(estadoFinal)) {
                const ocupados = await cargarAsientosOcupados(pool, funcionId);
                const conflictos = obtenerConflictosAsientos(asientosNormalizados, ocupados);

                if (conflictos.length > 0) {
                    const [funciones] = await pool.query(
                        `SELECT f.id, p.titulo, f.fecha, f.hora, f.precio_base
                         FROM funciones f
                         INNER JOIN peliculas p ON p.id = f.pelicula_id
                         ORDER BY f.fecha DESC, f.hora DESC`
                    );
                    const [clientes] = await pool.query('SELECT id, nombre FROM clientes ORDER BY nombre');
                    return res.render('entradas/nueva', {
                        title: 'Nueva Entrada',
                        active: 'entradas',
                        error_msg: 'Asientos ocupados: ' + conflictos.join(', '),
                        entrada: req.body,
                        funciones,
                        clientes
                    });
                }
            }

            await pool.query(
                'INSERT INTO entradas (funcion_id, cliente_id, cantidad, asientos, total, metodo_pago, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [funcionId, Number.isNaN(clienteId) ? null : clienteId, cantidadNum, normalizarAsientosTexto(asientosNormalizados), totalNum, metodo_pago, estadoFinal]
            );

            res.redirect('/entradas?success=' + encodeURIComponent('Entrada creada exitosamente'));
        } catch (error) {
            res.redirect('/entradas?error=' + encodeURIComponent(error.message));
        }
    };

    mostrarFormularioEditar = async (req, res) => {
        try {
            const [entrada] = await pool.query('SELECT * FROM entradas WHERE id = ?', [req.params.id]);
            if (entrada.length === 0) {
                return res.redirect('/entradas?error=' + encodeURIComponent('Entrada no encontrada'));
            }

            const [funciones] = await pool.query(
                `SELECT f.id, p.titulo, f.fecha, f.hora, f.precio_base
                 FROM funciones f
                 INNER JOIN peliculas p ON p.id = f.pelicula_id
                 ORDER BY f.fecha DESC, f.hora DESC`
            );
            const [clientes] = await pool.query('SELECT id, nombre FROM clientes ORDER BY nombre');

            res.render('entradas/editar', {
                title: 'Editar Entrada',
                active: 'entradas',
                error_msg: req.query.error || null,
                entrada: entrada[0],
                funciones,
                clientes
            });
        } catch (error) {
            res.redirect('/entradas?error=' + encodeURIComponent(error.message));
        }
    };

    actualizarWeb = async (req, res) => {
        try {
            const { funcion_id, cliente_id, cantidad, asientos, total, metodo_pago, estado } = req.body;
            const funcionId = Number.parseInt(funcion_id, 10);
            const clienteId = cliente_id ? Number.parseInt(cliente_id, 10) : null;
            const cantidadNum = Number.parseInt(cantidad, 10);
            const totalNum = Number.parseFloat(total);
            const estadoFinal = estado || 'PAGADA';
            const asientosNormalizados = parseAsientos(asientos);
            const formatoAsientos = validarFormatoAsientos(asientosNormalizados);

            if (Number.isNaN(funcionId) || Number.isNaN(cantidadNum) || cantidadNum <= 0 || Number.isNaN(totalNum) || totalNum <= 0 || !metodo_pago) {
                return res.redirect('/entradas/' + req.params.id + '/editar?error=' + encodeURIComponent('Datos invalidos'));
            }

            if (!formatoAsientos.valido) {
                return res.redirect('/entradas/' + req.params.id + '/editar?error=' + encodeURIComponent('Formato de asientos invalido. Usa formato como A1,B2,C3'));
            }

            if (asientosNormalizados.length > 0 && asientosNormalizados.length !== cantidadNum) {
                return res.redirect('/entradas/' + req.params.id + '/editar?error=' + encodeURIComponent('La cantidad debe coincidir con el numero de asientos'));
            }

            if (asientosNormalizados.length > 0 && ['PAGADA', 'RESERVADA'].includes(estadoFinal)) {
                const ocupados = await cargarAsientosOcupados(pool, funcionId, Number.parseInt(req.params.id, 10));
                const conflictos = obtenerConflictosAsientos(asientosNormalizados, ocupados);

                if (conflictos.length > 0) {
                    return res.redirect('/entradas/' + req.params.id + '/editar?error=' + encodeURIComponent('Asientos ocupados: ' + conflictos.join(', ')));
                }
            }

            const [result] = await pool.query(
                'UPDATE entradas SET funcion_id = ?, cliente_id = ?, cantidad = ?, asientos = ?, total = ?, metodo_pago = ?, estado = ? WHERE id = ?',
                [funcionId, Number.isNaN(clienteId) ? null : clienteId, cantidadNum, normalizarAsientosTexto(asientosNormalizados), totalNum, metodo_pago, estadoFinal, req.params.id]
            );

            if (result.affectedRows === 0) {
                return res.redirect('/entradas?error=' + encodeURIComponent('Entrada no encontrada'));
            }

            res.redirect('/entradas?success=' + encodeURIComponent('Entrada actualizada exitosamente'));
        } catch (error) {
            res.redirect('/entradas/' + req.params.id + '/editar?error=' + encodeURIComponent(error.message));
        }
    };

    eliminarWeb = async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM entradas WHERE id = ?', [req.params.id]);
            if (result.affectedRows === 0) {
                return res.redirect('/entradas?error=' + encodeURIComponent('Entrada no encontrada'));
            }
            res.redirect('/entradas?success=' + encodeURIComponent('Entrada eliminada exitosamente'));
        } catch (error) {
            res.redirect('/entradas?error=' + encodeURIComponent(error.message));
        }
    };
}

module.exports = EntradaController;
