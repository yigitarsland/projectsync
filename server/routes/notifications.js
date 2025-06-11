const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middlewares/authenticate'); 

router.use(authMiddleware); // applies to all routes below, this alone is enough

router.get(
  '/projects/:projectId/notifications',
  notificationController.getNotifications
);

module.exports = router;
