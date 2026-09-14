import React, { useState } from 'react';
import { Upload, FileText, Users, FlaskConical, CheckCircle2, ChevronRight, ChevronLeft, MapPin, Building, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet icon issue in react
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function LocationPicker({ position, setPosition }) {
  const map = useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  
  React.useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  return position ? <Marker position={position} /> : null;
}

const PhasedIntakeWizard = ({ projectId, onComplete }) => {
  const [currentPhase, setCurrentPhase] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState({});
  const [position, setPosition] = useState(null); // Map coordinates
  const [formData, setFormData] = useState({
    projectName: '',
    projectCategory: 'Infrastructure',
    siteArea: '',
    county: '',
    plotNumber: '',
    proponentName: '',
    pin: '',
    proponentEmail: '',
    proponentPhone: '',
    investmentCost: '',
    timelineMonths: '',
    leadExpertReg: 'NEMA/EIA/1234', // Auto-filled from user context
    communityConcerns: '',
    sensitiveReceptors: []
  });

  const phases = [
    {
      id: 1,
      title: "Scoping & Engineering",
      icon: <Building className="w-6 h-6" />,
      description: "Project fundamentals and engineering designs."
    },
    {
      id: 2,
      title: "Ground-Truthing & Science",
      icon: <FlaskConical className="w-6 h-6" />,
      description: "Specialist baseline reports (Soil, Flora, Hydrology)."
    },
    {
      id: 3,
      title: "Stakeholder Engagement",
      icon: <Users className="w-6 h-6" />,
      description: "Public participation minutes and attendance."
    },
    {
      id: 4,
      title: "Final Review",
      icon: <FileText className="w-6 h-6" />,
      description: "Confirm details before AI processing."
    }
  ];

  const handleFileChange = (category, e) => {
    setFiles({ ...files, [category]: e.target.files[0] });
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleReceptorChange = (value) => {
    const current = formData.sensitiveReceptors;
    if (current.includes(value)) {
      setFormData({ ...formData, sensitiveReceptors: current.filter(item => item !== value) });
    } else {
      setFormData({ ...formData, sensitiveReceptors: [...current, value] });
    }
  };

  const submitPhase = async () => {
    setIsUploading(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsUploading(false);
    
    if (currentPhase < 4) {
      setCurrentPhase(currentPhase + 1);
    } else {
      if (onComplete) onComplete({ ...formData, location: position }, files);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">ESIA Intake Workflow</h2>
        <div className="flex justify-between items-center relative">
          <div className="absolute left-0 top-1/2 -z-10 w-full h-1 bg-gray-100 -translate-y-1/2"></div>
          <div className="absolute left-0 top-1/2 -z-10 h-1 bg-emerald-500 transition-all duration-300 -translate-y-1/2" 
               style={{ width: `${((currentPhase - 1) / 3) * 100}%` }}></div>
          
          {phases.map((phase) => (
            <div key={phase.id} className="flex flex-col items-center bg-white px-2">
              <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 mb-2 bg-white">
                {currentPhase > phase.id ? <CheckCircle2 className="w-6 h-6" /> : phase.icon}
              </div>
              <span className="text-sm font-medium hidden sm:block">{phase.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="min-h-[400px] bg-gray-50 rounded-lg p-6 mb-6 border border-gray-100">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-800">{phases[currentPhase-1].title}</h3>
          <p className="text-gray-500 text-sm">{phases[currentPhase-1].description}</p>
        </div>

        {currentPhase === 1 && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Project Details */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">1. Project Identity & Scope</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Title / Name *</label>
                    <input type="text" name="projectName" value={formData.projectName} onChange={handleInputChange} 
                           className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border" placeholder="e.g. Proposed Bomas-Kiserian Road Upgrade" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Category *</label>
                    <select name="projectCategory" value={formData.projectCategory} onChange={handleInputChange} className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border bg-white">
                        <option value="Infrastructure">Infrastructure (Roads/Bridges)</option>
                        <option value="Energy">Energy (Solar/Wind/Geothermal)</option>
                        <option value="Real Estate">Real Estate & Housing</option>
                        <option value="Mining">Mining & Quarrying</option>
                        <option value="Manufacturing">Manufacturing & Processing</option>
                        <option value="Agriculture">Agriculture & Forestry</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Investment Cost (KES) *</label>
                    <input type="number" name="investmentCost" value={formData.investmentCost} onChange={handleInputChange} 
                           className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border" placeholder="e.g. 1500000000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Construction Timeline (Months) *</label>
                    <input type="number" name="timelineMonths" value={formData.timelineMonths} onChange={handleInputChange} 
                           className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. 24" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Site Area / Footprint (Hectares) *</label>
                    <input type="number" name="siteArea" value={formData.siteArea} onChange={handleInputChange} step="0.1"
                           className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. 15.5" />
                  </div>
                </div>
            </div>

            {/* Proponent Details */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">2. Proponent Profile</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Proponent Name (Company/Agency) *</label>
                    <input type="text" name="proponentName" value={formData.proponentName} onChange={handleInputChange} 
                           className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. KeNHA" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Proponent KRA PIN *</label>
                    <input type="text" name="pin" value={formData.pin} onChange={handleInputChange} 
                           className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="P051..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                    <input type="email" name="proponentEmail" value={formData.proponentEmail} onChange={handleInputChange} 
                           className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="contact@proponent.co.ke" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <input type="text" name="proponentPhone" value={formData.proponentPhone} onChange={handleInputChange} 
                           className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="+254..." />
                  </div>
                </div>
            </div>

            {/* Location Details */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center justify-between">
                    <span>3. Administrative & Spatial Location</span>
                    <span className="text-xs text-gray-400 font-normal">Lead Expert: {formData.leadExpertReg}</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">County *</label>
                    <input type="text" name="county" value={formData.county} onChange={handleInputChange} 
                           className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. Kajiado" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plot / LR Number *</label>
                    <input type="text" name="plotNumber" value={formData.plotNumber} onChange={handleInputChange} 
                           className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. LR No. 1234/56" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <MapPin className="w-4 h-4 mr-1 text-emerald-600" />
                    Spatial Boundary (Drop a pin for Sentinel-2 centroid) *
                  </label>
              <div className="h-[250px] w-full rounded-md border border-gray-300 overflow-hidden relative z-0">
                <MapContainer center={[-1.2921, 36.8219]} zoom={11} className="w-full h-full">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationPicker position={position} setPosition={setPosition} />
                </MapContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Latitude</label>
                  <input type="number" step="0.0001" value={position ? position[0] : ''} 
                         onChange={(e) => setPosition([parseFloat(e.target.value) || 0, position ? position[1] : 36.8219])}
                         className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-1.5 border text-sm" placeholder="e.g. -1.2921" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Longitude</label>
                  <input type="number" step="0.0001" value={position ? position[1] : ''} 
                         onChange={(e) => setPosition([position ? position[0] : -1.2921, parseFloat(e.target.value) || 0])}
                         className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-1.5 border text-sm" placeholder="e.g. 36.8219" />
                </div>
              </div>
            </div>

            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors">
              <label className="flex flex-col items-center justify-center cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-600">Upload Engineering / Architectural Designs (PDF)</span>
                <span className="text-xs text-gray-400 mt-1">{files.engineering_design ? files.engineering_design.name : 'No file selected'}</span>
                <input type="file" className="hidden" onChange={(e) => handleFileChange('engineering_design', e)} />
              </label>
            </div>
          </div>
        )}

        {currentPhase === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Sensitive Receptors within 1km (Check all that apply)</label>
              <div className="grid grid-cols-2 gap-3">
                {['Hospitals / Clinics', 'Schools', 'Places of Worship', 'Rivers / Wetlands', 'National Parks', 'Boreholes'].map((item) => (
                  <label key={item} className="flex items-center space-x-3 p-3 border rounded-lg bg-white hover:border-emerald-500 cursor-pointer">
                    <input type="checkbox" checked={formData.sensitiveReceptors.includes(item)} onChange={() => handleReceptorChange(item)} 
                           className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
                    <span className="text-sm text-gray-700">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                <label className="flex flex-col items-center justify-center cursor-pointer text-center">
                  <Upload className="w-6 h-6 text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-gray-600">Upload Biodiversity Survey</span>
                  <span className="text-xs text-gray-400 mt-1">{files.biodiversity_survey ? files.biodiversity_survey.name : 'Optional'}</span>
                  <input type="file" className="hidden" onChange={(e) => handleFileChange('biodiversity_survey', e)} />
                </label>
              </div>
              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                <label className="flex flex-col items-center justify-center cursor-pointer text-center">
                  <Upload className="w-6 h-6 text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-gray-600">Upload Hydrology Report</span>
                  <span className="text-xs text-gray-400 mt-1">{files.hydrology_report ? files.hydrology_report.name : 'Optional'}</span>
                  <input type="file" className="hidden" onChange={(e) => handleFileChange('hydrology_report', e)} />
                </label>
              </div>
            </div>
          </div>
        )}

        {currentPhase === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Top 3 Community Concerns (Summary)</label>
              <textarea name="communityConcerns" value={formData.communityConcerns} onChange={handleInputChange} rows={3}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border" 
                        placeholder="1. Dust during construction&#10;2. Loss of business frontage&#10;3. Local youth employment" />
            </div>

            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors">
              <label className="flex flex-col items-center justify-center cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-600">Upload Public Baraza Minutes & Attendance (PDF/Images) *</span>
                <span className="text-xs text-gray-400 mt-1">{files.baraza_minutes ? files.baraza_minutes.name : 'Required by NEMA Reg 17'}</span>
                <input type="file" className="hidden" onChange={(e) => handleFileChange('baraza_minutes', e)} />
              </label>
            </div>
          </div>
        )}

        {currentPhase === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h4 className="text-emerald-800 font-bold flex items-center mb-2">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Ready for AI Processing
              </h4>
              <p className="text-emerald-700 text-sm">
                Your data is structured and compliant. Clicking 'Compile Report' will initiate the Cloud AI to parse your specific uploads and merge them into the final NEMA format.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm bg-white p-4 rounded-lg border">
              <div><span className="text-gray-500">Project Name:</span> <span className="font-medium text-gray-900">{formData.projectName || 'Missing'}</span></div>
              <div><span className="text-gray-500">Category:</span> <span className="font-medium text-gray-900">{formData.projectCategory || 'Missing'}</span></div>
              <div><span className="text-gray-500">Proponent:</span> <span className="font-medium text-gray-900">{formData.proponentName || 'Missing'}</span></div>
              <div><span className="text-gray-500">Location:</span> <span className="font-medium text-gray-900">{formData.county || 'Missing'}, Plot {formData.plotNumber || 'Missing'}</span></div>
              <div><span className="text-gray-500">Coordinates:</span> <span className="font-medium text-gray-900">{position ? `${position[0].toFixed(3)}, ${position[1].toFixed(3)}` : 'Missing'}</span></div>
              <div><span className="text-gray-500">Cost (KES):</span> <span className="font-medium text-gray-900">{formData.investmentCost ? Number(formData.investmentCost).toLocaleString() : 'Missing'}</span></div>
              <div><span className="text-gray-500">Files Uploaded:</span> <span className="font-medium text-gray-900">{Object.keys(files).length}</span></div>
              <div><span className="text-gray-500">Receptors:</span> <span className="font-medium text-gray-900">{formData.sensitiveReceptors.length} identified</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button 
          onClick={() => setCurrentPhase(Math.max(1, currentPhase - 1))}
          disabled={currentPhase === 1 || isUploading}
          className="flex items-center px-4 py-2 rounded-lg font-medium transition-colors text-gray-600 hover:bg-gray-200"
        >
          <ChevronLeft className="w-5 h-5 mr-1" /> Back
        </button>
        
        <button 
          onClick={submitPhase}
          disabled={isUploading || (currentPhase === 1 && !position)}
          className="flex items-center px-6 py-2 rounded-lg font-medium text-white transition-colors shadow-sm bg-emerald-600 hover:bg-emerald-700"
        >
          {isUploading ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Saving...</>
          ) : currentPhase === 4 ? (
            <>Compile Report <FileText className="w-5 h-5 ml-2" /></>
          ) : (
            <>Next Phase <ChevronRight className="w-5 h-5 ml-2" /></>
          )}
        </button>
      </div>
    </div>
  );
};

export default PhasedIntakeWizard;

