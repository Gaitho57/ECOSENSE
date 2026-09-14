import React, { useState } from 'react';
import { Upload, Save, Building, Palette, Hash } from 'lucide-react';

const BrandingSettings = () => {
  const [formData, setFormData] = useState({
    firmName: 'EcoSense Consulting Ltd',
    registrationNumber: 'NEMA/PR/5923',
    brandColor: '#059669',
  });
  
  const [logoPreview, setLogoPreview] = useState(null);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Firm Branding & White-Labeling</h2>
        <p className="text-gray-500">Configure how your ESIA reports appear to clients and regulators.</p>
      </div>

      <div className="space-y-8">
        {/* Logo Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Building className="w-5 h-5 mr-2 text-emerald-600" />
            Company Logo (Report Cover)
          </h3>
          <div className="flex items-center space-x-6">
            <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Upload className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <div>
              <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
                <span>Upload Logo</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </label>
              <p className="text-sm text-gray-500 mt-2">Recommended size: 400x200px (PNG with transparent background)</p>
            </div>
          </div>
        </div>

        {/* Firm Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Building className="w-4 h-4 mr-1" /> Firm Name
            </label>
            <input type="text" name="firmName" value={formData.firmName} onChange={handleInputChange} 
                   className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Hash className="w-4 h-4 mr-1" /> NEMA Firm Registration No.
            </label>
            <input type="text" name="registrationNumber" value={formData.registrationNumber} onChange={handleInputChange} 
                   className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border" />
          </div>
        </div>

        {/* Brand Color */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Palette className="w-5 h-5 mr-2 text-emerald-600" />
            Corporate Brand Color
          </h3>
          <div className="flex items-center space-x-4">
            <input type="color" name="brandColor" value={formData.brandColor} onChange={handleInputChange}
                   className="w-12 h-12 rounded cursor-pointer border-0 p-0" />
            <input type="text" name="brandColor" value={formData.brandColor} onChange={handleInputChange}
                   className="w-32 rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border font-mono" />
            <span className="text-sm text-gray-500">This color will be used for report headers, tables, and borders.</span>
          </div>
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-gray-200 flex justify-end">
        <button className="flex items-center bg-emerald-600 text-white font-medium py-2 px-6 rounded-lg shadow-sm hover:bg-emerald-700 transition-colors">
          <Save className="w-5 h-5 mr-2" /> Save Brand Settings
        </button>
      </div>
    </div>
  );
};

export default BrandingSettings;