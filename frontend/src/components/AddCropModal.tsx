import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { cropService } from '../services/cropService';

interface AddCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

// Top 10 crops grown in Uganda
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

const AddCropModal: React.FC<AddCropModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [selectedCrop, setSelectedCrop] = useState('');
  const [customName, setCustomName] = useState('');
  const [gradeARate, setGradeARate] = useState('');
  const [gradeBRate, setGradeBRate] = useState('');
  const [gradeCRate, setGradeCRate] = useState('');
  const [customIcon, setCustomIcon] = useState('🌾');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const handleCropSelect = (cropName: string) => {
    setSelectedCrop(cropName);
    const crop = UGANDA_CROPS.find(c => c.name === cropName);
    if (crop) {
      setGradeARate(crop.rates['Grade A'].toString());
      setGradeBRate(crop.rates['Grade B'].toString());
      setGradeCRate(crop.rates['Grade C'].toString());
      setCustomIcon(crop.icon);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cropName = isCustom ? customName : selectedCrop;

      if (!cropName) {
        throw new Error('Please select or enter a crop name');
      }

      if (!gradeARate || !gradeBRate || !gradeCRate) {
        throw new Error('Please enter all grade rates');
      }

      const cropData = {
        name: cropName,
        rates: {
          'Grade A': parseInt(gradeARate),
          'Grade B': parseInt(gradeBRate),
          'Grade C': parseInt(gradeCRate)
        },
        icon: customIcon || '🌾'
      };

      await cropService.createCrop(cropData);
      
      onSuccess(`${cropName} added successfully!`);
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to add crop');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCrop('');
    setCustomName('');
    setGradeARate('');
    setGradeBRate('');
    setGradeCRate('');
    setCustomIcon('🌾');
    setIsCustom(false);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">🌱 Add New Crop</h2>
            <p className="text-sm text-gray-500 mt-1">Select from common crops or add a custom one</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6"/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Toggle between predefined and custom */}
          <div className="flex items-center space-x-4 bg-gray-100 p-3 rounded-lg">
            <button
              type="button"
              onClick={() => setIsCustom(false)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                !isCustom
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              📋 Select from List
            </button>
            <button
              type="button"
              onClick={() => setIsCustom(true)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isCustom
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              ✏️ Custom Crop
            </button>
          </div>

          {!isCustom ? (
            /* Predefined Crops Selection */
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select Crop <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {UGANDA_CROPS.map((crop) => (
                  <button
                    key={crop.name}
                    type="button"
                    onClick={() => handleCropSelect(crop.name)}
                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-all border-2 ${
                      selectedCrop === crop.name
                        ? 'border-green-600 bg-green-50 text-green-900'
                        : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                    }`}
                  >
                    <span className="text-2xl mr-2">{crop.icon}</span>
                    {crop.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Custom Crop Input */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Crop Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter crop name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon (Emoji)
                </label>
                <input
                  type="text"
                  value={customIcon}
                  onChange={(e) => setCustomIcon(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="🌾"
                  maxLength={2}
                />
              </div>
            </div>
          )}

          {/* Pricing Rates */}
          {(selectedCrop || customName) && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">💰 Pricing Rates (UGX per kg)</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grade A <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={gradeARate}
                    onChange={(e) => setGradeARate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="1200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grade B <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={gradeBRate}
                    onChange={(e) => setGradeBRate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    placeholder="1000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grade C <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={gradeCRate}
                    onChange={(e) => setGradeCRate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="800"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (!selectedCrop && !customName)}
              className={`flex-1 px-6 py-3 rounded-lg font-medium text-white transition-all flex items-center justify-center ${
                loading || (!selectedCrop && !customName)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                '✅ Add Crop'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCropModal;
