import express from 'express';
import { cropCycleController } from '../controllers/cropCycleController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// CRUD operations
router.post('/', cropCycleController.createCropCycle.bind(cropCycleController));
router.get('/', cropCycleController.getAllCropCycles.bind(cropCycleController));
router.get('/summary', cropCycleController.getCropCyclesSummary.bind(cropCycleController));
router.get('/:id', cropCycleController.getCropCycleById.bind(cropCycleController));
router.post('/:id/monitoring', cropCycleController.addMonitoringVisit.bind(cropCycleController));
router.post('/:id/harvest', cropCycleController.recordHarvest.bind(cropCycleController));
router.delete('/:id', cropCycleController.deleteCropCycle.bind(cropCycleController));

export default router;
