const express = require('express');
const router = express.Router();
const FuncionController = require('../../controllers/funcionController');
const { requireAdmin } = require('../../middleware/auth');

const funcionController = new FuncionController();

router.get('/', funcionController.listarWeb);
router.get('/nueva', requireAdmin, funcionController.mostrarFormularioNuevo);
router.post('/', requireAdmin, funcionController.guardarNuevo);
router.get('/:id/editar', requireAdmin, funcionController.mostrarFormularioEditar);
router.put('/:id', requireAdmin, funcionController.actualizarWeb);
router.delete('/:id', requireAdmin, funcionController.eliminarWeb);

module.exports = router;
