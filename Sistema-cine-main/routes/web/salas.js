// routes/web/salas.js
const express = require('express');
const router = express.Router();
const SalaController = require('../../controllers/salaController');
const { requireAdmin } = require('../../middleware/auth');

const salaController = new SalaController();

router.get('/', salaController.listarWeb);
router.get('/nueva', requireAdmin, salaController.mostrarFormularioNuevo);
router.post('/', requireAdmin, salaController.guardarNuevo);
router.get('/:id/editar', requireAdmin, salaController.mostrarFormularioEditar);
router.put('/:id', requireAdmin, salaController.actualizarWeb);
router.delete('/:id', requireAdmin, salaController.eliminarWeb);

module.exports = router;
