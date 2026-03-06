
import axiosInstance from './axiosConfig';

export interface TransactionFilters {
  userId?: string;
  bookingId?: string;
  cabinId?: string;
  bookingType?: 'cabin' | 'hostel' | 'laundry' | 'mess';
  transactionType?: 'booking' | 'renewal' | 'cancellation' | 'refund';
  status?: 'pending' | 'completed' | 'failed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface TransactionReport {
  _id: string;
  transactionId: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  bookingId: string;
  bookingType: string;
  transactionType: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod?: string;
  additionalMonths?: number;
  newEndDate?: string;
  previousEndDate?: string;
  createdAt: string;
  updatedAt: string;
  bookingDetails?: {
    cabinId?: {
      _id: string;
      name: string;
      cabinCode: string;
    };
    seatId?: {
      _id: string;
      number: number;
    };
    hostelId?: {
      _id: string;
      name: string;
    };
    startDate: string;
    endDate: string;
  };
}

export const transactionReportsService = {
  // Get all transactions with filters and population
  getTransactionReports: async (filters?: TransactionFilters) => {
    try {
      const response = await axiosInstance.get('/transactions/reports/all', { 
        params: filters 
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching transaction reports:', error);
      return { success: false, error: error.response?.data || error.message };
    }
  },

  // Export transactions as Excel
  exportTransactionsExcel: async (filters?: TransactionFilters) => {
    try {
      const response = await axiosInstance.get('/admin/reports/transactions/excel', {
        params: filters,
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transactions-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error('Error exporting transactions:', error);
      return { success: false, error: error.response?.data || error.message };
    }
  },

  // Export transactions as PDF
  exportTransactionsPDF: async (filters?: TransactionFilters) => {
    try {
      const response = await axiosInstance.get('/admin/reports/transactions/pdf', {
        params: filters,
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transactions-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error('Error exporting transactions PDF:', error);
      return { success: false, error: error.response?.data || error.message };
    }
  }
};
