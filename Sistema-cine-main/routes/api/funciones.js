const express = require('express');
const router = express.Router();
const FuncionController = require('../../controllers/funcionController');
const { requireApiClientOrAdmin, requireApiAdmin } = require('../../middleware/auth');

const funcionController = new FuncionController();

router.get('/', requireApiClientOrAdmin, funcionController.listarApi);
router.get('/:id', requireApiClientOrAdmin, funcionController.obtenerPorIdApi);
router.post('/', requireApiAdmin, funcionController.crearApi);
router.put('/:id', requireApiAdmin, funcionController.actualizarApi);
router.delete('/:id', requireApiAdmin, funcionController.eliminarApi);

module.exports = router;
