const express = require('express');
const router = express.Router();
const AuthController = require('../../controllers/authController');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

const authController = new AuthController();

router.get('/login', authController.mostrarLogin);
router.post('/login', authController.login);
router.get('/register', authController.mostrarRegistro);
router.post('/register', authController.registroCliente);
router.get('/register-seller', requireAdmin, authController.mostrarRegistroVendedor);
router.post('/register-seller', requireAdmin, authController.registroVendedor);
router.get('/sellers', requireAdmin, authController.listarVendedores);
router.get('/sellers/:id/edit', requireAdmin, authController.mostrarFormularioEditarVendedor);
router.put('/sellers/:id', requireAdmin, authController.actualizarVendedor);
router.delete('/sellers/:id', requireAdmin, authController.eliminarVendedor);
router.post('/logout', requireAuth, authController.logout);

module.exports = router;
