import express from 'express';
import AppController from '../controllers/AppControllers';

const router = express.Router();

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

export default router;
