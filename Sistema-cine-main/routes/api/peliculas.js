const express = require('express');
const router = express.Router();
const PeliculaController = require('../../controllers/peliculaController');
const { requireApiAuth, requireApiAdmin } = require('../../middleware/auth');

const peliculaController = new PeliculaController();

router.get('/', requireApiAuth, peliculaController.listarApi);
router.get('/:id', requireApiAuth, peliculaController.obtenerPorIdApi);
router.post('/', requireApiAdmin, peliculaController.crearApi);
router.put('/:id', requireApiAdmin, peliculaController.actualizarApi);
router.delete('/:id', requireApiAdmin, peliculaController.eliminarApi);

module.exports = router;
