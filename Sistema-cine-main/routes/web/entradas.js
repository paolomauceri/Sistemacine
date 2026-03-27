const express = require('express');
const router = express.Router();
const EntradaController = require('../../controllers/entradaController');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

const entradaController = new EntradaController();

router.get('/', requireAdmin, entradaController.listarWeb);
router.get('/nueva', requireAdmin, entradaController.mostrarFormularioNuevo);
router.post('/', requireAdmin, entradaController.guardarNuevo);
router.get('/:id/editar', requireAdmin, entradaController.mostrarFormularioEditar);
router.put('/:id', requireAdmin, entradaController.actualizarWeb);
router.delete('/:id', requireAdmin, entradaController.eliminarWeb);

module.exports = router;
