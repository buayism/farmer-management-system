import api from './api';

export const cropCycleService = {
  // Create a new crop cycle (planting)
  createCropCycle: async (cycleData: {
    farmer_id: string;
    crop_type: string;
    crop_name?: string;
    variety?: string;
    planting_date: string;
    area_planted: number;
    expected_yield_kg: number;
    rate_per_kg: number;
    expected_value: number;
    advance_percentage: number;
    advance_amount: number;
    notes?: string;
  }) => {
    const response = await api.post('/crop-cycles', cycleData);
    return response.data;
  },

  // Add monitoring visit to a crop cycle
  addMonitoringVisit: async (cycleId: string, monitoringData: {
    health_status: string;
    pest_detected: boolean;
    pest_details?: string;
    notes?: string;
  }) => {
    const response = await api.post(`/crop-cycles/${cycleId}/monitoring`, monitoringData);
    return response.data;
  },

  // Record harvest for a crop cycle
  recordHarvest: async (cycleId: string, harvestData: {
    harvest_date: string;
    actual_yield_kg: number;
    quality_grade: string;
    moisture_content?: number;
    harvest_value: number;
    notes?: string;
  }) => {
    const response = await api.post(`/crop-cycles/${cycleId}/harvest`, harvestData);
    return response.data;
  },

  // Get all crop cycles
  getAllCropCycles: async (filters?: {
    status?: string;
    farmer_id?: string;
    crop_type?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.farmer_id) params.append('farmer_id', filters.farmer_id);
    if (filters?.crop_type) params.append('crop_type', filters.crop_type);
    
    const response = await api.get(`/crop-cycles?${params.toString()}`);
    return response.data;
  },

  // Get crop cycles summary (for My Crops section)
  getCropCyclesSummary: async () => {
    const response = await api.get('/crop-cycles/summary');
    return response.data;
  },

  // Get a single crop cycle by ID
  getCropCycleById: async (id: string) => {
    const response = await api.get(`/crop-cycles/${id}`);
    return response.data;
  },

  // Delete/Cancel a crop cycle
  deleteCropCycle: async (id: string) => {
    const response = await api.delete(`/crop-cycles/${id}`);
    return response.data;
  }
};
