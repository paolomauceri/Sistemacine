const express = require('express');
const router = express.Router();
const ClienteController = require('../../controllers/clienteController');
const { requireApiClientOrAdmin, requireApiAdmin } = require('../../middleware/auth');

const clienteController = new ClienteController();

router.get('/', requireApiClientOrAdmin, clienteController.listarApi);
router.get('/:id', requireApiClientOrAdmin, clienteController.obtenerPorIdApi);
router.post('/', requireApiAdmin, clienteController.crearApi);
router.put('/:id', requireApiAdmin, clienteController.actualizarApi);
router.delete('/:id', requireApiAdmin, clienteController.eliminarApi);

module.exports = router;
