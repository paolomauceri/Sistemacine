const { pool } = require('../config/db');
const {
    parseAsientos,
    validarFormatoAsientos,
    obtenerConflictosAsientos,
    normalizarAsientosTexto,
    generarAsientosPorCapacidad
} = require('../utils/asientos');

const METODOS_PAGO_VALIDOS = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'];

class VentaController {
    obtenerDatosVentaRapida = async () => {
        const [funciones] = await pool.query(
            `SELECT f.id, p.titulo, f.fecha, f.hora, f.precio_base, s.nombre AS sala_nombre
             FROM funciones f
             INNER JOIN peliculas p ON p.id = f.pelicula_id
             INNER JOIN salas s ON s.id = f.sala_id
             WHERE f.estado = 'PROGRAMADA'
             ORDER BY f.fecha DESC, f.hora DESC`
        );

        const [clientes] = await pool.query('SELECT id, nombre FROM clientes ORDER BY nombre');

        const [productos] = await pool.query(
            `SELECT id, nombre, tipo, precio, stock
             FROM productos
             WHERE tipo IN ('Snack', 'Bebida') AND stock > 0
             ORDER BY tipo, nombre`
        );

        const snacks = productos.filter((producto) => producto.tipo === 'Snack');
        const bebidas = productos.filter((producto) => producto.tipo === 'Bebida');

        return { funciones, clientes, snacks, bebidas };
    };

    renderVentaRapida = async (res, ventaRapida = {}, errorMsg = null) => {
        const { funciones, clientes, snacks, bebidas } = await this.obtenerDatosVentaRapida();

        return res.render('ventas/rapida', {
            title: 'Venta Rapida',
            active: 'ventas',
            error_msg: errorMsg,
            ventaRapida,
            funciones,
            clientes,
            snacks,
            bebidas
        });
    };

