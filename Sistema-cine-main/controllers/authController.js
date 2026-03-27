const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { buildApiToken, getApiTokenTtlSeconds } = require('../utils/apiToken');

class AuthController {
    validarCredenciales = async (emailRaw, passwordRaw) => {
        const email = String(emailRaw || '').trim().toLowerCase();
        const password = String(passwordRaw || '');

        if (!email || !password) {
            return { ok: false, error: 'Email y contrasena son obligatorios' };
        }

        const [rows] = await pool.query('SELECT id, nombre, email, password_hash, role FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return { ok: false, error: 'Credenciales invalidas' };
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return { ok: false, error: 'Credenciales invalidas' };
        }

        return {
            ok: true,
            user: {
                id: user.id,
                nombre: user.nombre,
                email: user.email,
                role: user.role
            }
        };
    };

    mostrarLogin = (req, res) => {
        if (req.session.user) {
            return res.redirect('/');
        }

        res.render('auth/login', {
            title: 'Iniciar sesion',
            active: 'auth',
            error_msg: req.query.error || null
        });
    };

    login = async (req, res) => {
        try {
            const result = await this.validarCredenciales(req.body.email, req.body.password);
            if (!result.ok) {
                return res.redirect('/auth/login?error=' + encodeURIComponent(result.error));
            }

            req.session.user = result.user;
            req.session.save((err) => {
                if (err) {
                    return res.redirect('/auth/login?error=' + encodeURIComponent('No se pudo guardar la sesion'));
                }

                return res.redirect('/?success=' + encodeURIComponent('Sesion iniciada correctamente'));
            });
        } catch (error) {
            return res.redirect('/auth/login?error=' + encodeURIComponent(error.message));
        }
    };

    mostrarRegistro = (req, res) => {
        if (req.session.user) {
            return res.redirect('/');
        }

        res.render('auth/register', {
            title: 'Registro de cliente',
            active: 'auth',
            error_msg: req.query.error || null
        });
    };

    mostrarRegistroVendedor = (req, res) => {
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.redirect('/?error=' + encodeURIComponent('Solo admin puede crear vendedores'));
        }

