
import axios from './axiosConfig';

interface VendorRegistrationData {
  contactPerson: string;
  email: string;
  phone: string;
  password: string;
  businessName: string;
  businessType: string;
  businessDetails: {
    gstNumber: string;
    panNumber: string;
    businessLicense: string;
    description: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  bankDetails: {
    accountHolderName: string;
    accountNumber: string;
    bankName: string;
    ifscCode: string;
    upiId?: string;
  };
}

export const vendorRegistrationService = {
  registerVendor: async (data: VendorRegistrationData) => {
    try {
      const response = await axios.post('/vendor-registration/register', data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  },

  getVendorStatus: async (vendorId: string) => {
    try {
      const response = await axios.get(`/vendor-registration/status/${vendorId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get vendor status');
    }
  }
};

/** @deprecated Use partnerRegistrationService instead */
export const partnerRegistrationService = vendorRegistrationService;
