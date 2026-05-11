import React, { useState, useEffect } from 'react';
import { Search, FileText, Calendar, DollarSign, User, ChevronLeft } from 'lucide-react';
import { invoiceService } from '../services/invoiceService';
import { formatUGX } from '../utils/currency';
import { format } from 'date-fns';
import PaymentReceipt from './PaymentReceipt';
import { useToast } from './Toast';

interface ManagerPaymentsListProps {
  onBack: () => void;
}

const ManagerPaymentsList: React.FC<ManagerPaymentsListProps> = ({ onBack }) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    loadPayments();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [searchTerm, payments]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await invoiceService.getPaidPayments();
      if (response.success) {
        setPayments(response.data || []);
      }
    } catch (error: any) {
      showToast('Failed to load payments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    if (!searchTerm.trim()) {
      setFilteredPayments(payments);
      return;
    }

    const search = searchTerm.toLowerCase();
    const filtered = payments.filter((payment) => {
      const farmerName = payment.farmer?.name?.toLowerCase() || '';
      const farmerId = payment.farmer_id?.toString().toLowerCase() || '';
      const paymentId = payment._id?.toString().toLowerCase() || '';
      const amount = payment.amount?.toString() || '';
      const method = payment.payment_method?.toLowerCase() || '';

      return (
        farmerName.includes(search) ||
        farmerId.includes(search) ||
        paymentId.includes(search) ||
        amount.includes(search) ||
        method.includes(search)
      );
    });

    setFilteredPayments(filtered);
  };

  const handleViewReceipt = (payment: any) => {
    setSelectedPayment(payment);
    setReceiptModalOpen(true);
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM dd, yyyy');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#6B2C91] via-[#9932CC] to-[#E85D75] px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-white hover:bg-white/20 rounded-lg px-3 py-2 transition mb-4"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-white">
              <FileText className="w-10 h-10" />
              <div>
                <h1 className="text-3xl font-bold">Processed Payments</h1>
                <p className="text-sm opacity-90 mt-1">View all completed payment transactions</p>
              </div>
            </div>
            <div className="text-white text-right">
              <p className="text-sm opacity-90">Total Payments</p>
              <p className="text-3xl font-bold">{payments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by farmer name, payment ID, amount, or method..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading payments...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">
                {searchTerm ? 'No payments found matching your search' : 'No processed payments yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-[#7C3AED] to-[#9333EA]">
                    <th className="py-4 px-6 text-left text-white text-sm font-semibold uppercase tracking-wider">
                      Date
                    </th>
                    <th className="py-4 px-6 text-left text-white text-sm font-semibold uppercase tracking-wider">
                      Farmer
                    </th>
                    <th className="py-4 px-6 text-left text-white text-sm font-semibold uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="py-4 px-6 text-left text-white text-sm font-semibold uppercase tracking-wider">
                      Method
                    </th>
                    <th className="py-4 px-6 text-left text-white text-sm font-semibold uppercase tracking-wider">
                      Type
                    </th>
                    <th className="py-4 px-6 text-left text-white text-sm font-semibold uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="py-4 px-6 text-left text-white text-sm font-semibold uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment, index) => (
                    <tr
                      key={payment._id || index}
                      className="border-b border-gray-100 hover:bg-purple-50 transition-colors cursor-pointer"
                      onClick={() => handleViewReceipt(payment)}
                    >
                      <td className="py-4 px-6 text-sm text-gray-700">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{formatDate(payment.payment_date)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {payment.farmer?.name || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-500">
                              ID: {payment.farmer_id?.toString().substring(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-bold text-gray-900">
                            {formatUGX(payment.amount || 0)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          {payment.payment_method?.replace('_', ' ').toUpperCase() || 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                          {payment.payment_type?.toUpperCase() || 'STANDARD'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700">
                        {payment.reference || '—'}
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewReceipt(payment);
                          }}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg hover:from-purple-700 hover:to-pink-600 transition text-xs font-medium"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {!loading && filteredPayments.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
              <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Total Paid</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatUGX(filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0))}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
              <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{filteredPayments.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
              <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Unique Farmers</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(filteredPayments.map((p) => p.farmer_id?.toString())).size}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Payment Receipt Modal */}
      <PaymentReceipt
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        payment={selectedPayment}
      />

      {/* Toast Notifications */}
      {ToastComponent}
    </div>
  );
};

export default ManagerPaymentsList;