    listarApi = async (req, res) => {
        try {
            const [rows] = await pool.query(
                `SELECT v.*, e.id AS entrada_id, p.titulo AS pelicula_titulo, c.nombre AS cliente_nombre
                 FROM ventas v
                 INNER JOIN entradas e ON e.id = v.entrada_id
                 INNER JOIN funciones f ON f.id = e.funcion_id
                 INNER JOIN peliculas p ON p.id = f.pelicula_id
                 LEFT JOIN clientes c ON c.id = e.cliente_id
                 ORDER BY v.created_at DESC`
            );
            res.json({ success: true, data: rows, total: rows.length });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };

    obtenerAsientosFuncion = async (req, res) => {
        try {
            const funcionId = Number.parseInt(req.params.funcionId, 10);
            if (Number.isNaN(funcionId)) {
                return res.status(400).json({ success: false, error: 'Funcion invalida' });
            }

            const [funcionRows] = await pool.query(
                `SELECT f.id, s.capacidad
                 FROM funciones f
                 INNER JOIN salas s ON s.id = f.sala_id
                 WHERE f.id = ?`,
                [funcionId]
            );

            if (funcionRows.length === 0) {
                return res.status(404).json({ success: false, error: 'Funcion no encontrada' });
            }

            const capacidad = Number.parseInt(funcionRows[0].capacidad, 10);
            const [entradasRows] = await pool.query(
                "SELECT asientos FROM entradas WHERE funcion_id = ? AND estado IN ('PAGADA', 'RESERVADA')",
                [funcionId]
            );

            const ocupados = [...new Set(entradasRows.flatMap((row) => parseAsientos(row.asientos)))];
            const asientos = generarAsientosPorCapacidad(capacidad);

            res.json({
                success: true,
                data: {
                    funcion_id: funcionId,
                    capacidad,
                    asientos,
                    ocupados
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };

    obtenerPorIdApi = async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM ventas WHERE id = ?', [req.params.id]);
            if (rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Venta no encontrada' });
            }
            res.json({ success: true, data: rows[0] });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };

    crearApi = async (req, res) => {
        try {
            const { entrada_id, descripcion, subtotal, descuento, impuesto, total, metodo_pago, estado } = req.body;
            const entradaId = Number.parseInt(entrada_id, 10);
            const subtotalNum = Number.parseFloat(subtotal);
            const descuentoNum = Number.parseFloat(descuento || 0);
            const impuestoNum = Number.parseFloat(impuesto || 0);
            const totalNum = Number.parseFloat(total);

            if (Number.isNaN(entradaId) || Number.isNaN(subtotalNum) || Number.isNaN(totalNum) || subtotalNum <= 0 || totalNum <= 0 || !metodo_pago) {
                return res.status(400).json({ success: false, error: 'Datos de venta invalidos' });
            }

            const [result] = await pool.query(
                'INSERT INTO ventas (entrada_id, descripcion, subtotal, descuento, impuesto, total, metodo_pago, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [entradaId, descripcion ? String(descripcion).trim() : null, subtotalNum, descuentoNum, impuestoNum, totalNum, metodo_pago, estado || 'CONFIRMADA']
            );

            const [nueva] = await pool.query('SELECT * FROM ventas WHERE id = ?', [result.insertId]);
            res.status(201).json({ success: true, message: 'Venta creada', data: nueva[0] });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    };

    actualizarApi = async (req, res) => {
        try {
            const { entrada_id, descripcion, subtotal, descuento, impuesto, total, metodo_pago, estado } = req.body;
            const entradaId = Number.parseInt(entrada_id, 10);
            const subtotalNum = Number.parseFloat(subtotal);
            const descuentoNum = Number.parseFloat(descuento || 0);
            const impuestoNum = Number.parseFloat(impuesto || 0);
            const totalNum = Number.parseFloat(total);

            if (Number.isNaN(entradaId) || Number.isNaN(subtotalNum) || Number.isNaN(totalNum) || subtotalNum <= 0 || totalNum <= 0 || !metodo_pago) {
                return res.status(400).json({ success: false, error: 'Datos de venta invalidos' });
            }

            const [result] = await pool.query(
                'UPDATE ventas SET entrada_id = ?, descripcion = ?, subtotal = ?, descuento = ?, impuesto = ?, total = ?, metodo_pago = ?, estado = ? WHERE id = ?',
                [entradaId, descripcion ? String(descripcion).trim() : null, subtotalNum, descuentoNum, impuestoNum, totalNum, metodo_pago, estado || 'CONFIRMADA', req.params.id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, error: 'Venta no encontrada' });
            }

            const [actualizada] = await pool.query('SELECT * FROM ventas WHERE id = ?', [req.params.id]);
            res.json({ success: true, message: 'Venta actualizada', data: actualizada[0] });
        } catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    };

    eliminarApi = async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM ventas WHERE id = ?', [req.params.id]);
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, error: 'Venta no encontrada' });
            }
            res.json({ success: true, message: 'Venta eliminada' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    };

    listarWeb = async (req, res) => {
        try {
            const [ventas] = await pool.query(
                `SELECT v.*, e.id AS entrada_id, p.titulo AS pelicula_titulo, c.nombre AS cliente_nombre
                 FROM ventas v
                 INNER JOIN entradas e ON e.id = v.entrada_id
                 INNER JOIN funciones f ON f.id = e.funcion_id
                 INNER JOIN peliculas p ON p.id = f.pelicula_id
                 LEFT JOIN clientes c ON c.id = e.cliente_id
                 ORDER BY v.created_at DESC`
            );

            res.render('ventas/index', {
                title: 'Ventas',
                active: 'ventas',
                ventas,
                success_msg: req.query.success,
                error_msg: req.query.error
            });
        } catch (error) {
            res.status(500).render('error', { title: 'Error', message: error.message });
        }
    };

    mostrarFormularioNuevo = async (req, res) => {
        try {
            const [entradas] = await pool.query(
                `SELECT e.id, p.titulo, e.total
                 FROM entradas e
                 INNER JOIN funciones f ON f.id = e.funcion_id
                 INNER JOIN peliculas p ON p.id = f.pelicula_id
                 ORDER BY e.id DESC`
            );

            res.render('ventas/nueva', {
                title: 'Nueva Venta',
                active: 'ventas',
                error_msg: null,
                venta: {},
                entradas
            });
        } catch (error) {
            res.redirect('/ventas?error=' + encodeURIComponent(error.message));
        }
    };

    mostrarFormularioRapido = async (req, res) => {
        try {
            const funcionId = Number.parseInt(req.query.funcion_id, 10);

            await this.renderVentaRapida(
                res,
                Number.isNaN(funcionId)
                    ? { snack_cantidad: 0, bebida_cantidad: 0 }
                    : { funcion_id: funcionId, snack_cantidad: 0, bebida_cantidad: 0 }
            );
        } catch (error) {
            res.redirect('/ventas?error=' + encodeURIComponent(error.message));
        }
    };

    guardarVentaRapida = async (req, res) => {
        const connection = await pool.getConnection();

        try {
            const {
                funcion_id,
                cliente_id,
                cantidad,
                asientos,
                metodo_pago,
                descuento,
                impuesto,
                descripcion,
                snack_id,
                snack_cantidad,
                bebida_id,
                bebida_cantidad
            } = req.body;

            const funcionId = Number.parseInt(funcion_id, 10);
            let clienteId = cliente_id ? Number.parseInt(cliente_id, 10) : null;
            const cantidadNum = Number.parseInt(cantidad, 10);
            const descuentoNum = Number.parseFloat(descuento || 0);
            const impuestoNum = Number.parseFloat(impuesto || 0);
            const snackId = snack_id ? Number.parseInt(snack_id, 10) : null;
            const snackCantidadNum = Number.parseInt(snack_cantidad || 0, 10);
            const bebidaId = bebida_id ? Number.parseInt(bebida_id, 10) : null;
            const bebidaCantidadNum = Number.parseInt(bebida_cantidad || 0, 10);
            const asientosNormalizados = parseAsientos(asientos);
            const formatoAsientos = validarFormatoAsientos(asientosNormalizados);

            const descuentoInvalido = Number.isNaN(descuentoNum) || descuentoNum < 0;
            const impuestoInvalido = Number.isNaN(impuestoNum) || impuestoNum < 0;
            const metodoPagoInvalido = !METODOS_PAGO_VALIDOS.includes(String(metodo_pago || '').trim());
            const snackCantidadInvalida = Number.isNaN(snackCantidadNum) || snackCantidadNum < 0;
            const bebidaCantidadInvalida = Number.isNaN(bebidaCantidadNum) || bebidaCantidadNum < 0;
            const combinacionSnackInvalida = (snackId && snackCantidadNum <= 0) || (!snackId && snackCantidadNum > 0);
            const combinacionBebidaInvalida = (bebidaId && bebidaCantidadNum <= 0) || (!bebidaId && bebidaCantidadNum > 0);

            if (
                Number.isNaN(funcionId)
                || Number.isNaN(cantidadNum)
                || cantidadNum <= 0
                || metodoPagoInvalido
                || descuentoInvalido
                || impuestoInvalido
                || snackCantidadInvalida
                || bebidaCantidadInvalida
                || combinacionSnackInvalida
                || combinacionBebidaInvalida
            ) {
                return await this.renderVentaRapida(res, req.body, 'Datos invalidos para generar la venta rapida');
            }

            if (!formatoAsientos.valido) {
                return await this.renderVentaRapida(res, req.body, 'Formato de asientos invalido. Usa formato como A1,B2,C3');
            }

            if (asientosNormalizados.length > 0 && asientosNormalizados.length !== cantidadNum) {
                return await this.renderVentaRapida(res, req.body, 'La cantidad debe coincidir con el numero de asientos');
            }

            const [funcionRows] = await connection.query(
                `SELECT f.id, f.precio_base, f.estado, f.fecha, f.hora, p.titulo, s.nombre AS sala_nombre
                 FROM funciones f
                 INNER JOIN peliculas p ON p.id = f.pelicula_id
                 INNER JOIN salas s ON s.id = f.sala_id
                 WHERE f.id = ?`,
                [funcionId]
            );

            if (funcionRows.length === 0 || funcionRows[0].estado !== 'PROGRAMADA') {
                return await this.renderVentaRapida(res, req.body, 'La funcion seleccionada no esta disponible');
            }

            const precioBase = Number.parseFloat(funcionRows[0].precio_base);
            let subtotalNum = Number((precioBase * cantidadNum).toFixed(2));
            let clienteNombreTicket = 'Publico general';
            let detalleSnack = null;
            let detalleBebida = null;
            let snackSubtotalNum = 0;
            let bebidaSubtotalNum = 0;

            await connection.beginTransaction();

            if (req.session && req.session.user && req.session.user.role === 'client') {
                const sessionEmail = String(req.session.user.email || '').trim().toLowerCase();
                const sessionNombre = String(req.session.user.nombre || 'Cliente').trim();

                const [clienteSessionRows] = await connection.query(
                    'SELECT id, nombre FROM clientes WHERE email = ? LIMIT 1',
                    [sessionEmail]
                );

                if (clienteSessionRows.length === 0) {
                    const [nuevoClienteResult] = await connection.query(
                        'INSERT INTO clientes (nombre, email, telefono) VALUES (?, ?, ?)',
                        [sessionNombre, sessionEmail, null]
                    );

                    clienteId = nuevoClienteResult.insertId;
                    clienteNombreTicket = sessionNombre;
                } else {
                    clienteId = clienteSessionRows[0].id;
                    clienteNombreTicket = clienteSessionRows[0].nombre;
                }
            } else if (!Number.isNaN(clienteId)) {
                const [clienteRows] = await connection.query(
                    'SELECT id, nombre FROM clientes WHERE id = ?',
                    [clienteId]
                );

                if (clienteRows.length === 0) {
                    await connection.rollback();
                    return await this.renderVentaRapida(res, req.body, 'El cliente seleccionado no existe');
                }

                clienteNombreTicket = clienteRows[0].nombre;
            }

            if (asientosNormalizados.length > 0) {
                const [asientosOcupadosRows] = await connection.query(
                    "SELECT asientos FROM entradas WHERE funcion_id = ? AND estado IN ('PAGADA', 'RESERVADA') FOR UPDATE",
                    [funcionId]
                );
                const asientosOcupados = asientosOcupadosRows.flatMap((row) => parseAsientos(row.asientos));
                const conflictos = obtenerConflictosAsientos(asientosNormalizados, asientosOcupados);

                if (conflictos.length > 0) {
                    await connection.rollback();
                    return await this.renderVentaRapida(res, req.body, 'Asientos ocupados: ' + conflictos.join(', '));
                }
            }

            if (snackId) {
                const [snackRows] = await connection.query(
                    'SELECT id, nombre, tipo, precio, stock FROM productos WHERE id = ? FOR UPDATE',
                    [snackId]
                );

                if (snackRows.length === 0 || snackRows[0].tipo !== 'Snack') {
                    await connection.rollback();
                    return await this.renderVentaRapida(res, req.body, 'El snack seleccionado no es valido');
                }

                if (snackRows[0].stock < snackCantidadNum) {
                    await connection.rollback();
                    return await this.renderVentaRapida(res, req.body, 'Stock insuficiente para el snack seleccionado');
                }

                snackSubtotalNum = Number((Number.parseFloat(snackRows[0].precio) * snackCantidadNum).toFixed(2));
                subtotalNum = Number((subtotalNum + snackSubtotalNum).toFixed(2));
                detalleSnack = `${snackRows[0].nombre} x${snackCantidadNum}`;

                await connection.query(
                    'UPDATE productos SET stock = stock - ? WHERE id = ?',
                    [snackCantidadNum, snackId]
                );
            }

            if (bebidaId) {
                const [bebidaRows] = await connection.query(
                    'SELECT id, nombre, tipo, precio, stock FROM productos WHERE id = ? FOR UPDATE',
                    [bebidaId]
                );

                if (bebidaRows.length === 0 || bebidaRows[0].tipo !== 'Bebida') {
                    await connection.rollback();
                    return await this.renderVentaRapida(res, req.body, 'La bebida seleccionada no es valida');
                }

                if (bebidaRows[0].stock < bebidaCantidadNum) {
                    await connection.rollback();
                    return await this.renderVentaRapida(res, req.body, 'Stock insuficiente para la bebida seleccionada');
                }

                bebidaSubtotalNum = Number((Number.parseFloat(bebidaRows[0].precio) * bebidaCantidadNum).toFixed(2));
                subtotalNum = Number((subtotalNum + bebidaSubtotalNum).toFixed(2));
                detalleBebida = `${bebidaRows[0].nombre} x${bebidaCantidadNum}`;

                await connection.query(
                    'UPDATE productos SET stock = stock - ? WHERE id = ?',
                    [bebidaCantidadNum, bebidaId]
                );
            }

            if (descuentoNum > subtotalNum) {
                await connection.rollback();
                return await this.renderVentaRapida(res, req.body, 'El descuento no puede ser mayor al subtotal');
            }

            const totalNum = Number((subtotalNum - descuentoNum + impuestoNum).toFixed(2));

            if (totalNum <= 0) {
                await connection.rollback();
                return await this.renderVentaRapida(res, req.body, 'El total debe ser mayor a 0');
            }

            const [entradaResult] = await connection.query(
                'INSERT INTO entradas (funcion_id, cliente_id, cantidad, asientos, total, metodo_pago, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [
                    funcionId,
                    Number.isNaN(clienteId) ? null : clienteId,
                    cantidadNum,
                    normalizarAsientosTexto(asientosNormalizados),
                    totalNum,
                    metodo_pago,
                    'PAGADA'
                ]
            );

            const [ventaResult] = await connection.query(
                'INSERT INTO ventas (entrada_id, descripcion, subtotal, descuento, impuesto, total, metodo_pago, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    entradaResult.insertId,
                    [
                        descripcion ? String(descripcion).trim() : 'Venta rapida de taquilla',
                        detalleSnack ? `Snack: ${detalleSnack}` : null,
                        detalleBebida ? `Bebida: ${detalleBebida}` : null
                    ].filter(Boolean).join(' | ').slice(0, 255),
                    subtotalNum,
                    descuentoNum,
                    impuestoNum,
                    totalNum,
                    metodo_pago,
                    'CONFIRMADA'
                ]
            );

            await connection.commit();

            const ticketData = {
                venta_id: ventaResult.insertId,
                entrada_id: entradaResult.insertId,
                pelicula_titulo: funcionRows[0].titulo,
                sala_nombre: funcionRows[0].sala_nombre,
                fecha: funcionRows[0].fecha,
                hora: funcionRows[0].hora,
                cliente_nombre: clienteNombreTicket,
                asientos: normalizarAsientosTexto(asientosNormalizados) || 'Asignacion general',
                cantidad_entradas: cantidadNum,
                precio_entrada_unitario: Number(precioBase.toFixed(2)),
                subtotal_entradas: Number((precioBase * cantidadNum).toFixed(2)),
                snack_detalle: detalleSnack,
                snack_subtotal: snackSubtotalNum,
                bebida_detalle: detalleBebida,
                bebida_subtotal: bebidaSubtotalNum,
                subtotal: subtotalNum,
                descuento: descuentoNum,
                impuesto: impuestoNum,
                total: totalNum,
                metodo_pago,
                descripcion: descripcion ? String(descripcion).trim() : 'Venta rapida de taquilla',
                fecha_emision: new Date()
            };

            if (req.session && req.session.user && (req.session.user.role === 'client' || req.session.user.role === 'seller')) {
                return res.render('ventas/ticket', {
                    title: 'Ticket de Compra',
                    active: 'ventas',
                    ticket: ticketData
                });
            }

            return res.redirect('/ventas?success=' + encodeURIComponent('Venta rapida registrada exitosamente'));
        } catch (error) {
            await connection.rollback();
            res.redirect('/ventas?error=' + encodeURIComponent(error.message));
        } finally {
            connection.release();
        }
    };

