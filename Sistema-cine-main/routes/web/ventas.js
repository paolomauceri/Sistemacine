const express = require('express');
const router = express.Router();
const VentaController = require('../../controllers/ventaController');
const { requireSellerOrAdmin, requireSalesAccess } = require('../../middleware/auth');

const ventaController = new VentaController();

router.get('/', requireSellerOrAdmin, ventaController.listarWeb);
router.get('/nueva', requireSellerOrAdmin, ventaController.mostrarFormularioNuevo);
router.get('/rapida', requireSalesAccess, ventaController.mostrarFormularioRapido);
router.get('/funciones/:funcionId/asientos', requireSalesAccess, ventaController.obtenerAsientosFuncion);
router.post('/', requireSellerOrAdmin, ventaController.guardarNuevo);
router.post('/rapida', requireSalesAccess, ventaController.guardarVentaRapida);
router.get('/:id/editar', requireSellerOrAdmin, ventaController.mostrarFormularioEditar);
router.put('/:id', requireSellerOrAdmin, ventaController.actualizarWeb);
router.delete('/:id', requireSellerOrAdmin, ventaController.eliminarWeb);

module.exports = router;
