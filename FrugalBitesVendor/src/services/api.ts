import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { logger } from './logger';

// Create a contextual logger for API calls
const apiLogger = logger.withContext('API');

const API_BASE_URL = 'http://192.168.1.53:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  apiLogger.debug(`Request: ${config.method?.toUpperCase()} ${config.url}`);
  const token = await SecureStore.getItemAsync('vendor_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for logging
api.interceptors.response.use(
  (response) => {
    apiLogger.debug(`Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    apiLogger.error('Response error', {
      status: error.response?.status,
      message: error.message,
      url: error.config?.url,
    });
    return Promise.reject(error);
  }
);

// Auth Service
export const authService = {
  async loginMerchant(email: string, password: string) {
    apiLogger.info('Attempting login', { email });
    try {
      const response = await api.post('/auth/login', { email, password });
      apiLogger.info('Login successful');
      return response.data;
    } catch (error: any) {
      apiLogger.error('Login failed', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw error;
    }
  },
};

// Offer types
export interface OfferDTO {
  offerId: string;
  merchantId: string;
  foodName: string;
  description?: string;
  category: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercentage: number;
  quantity: number;
  quantityUnit: string;
  imageUrl?: string;
  pickupStartTime: string;
  pickupEndTime: string;
  isAvailable: boolean;
  createdAt: string;
}

export interface CreateOfferDTO {
  foodName: string;
  description?: string;
  category: string;
  originalPrice: number;
  discountedPrice: number;
  quantity: number;
  quantityUnit: string;
  imageUrl?: string;
  pickupStartTime: string;
  pickupEndTime: string;
}

// Offers Service
export const offerService = {
  async getMyOffers(): Promise<OfferDTO[]> {
    const response = await api.get('/vendor/offers');
    return response.data;
  },

  async createOffer(offer: CreateOfferDTO): Promise<OfferDTO> {
    const response = await api.post('/vendor/offers', offer);
    return response.data;
  },

  async updateOffer(offerId: string, offer: Partial<CreateOfferDTO>): Promise<OfferDTO> {
    const response = await api.put(`/vendor/offers/${offerId}`, offer);
    return response.data;
  },

  async deleteOffer(offerId: string): Promise<void> {
    await api.delete(`/vendor/offers/${offerId}`);
  },

  async toggleAvailability(offerId: string): Promise<OfferDTO> {
    const response = await api.patch(`/vendor/offers/${offerId}/toggle`);
    return response.data;
  },
};

// Order types
export interface OrderDTO {
  orderId: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  offerId: string;
  offerName: string;
  quantity: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
  pickupTime: string;
  createdAt: string;
}

// Orders Service
export const orderService = {
  async getMyOrders(): Promise<OrderDTO[]> {
    const response = await api.get('/vendor/orders');
    return response.data;
  },

  async updateOrderStatus(orderId: string, status: string): Promise<OrderDTO> {
    const response = await api.patch(`/vendor/orders/${orderId}/status`, { status });
    return response.data;
  },
};

// Analytics types
export interface AnalyticsDTO {
  todayOrders: number;
  todayRevenue: number;
  totalOrders: number;
  totalRevenue: number;
  totalFoodSaved: number;
  averageRating: number;
}

// Analytics Service
export const analyticsService = {
  async getAnalytics(): Promise<AnalyticsDTO> {
    const response = await api.get('/vendor/analytics');
    return response.data;
  },
};

export default api;
