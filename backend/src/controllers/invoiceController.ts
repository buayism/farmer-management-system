import { Request, Response } from 'express';
import { getDb } from '../config/db';
import { ObjectId } from 'mongodb';
import puppeteer from 'puppeteer';
import { generateInvoiceHTML, InvoiceData } from '../templates/invoiceTemplate';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';

export class InvoiceController {
  /**
   * Generate invoice PDF for a payment
   */
  async generateInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params;
      const db = getDb();

      // Fetch payment details
      const payment = await db.collection('payments').findOne({ _id: new ObjectId(paymentId) });
      if (!payment) {
        res.status(404).json({ success: false, message: 'Payment not found' });
        return;
      }

      // Fetch farmer details
      const farmer = await db.collection('farmers').findOne({ _id: payment.farmer_id });
      if (!farmer) {
        res.status(404).json({ success: false, message: 'Farmer not found' });
        return;
      }

      // Fetch user details (who processed the payment)
      let processedBy = 'System';
      if (req.user && req.user.name) {
        processedBy = req.user.name;
      }

      // Generate invoice ID
      const invoiceId = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;

      // Prepare invoice data
      const invoiceData: InvoiceData = {
        invoiceId,
        paymentId: payment._id.toString(),
        invoiceDate: new Date(),
        farmerName: farmer.name || 'Unknown Farmer',
        farmerId: farmer._id.toString(),
        farmerContact: farmer.contact || farmer.phone || farmer.email,
        amount: payment.amount || 0,
        paymentMethod: payment.payment_method || 'N/A',
        paymentDate: payment.payment_date ? new Date(payment.payment_date) : new Date(),
        reference: payment.reference,
        paymentType: payment.payment_type,
        processedBy,
        calculation: payment.calculation
      };

      // Generate HTML
      const html = generateInvoiceHTML(invoiceData);

      // Ensure invoices directory exists
      const invoicesDir = path.join(process.cwd(), 'storage', 'invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      // Generate PDF using Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfFileName = `invoice_${invoiceId}_${Date.now()}.pdf`;
      const pdfPath = path.join(invoicesDir, pdfFileName);

      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0px',
          right: '0px',
          bottom: '0px',
          left: '0px'
        }
      });

      await browser.close();

      logger.info(`Invoice generated successfully: ${pdfFileName}`);

      // Store invoice record in database
      await db.collection('invoices').insertOne({
        invoice_id: invoiceId,
        payment_id: new ObjectId(paymentId),
        farmer_id: payment.farmer_id,
        file_path: pdfPath,
        file_name: pdfFileName,
        generated_by: req.user?.id ? new ObjectId(req.user.id as string) : null,
        generated_at: new Date(),
        amount: payment.amount
      });

      res.json({
        success: true,
        message: 'Invoice generated successfully',
        data: {
          invoiceId,
          fileName: pdfFileName,
          filePath: pdfPath
        }
      });
    } catch (error: any) {
      logger.error('Error generating invoice:', error);
      res.status(500).json({ success: false, message: 'Failed to generate invoice', error: error.message });
    }
  }

  /**
   * View/Download invoice PDF
   */
  async viewInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { invoiceId } = req.params;
      const db = getDb();

      // Fetch invoice record
      const invoice = await db.collection('invoices').findOne({ invoice_id: invoiceId });
      if (!invoice) {
        res.status(404).json({ success: false, message: 'Invoice not found' });
        return;
      }

      // Check if file exists
      if (!fs.existsSync(invoice.file_path)) {
        res.status(404).json({ success: false, message: 'Invoice file not found' });
        return;
      }

      // Set headers for PDF viewing
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${invoice.file_name}"`);

      // Stream the file
      const fileStream = fs.createReadStream(invoice.file_path);
      fileStream.pipe(res);
    } catch (error: any) {
      logger.error('Error viewing invoice:', error);
      res.status(500).json({ success: false, message: 'Failed to view invoice', error: error.message });
    }
  }

  /**
   * Get all invoices for a manager
   */
  async getManagerInvoices(req: Request, res: Response): Promise<void> {
    try {
      const db = getDb();
      const managerId = req.user?.id;

      // Get all invoices generated by this manager
      const invoices = await db.collection('invoices')
        .find({ generated_by: new ObjectId(managerId as string) })
        .sort({ generated_at: -1 })
        .toArray();

      // Populate payment and farmer details
      const enrichedInvoices = await Promise.all(
        invoices.map(async (invoice) => {
          const payment = await db.collection('payments').findOne({ _id: invoice.payment_id });
          const farmer = await db.collection('farmers').findOne({ _id: invoice.farmer_id });

          return {
            ...invoice,
            payment,
            farmer
          };
        })
      );

      res.json({
        success: true,
        data: enrichedInvoices
      });
    } catch (error: any) {
      logger.error('Error fetching manager invoices:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch invoices', error: error.message });
    }
  }

  /**
   * Get all paid payments (for manager's payments list)
   */
  async getPaidPayments(req: Request, res: Response): Promise<void> {
    try {
      const db = getDb();

      // Get all paid payments
      const payments = await db.collection('payments')
        .find({ status: 'paid' })
        .sort({ payment_date: -1 })
        .toArray();

      // Populate farmer details
      const enrichedPayments = await Promise.all(
        payments.map(async (payment) => {
          const farmer = await db.collection('farmers').findOne({ _id: payment.farmer_id });
          const invoice = await db.collection('invoices').findOne({ payment_id: payment._id });

          return {
            ...payment,
            farmer,
            invoice
          };
        })
      );

      res.json({
        success: true,
        data: enrichedPayments
      });
    } catch (error: any) {
      logger.error('Error fetching paid payments:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch payments', error: error.message });
    }
  }
}

export const invoiceController = new InvoiceController();
