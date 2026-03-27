const express = require('express');
const router = express.Router();
const AuthController = require('../../controllers/authController');
const { requireApiAuth } = require('../../middleware/auth');

const authController = new AuthController();

router.post('/login', authController.apiLogin);
router.get('/me', requireApiAuth, authController.apiMe);
router.post('/logout', requireApiAuth, authController.apiLogout);

module.exports = router;
