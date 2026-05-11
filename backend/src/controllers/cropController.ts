import { Request, Response } from 'express';
import { getDb } from '../config/db';
import { ObjectId } from 'mongodb';
import logger from '../utils/logger';

// Top 10 crops grown in Uganda for initialization
const UGANDA_CROPS = [
  { name: 'Maize', rates: { 'Grade A': 1200, 'Grade B': 1000, 'Grade C': 800 }, icon: '🌽' },
  { name: 'Beans', rates: { 'Grade A': 1800, 'Grade B': 1500, 'Grade C': 1200 }, icon: '🫘' },
  { name: 'Cassava', rates: { 'Grade A': 600, 'Grade B': 500, 'Grade C': 400 }, icon: '🥔' },
  { name: 'Sweet Potatoes', rates: { 'Grade A': 800, 'Grade B': 650, 'Grade C': 500 }, icon: '🍠' },
  { name: 'Coffee', rates: { 'Grade A': 5000, 'Grade B': 4000, 'Grade C': 3000 }, icon: '☕' },
  { name: 'Bananas', rates: { 'Grade A': 1500, 'Grade B': 1200, 'Grade C': 900 }, icon: '🍌' },
  { name: 'Rice', rates: { 'Grade A': 2500, 'Grade B': 2000, 'Grade C': 1500 }, icon: '🌾' },
  { name: 'Millet', rates: { 'Grade A': 1400, 'Grade B': 1100, 'Grade C': 900 }, icon: '🌾' },
  { name: 'Sorghum', rates: { 'Grade A': 1300, 'Grade B': 1000, 'Grade C': 800 }, icon: '🌾' },
  { name: 'Groundnuts', rates: { 'Grade A': 2000, 'Grade B': 1700, 'Grade C': 1400 }, icon: '🥜' }
];

export class CropController {
  /**
   * Initialize default crops if none exist
   */
  async initializeDefaultCrops(req: Request, res: Response): Promise<void> {
    try {
      const db = getDb();
      const cropsCollection = db.collection('crops');
      
      // Check if crops already exist
      const existingCrops = await cropsCollection.countDocuments();
      
      if (existingCrops > 0) {
        res.json({ 
          success: true, 
          message: 'Crops already initialized',
          count: existingCrops 
        });
        return;
      }
      
      // Insert default crops
      const cropsToInsert = UGANDA_CROPS.map(crop => ({
        ...crop,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
        created_by: req.user?.id ? new ObjectId(req.user.id as string) : null
      }));
      
      const result = await cropsCollection.insertMany(cropsToInsert);
      
      logger.info(`Initialized ${result.insertedCount} default crops`);
      
      res.json({
        success: true,
        message: `Successfully initialized ${result.insertedCount} crops`,
        data: cropsToInsert
      });
    } catch (error: any) {
      logger.error('Error initializing default crops:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to initialize default crops',
        error: error.message 
      });
    }
  }

  /**
   * Create a new crop
   */
  async createCrop(req: Request, res: Response): Promise<void> {
    try {
      const { name, rates, icon } = req.body;
      const db = getDb();
      
      // Validate required fields
      if (!name || !rates) {
        res.status(400).json({ 
          success: false, 
          message: 'Crop name and rates are required' 
        });
        return;
      }
      
      // Check if crop already exists
      const existingCrop = await db.collection('crops').findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') } 
      });
      
      if (existingCrop) {
        res.status(400).json({ 
          success: false, 
          message: 'Crop with this name already exists' 
        });
        return;
      }
      
      // Create crop document
      const cropData = {
        name,
        rates: rates || { 'Grade A': 0, 'Grade B': 0, 'Grade C': 0 },
        icon: icon || '🌾',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
        created_by: req.user?.id ? new ObjectId(req.user.id as string) : null
      };
      
      const result = await db.collection('crops').insertOne(cropData);
      
      logger.info(`Crop created: ${name} by ${req.user?.name || 'System'}`);
      
      res.status(201).json({
        success: true,
        message: 'Crop created successfully',
        data: { ...cropData, _id: result.insertedId }
      });
    } catch (error: any) {
      logger.error('Error creating crop:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create crop',
        error: error.message 
      });
    }
  }

  /**
   * Get all active crops
   */
  async getAllCrops(req: Request, res: Response): Promise<void> {
    try {
      const db = getDb();
      
      const crops = await db.collection('crops')
        .find({ status: 'active' })
        .sort({ name: 1 })
        .toArray();
      
      res.json({
        success: true,
        data: crops,
        count: crops.length
      });
    } catch (error: any) {
      logger.error('Error fetching crops:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch crops',
        error: error.message 
      });
    }
  }

  /**
   * Get a single crop by ID
   */
  async getCropById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const db = getDb();
      
      const crop = await db.collection('crops').findOne({ _id: new ObjectId(id) });
      
      if (!crop) {
        res.status(404).json({ 
          success: false, 
          message: 'Crop not found' 
        });
        return;
      }
      
      res.json({
        success: true,
        data: crop
      });
    } catch (error: any) {
      logger.error('Error fetching crop:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch crop',
        error: error.message 
      });
    }
  }

  /**
   * Update a crop
   */
  async updateCrop(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, rates, icon, status } = req.body;
      const db = getDb();
      
      const updateData: any = {
        updated_at: new Date()
      };
      
      if (name) updateData.name = name;
      if (rates) updateData.rates = rates;
      if (icon) updateData.icon = icon;
      if (status) updateData.status = status;
      
      const result = await db.collection('crops').findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      
      if (!result) {
        res.status(404).json({ 
          success: false, 
          message: 'Crop not found' 
        });
        return;
      }
      
      logger.info(`Crop updated: ${id} by ${req.user?.name || 'System'}`);
      
      res.json({
        success: true,
        message: 'Crop updated successfully',
        data: result
      });
    } catch (error: any) {
      logger.error('Error updating crop:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update crop',
        error: error.message 
      });
    }
  }

  /**
   * Delete a crop (soft delete by setting status to inactive)
   */
  async deleteCrop(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const db = getDb();
      
      const result = await db.collection('crops').findOneAndUpdate(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            status: 'inactive',
            updated_at: new Date()
          }
        },
        { returnDocument: 'after' }
      );
      
      if (!result) {
        res.status(404).json({ 
          success: false, 
          message: 'Crop not found' 
        });
        return;
      }
      
      logger.info(`Crop deleted: ${id} by ${req.user?.name || 'System'}`);
      
      res.json({
        success: true,
        message: 'Crop deleted successfully'
      });
    } catch (error: any) {
      logger.error('Error deleting crop:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to delete crop',
        error: error.message 
      });
    }
  }
}

export const cropController = new CropController();
