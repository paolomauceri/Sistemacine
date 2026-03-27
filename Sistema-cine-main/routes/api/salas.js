// routes/api/salas.js
const express = require('express');
const router = express.Router();
const SalaController = require('../../controllers/salaController');
const { requireApiClientOrAdmin, requireApiAdmin } = require('../../middleware/auth');

const salaController = new SalaController();

router.get('/', requireApiClientOrAdmin, salaController.listarApi);
router.get('/:id', requireApiClientOrAdmin, salaController.obtenerPorIdApi);
router.post('/', requireApiAdmin, salaController.crearApi);
router.put('/:id', requireApiAdmin, salaController.actualizarApi);
router.delete('/:id', requireApiAdmin, salaController.eliminarApi);

module.exports = router;
