const express = require('express');
const router = express.Router();
const EntradaController = require('../../controllers/entradaController');
const { requireApiClientOrAdmin, requireApiAdmin } = require('../../middleware/auth');

const entradaController = new EntradaController();

router.get('/', requireApiClientOrAdmin, entradaController.listarApi);
router.get('/:id', requireApiClientOrAdmin, entradaController.obtenerPorIdApi);
router.post('/', requireApiAdmin, entradaController.crearApi);
router.put('/:id', requireApiAdmin, entradaController.actualizarApi);
router.delete('/:id', requireApiAdmin, entradaController.eliminarApi);

module.exports = router;
