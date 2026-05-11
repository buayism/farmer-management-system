import api from './api';

export const invoiceService = {
  // Generate invoice for a payment
  generateInvoice: async (paymentId: string) => {
    try {
      const response = await api.post(`/invoices/generate/${paymentId}`);
      return response.data;
    } catch (error) {
      console.error('Error generating invoice:', error);
      throw error;
    }
  },

  // View invoice PDF in new tab
  viewInvoice: (invoiceId: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const url = `${apiUrl}/api/invoices/view/${invoiceId}?token=${token}`;
      console.log('Opening invoice PDF at:', url);
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        alert('Please allow popups to view the receipt PDF');
      }
    } catch (error) {
      console.error('Error viewing invoice:', error);
      throw error;
    }
  },

  // Get all invoices for manager
  getManagerInvoices: async () => {
    const response = await api.get('/invoices/manager');
    return response.data;
  },

  // Get all paid payments
  getPaidPayments: async () => {
    const response = await api.get('/invoices/paid-payments');
    return response.data;
  }
};
