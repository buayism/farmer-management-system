import express from 'express';
import { invoiceController } from '../controllers/invoiceController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Generate invoice for a payment
router.post('/generate/:paymentId', invoiceController.generateInvoice.bind(invoiceController));

// View/Download invoice PDF
router.get('/view/:invoiceId', invoiceController.viewInvoice.bind(invoiceController));

// Get all invoices for logged-in manager
router.get('/manager', invoiceController.getManagerInvoices.bind(invoiceController));

// Get all paid payments (for manager's payments list)
router.get('/paid-payments', invoiceController.getPaidPayments.bind(invoiceController));

export default router;
