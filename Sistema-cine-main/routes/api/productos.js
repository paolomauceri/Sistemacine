const express = require('express');
const router = express.Router();
const ProductoController = require('../../controllers/productoController');
const { requireApiClientOrAdmin, requireApiAdmin } = require('../../middleware/auth');

const productoController = new ProductoController();

router.get('/', requireApiClientOrAdmin, productoController.listarApi);
router.get('/:id', requireApiClientOrAdmin, productoController.obtenerPorIdApi);
router.post('/', requireApiAdmin, productoController.crearApi);
router.put('/:id', requireApiAdmin, productoController.actualizarApi);
router.delete('/:id', requireApiAdmin, productoController.eliminarApi);

module.exports = router;
