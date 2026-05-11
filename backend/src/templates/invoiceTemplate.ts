import { format } from 'date-fns';

export interface InvoiceData {
  invoiceId: string;
  paymentId: string;
  invoiceDate: Date;
  farmerName: string;
  farmerId: string;
  farmerContact?: string;
  amount: number;
  paymentMethod: string;
  paymentDate: Date;
  reference?: string;
  paymentType?: string;
  processedBy?: string;
  calculation?: any;
}

export function generateInvoiceHTML(data: InvoiceData): string {
  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatDate = (date: Date) => {
    return format(new Date(date), 'MMMM dd, yyyy');
  };

  const formatDateTime = (date: Date) => {
    return format(new Date(date), 'MMMM dd, yyyy \'at\' HH:mm');
  };

  const isAdvancePayment = data.paymentType === 'advance';
  const totalExpectedPayment = data.calculation?.totalExpectedPayment || (isAdvancePayment ? data.amount / 0.3 : data.amount);
  const remainingAmount = isAdvancePayment ? totalExpectedPayment - data.amount : 0;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt - ${data.invoiceId}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #333;
      background: #fff;
      padding: 20px;
    }
    
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #6B2C91 0%, #9932CC 50%, #E85D75 100%);
      color: white;
      padding: 15px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 22px;
      margin-bottom: 3px;
      font-weight: 700;
    }
    
    .header .subtitle {
      font-size: 13px;
      opacity: 0.95;
      margin-bottom: 8px;
    }
    
    .logo {
      width: 45px;
      height: 45px;
      background: rgba(255,255,255,0.2);
      border: 2px solid white;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      margin-bottom: 5px;
    }
    
    .invoice-info {
      background: #f8f9fa;
      padding: 18px 25px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      border-bottom: 2px solid #e0e0e0;
    }
    
    .info-group h3 {
      font-size: 10px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 5px;
      font-weight: 600;
    }
    
    .info-group p {
      font-size: 11px;
      color: #333;
      margin-bottom: 3px;
    }
    
    .info-group .highlight {
      font-weight: 700;
      color: #9932CC;
      font-size: 12px;
    }
    
    .payment-details {
      padding: 20px 25px;
    }
    
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #6B2C91;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 2px solid #9932CC;
    }
    
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 8px;
    }
    
    .detail-item {
      background: #f8f9fa;
      padding: 8px;
      border-radius: 4px;
      border-left: 3px solid #9932CC;
    }
    
    .detail-label {
      font-size: 9px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 3px;
      font-weight: 600;
    }
    
    .detail-value {
      font-size: 11px;
      color: #333;
      font-weight: 600;
    }
    
    .amount-section {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border: 2px solid #10b981;
      border-radius: 6px;
      padding: 16px;
      margin: 15px 0;
      text-align: center;
    }
    
    .amount-label {
      font-size: 11px;
      color: #065f46;
      text-transform: uppercase;
      margin-bottom: 6px;
      font-weight: 600;
    }
    
    .amount-value {
      font-size: 26px;
      color: #10b981;
      font-weight: 700;
    }
    
    .breakdown-box {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
    
    .breakdown-title {
      font-size: 12px;
      font-weight: 700;
      color: #92400e;
      margin-bottom: 10px;
    }
    
    .breakdown-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #fde68a;
    }
    
    .breakdown-row:last-child {
      border-bottom: none;
      font-weight: 700;
    }
    
    .breakdown-label {
      font-size: 11px;
      color: #78350f;
    }
    
    .breakdown-value {
      font-size: 11px;
      color: #78350f;
      font-weight: 600;
    }
    
    .footer {
      background: #f3f4f6;
      padding: 15px 20px;
      text-align: center;
      border-top: 2px solid #e0e0e0;
    }
    
    .footer p {
      font-size: 9px;
      color: #6b7280;
      margin-bottom: 4px;
      line-height: 1.4;
    }
    
    .status-badge {
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      margin-top: 5px;
    }
    
    .signature-section {
      margin-top: 25px;
      padding-top: 15px;
      border-top: 1px dashed #ccc;
      display: flex;
      justify-content: space-around;
    }
    
    .signature-box {
      text-align: center;
    }
    
    .signature-line {
      width: 130px;
      border-top: 1.5px solid #666;
      margin: 15px 0 8px 0;
    }
    
    .signature-label {
      font-size: 10px;
      color: #666;
      font-weight: 600;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      .invoice-container {
        border: none;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="logo">🌾</div>
      <h1>Farm Management System</h1>
      <div class="subtitle">Payment Receipt</div>
      <span class="status-badge">✓ Processed</span>
    </div>
    
    <!-- Invoice Info -->
    <div class="invoice-info">
      <div class="info-group">
        <h3>Invoice Details</h3>
        <p><strong>Invoice No:</strong> <span class="highlight">${data.invoiceId}</span></p>
        <p><strong>Invoice Date:</strong> ${formatDate(data.invoiceDate)}</p>
        <p><strong>Payment ID:</strong> ${data.paymentId}</p>
      </div>
      <div class="info-group">
        <h3>Recipient Information</h3>
        <p><strong>Farmer:</strong> ${data.farmerName}</p>
        <p><strong>Farmer ID:</strong> ${data.farmerId}</p>
        ${data.farmerContact ? `<p><strong>Contact:</strong> ${data.farmerContact}</p>` : ''}
      </div>
    </div>
    
    <!-- Payment Details -->
    <div class="payment-details">
      <h2 class="section-title">Payment Information</h2>
      
      <div class="amount-section">
        <div class="amount-label">${isAdvancePayment ? '30% Advance Payment' : 'Total Amount Paid'}</div>
        <div class="amount-value">${formatCurrency(data.amount)}</div>
      </div>
      
      ${isAdvancePayment ? `
      <div class="breakdown-box">
        <div class="breakdown-title">📌 Payment Breakdown</div>
        <div class="breakdown-row">
          <span class="breakdown-label">Total Expected Payment:</span>
          <span class="breakdown-value">${formatCurrency(totalExpectedPayment)}</span>
        </div>
        <div class="breakdown-row">
          <span class="breakdown-label">Advance Payment (30%):</span>
          <span class="breakdown-value" style="color: #10b981;">${formatCurrency(data.amount)}</span>
        </div>
        <div class="breakdown-row">
          <span class="breakdown-label">Remaining Balance (70%):</span>
          <span class="breakdown-value" style="color: #f59e0b;">${formatCurrency(remainingAmount)}</span>
        </div>
      </div>
      ` : ''}
      
      
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Manager</div>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-label">Date</div>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p><strong>Farm Management System</strong> | Printed: ${formatDateTime(new Date())} by Management</p>
      <p>© ${new Date().getFullYear()} Farm Management System. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
}