        res.render('auth/register-seller', {
            title: 'Registro de vendedor',
            active: 'auth',
            error_msg: req.query.error || null
        });
    };

    listarVendedores = async (req, res) => {
        try {
            const search = String(req.query.q || '').trim();
            const hasSearch = search.length > 0;
            const likeValue = `%${search}%`;

            const [vendedores] = hasSearch
                ? await pool.query(
                    "SELECT id, nombre, email, role, created_at FROM users WHERE role = 'seller' AND (nombre LIKE ? OR email LIKE ?) ORDER BY created_at DESC",
                    [likeValue, likeValue]
                )
                : await pool.query(
                    "SELECT id, nombre, email, role, created_at FROM users WHERE role = 'seller' ORDER BY created_at DESC"
                );

            return res.render('auth/sellers', {
                title: 'Vendedores',
                active: 'vendedores',
                vendedores,
                search,
                success_msg: req.query.success || null,
                error_msg: req.query.error || null
            });
        } catch (error) {
            return res.redirect('/?error=' + encodeURIComponent(error.message));
        }
    };

    mostrarFormularioEditarVendedor = async (req, res) => {
        try {
            const sellerId = Number.parseInt(req.params.id, 10);
            if (Number.isNaN(sellerId)) {
                return res.redirect('/auth/sellers?error=' + encodeURIComponent('Vendedor invalido'));
            }

            const [rows] = await pool.query(
                "SELECT id, nombre, email, role FROM users WHERE id = ? AND role = 'seller'",
                [sellerId]
            );

            if (rows.length === 0) {
                return res.redirect('/auth/sellers?error=' + encodeURIComponent('Vendedor no encontrado'));
            }

            return res.render('auth/edit-seller', {
                title: 'Editar vendedor',
                active: 'vendedores',
                error_msg: req.query.error || null,
                vendedor: rows[0]
            });
        } catch (error) {
            return res.redirect('/auth/sellers?error=' + encodeURIComponent(error.message));
        }
    };

    registroCliente = async (req, res) => {
        try {
            const nombre = String(req.body.nombre || '').trim();
            const email = String(req.body.email || '').trim().toLowerCase();
            const password = String(req.body.password || '');

            if (!nombre || !email || !password) {
                return res.redirect('/auth/register?error=' + encodeURIComponent('Todos los campos son obligatorios'));
            }

            if (password.length < 6) {
                return res.redirect('/auth/register?error=' + encodeURIComponent('La contrasena debe tener al menos 6 caracteres'));
            }

            const [exists] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
            if (exists.length > 0) {
                return res.redirect('/auth/register?error=' + encodeURIComponent('Ese email ya esta registrado'));
            }

            const hash = await bcrypt.hash(password, 10);
            await pool.query(
                'INSERT INTO users (nombre, email, password_hash, role) VALUES (?, ?, ?, ?)',
                [nombre, email, hash, 'client']
            );

            const [clienteExistente] = await pool.query('SELECT id FROM clientes WHERE email = ?', [email]);
            if (clienteExistente.length === 0) {
                await pool.query(
                    'INSERT INTO clientes (nombre, email, telefono) VALUES (?, ?, ?)',
                    [nombre, email, null]
                );
            }

            return res.redirect('/auth/login?success=' + encodeURIComponent('Cuenta creada. Ya puedes iniciar sesion'));
        } catch (error) {
            return res.redirect('/auth/register?error=' + encodeURIComponent(error.message));
        }
    };

    registroVendedor = async (req, res) => {
        try {
            if (!req.session.user || req.session.user.role !== 'admin') {
                return res.redirect('/?error=' + encodeURIComponent('Solo admin puede crear vendedores'));
            }

            const nombre = String(req.body.nombre || '').trim();
            const email = String(req.body.email || '').trim().toLowerCase();
            const password = String(req.body.password || '');

            if (!nombre || !email || !password) {
                return res.redirect('/auth/register-seller?error=' + encodeURIComponent('Todos los campos son obligatorios'));
            }

            if (password.length < 6) {
                return res.redirect('/auth/register-seller?error=' + encodeURIComponent('La contrasena debe tener al menos 6 caracteres'));
            }

            const [exists] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
            if (exists.length > 0) {
                return res.redirect('/auth/register-seller?error=' + encodeURIComponent('Ese email ya esta registrado'));
            }

            const hash = await bcrypt.hash(password, 10);
            await pool.query(
                'INSERT INTO users (nombre, email, password_hash, role) VALUES (?, ?, ?, ?)',
                [nombre, email, hash, 'seller']
            );

            return res.redirect('/?success=' + encodeURIComponent('Vendedor creado exitosamente'));
        } catch (error) {
            return res.redirect('/auth/register-seller?error=' + encodeURIComponent(error.message));
        }
    };

    actualizarVendedor = async (req, res) => {
        try {
            const sellerId = Number.parseInt(req.params.id, 10);
            if (Number.isNaN(sellerId)) {
                return res.redirect('/auth/sellers?error=' + encodeURIComponent('Vendedor invalido'));
            }

            const nombre = String(req.body.nombre || '').trim();
            const email = String(req.body.email || '').trim().toLowerCase();
            const password = String(req.body.password || '').trim();

            if (!nombre || !email) {
                return res.redirect('/auth/sellers/' + sellerId + '/edit?error=' + encodeURIComponent('Nombre y email son obligatorios'));
            }

            const [exists] = await pool.query(
                'SELECT id FROM users WHERE email = ? AND id <> ?',
                [email, sellerId]
            );
            if (exists.length > 0) {
                return res.redirect('/auth/sellers/' + sellerId + '/edit?error=' + encodeURIComponent('Ese email ya esta en uso'));
            }

            const [sellerRows] = await pool.query(
                "SELECT id FROM users WHERE id = ? AND role = 'seller'",
                [sellerId]
            );
            if (sellerRows.length === 0) {
                return res.redirect('/auth/sellers?error=' + encodeURIComponent('Vendedor no encontrado'));
            }

            if (password) {
                if (password.length < 6) {
                    return res.redirect('/auth/sellers/' + sellerId + '/edit?error=' + encodeURIComponent('La contrasena debe tener al menos 6 caracteres'));
                }

                const hash = await bcrypt.hash(password, 10);
                await pool.query(
                    "UPDATE users SET nombre = ?, email = ?, password_hash = ? WHERE id = ? AND role = 'seller'",
                    [nombre, email, hash, sellerId]
                );
            } else {
                await pool.query(
                    "UPDATE users SET nombre = ?, email = ? WHERE id = ? AND role = 'seller'",
                    [nombre, email, sellerId]
                );
            }

            return res.redirect('/auth/sellers?success=' + encodeURIComponent('Vendedor actualizado exitosamente'));
        } catch (error) {
            return res.redirect('/auth/sellers?error=' + encodeURIComponent(error.message));
        }
    };

    eliminarVendedor = async (req, res) => {
        try {
            const sellerId = Number.parseInt(req.params.id, 10);
            if (Number.isNaN(sellerId)) {
                return res.redirect('/auth/sellers?error=' + encodeURIComponent('Vendedor invalido'));
            }

            const [result] = await pool.query(
                "DELETE FROM users WHERE id = ? AND role = 'seller'",
                [sellerId]
            );

            if (result.affectedRows === 0) {
                return res.redirect('/auth/sellers?error=' + encodeURIComponent('Vendedor no encontrado'));
            }

            return res.redirect('/auth/sellers?success=' + encodeURIComponent('Vendedor eliminado exitosamente'));
        } catch (error) {
            return res.redirect('/auth/sellers?error=' + encodeURIComponent(error.message));
        }
    };

    logout = (req, res) => {
        req.session.destroy(() => {
            res.redirect('/auth/login?success=' + encodeURIComponent('Sesion cerrada'));
        });
    };

    apiLogin = async (req, res) => {
        try {
            const result = await this.validarCredenciales(req.body.email, req.body.password);
            if (!result.ok) {
                return res.status(401).json({ success: false, error: result.error });
            }

            req.session.user = result.user;
            req.session.save((err) => {
                if (err) {
                    return res.status(500).json({ success: false, error: 'No se pudo guardar la sesion' });
                }

                const token = buildApiToken(result.user);

                return res.json({
                    success: true,
                    message: 'Sesion iniciada',
                    user: result.user,
                    sessionId: req.sessionID,
                    token,
                    tokenType: 'Bearer',
                    expiresIn: getApiTokenTtlSeconds()
                });
            });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    };

    apiMe = (req, res) => {
        const currentUser = req.user || (req.session ? req.session.user : null);

        if (!currentUser) {
            return res.status(401).json({ success: false, error: 'No autenticado' });
        }

        return res.json({ success: true, user: currentUser });
    };

    apiLogout = (req, res) => {
        req.session.destroy(() => {
            return res.json({ success: true, message: 'Sesion cerrada' });
        });
    };
}

module.exports = AuthController;
