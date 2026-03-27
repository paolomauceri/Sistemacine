const express = require('express');
const router = express.Router();
const ProductoController = require('../../controllers/productoController');
const { requireAdmin, requireClientOrAdmin } = require('../../middleware/auth');

const productoController = new ProductoController();

router.get('/', productoController.listarWeb);
router.get('/nueva', requireAdmin, productoController.mostrarFormularioNuevo);
router.post('/', requireAdmin, productoController.guardarNuevo);
router.post('/:id/comprar', requireClientOrAdmin, productoController.comprarWeb);
router.get('/:id/editar', requireAdmin, productoController.mostrarFormularioEditar);
router.put('/:id', requireAdmin, productoController.actualizarWeb);
router.delete('/:id', requireAdmin, productoController.eliminarWeb);

module.exports = router;