    guardarNuevo = async (req, res) => {
        try {
            const { entrada_id, descripcion, subtotal, descuento, impuesto, total, metodo_pago, estado } = req.body;
            const entradaId = Number.parseInt(entrada_id, 10);
            const subtotalNum = Number.parseFloat(subtotal);
            const descuentoNum = Number.parseFloat(descuento || 0);
            const impuestoNum = Number.parseFloat(impuesto || 0);
            const totalNum = Number.parseFloat(total);

            if (Number.isNaN(entradaId) || Number.isNaN(subtotalNum) || Number.isNaN(totalNum) || subtotalNum <= 0 || totalNum <= 0 || !metodo_pago) {
                const [entradas] = await pool.query(
                    `SELECT e.id, p.titulo, e.total
                     FROM entradas e
                     INNER JOIN funciones f ON f.id = e.funcion_id
                     INNER JOIN peliculas p ON p.id = f.pelicula_id
                     ORDER BY e.id DESC`
                );
                return res.render('ventas/nueva', {
                    title: 'Nueva Venta',
                    active: 'ventas',
                    error_msg: 'Datos invalidos para la venta',
                    venta: req.body,
                    entradas
                });
            }

            await pool.query(
                'INSERT INTO ventas (entrada_id, descripcion, subtotal, descuento, impuesto, total, metodo_pago, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [entradaId, descripcion ? String(descripcion).trim() : null, subtotalNum, descuentoNum, impuestoNum, totalNum, metodo_pago, estado || 'CONFIRMADA']
            );

            res.redirect('/ventas?success=' + encodeURIComponent('Venta creada exitosamente'));
        } catch (error) {
            res.redirect('/ventas?error=' + encodeURIComponent(error.message));
        }
    };

