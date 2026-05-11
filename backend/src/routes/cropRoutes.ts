import express from 'express';
import { cropController } from '../controllers/cropController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Initialize default crops (one-time setup)
router.post('/initialize', cropController.initializeDefaultCrops.bind(cropController));

// CRUD operations
router.post('/', cropController.createCrop.bind(cropController));
router.get('/', cropController.getAllCrops.bind(cropController));
router.get('/:id', cropController.getCropById.bind(cropController));
router.put('/:id', cropController.updateCrop.bind(cropController));
router.delete('/:id', cropController.deleteCrop.bind(cropController));

export default router;
