import { Request, Response } from 'express';
import { getDb } from '../config/db';
import { ObjectId } from 'mongodb';
import logger from '../utils/logger';

export class CropCycleController {
  /**
   * Create a new crop cycle (planting)
   */
  async createCropCycle(req: Request, res: Response): Promise<void> {
    try {
      const {
        farmer_id,
        crop_type,
        crop_name,
        variety,
        planting_date,
        area_planted,
        expected_yield_kg,
        rate_per_kg,
        expected_value,
        advance_percentage,
        advance_amount,
        notes
      } = req.body;
      
      const db = getDb();
      
      // Validate required fields
      if (!farmer_id || !crop_type || !planting_date) {
        res.status(400).json({ 
          success: false, 
          message: 'Farmer ID, crop type, and planting date are required' 
        });
        return;
      }
      
      // Create crop cycle document
      const cropCycleData = {
        farmer_id: new ObjectId(farmer_id),
        crop_type: crop_type.toLowerCase(),
        crop_name: crop_name || crop_type,
        variety: variety || null,
        planting_date: new Date(planting_date),
        area_planted: parseFloat(area_planted) || 0,
        expected_yield_kg: parseFloat(expected_yield_kg) || 0,
        rate_per_kg: parseFloat(rate_per_kg) || 0,
        expected_value: parseFloat(expected_value) || 0,
        advance_percentage: parseFloat(advance_percentage) || 0,
        advance_amount: parseFloat(advance_amount) || 0,
        
        // Current stage tracking
        current_stage: 'planting', // planting -> monitoring -> harvest
        progress_percentage: 50, // 50% for planting, 75% for monitoring, 100% for harvest
        status: 'active', // active, completed, cancelled
        
        // Visit tracking
        visits: [
          {
            visit_type: 'planting',
            visit_date: new Date(planting_date),
            notes: notes || 'Initial planting visit',
            recorded_by: req.user?.id ? new ObjectId(req.user.id as string) : null,
            recorded_at: new Date()
          }
        ],
        
        // Monitoring data (will be updated later)
        monitoring_visits: [],
        health_status: 'good',
        pest_detected: false,
        
        // Harvest data (will be updated later)
        harvest_date: null,
        actual_yield_kg: null,
        quality_grade: null,
        harvest_value: null,
        
        // Metadata
        created_at: new Date(),
        updated_at: new Date(),
        created_by: req.user?.id ? new ObjectId(req.user.id as string) : null
      };
      
      const result = await db.collection('crop_cycles').insertOne(cropCycleData);
      
      logger.info(`Crop cycle created: ${crop_type} for farmer ${farmer_id}`);
      
      res.status(201).json({
        success: true,
        message: 'Crop cycle created successfully',
        data: { ...cropCycleData, _id: result.insertedId }
      });
    } catch (error: any) {
      logger.error('Error creating crop cycle:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create crop cycle',
        error: error.message 
      });
    }
  }

  /**
   * Add monitoring visit to a crop cycle
   */
  async addMonitoringVisit(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { health_status, pest_detected, pest_details, notes } = req.body;
      
      const db = getDb();
      
      const monitoringVisit = {
        visit_type: 'monitoring',
        visit_date: new Date(),
        health_status: health_status || 'good',
        pest_detected: pest_detected || false,
        pest_details: pest_details || null,
        notes: notes || '',
        recorded_by: req.user?.id ? new ObjectId(req.user.id as string) : null,
        recorded_at: new Date()
      };
      
      const result = await db.collection('crop_cycles').findOneAndUpdate(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            current_stage: 'monitoring',
            progress_percentage: 75,
            health_status: health_status || 'good',
            pest_detected: pest_detected || false,
            updated_at: new Date()
          },
          $push: {
            visits: monitoringVisit as any,
            monitoring_visits: monitoringVisit as any
          }
        },
        { returnDocument: 'after' }
      );
      
      if (!result) {
        res.status(404).json({ 
          success: false, 
          message: 'Crop cycle not found' 
        });
        return;
      }
      
      logger.info(`Monitoring visit added to crop cycle: ${id}`);
      
      res.json({
        success: true,
        message: 'Monitoring visit recorded successfully',
        data: result
      });
    } catch (error: any) {
      logger.error('Error adding monitoring visit:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to add monitoring visit',
        error: error.message 
      });
    }
  }

  /**
   * Record harvest for a crop cycle
   */
  async recordHarvest(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        harvest_date,
        actual_yield_kg,
        quality_grade,
        moisture_content,
        harvest_value,
        notes
      } = req.body;
      
      const db = getDb();
      
      // Validate required fields
      if (!harvest_date || !actual_yield_kg || !quality_grade) {
        res.status(400).json({ 
          success: false, 
          message: 'Harvest date, actual yield, and quality grade are required' 
        });
        return;
      }
      
      const harvestVisit = {
        visit_type: 'harvest',
        visit_date: new Date(harvest_date),
        actual_yield_kg: parseFloat(actual_yield_kg),
        quality_grade,
        moisture_content: moisture_content ? parseFloat(moisture_content) : null,
        harvest_value: parseFloat(harvest_value) || 0,
        notes: notes || '',
        recorded_by: req.user?.id ? new ObjectId(req.user.id as string) : null,
        recorded_at: new Date()
      };
      
      const result = await db.collection('crop_cycles').findOneAndUpdate(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            current_stage: 'harvest',
            progress_percentage: 100,
            status: 'completed',
            harvest_date: new Date(harvest_date),
            actual_yield_kg: parseFloat(actual_yield_kg),
            quality_grade,
            harvest_value: parseFloat(harvest_value) || 0,
            updated_at: new Date()
          },
          $push: {
            visits: harvestVisit as any
          }
        },
        { returnDocument: 'after' }
      );
      
      if (!result) {
        res.status(404).json({ 
          success: false, 
          message: 'Crop cycle not found' 
        });
        return;
      }
      
      logger.info(`Harvest recorded for crop cycle: ${id}`);
      
      res.json({
        success: true,
        message: 'Harvest recorded successfully',
        data: result
      });
    } catch (error: any) {
      logger.error('Error recording harvest:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to record harvest',
        error: error.message 
      });
    }
  }

  /**
   * Get all crop cycles
   */
  async getAllCropCycles(req: Request, res: Response): Promise<void> {
    try {
      const db = getDb();
      const { status, farmer_id, crop_type } = req.query;
      
      const filter: any = {};
      if (status) filter.status = status;
      if (farmer_id) filter.farmer_id = new ObjectId(farmer_id as string);
      if (crop_type) filter.crop_type = (crop_type as string).toLowerCase();
      
      const cropCycles = await db.collection('crop_cycles')
        .find(filter)
        .sort({ created_at: -1 })
        .toArray();
      
      res.json({
        success: true,
        data: cropCycles,
        count: cropCycles.length
      });
    } catch (error: any) {
      logger.error('Error fetching crop cycles:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch crop cycles',
        error: error.message 
      });
    }
  }

  /**
   * Get crop cycles summary by crop type (for My Crops section)
   */
  async getCropCyclesSummary(req: Request, res: Response): Promise<void> {
    try {
      const db = getDb();
      
      // Aggregate crop cycles by crop type to get latest status
      const summary = await db.collection('crop_cycles').aggregate([
        {
          $match: {
            status: 'active' // Only active crop cycles
          }
        },
        {
          $sort: { updated_at: -1 }
        },
        {
          $group: {
            _id: '$crop_type',
            crop_name: { $first: '$crop_name' },
            current_stage: { $first: '$current_stage' },
            progress_percentage: { $first: '$progress_percentage' },
            total_area: { $sum: '$area_planted' },
            total_cycles: { $sum: 1 },
            latest_update: { $first: '$updated_at' }
          }
        },
        {
          $sort: { latest_update: -1 }
        }
      ]).toArray();
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error: any) {
      logger.error('Error fetching crop cycles summary:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch crop cycles summary',
        error: error.message 
      });
    }
  }

  /**
   * Get a single crop cycle by ID
   */
  async getCropCycleById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const db = getDb();
      
      const cropCycle = await db.collection('crop_cycles').findOne({ 
        _id: new ObjectId(id) 
      });
      
      if (!cropCycle) {
        res.status(404).json({ 
          success: false, 
          message: 'Crop cycle not found' 
        });
        return;
      }
      
      res.json({
        success: true,
        data: cropCycle
      });
    } catch (error: any) {
      logger.error('Error fetching crop cycle:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch crop cycle',
        error: error.message 
      });
    }
  }

  /**
   * Delete/Cancel a crop cycle
   */
  async deleteCropCycle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const db = getDb();
      
      const result = await db.collection('crop_cycles').findOneAndUpdate(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            status: 'cancelled',
            updated_at: new Date()
          }
        },
        { returnDocument: 'after' }
      );
      
      if (!result) {
        res.status(404).json({ 
          success: false, 
          message: 'Crop cycle not found' 
        });
        return;
      }
      
      logger.info(`Crop cycle cancelled: ${id}`);
      
      res.json({
        success: true,
        message: 'Crop cycle cancelled successfully'
      });
    } catch (error: any) {
      logger.error('Error deleting crop cycle:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to delete crop cycle',
        error: error.message 
      });
    }
  }
}

export const cropCycleController = new CropCycleController();