    mostrarFormularioEditar = async (req, res) => {
        try {
            const [venta] = await pool.query('SELECT * FROM ventas WHERE id = ?', [req.params.id]);
            if (venta.length === 0) {
                return res.redirect('/ventas?error=' + encodeURIComponent('Venta no encontrada'));
            }

            const [entradas] = await pool.query(
                `SELECT e.id, p.titulo, e.total
                 FROM entradas e
                 INNER JOIN funciones f ON f.id = e.funcion_id
                 INNER JOIN peliculas p ON p.id = f.pelicula_id
                 ORDER BY e.id DESC`
            );

            res.render('ventas/editar', {
                title: 'Editar Venta',
                active: 'ventas',
                error_msg: req.query.error || null,
                venta: venta[0],
                entradas
            });
        } catch (error) {
            res.redirect('/ventas?error=' + encodeURIComponent(error.message));
        }
    };

    actualizarWeb = async (req, res) => {
        try {
            const { entrada_id, descripcion, subtotal, descuento, impuesto, total, metodo_pago, estado } = req.body;
            const entradaId = Number.parseInt(entrada_id, 10);
            const subtotalNum = Number.parseFloat(subtotal);
            const descuentoNum = Number.parseFloat(descuento || 0);
            const impuestoNum = Number.parseFloat(impuesto || 0);
            const totalNum = Number.parseFloat(total);

            if (Number.isNaN(entradaId) || Number.isNaN(subtotalNum) || Number.isNaN(totalNum) || subtotalNum <= 0 || totalNum <= 0 || !metodo_pago) {
                return res.redirect('/ventas/' + req.params.id + '/editar?error=' + encodeURIComponent('Datos invalidos'));
            }

            const [result] = await pool.query(
                'UPDATE ventas SET entrada_id = ?, descripcion = ?, subtotal = ?, descuento = ?, impuesto = ?, total = ?, metodo_pago = ?, estado = ? WHERE id = ?',
                [entradaId, descripcion ? String(descripcion).trim() : null, subtotalNum, descuentoNum, impuestoNum, totalNum, metodo_pago, estado || 'CONFIRMADA', req.params.id]
            );

            if (result.affectedRows === 0) {
                return res.redirect('/ventas?error=' + encodeURIComponent('Venta no encontrada'));
            }

            res.redirect('/ventas?success=' + encodeURIComponent('Venta actualizada exitosamente'));
        } catch (error) {
            res.redirect('/ventas/' + req.params.id + '/editar?error=' + encodeURIComponent(error.message));
        }
    };

    eliminarWeb = async (req, res) => {
        try {
            const [result] = await pool.query('DELETE FROM ventas WHERE id = ?', [req.params.id]);
            if (result.affectedRows === 0) {
                return res.redirect('/ventas?error=' + encodeURIComponent('Venta no encontrada'));
            }
            res.redirect('/ventas?success=' + encodeURIComponent('Venta eliminada exitosamente'));
        } catch (error) {
            res.redirect('/ventas?error=' + encodeURIComponent(error.message));
        }
    };
}

module.exports = VentaController;
