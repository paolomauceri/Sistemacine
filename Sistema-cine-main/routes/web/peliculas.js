const express = require('express');
const router = express.Router();
const PeliculaController = require('../../controllers/peliculaController');
const { requireAdmin } = require('../../middleware/auth');

const peliculaController = new PeliculaController();

router.get('/', peliculaController.listarWeb);
router.get('/nueva', requireAdmin, peliculaController.mostrarFormularioNuevo);
router.post('/', requireAdmin, peliculaController.guardarNuevo);
router.get('/:id/editar', requireAdmin, peliculaController.mostrarFormularioEditar);
router.put('/:id', requireAdmin, peliculaController.actualizarWeb);
router.delete('/:id', requireAdmin, peliculaController.eliminarWeb);

module.exports = router;
