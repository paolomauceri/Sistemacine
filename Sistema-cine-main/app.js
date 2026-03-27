// app.js
const express = require('express');
const morgan = require('morgan');
const ejsLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');
const session = require('express-session');
const path = require('path');
const { testConnection, initializeAuthData } = require('./config/db');
require('dotenv').config();

// Importar rutas API
const authApiRouter = require('./routes/api/auth');
const peliculasApiRouter = require('./routes/api/peliculas');
const salasApiRouter = require('./routes/api/salas');
const productosApiRouter = require('./routes/api/productos');
const clientesApiRouter = require('./routes/api/clientes');
const funcionesApiRouter = require('./routes/api/funciones');
const entradasApiRouter = require('./routes/api/entradas');
const ventasApiRouter = require('./routes/api/ventas');

// Importar rutas Web
const authWebRouter = require('./routes/web/auth');
const peliculasWebRouter = require('./routes/web/peliculas');
const salasWebRouter = require('./routes/web/salas');
const productosWebRouter = require('./routes/web/productos');
const clientesWebRouter = require('./routes/web/clientes');
const funcionesWebRouter = require('./routes/web/funciones');
const entradasWebRouter = require('./routes/web/entradas');
const ventasWebRouter = require('./routes/web/ventas');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar method-override para usar PUT y DELETE
app.use(methodOverride('_method'));

// Probar conexión a MySQL
testConnection();
initializeAuthData();

// Middlewares
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'cine-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8 }
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(ejsLayouts);

// Variables globales para las vistas
app.use((req, res, next) => {
    res.locals.success_msg = req.query.success;
    res.locals.error_msg = req.query.error;
    res.locals.currentUser = req.session.user || null;
    res.locals.active = '';
    next();
});

// Restringe a vendedores a los modulos permitidos
app.use((req, res, next) => {
    const currentUser = req.session && req.session.user;
    if (!currentUser || currentUser.role !== 'seller') {
        return next();
    }

    const path = req.path || '/';
    const allowed = path === '/' || path.startsWith('/peliculas') || path.startsWith('/ventas') || path.startsWith('/auth/logout') || path.startsWith('/health') || path.startsWith('/api/auth') || path.startsWith('/api/peliculas');

    if (allowed) {
        return next();
    }

    return res.redirect('/ventas?error=' + encodeURIComponent('El rol vendedor solo tiene acceso a ventas y peliculas'));
});

// Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/layout');

// ============================================
// RUTAS API (JSON)
// ============================================
app.use('/api/auth', authApiRouter);
app.use('/api/peliculas', peliculasApiRouter);
app.use('/api/salas', salasApiRouter);
app.use('/api/productos', productosApiRouter);
app.use('/api/clientes', clientesApiRouter);
app.use('/api/funciones', funcionesApiRouter);
app.use('/api/entradas', entradasApiRouter);
app.use('/api/ventas', ventasApiRouter);

// ============================================
// RUTAS WEB (Vistas)
// ============================================
app.use('/auth', authWebRouter);
app.use('/peliculas', peliculasWebRouter);
app.use('/salas', salasWebRouter);
app.use('/productos', productosWebRouter);
app.use('/clientes', clientesWebRouter);
app.use('/funciones', funcionesWebRouter);
app.use('/entradas', entradasWebRouter);
app.use('/ventas', ventasWebRouter);

// Diagnóstico rápido de servidor y DB para entorno local
app.get('/health', async (req, res) => {
    try {
        const { pool } = require('./config/db');
        await pool.query('SELECT 1');

        res.json({
            success: true,
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'error',
            message: 'No se pudo conectar con la base de datos',
            timestamp: new Date().toISOString()
        });
    }
});

// Página de inicio
app.get('/', async (req, res) => {
    try {
        const { pool } = require('./config/db');
        const [peliculas] = await pool.query('SELECT COUNT(*) as total FROM peliculas');
        const [salas] = await pool.query('SELECT COUNT(*) as total FROM salas');
        const [productos] = await pool.query('SELECT COUNT(*) as total FROM productos');
        const [funciones] = await pool.query('SELECT COUNT(*) as total FROM funciones');
        const [entradas] = await pool.query('SELECT COUNT(*) as total FROM entradas');
        const [ventas] = await pool.query('SELECT COUNT(*) as total FROM ventas');
        
        res.render('index', { 
            title: 'Inicio',
            active: 'inicio',
            totalPeliculas: peliculas[0].total,
            totalSalas: salas[0].total,
            totalProductos: productos[0].total,
            totalFunciones: funciones[0].total,
            totalEntradas: entradas[0].total,
            totalVentas: ventas[0].total
        });
    } catch (error) {
        res.render('index', { 
            title: 'Inicio',
            active: 'inicio',
            totalPeliculas: 0,
            totalSalas: 0,
            totalProductos: 0,
            totalFunciones: 0,
            totalEntradas: 0,
            totalVentas: 0
        });
    }
});

// Ruta 404
app.use((req, res) => {
    res.status(404).render('404', { 
        title: 'Página no encontrada'
    });
});

// Manejador de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { 
        title: 'Error',
        message: err.message
    });
});

app.listen(PORT, () => {
    console.log('╔════════════════════════════════════╗');
    console.log('║   🎬 SISTEMA DE CINE               ║');
    console.log('║   VERSIÓN CON INTERFAZ AMIGABLE    ║');
    console.log('╚════════════════════════════════════╝');
    console.log(`🌐 Servidor: http://localhost:${PORT}`);
    console.log('📌 Métodos HTTP: GET, POST, PUT, DELETE');
    console.log('🎨 Interfaz: EJS + CSS Moderno');
    console.log('📊 Entidades: Películas, Salas, Productos, Funciones, Entradas, Ventas y Clientes');
});
