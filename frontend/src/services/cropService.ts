import api from './api';

export const cropService = {
  // Initialize default crops
  initializeDefaultCrops: async () => {
    const response = await api.post('/crops/initialize');
    return response.data;
  },

  // Get all crops
  getAllCrops: async () => {
    const response = await api.get('/crops');
    return response.data;
  },

  // Get crop by ID
  getCropById: async (id: string) => {
    const response = await api.get(`/crops/${id}`);
    return response.data;
  },

  // Create new crop
  createCrop: async (cropData: {
    name: string;
    rates: { [key: string]: number };
    icon?: string;
  }) => {
    const response = await api.post('/crops', cropData);
    return response.data;
  },

  // Update crop
  updateCrop: async (id: string, cropData: any) => {
    const response = await api.put(`/crops/${id}`, cropData);
    return response.data;
  },

  // Delete crop
  deleteCrop: async (id: string) => {
    const response = await api.delete(`/crops/${id}`);
    return response.data;
  }
};
