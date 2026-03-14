import { formatCurrency, formatBookingPeriod } from '@/utils/currency';

export interface InvoiceData {
  serialNumber: string;
  bookingDate: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  studentSerialNumber: string;
  cabinName: string;
  seatNumber: number;
  startDate: string;
  endDate: string;
  duration: string;
  durationCount?: number;
  bookingDuration?: string;
  seatAmount: number;
  discountAmount: number;
  discountReason: string;
  lockerIncluded: boolean;
  lockerPrice: number;
  foodOpted?: boolean;
  foodAmount?: number;
  foodPolicyType?: 'not_available' | 'mandatory' | 'optional';
  totalAmount: number;
  paymentMethod: string;
  transactionId: string;
  collectedByName: string;
  floor?: number | string;
  roomNumber?: number | string;
  seatLabel?: string;
}

const paymentMethodLabel = (method: string) => {
  switch (method) {
    case 'cash': return 'Cash';
    case 'upi': return 'PhonePe / UPI';
    case 'bank_transfer': return 'Bank Transfer';
    case 'online': return 'Online';
    default: return method;
  }
};

export const generateInvoiceHTML = (data: InvoiceData): string => {
  const period = formatBookingPeriod(data.startDate, data.endDate);
  
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice - ${data.serialNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a1a; background: #fff; }
  .invoice { max-width: 800px; margin: 0 auto; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid #1a1a1a; padding-bottom: 20px; }
  .company { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
  .company-sub { font-size: 11px; color: #666; margin-top: 4px; }
  .invoice-meta { text-align: right; }
  .invoice-meta h2 { font-size: 20px; font-weight: 700; color: #1a1a1a; }
  .invoice-meta p { font-size: 12px; color: #666; margin-top: 2px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #999; margin-bottom: 8px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .info-box { background: #f8f8f8; border-radius: 8px; padding: 16px; }
  .info-label { font-size: 10px; text-transform: uppercase; color: #999; letter-spacing: 0.5px; }
  .info-value { font-size: 14px; font-weight: 600; margin-top: 2px; }
  .info-value-sm { font-size: 12px; color: #444; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #999; padding: 8px 12px; border-bottom: 2px solid #eee; }
  td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
  td:last-child, th:last-child { text-align: right; }
  .total-row td { font-weight: 700; font-size: 16px; border-top: 2px solid #1a1a1a; border-bottom: none; padding-top: 12px; }
  .discount-row td { color: #16a34a; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 11px; color: #999; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .invoice { padding: 20px; }
  }
</style>
</head>
<body>
<div class="invoice">
  <div class="header">
    <div>
      <div class="company">InhaleStays</div>
      <div class="company-sub">Study Space Booking Invoice</div>
    </div>
    <div class="invoice-meta">
      <h2>INVOICE</h2>
      <p>${data.serialNumber}</p>
      <p>Date: ${new Date(data.bookingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
    </div>
  </div>

  <div class="info-grid section">
    <div class="info-box">
      <div class="section-title">Student Details</div>
      <div class="info-value">${data.studentName}</div>
      <div class="info-value-sm">${data.studentEmail}</div>
      <div class="info-value-sm">${data.studentPhone}</div>
      ${data.studentSerialNumber ? `<div class="info-value-sm">${data.studentSerialNumber}</div>` : ''}
    </div>
    <div class="info-box">
      <div class="section-title">Booking Details</div>
      <div class="info-value">${data.cabinName}${data.floor ? ` — Floor ${data.floor}` : ''} — ${data.roomNumber ? `Room ${data.roomNumber} · ` : ''}${data.seatLabel || `Seat #${data.seatNumber}`}</div>
      <div class="info-value-sm">${period}</div>
      <div class="info-value-sm">${data.duration}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Price Breakdown</div>
    <table>
      <thead><tr><th>Description</th><th>Amount</th></tr></thead>
      <tbody>
        ${(() => {
          const durationSuffix = data.durationCount && data.bookingDuration
            ? ` (${data.durationCount} ${data.bookingDuration === 'daily' ? 'day' : data.bookingDuration === 'weekly' ? 'week' : 'month'}${data.durationCount > 1 ? 's' : ''})`
            : '';
          if (data.foodPolicyType === 'mandatory') {
            return `<tr><td>Room Rent (Including Food)${durationSuffix}</td><td>${formatCurrency(data.seatAmount + (data.foodAmount || 0))}</td></tr>`;
          }
          return `<tr><td>Seat Booking${durationSuffix}</td><td>${formatCurrency(data.seatAmount)}</td></tr>`;
        })()}
        ${data.discountAmount > 0 ? `<tr class="discount-row"><td>Discount${data.discountReason ? ` (${data.discountReason})` : ''}</td><td>-${formatCurrency(data.discountAmount)}</td></tr>` : ''}
        ${data.lockerIncluded ? `<tr><td>Locker</td><td>${formatCurrency(data.lockerPrice)}</td></tr>` : ''}
        ${data.foodPolicyType === 'optional' && data.foodOpted && data.foodAmount ? `<tr><td>Food Add-on</td><td>${formatCurrency(data.foodAmount)}</td></tr>` : ''}
        <tr class="total-row"><td>Total</td><td>${formatCurrency(data.totalAmount)}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="info-grid section">
    <div class="info-box">
      <div class="info-label">Payment Method</div>
      <div class="info-value">${paymentMethodLabel(data.paymentMethod)}</div>
      ${data.transactionId ? `<div class="info-label" style="margin-top:8px">Transaction ID</div><div class="info-value-sm">${data.transactionId}</div>` : ''}
    </div>
    <div class="info-box">
      <div class="info-label">Collected By</div>
      <div class="info-value">${data.collectedByName}</div>
    </div>
  </div>

  <div class="footer">
    <p>Thank you for choosing InhaleStays! This is a computer-generated invoice.</p>
  </div>
</div>
</body>
</html>`;
};

export const downloadInvoice = (data: InvoiceData) => {
  const html = generateInvoiceHTML(data);
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 500);
};
