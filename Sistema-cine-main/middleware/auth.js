const { verifyApiToken } = require('../utils/apiToken');

function getApiUser(req) {
    if (req.session && req.session.user) {
        return req.session.user;
    }

    const authorization = req.get('authorization') || '';
    const bearerToken = authorization.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length).trim()
        : '';
    const headerToken = req.get('x-api-token') || '';
    const token = bearerToken || headerToken;

    if (!token) {
        return null;
    }

    return verifyApiToken(token);
}

function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }

    return res.redirect('/auth/login?error=' + encodeURIComponent('Debes iniciar sesion'));
}

function requireApiAuth(req, res, next) {
    const apiUser = getApiUser(req);
    if (apiUser) {
        req.user = apiUser;
        return next();
    }

    return res.status(401).json({
        success: false,
        error: 'No autenticado. Usa la cookie de sesion o Authorization: Bearer <token>'
    });
}

function requireApiAdmin(req, res, next) {
    const apiUser = getApiUser(req);
    if (!apiUser) {
        return res.status(401).json({
            success: false,
            error: 'No autenticado. Usa la cookie de sesion o Authorization: Bearer <token>'
        });
    }

    req.user = apiUser;

    if (apiUser.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Solo admin puede realizar esta accion'
        });
    }

    return next();
}

function requireApiClientOrAdmin(req, res, next) {
    const apiUser = getApiUser(req);
    if (!apiUser) {
        return res.status(401).json({
            success: false,
            error: 'No autenticado. Usa la cookie de sesion o Authorization: Bearer <token>'
        });
    }

    req.user = apiUser;

    const role = apiUser.role;
    if (role !== 'client' && role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Rol no permitido'
        });
    }

    return next();
}

function requireApiSellerOrAdmin(req, res, next) {
    const apiUser = getApiUser(req);
    if (!apiUser) {
        return res.status(401).json({
            success: false,
            error: 'No autenticado. Usa la cookie de sesion o Authorization: Bearer <token>'
        });
    }

    req.user = apiUser;

    const role = apiUser.role;
    if (role !== 'seller' && role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Solo admin o vendedor puede realizar esta accion'
        });
    }

    return next();
}

function requireAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    }

    return res.redirect('/?error=' + encodeURIComponent('Solo el administrador puede realizar esta accion'));
}

function requireClientOrAdmin(req, res, next) {
    if (req.session && req.session.user && (req.session.user.role === 'client' || req.session.user.role === 'admin')) {
        return next();
    }

    return res.redirect('/auth/login?error=' + encodeURIComponent('Debes iniciar sesion'));
}

function requireSellerOrAdmin(req, res, next) {
    if (req.session && req.session.user && (req.session.user.role === 'seller' || req.session.user.role === 'admin')) {
        return next();
    }

    return res.redirect('/?error=' + encodeURIComponent('Solo admin o vendedor puede realizar esta accion'));
}

function requireSalesAccess(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.redirect('/auth/login?error=' + encodeURIComponent('Debes iniciar sesion'));
    }

    const role = req.session.user.role;
    if (role === 'admin' || role === 'seller' || role === 'client') {
        return next();
    }

    return res.redirect('/auth/login?error=' + encodeURIComponent('No tienes permisos para acceder a ventas'));
}

module.exports = {
    requireAuth,
    requireAdmin,
    requireClientOrAdmin,
    requireSellerOrAdmin,
    requireSalesAccess,
    requireApiAuth,
    requireApiAdmin,
    requireApiClientOrAdmin,
    requireApiSellerOrAdmin
};
