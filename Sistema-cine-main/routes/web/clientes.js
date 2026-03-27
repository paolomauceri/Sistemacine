const express = require('express');
const router = express.Router();
const ClienteController = require('../../controllers/clienteController');
const { requireAdmin } = require('../../middleware/auth');

const clienteController = new ClienteController();

router.get('/', requireAdmin, clienteController.listarWeb);
router.get('/nueva', requireAdmin, clienteController.mostrarFormularioNuevo);
router.post('/', requireAdmin, clienteController.guardarNuevo);
router.get('/:id/editar', requireAdmin, clienteController.mostrarFormularioEditar);
router.put('/:id', requireAdmin, clienteController.actualizarWeb);
router.delete('/:id', requireAdmin, clienteController.eliminarWeb);

module.exports = router;
