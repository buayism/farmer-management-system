import React from 'react';
import { X, Printer } from 'lucide-react';
import { formatUGX } from '../utils/currency';
import { format } from 'date-fns';
import { invoiceService } from '../services/invoiceService';

interface PaymentReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  payment: any;
}

const PaymentReceipt: React.FC<PaymentReceiptProps> = ({ isOpen, onClose, payment }) => {
  if (!isOpen || !payment) return null;

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMMM dd, yyyy');
  };

  const formatDateTime = (date: any) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMMM dd, yyyy \'at\' HH:mm');
  };

  const isAdvancePayment = payment.payment_type === 'advance';
  const totalExpectedPayment = payment.calculation?.totalExpectedPayment || (isAdvancePayment ? payment.amount / 0.3 : payment.amount);
  const remainingAmount = isAdvancePayment ? totalExpectedPayment - payment.amount : 0;

  const handlePrint = async () => {
    try {
      // If invoice doesn't exist yet, generate it first
      if (!payment.invoice || !payment.invoice.invoice_id) {
        console.log('Generating invoice for payment:', payment._id);
        const result = await invoiceService.generateInvoice(payment._id);
        if (result.success && result.data.invoiceId) {
          // Now view the generated invoice
          invoiceService.viewInvoice(result.data.invoiceId);
        } else {
          alert('Failed to generate invoice. Please try again.');
        }
      } else {
        // Invoice exists, just view it
        console.log('Viewing existing invoice:', payment.invoice.invoice_id);
        invoiceService.viewInvoice(payment.invoice.invoice_id);
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      alert('Failed to print receipt. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#6B2C91] via-[#9932CC] to-[#E85D75] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-white">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-2xl border-2 border-white">
                🌾
              </div>
              <div>
                <h2 className="text-xl font-bold">Payment Receipt</h2>
                <p className="text-sm opacity-90">Farm Management System</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-1 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Status Badge */}
          <div className="text-center mb-6">
            <span className="inline-block bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold uppercase">
              ✓ Processed
            </span>
          </div>

          {/* Invoice Info Grid */}
          <div className="grid grid-cols-2 gap-6 mb-8 bg-gray-50 p-6 rounded-lg">
            <div>
              <h3 className="text-xs font-semibold text-gray-600 uppercase mb-2">Invoice Details</h3>
              <p className="text-sm mb-1">
                <strong>Invoice No:</strong>{' '}
                <span className="text-purple-700 font-bold">
                  {payment.invoice?.invoice_id || 'N/A'}
                </span>
              </p>
              <p className="text-sm mb-1">
                <strong>Invoice Date:</strong> {formatDate(payment.invoice?.generated_at || payment.payment_date)}
              </p>
              <p className="text-sm">
                <strong>Payment ID:</strong> {payment._id?.toString().substring(0, 10)}...
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-600 uppercase mb-2">Recipient Information</h3>
              <p className="text-sm mb-1">
                <strong>Farmer:</strong> {payment.farmer?.name || 'Unknown'}
              </p>
              <p className="text-sm mb-1">
                <strong>Farmer ID:</strong> {payment.farmer_id?.toString().substring(0, 10)}...
              </p>
              {payment.farmer?.contact && (
                <p className="text-sm">
                  <strong>Contact:</strong> {payment.farmer.contact}
                </p>
              )}
            </div>
          </div>

          {/* Amount Section */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 rounded-lg p-6 mb-6 text-center">
            <p className="text-xs font-semibold text-green-900 uppercase mb-2">
              {isAdvancePayment ? '30% Advance Payment' : 'Total Amount Paid'}
            </p>
            <p className="text-4xl font-bold text-green-600">{formatUGX(payment.amount || 0)}</p>
          </div>

          {/* Payment Breakdown for Advance Payments */}
          {isAdvancePayment && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 mb-6 rounded">
              <h3 className="text-sm font-bold text-yellow-900 mb-4">📌 Payment Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-yellow-200 pb-2">
                  <span className="text-sm text-yellow-900">Total Expected Payment:</span>
                  <span className="text-sm font-semibold text-yellow-900">{formatUGX(totalExpectedPayment)}</span>
                </div>
                <div className="flex justify-between border-b border-yellow-200 pb-2">
                  <span className="text-sm text-yellow-900">Advance Payment (30%):</span>
                  <span className="text-sm font-semibold text-green-600">{formatUGX(payment.amount)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-sm text-yellow-900">Remaining Balance (70%):</span>
                  <span className="text-sm font-semibold text-yellow-700">{formatUGX(remainingAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Details Grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-500">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Payment Method</p>
              <p className="text-sm font-semibold text-gray-900">
                {payment.payment_method?.replace('_', ' ').toUpperCase() || 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-500">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Payment Date</p>
              <p className="text-sm font-semibold text-gray-900">{formatDate(payment.payment_date)}</p>
            </div>
            {payment.reference && (
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-500">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Reference</p>
                <p className="text-sm font-semibold text-gray-900">{payment.reference}</p>
              </div>
            )}
            {payment.payment_type && (
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-500">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Payment Type</p>
                <p className="text-sm font-semibold text-gray-900">
                  {payment.payment_type.charAt(0).toUpperCase() + payment.payment_type.slice(1)}
                </p>
              </div>
            )}
            <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-500">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Processing Time</p>
              <p className="text-sm font-semibold text-gray-900">{formatDateTime(payment.payment_date)}</p>
            </div>
          </div>

          {/* Signature Section */}
          <div className="border-t-2 border-dashed border-gray-300 pt-8 mt-8">
            <div className="flex justify-around items-end">
              <div className="text-center">
                <div className="w-48 border-t-2 border-gray-400 mb-2"></div>
                <p className="text-xs font-semibold text-gray-600">Manager Signature</p>
              </div>
              <div className="text-center">
                <div className="w-48 border-t-2 border-gray-400 mb-2"></div>
                <p className="text-xs font-semibold text-gray-600">Date</p>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-8 text-center text-xs text-gray-500">
            <p><strong>Farm Management System</strong></p>
            <p className="mt-1">This is an official payment receipt. Please keep this for your records.</p>
            <p className="mt-1">© {new Date().getFullYear()} Farm Management System. All rights reserved.</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:from-purple-700 hover:to-pink-600 rounded-lg transition shadow-md hover:shadow-lg"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentReceipt;
