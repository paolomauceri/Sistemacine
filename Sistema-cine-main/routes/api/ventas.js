const express = require('express');
const router = express.Router();
const VentaController = require('../../controllers/ventaController');
const { requireApiClientOrAdmin, requireApiAdmin } = require('../../middleware/auth');

const ventaController = new VentaController();

router.get('/', requireApiClientOrAdmin, ventaController.listarApi);
router.get('/:id', requireApiClientOrAdmin, ventaController.obtenerPorIdApi);
router.post('/', requireApiAdmin, ventaController.crearApi);
router.put('/:id', requireApiAdmin, ventaController.actualizarApi);
router.delete('/:id', requireApiAdmin, ventaController.eliminarApi);

module.exports = router;
