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
    subCounty: '',
    ward: '',
    plotNumber: '',
    landOwnership: '',
    proponentName: '',
    pin: '',
    proponentEmail: '',
    proponentPhone: '',
    investmentCost: '',
    timelineMonths: '',
    operationalLifespan: '',
    leadExpertReg: 'NEMA/EIA/1234', // Auto-filled from user context
    communityConcerns: [{ concern: '', category: 'Social', response: '' }], // Structured list
    barazaDate: '',
    barazaVenue: '',
    barazaLanguage: '',
    attendeeCount: '',
    attendeesMale: '',
    attendeesFemale: '',
    facilitatingOfficer: '',
    newspaperName: '',
    newspaperDate: '',
    noticePeriodDays: '',
    otherNotificationMethod: '',
    stakeholderGroups: {}, // e.g. { "County Government": true }
    vulnerableGroups: '',
    grmEstablished: 'Yes',
    grmContact: '',
    sensitiveReceptors: {}, // Changed from array to object map
    airQualityPM25: '',
    airQualityPM10: '',
    noiseLevel: '',
    groundwaterDepth: '',
    existingLandUse: '',
    baselineDate: '',
    baselineSeason: 'Dry Season',
    baselineSource: 'Field Instrument',
    specialistName: '',
    specialistDate: '',
    projectDescription: '',
    alternativesConsidered: '',
    empRows: [{ impact: '', mitigation: '', responsibleParty: '', monitoringFrequency: '', estCost: '' }],
    engineeringSpecs: {} // Category-specific engineering specs
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
      title: "Management Plan",
      icon: <FileText className="w-6 h-6" />,
      description: "Environmental and Social Management Plan (EMP)."
    },
    {
      id: 5,
      title: "Final Review",
      icon: <CheckCircle2 className="w-6 h-6" />,
      description: "Confirm details before AI processing."
    }
  ];

  const handleFileChange = (category, e) => {
    setFiles({ ...files, [category]: e.target.files[0] });
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSpecChange = (e) => {
    setFormData({
      ...formData,
      engineeringSpecs: { ...formData.engineeringSpecs, [e.target.name]: e.target.value }
    });
  };

  const handleReceptorToggle = (category) => {
    const current = { ...formData.sensitiveReceptors };
    if (current[category]) {
      delete current[category];
    } else {
      current[category] = { name: '', distance: '', direction: '' };
    }
    setFormData({ ...formData, sensitiveReceptors: current });
  };

  const handleReceptorField = (category, field, value) => {
    setFormData({
      ...formData,
      sensitiveReceptors: {
        ...formData.sensitiveReceptors,
        [category]: { ...formData.sensitiveReceptors[category], [field]: value }
      }
    });
  };

  const handleStakeholderToggle = (group) => {
    const current = { ...formData.stakeholderGroups };
    if (current[group]) {
      delete current[group];
    } else {
      current[group] = true;
    }
    setFormData({ ...formData, stakeholderGroups: current });
  };

  const handleConcernChange = (index, field, value) => {
    const newConcerns = [...formData.communityConcerns];
    newConcerns[index][field] = value;
    setFormData({ ...formData, communityConcerns: newConcerns });
  };

  const addConcern = () => {
    setFormData({ ...formData, communityConcerns: [...formData.communityConcerns, { concern: '', category: 'Social', response: '' }] });
  };

  const handleEmpChange = (index, field, value) => {
    const newEmp = [...formData.empRows];
    newEmp[index][field] = value;
    setFormData({ ...formData, empRows: newEmp });
  };

  const addEmpRow = () => {
    setFormData({ ...formData, empRows: [...formData.empRows, { impact: '', mitigation: '', responsibleParty: '', monitoringFrequency: '', estCost: '' }] });
  };

  const submitPhase = async () => {
    // Front-end validation for Phase 1
    if (currentPhase === 1) {
      if (formData.projectCategory === 'Energy' && formData.engineeringSpecs?.arrayFootprint && formData.siteArea) {
        const footprint = parseFloat(formData.engineeringSpecs.arrayFootprint);
        const siteArea = parseFloat(formData.siteArea);
        if (footprint > siteArea) {
          alert(`Validation Error: Panel Array Footprint (${footprint} ha) cannot exceed total Site Area (${siteArea} ha). Please correct this before proceeding.`);
          return;
        }
      }
    }

    setIsUploading(true);
    try {
      if (currentPhase < 5) {
        await new Promise(r => setTimeout(r, 1000));
        setCurrentPhase(currentPhase + 1);
      } else {
        // Assuming you have the project_id from context or props. 
        // For demonstration, we'll use a placeholder '1' if none exists.
        const currentProjectId = projectId || 1; 
        const response = await fetch(`/api/reports/projects/${currentProjectId}/generate_groq/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${token}` // Add auth if needed
          },
          body: JSON.stringify({ ...formData, location: position })
        });
        
        if (!response.ok) throw new Error('Failed to start AI generation');
        
        // Generation is running in the background!
        alert("AI Generation Started! The 120B model is writing your report in the background. Check back in 5 minutes.");
        
        if (onComplete) onComplete({ ...formData, location: position }, files);
      }
    } catch (err) {
      console.error(err);
      alert("Error triggering the Groq generator.");
    } finally {
      setIsUploading(false);
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
            
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" name="isMegaProject" checked={formData.isMegaProject || false} onChange={(e) => setFormData({...formData, isMegaProject: e.target.checked})} className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                <div>
                  <span className="text-base font-bold text-indigo-900">Linear Infrastructure / Mega-Project Mode</span>
                  <p className="text-xs text-indigo-700 mt-1">Check this for multi-county projects, highways, or transmission lines. It replaces strict single-point fields with flexible summaries.</p>
                </div>
              </label>
            </div>

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
                        <option value="Water">Water & Sanitation (Boreholes, Dams, Pipelines)</option>
                        <option value="Waste">Waste Management (Landfills, Incinerators)</option>
                        <option value="Energy">Energy (Solar/Wind/Geothermal)</option>
                        <option value="Real Estate">Real Estate & Housing</option>
                        <option value="Mining">Mining & Quarrying</option>
                        <option value="Manufacturing">Manufacturing/Agro-Processing</option>
                        <option value="Agriculture">Agriculture & Forestry</option>
                    </select>
                  </div>
                  
                  {/* DYNAMIC ENGINEERING SPECS */}
                  <div className="col-span-1 md:col-span-2 mt-6 pt-6 border-t border-gray-200">
                    <h4 className="font-bold text-gray-800 mb-4">Category-Specific Engineering Specifications</h4>
                    
                    {formData.projectCategory === 'Mining' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Production/Crushing Capacity *</label>
                          <input type="text" name="productionCapacity" value={formData.engineeringSpecs?.productionCapacity || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. 500 t/day" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Explosive Type & Blast Schedule *</label>
                          <input type="text" name="explosiveType" value={formData.engineeringSpecs?.explosiveType || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. ANFO, bi-weekly" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Daily Haul Truck Volume *</label>
                          <input type="text" name="truckVolume" value={formData.engineeringSpecs?.truckVolume || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. 40 trips/day" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Generator / Power Rating *</label>
                          <input type="text" name="powerRating" value={formData.engineeringSpecs?.powerRating || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. 800 kVA" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Daily Water Consumption *</label>
                          <input type="text" name="waterConsumption" value={formData.engineeringSpecs?.waterConsumption || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. 15,000 L/day" />
                        </div>
                      </div>
                    )}
                    
                    {formData.projectCategory === 'Manufacturing' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Throughput / Processing Capacity *</label>
                          <input type="text" name="processingCapacity" value={formData.engineeringSpecs?.processingCapacity || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. 300 t/day" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Effluent Discharge Rate *</label>
                          <input type="text" name="effluentRate" value={formData.engineeringSpecs?.effluentRate || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. Zero-discharge / 50 m3/day" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Storage Silo/Tank Capacity *</label>
                          <input type="text" name="storageCapacity" value={formData.engineeringSpecs?.storageCapacity || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. 15,000 tonnes" />
                        </div>
                      </div>
                    )}

                    {formData.projectCategory === 'Real Estate' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Unit Type Breakdown *</label>
                          <input type="text" name="unitBreakdown" value={formData.engineeringSpecs?.unitBreakdown || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. 300 apartments, 112 townhouses" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">PSTP Treatment Capacity (m³/day) *</label>
                          <input type="text" name="pstpCapacity" value={formData.engineeringSpecs?.pstpCapacity || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. 600 m3/day" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Peak Daily Water Demand (m³/day) *</label>
                          <input type="text" name="waterDemand" value={formData.engineeringSpecs?.waterDemand || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. 800 m3/day" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Average Daily Traffic (ADT) *</label>
                          <input type="text" name="avgDailyTraffic" value={formData.engineeringSpecs?.avgDailyTraffic || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. 450 vehicles/day" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Peak Hour Vehicle Count *</label>
                          <input type="text" name="peakHourTraffic" value={formData.engineeringSpecs?.peakHourTraffic || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. 120 vehicles/hr" />
                        </div>
                      </div>
                    )}

                    {formData.projectCategory === 'Energy' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Plant Capacity (MW) *</label>
                          <input type="text" name="plantCapacity" value={formData.engineeringSpecs?.plantCapacity || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. 50 MW" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Panel Array Footprint (ha) *</label>
                          <input type="text" name="arrayFootprint" value={formData.engineeringSpecs?.arrayFootprint || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. 45 ha" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Direct Operations Employment *</label>
                          <input type="text" name="opsEmployment" value={formData.engineeringSpecs?.opsEmployment || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. 25 permanent staff" />
                        </div>
                      </div>
                    )}

                    {formData.projectCategory === 'Infrastructure' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Total Length (km) *</label>
                          <input type="text" name="roadLength" value={formData.engineeringSpecs?.roadLength || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. 15 km" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Right-of-Way Width (m) *</label>
                          <input type="text" name="rowWidth" value={formData.engineeringSpecs?.rowWidth || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. 30 meters" />
                        </div>
                      </div>
                    )}
                    
                    {formData.projectCategory === 'Water' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Target Drilling Depth (m)</label>
                          <input type="text" name="targetDepth" value={formData.engineeringSpecs?.targetDepth || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. 200 m" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Expected Yield (m³/hr)</label>
                          <input type="text" name="expectedYield" value={formData.engineeringSpecs?.expectedYield || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. 15 m³/hr" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Storage Tank Capacity (Liters)</label>
                          <input type="text" name="storageTankCapacity" value={formData.engineeringSpecs?.storageTankCapacity || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. 10,000 L" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Distribution Network Length (km)</label>
                          <input type="text" name="distributionLength" value={formData.engineeringSpecs?.distributionLength || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. 2.5 km (Optional)" />
                        </div>
                      </div>
                    )}

                    {formData.projectCategory === 'Waste' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Waste Characterization *</label>
                          <input type="text" name="wasteCharacterization" value={formData.engineeringSpecs?.wasteCharacterization || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. MSW, Medical, Hazardous" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Daily Intake Tonnage (t/day) *</label>
                          <input type="text" name="dailyIntake" value={formData.engineeringSpecs?.dailyIntake || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. 150 t/day" />
                        </div>
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 mt-2 border-gray-100">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Liner System Specifications *</label>
                            <input type="text" name="linerSpecs" value={formData.engineeringSpecs?.linerSpecs || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. 2mm HDPE Geomembrane + GCL" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Leachate Management Plan *</label>
                            <input type="text" name="leachatePlan" value={formData.engineeringSpecs?.leachatePlan || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. Collection pipes to onsite aerobic PSTP" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Landfill Gas / Methane Management *</label>
                            <input type="text" name="gasManagement" value={formData.engineeringSpecs?.gasManagement || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. Passive venting / Active flaring" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lifespan per Cell (Years) *</label>
                            <input type="text" name="cellLifespan" value={formData.engineeringSpecs?.cellLifespan || ''} onChange={handleSpecChange} className="w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. 5 years per cell" />
                          </div>
                        </div>
                      </div>
                    )}
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Operational Lifespan (Years)</label>
                    <input type="number" name="operationalLifespan" value={formData.operationalLifespan} onChange={handleInputChange} 
                           className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. 30" />
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
                
                {!formData.isMegaProject ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">County *</label>
                      <input type="text" name="county" value={formData.county} onChange={handleInputChange} 
                             className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. Kajiado" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sub-county *</label>
                      <input type="text" name="subCounty" value={formData.subCounty} onChange={handleInputChange} 
                             className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. Kajiado North" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ward *</label>
                      <input type="text" name="ward" value={formData.ward} onChange={handleInputChange} 
                             className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. Ongata Rongai" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Plot / LR Number *</label>
                      <input type="text" name="plotNumber" value={formData.plotNumber} onChange={handleInputChange} 
                             className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. LR No. 1234/56" />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Counties & Wards Traversed *</label>
                      <textarea name="countiesTraversed" value={formData.countiesTraversed || ''} onChange={handleInputChange} rows={2}
                             className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. Nakuru County (Naivasha, Gilgil), Narok County (Suswa)" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Alignment Coordinates / Chainage Summary *</label>
                      <textarea name="alignmentCoordinates" value={formData.alignmentCoordinates || ''} onChange={handleInputChange} rows={2}
                             className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. Starts at Suswa (-1.158, 36.339), ends at Naivasha (-0.717, 36.431)" />
                    </div>
                  </div>
                )}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Land Ownership Status *</label>
                    {!formData.isMegaProject ? (
                      <select name="landOwnership" value={formData.landOwnership} onChange={handleInputChange} className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border bg-white">
                        <option value="">Select Ownership Status</option>
                        <option value="Private Land - Freehold">Private Land - Freehold</option>
                        <option value="Private Land - Leasehold">Private Land - Leasehold</option>
                        <option value="Government Land - Way Leave">Government Land - Way Leave</option>
                        <option value="Community Land">Community Land</option>
                        <option value="Public Land">Public Land</option>
                        <option value="Mixed">Mixed</option>
                      </select>
                    ) : (
                      <textarea name="landTenureSummary" value={formData.landTenureSummary || ''} onChange={handleInputChange} rows={2}
                             className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. Mixed - Government road reserve, community group ranches, and compulsory acquisition of private freeholds" />
                    )}
                  </div>
                  
                  <div className="md:col-span-2 mt-2">
                    <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 p-3 rounded border border-gray-200">
                      <input type="checkbox" name="requiresRAP" checked={formData.requiresRAP || false} onChange={(e) => setFormData({...formData, requiresRAP: e.target.checked})} className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500" />
                      <span className="text-sm font-bold text-gray-800">Requires Compulsory Acquisition or Displacement (Triggers RAP)</span>
                    </label>
                  </div>

                  {formData.requiresRAP && (
                    <div className="md:col-span-2 mt-2 p-4 bg-amber-50 border border-amber-200 rounded-lg animate-fadeIn">
                      <h5 className="font-bold text-amber-800 mb-4 border-b border-amber-200 pb-2">Resettlement Action Plan (RAP) Details</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-amber-900 mb-1">Project-Affected Households (PAHs)</label>
                          <input type="number" name="rapPAHs" value={formData.rapPAHs || ''} onChange={handleInputChange} className="w-full rounded-md border-amber-300 shadow-sm p-2 border bg-white" placeholder="e.g. 46" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-amber-900 mb-1">Project-Affected Persons (PAPs)</label>
                          <input type="number" name="rapPAPs" value={formData.rapPAPs || ''} onChange={handleInputChange} className="w-full rounded-md border-amber-300 shadow-sm p-2 border bg-white" placeholder="e.g. 211" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-amber-900 mb-1">Structures Affected</label>
                          <input type="text" name="rapStructures" value={formData.rapStructures || ''} onChange={handleInputChange} className="w-full rounded-md border-amber-300 shadow-sm p-2 border bg-white" placeholder="e.g. 31 residential, 8 commercial kiosks" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-amber-900 mb-1">Cut-off Date</label>
                          <input type="date" name="rapCutoffDate" value={formData.rapCutoffDate || ''} onChange={handleInputChange} className="w-full rounded-md border-amber-300 shadow-sm p-2 border bg-white" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-amber-900 mb-1">Compensation Methodology</label>
                          <input type="text" name="rapMethodology" value={formData.rapMethodology || ''} onChange={handleInputChange} className="w-full rounded-md border-amber-300 shadow-sm p-2 border bg-white" placeholder="e.g. Replacement cost, no depreciation" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="md:col-span-2 mt-2">
                    <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 p-3 rounded border border-gray-200">
                      <input type="checkbox" name="requiresProtectedArea" checked={formData.requiresProtectedArea || false} onChange={(e) => setFormData({...formData, requiresProtectedArea: e.target.checked})} className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500" />
                      <span className="text-sm font-bold text-gray-800">Site Overlaps with Protected Area (Forest Reserve, National Park, Riparian)</span>
                    </label>
                  </div>

                  {formData.requiresProtectedArea && (
                    <div className="md:col-span-2 mt-2 p-4 bg-rose-50 border border-rose-200 rounded-lg animate-fadeIn">
                      <h5 className="font-bold text-rose-800 mb-4 border-b border-rose-200 pb-2">Protected Area Overlap Details</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-rose-900 mb-1">Protected Area Name</label>
                          <input type="text" name="protectedAreaName" value={formData.protectedAreaName || ''} onChange={handleInputChange} className="w-full rounded-md border-rose-300 shadow-sm p-2 border bg-white" placeholder="e.g. Kieni Forest Reserve" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-rose-900 mb-1">Managing Authority</label>
                          <select name="managingAuthority" value={formData.managingAuthority || ''} onChange={handleInputChange} className="w-full rounded-md border-rose-300 shadow-sm p-2 border bg-white">
                              <option value="">Select Authority</option>
                              <option value="KFS">Kenya Forest Service (KFS)</option>
                              <option value="KWS">Kenya Wildlife Service (KWS)</option>
                              <option value="WRA">Water Resources Authority (WRA)</option>
                              <option value="NMK">National Museums of Kenya (NMK)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-rose-900 mb-1">Overlap Area (Hectares)</label>
                          <input type="number" step="0.1" name="overlapArea" value={formData.overlapArea || ''} onChange={handleInputChange} className="w-full rounded-md border-rose-300 shadow-sm p-2 border bg-white" placeholder="e.g. 0.9" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-rose-900 mb-1">Affected Project Components</label>
                          <input type="text" name="affectedComponents" value={formData.affectedComponents || ''} onChange={handleInputChange} className="w-full rounded-md border-rose-300 shadow-sm p-2 border bg-white" placeholder="e.g. 6 guest cottages" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="md:col-span-2 mt-2">
                    <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 p-3 rounded border border-gray-200">
                      <input type="checkbox" name="requiresContamination" checked={formData.requiresContamination || false} onChange={(e) => setFormData({...formData, requiresContamination: e.target.checked})} className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500" />
                      <span className="text-sm font-bold text-gray-800">Site has History of Industrial Use or Known Contamination (Brownfield)</span>
                    </label>
                  </div>

                  {formData.requiresContamination && (
                    <div className="md:col-span-2 mt-2 p-4 bg-purple-50 border border-purple-200 rounded-lg animate-fadeIn">
                      <h5 className="font-bold text-purple-800 mb-4 border-b border-purple-200 pb-2">Contaminated Land & Brownfield Details</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-purple-900 mb-1">Prior Site Use & History</label>
                          <input type="text" name="priorSiteUse" value={formData.priorSiteUse || ''} onChange={handleInputChange} className="w-full rounded-md border-purple-300 shadow-sm p-2 border bg-white" placeholder="e.g. Decommissioned fuel storage depot (1974-2009)" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-purple-900 mb-1">Key Contaminants of Concern</label>
                          <input type="text" name="contaminantsOfConcern" value={formData.contaminantsOfConcern || ''} onChange={handleInputChange} className="w-full rounded-md border-purple-300 shadow-sm p-2 border bg-white" placeholder="e.g. TPH, Benzene, Heavy Metals" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-purple-900 mb-1">Proposed Remediation Strategy</label>
                          <input type="text" name="remediationStrategy" value={formData.remediationStrategy || ''} onChange={handleInputChange} className="w-full rounded-md border-purple-300 shadow-sm p-2 border bg-white" placeholder="e.g. Excavation and off-site disposal" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-purple-900 mb-1">Max Soil Contamination Detected</label>
                          <input type="text" name="maxSoilContamination" value={formData.maxSoilContamination || ''} onChange={handleInputChange} className="w-full rounded-md border-purple-300 shadow-sm p-2 border bg-white" placeholder="e.g. TPH: 3,400 mg/kg" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-purple-900 mb-1">Max Groundwater Contamination</label>
                          <input type="text" name="maxWaterContamination" value={formData.maxWaterContamination || ''} onChange={handleInputChange} className="w-full rounded-md border-purple-300 shadow-sm p-2 border bg-white" placeholder="e.g. Benzene: 0.08 mg/L" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {!formData.isMegaProject && (
                  <div className="mt-4">
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
                )}
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">4. Project Description & Alternatives</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Project Description *</label>
                    <textarea name="projectDescription" value={formData.projectDescription} onChange={handleInputChange} rows={3}
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" 
                              placeholder="Describe the scope, activities, and design of the project..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alternatives Considered *</label>
                    <textarea name="alternativesConsidered" value={formData.alternativesConsidered} onChange={handleInputChange} rows={3}
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" 
                              placeholder="e.g. Alternative 1: No-action... Alternative 2: Different routing... Selected: Current..." />
                  </div>
                </div>
            </div>

            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors">
              <label className="flex flex-col items-center justify-center cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm font-bold text-gray-700">
                  {formData.projectCategory === 'Waste' ? 'Upload Landfill Cell & Leachate Designs (PDF)' : 'Upload Engineering / Architectural Designs (PDF)'}
                </span>
                <span className="text-xs text-gray-400 mt-1">{files.engineering_design ? files.engineering_design.name : 'No file selected'}</span>
                <input type="file" className="hidden" onChange={(e) => handleFileChange('engineering_design', e)} />
              </label>
            </div>
          </div>
        )}

        {currentPhase === 2 && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Baseline Conditions */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">1. Baseline Conditions</h4>
                
                {!formData.isMegaProject ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Air Quality: PM2.5 (µg/m³)</label>
                        <input type="number" name="airQualityPM25" value={formData.airQualityPM25} onChange={handleInputChange} 
                               className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. 12" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Air Quality: PM10 (µg/m³)</label>
                        <input type="number" name="airQualityPM10" value={formData.airQualityPM10} onChange={handleInputChange} 
                               className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. 25" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Noise Level (Leq in dBA)</label>
                        <input type="number" name="noiseLevel" value={formData.noiseLevel} onChange={handleInputChange} 
                               className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. 45" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Existing Land Use / Cover</label>
                        <input type="text" name="existingLandUse" value={formData.existingLandUse} onChange={handleInputChange} 
                               className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. Mixed Agriculture" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Groundwater Depth (m)</label>
                        <input type="number" name="groundwaterDepth" value={formData.groundwaterDepth} onChange={handleInputChange} 
                               className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. 50" />
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4 border border-gray-100">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Measurement Date / Month</label>
                        <input type="month" name="baselineDate" value={formData.baselineDate} onChange={handleInputChange} 
                               className="w-full rounded border-gray-300 p-1.5 border text-sm bg-white" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Season</label>
                        <select name="baselineSeason" value={formData.baselineSeason} onChange={handleInputChange} className="w-full rounded border-gray-300 p-1.5 border text-sm bg-white">
                            <option value="Dry Season">Dry Season</option>
                            <option value="Wet Season">Wet Season</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Data Source / Method</label>
                        <select name="baselineSource" value={formData.baselineSource} onChange={handleInputChange} className="w-full rounded border-gray-300 p-1.5 border text-sm bg-white">
                            <option value="Field Instrument">Field Instrument</option>
                            <option value="Desktop Estimate">Desktop Estimate</option>
                            <option value="Satellite Derived">Satellite Derived</option>
                            <option value="Secondary Literature">Secondary Literature</option>
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Segmented Baseline / Corridor Summary *</label>
                    <textarea name="baselineSummary" value={formData.baselineSummary || ''} onChange={handleInputChange} rows={4}
                           className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. Air quality ranges from 9 µg/m³ (Suswa segment) to 31 µg/m³ (Naivasha). Groundwater varies from 15-90m. Predominantly rangeland crossing into escarpment." />
                  </div>
                )}
            </div>

            {/* Sensitive Receptors */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">2. Sensitive Receptors within 1km</h4>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {['Hospitals / Clinics', 'Schools', 'Places of Worship', 'Rivers / Wetlands', 'National Parks', 'Gazetted Forest Reserves', 'Archaeological / Cultural Heritage', 'Residential Settlements', 'Boreholes'].map((item) => (
                  <div key={item} className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden transition-all">
                    <label className="flex items-center space-x-3 p-3 bg-white hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                      <input type="checkbox" checked={!!formData.sensitiveReceptors[item]} onChange={() => handleReceptorToggle(item)} 
                             className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
                      <span className="text-sm font-medium text-gray-700">{item}</span>
                    </label>
                    {formData.sensitiveReceptors[item] && (
                      <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-50 text-sm animate-fadeIn">
                        <div>
                           <label className="block text-xs text-gray-500 mb-1">Name / Identifier *</label>
                           <input type="text" value={formData.sensitiveReceptors[item].name} onChange={(e) => handleReceptorField(item, 'name', e.target.value)}
                                  className="w-full rounded border-gray-300 p-1.5 border bg-white" placeholder="e.g. Ruiru River" />
                        </div>
                        <div>
                           <label className="block text-xs text-gray-500 mb-1">Distance (Meters) *</label>
                           <input type="number" value={formData.sensitiveReceptors[item].distance} onChange={(e) => handleReceptorField(item, 'distance', e.target.value)}
                                  className="w-full rounded border-gray-300 p-1.5 border bg-white" placeholder="e.g. 450" />
                        </div>
                        <div>
                           <label className="block text-xs text-gray-500 mb-1">Direction / Bearing *</label>
                           <select value={formData.sensitiveReceptors[item].direction} onChange={(e) => handleReceptorField(item, 'direction', e.target.value)}
                                   className="w-full rounded border-gray-300 p-1.5 border bg-white">
                               <option value="">Select Direction</option>
                               <option value="N">North (N)</option>
                               <option value="NE">Northeast (NE)</option>
                               <option value="E">East (E)</option>
                               <option value="SE">Southeast (SE)</option>
                               <option value="S">South (S)</option>
                               <option value="SW">Southwest (SW)</option>
                               <option value="W">West (W)</option>
                               <option value="NW">Northwest (NW)</option>
                           </select>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Specialist Surveys */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-bold text-gray-800 mb-4 border-b pb-2 flex justify-between items-center">
                  <span>3. Specialist Surveys (PDF)</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lead Specialist / Firm Name</label>
                    <input type="text" name="specialistName" value={formData.specialistName} onChange={handleInputChange} 
                           className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. Dr. Jane Doe / EarthSciences Ltd" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fieldwork Date</label>
                    <input type="date" name="specialistDate" value={formData.specialistDate} onChange={handleInputChange} 
                           className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" />
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                  <label className="flex flex-col items-center justify-center cursor-pointer text-center h-full">
                    <Upload className="w-6 h-6 text-gray-400 mb-2" />
                    <span className="text-sm font-medium text-gray-600">Soil / Geotech Survey</span>
                    <span className="text-xs text-gray-400 mt-1">{files.soil_survey ? files.soil_survey.name : 'Optional'}</span>
                    <input type="file" className="hidden" onChange={(e) => handleFileChange('soil_survey', e)} />
                  </label>
                </div>
                <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                  <label className="flex flex-col items-center justify-center cursor-pointer text-center h-full">
                    <Upload className="w-6 h-6 text-gray-400 mb-2" />
                    <span className="text-sm font-medium text-gray-600">Biodiversity Survey</span>
                    <span className="text-xs text-gray-400 mt-1">{files.biodiversity_survey ? files.biodiversity_survey.name : 'Optional'}</span>
                    <input type="file" className="hidden" onChange={(e) => handleFileChange('biodiversity_survey', e)} />
                  </label>
                </div>
                <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                  <label className="flex flex-col items-center justify-center cursor-pointer text-center h-full">
                    <Upload className="w-6 h-6 text-gray-400 mb-2" />
                    <span className="text-sm font-medium text-gray-600">Hydrology / Hydrogeological Survey</span>
                    <span className="text-xs text-gray-400 mt-1">{files.hydrology_report ? files.hydrology_report.name : 'PDF up to 20MB'}</span>
                    <input type="file" className="hidden" onChange={(e) => handleFileChange('hydrology_report', e)} />
                  </label>
                </div>
                {formData.requiresRAP && (
                  <>
                    <div className="p-4 border-2 border-dashed border-amber-300 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors">
                      <label className="flex flex-col items-center justify-center cursor-pointer text-center h-full">
                        <Upload className="w-6 h-6 text-amber-500 mb-2" />
                        <span className="text-sm font-medium text-amber-900">Resettlement Action Plan (RAP)</span>
                        <span className="text-xs text-amber-700 mt-1">{files.rap_report ? files.rap_report.name : 'Required for RAP'}</span>
                        <input type="file" className="hidden" onChange={(e) => handleFileChange('rap_report', e)} />
                      </label>
                    </div>
                    <div className="p-4 border-2 border-dashed border-amber-300 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors">
                      <label className="flex flex-col items-center justify-center cursor-pointer text-center h-full">
                        <Upload className="w-6 h-6 text-amber-500 mb-2" />
                        <span className="text-sm font-medium text-amber-900">Asset Valuation Report</span>
                        <span className="text-xs text-amber-700 mt-1">{files.valuation_report ? files.valuation_report.name : 'Required for RAP'}</span>
                        <input type="file" className="hidden" onChange={(e) => handleFileChange('valuation_report', e)} />
                      </label>
                    </div>
                  </>
                )}
                {formData.requiresProtectedArea && (
                  <>
                    <div className="p-4 border-2 border-dashed border-rose-300 rounded-lg bg-rose-50 hover:bg-rose-100 transition-colors">
                      <label className="flex flex-col items-center justify-center cursor-pointer text-center h-full">
                        <Upload className="w-6 h-6 text-rose-500 mb-2" />
                        <span className="text-sm font-medium text-rose-900">Statutory Consent ({formData.managingAuthority || 'Authority'})</span>
                        <span className="text-xs text-rose-700 mt-1">{files.statutory_consent ? files.statutory_consent.name : 'Required for Overlap'}</span>
                        <input type="file" className="hidden" onChange={(e) => handleFileChange('statutory_consent', e)} />
                      </label>
                    </div>
                    <div className="p-4 border-2 border-dashed border-rose-300 rounded-lg bg-rose-50 hover:bg-rose-100 transition-colors">
                      <label className="flex flex-col items-center justify-center cursor-pointer text-center h-full">
                        <Upload className="w-6 h-6 text-rose-500 mb-2" />
                        <span className="text-sm font-medium text-rose-900">Management Plan Compatibility</span>
                        <span className="text-xs text-rose-700 mt-1">{files.management_compatibility ? files.management_compatibility.name : 'Required for Overlap'}</span>
                        <input type="file" className="hidden" onChange={(e) => handleFileChange('management_compatibility', e)} />
                      </label>
                    </div>
                  </>
                )}
                {formData.requiresContamination && (
                  <>
                    <div className="p-4 border-2 border-dashed border-purple-300 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors">
                      <label className="flex flex-col items-center justify-center cursor-pointer text-center h-full">
                        <Upload className="w-6 h-6 text-purple-500 mb-2" />
                        <span className="text-sm font-medium text-purple-900">Phase 1 ESA (Site History)</span>
                        <span className="text-xs text-purple-700 mt-1">{files.phase1_esa ? files.phase1_esa.name : 'Required for Brownfields'}</span>
                        <input type="file" className="hidden" onChange={(e) => handleFileChange('phase1_esa', e)} />
                      </label>
                    </div>
                    <div className="p-4 border-2 border-dashed border-purple-300 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors">
                      <label className="flex flex-col items-center justify-center cursor-pointer text-center h-full">
                        <Upload className="w-6 h-6 text-purple-500 mb-2" />
                        <span className="text-sm font-medium text-purple-900">Phase 2 ESA (Remediation)</span>
                        <span className="text-xs text-purple-700 mt-1">{files.phase2_esa ? files.phase2_esa.name : 'Required for Brownfields'}</span>
                        <input type="file" className="hidden" onChange={(e) => handleFileChange('phase2_esa', e)} />
                      </label>
                    </div>
                  </>
                )}
                {formData.isMegaProject && (
                  <div className="p-4 border-2 border-dashed border-indigo-300 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors md:col-span-3">
                    <label className="flex flex-col items-center justify-center cursor-pointer text-center h-full">
                      <Upload className="w-6 h-6 text-indigo-500 mb-2" />
                      <span className="text-sm font-medium text-indigo-900">Other Specialized Study (e.g. Seismic, SIA)</span>
                      <span className="text-xs text-indigo-700 mt-1">{files.other_study ? files.other_study.name : 'Optional for Mega-Projects'}</span>
                      <input type="file" className="hidden" onChange={(e) => handleFileChange('other_study', e)} />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {currentPhase === 3 && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Public Notification (Reg 17) */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-4 border-b pb-2 flex justify-between items-center">
                    <span>1. Public Notification (Reg 17)</span>
                    <label className="flex items-center space-x-2 text-sm font-normal cursor-pointer bg-gray-50 px-2 py-1 rounded border border-gray-200">
                        <input type="checkbox" name="newspaperWaiver" checked={formData.newspaperWaiver || false} onChange={(e) => setFormData({...formData, newspaperWaiver: e.target.checked})} className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500" />
                        <span className="text-gray-700">Waiver / N/A (Low Risk Project)</span>
                    </label>
                </h4>
                
                {!formData.newspaperWaiver && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Newspaper Name *</label>
                        <input type="text" name="newspaperName" value={formData.newspaperName} onChange={handleInputChange} 
                               className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. Daily Nation" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Publication Date *</label>
                        <input type="date" name="publicationDate" value={formData.publicationDate} onChange={handleInputChange} 
                               className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notice Period (Days) *</label>
                        <input type="number" name="noticePeriod" value={formData.noticePeriod} onChange={handleInputChange} 
                               className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. 14 or 30" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Other Notification Medium</label>
                        <input type="text" name="otherNotification" value={formData.otherNotification} onChange={handleInputChange} 
                               className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. Local Radio / Chief Baraza" />
                      </div>
                    </div>
                    <div className="p-3 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-white transition-colors">
                      <label className="flex items-center justify-center cursor-pointer">
                        <Upload className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-600 mr-2">Upload Newspaper Tear-sheet (PDF/Image) *</span>
                        <span className="text-xs text-gray-400">{files.newspaper_notice ? files.newspaper_notice.name : 'Missing'}</span>
                        <input type="file" className="hidden" onChange={(e) => handleFileChange('newspaper_notice', e)} />
                      </label>
                    </div>
                  </>
                )}
            </div>

            {/* Baraza Logistics & Attendance */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">2. Baraza Logistics & Stakeholders</h4>
                
                {!formData.isMegaProject ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Meeting *</label>
                      <input type="date" name="barazaDate" value={formData.barazaDate} onChange={handleInputChange} 
                             className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Venue / Location *</label>
                      <input type="text" name="barazaVenue" value={formData.barazaVenue} onChange={handleInputChange} 
                             className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. Chief's Camp, Rongai" />
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Schedule & Venues Summary *</label>
                    <textarea name="consultationSchedule" value={formData.consultationSchedule || ''} onChange={handleInputChange} rows={3}
                           className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. 2026-05-04 (Suswa Trading Centre), 2026-05-11 (Mai Mahiu), 2026-05-18 (Naivasha). Total 3 barazas." />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Attendees *</label>
                    <input type="number" name="attendeeCount" value={formData.attendeeCount} onChange={handleInputChange} 
                           className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. 150" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Facilitator / Lead Expert *</label>
                    <input type="text" name="facilitatingOfficer" value={formData.facilitatingOfficer} onChange={handleInputChange} 
                           className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. John Doe (NEMA/EIA/123)" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Male</label>
                    <input type="number" name="attendeesMale" value={formData.attendeesMale} onChange={handleInputChange} 
                           className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. 80" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Female</label>
                    <input type="number" name="attendeesFemale" value={formData.attendeesFemale} onChange={handleInputChange} 
                           className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. 70" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Language(s) Used</label>
                    <input type="text" name="barazaLanguage" value={formData.barazaLanguage} onChange={handleInputChange} 
                           className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. Kiswahili, Kikuyu" />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stakeholder Groups Consulted (Check all present)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Local Administration (Chief/DO)', 'County Government Officials', 'Project Affected Persons (PAPs)', 'Neighbors / Immediate Community', 'CBOs / NGOs', 'Youth Representatives', 'Women Representatives', 'Other Agencies (e.g. KWS, WRMA)'].map((group) => (
                      <label key={group} className="flex items-center space-x-2 p-2 border rounded bg-gray-50 hover:bg-white cursor-pointer text-sm">
                        <input type="checkbox" checked={!!formData.stakeholderGroups[group]} onChange={() => handleStakeholderToggle(group)} 
                               className="text-emerald-600 rounded" />
                        <span className="text-gray-700">{group}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="p-3 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-white transition-colors">
                  <label className="flex flex-col items-center justify-center cursor-pointer">
                    <Upload className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-sm font-medium text-gray-600">Upload Signed Attendance Sheets & Minutes (PDF) *</span>
                    <span className="text-xs text-gray-400">{files.baraza_minutes ? files.baraza_minutes.name : 'Missing'}</span>
                    <input type="file" className="hidden" onChange={(e) => handleFileChange('baraza_minutes', e)} />
                  </label>
            </div>

            {/* Inclusion & Grievance */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">3. Inclusion & Grievance Redress</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vulnerable/Marginalized Groups Addressed</label>
                    <input type="text" name="vulnerableGroups" value={formData.vulnerableGroups} onChange={handleInputChange} 
                           className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. Provisions made for PWDs access..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grievance Redress Mechanism (GRM) Proposed?</label>
                    <select name="grmEstablished" value={formData.grmEstablished} onChange={handleInputChange} className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border bg-white mb-2">
                        <option value="Yes">Yes - GRM Committee Formed/Proposed</option>
                        <option value="No">No GRM</option>
                    </select>
                    {formData.grmEstablished === 'Yes' && (
                        <input type="text" name="grmContact" value={formData.grmContact} onChange={handleInputChange} 
                               className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border text-sm" placeholder="GRM Contact Person / Phone Number" />
                    )}
                  </div>
                </div>
            </div>

            {/* Documented Concerns & Responses */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">4. Documented Concerns & Proponent Mitigations</h4>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {formData.communityConcerns.map((item, index) => (
                    <div key={index} className="flex flex-col gap-3 border p-3 rounded-lg bg-gray-50">
                      <div className="flex flex-col md:flex-row gap-3">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Community Concern #{index + 1}</label>
                            <textarea value={item.concern} onChange={(e) => handleConcernChange(index, 'concern', e.target.value)} rows={2}
                                      className="w-full rounded border-gray-300 p-2 border text-sm bg-white" placeholder="e.g. Dust during construction affecting local shops" />
                          </div>
                          <div className="w-full md:w-1/3">
                            <label className="block text-xs text-gray-500 mb-1">Category</label>
                            <select value={item.category} onChange={(e) => handleConcernChange(index, 'category', e.target.value)}
                                    className="w-full rounded border-gray-300 p-2 border text-sm bg-white">
                                <option value="Environmental">Environmental</option>
                                <option value="Social">Social</option>
                                <option value="Economic">Economic</option>
                                <option value="Labor">Labor / Health</option>
                            </select>
                          </div>
                      </div>
                      <div>
                        <label className="block text-xs text-emerald-600 mb-1 font-medium">Proponent Response / Mitigation</label>
                        <textarea value={item.response} onChange={(e) => handleConcernChange(index, 'response', e.target.value)} rows={2}
                                  className="w-full rounded border-gray-300 p-2 border text-sm bg-white" placeholder="e.g. Water bowsers will sprinkle the road 3x daily" />
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addConcern} className="mt-4 text-sm text-emerald-600 font-medium hover:text-emerald-700 flex items-center">
                  + Add Another Concern
                </button>
            </div>
          </div>
        )}

        {currentPhase === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">Environmental and Social Management Plan (EMP)</h4>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {formData.empRows.map((item, index) => (
                    <div key={index} className="flex flex-col gap-3 border p-3 rounded-lg bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Impact</label>
                            <input type="text" value={item.impact} onChange={(e) => handleEmpChange(index, 'impact', e.target.value)}
                                   className="w-full rounded border-gray-300 p-2 border text-sm bg-white" placeholder="e.g. Dust emissions during construction" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Mitigation</label>
                            <input type="text" value={item.mitigation} onChange={(e) => handleEmpChange(index, 'mitigation', e.target.value)}
                                   className="w-full rounded border-gray-300 p-2 border text-sm bg-white" placeholder="e.g. Water spraying 3x daily" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Responsible Party</label>
                            <input type="text" value={item.responsibleParty} onChange={(e) => handleEmpChange(index, 'responsibleParty', e.target.value)}
                                   className="w-full rounded border-gray-300 p-2 border text-sm bg-white" placeholder="e.g. Contractor" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Monitoring Frequency</label>
                            <input type="text" value={item.monitoringFrequency} onChange={(e) => handleEmpChange(index, 'monitoringFrequency', e.target.value)}
                                   className="w-full rounded border-gray-300 p-2 border text-sm bg-white" placeholder="e.g. Weekly" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Estimated Cost (KES)</label>
                            <input type="text" value={item.estCost} onChange={(e) => handleEmpChange(index, 'estCost', e.target.value)}
                                   className="w-full rounded border-gray-300 p-2 border text-sm bg-white" placeholder="e.g. 500,000" />
                          </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addEmpRow} className="mt-4 text-sm text-emerald-600 font-medium hover:text-emerald-700 flex items-center">
                  + Add EMP Row
                </button>
            </div>
          </div>
        )}

        {currentPhase === 5 && (
          <div className="space-y-6 animate-fadeIn">
            {(() => {
              const requiredFields = ['projectName', 'siteArea', 'county', 'plotNumber', 'proponentName', 'pin', 'investmentCost', 'timelineMonths', 'operationalLifespan', 'newspaperName', 'barazaDate'];
              const missingFields = requiredFields.filter(f => !formData[f]);
              const isReady = missingFields.length === 0;

              return (
                <>
                  <div className={`p-4 rounded-lg border ${isReady ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex items-center space-x-3 mb-2">
                      <CheckCircle2 className={`w-6 h-6 ${isReady ? 'text-emerald-600' : 'text-amber-600'}`} />
                      <h4 className={`font-bold ${isReady ? 'text-emerald-800' : 'text-amber-800'}`}>
                        {isReady ? 'Ready for AI Processing — your data is structured and compliant' : 'Incomplete Data — please fill missing fields before generating'}
                      </h4>
                    </div>
                    {!isReady && (
                      <p className="text-sm text-amber-700">Missing fields: {missingFields.join(', ')}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-2 bg-white p-4 rounded border border-gray-200">
                      <h5 className="font-bold text-gray-700 border-b pb-2 mb-3">Project Summary</h5>
                      <p><span className="font-semibold text-gray-600">Name:</span> {formData.projectName || 'Missing'}</p>
                      <p><span className="font-semibold text-gray-600">Category:</span> {formData.projectCategory}</p>
                      {!formData.isMegaProject ? (
                        <>
                          <p><span className="font-semibold text-gray-600">Location:</span> {formData.ward}, {formData.subCounty}, {formData.county}</p>
                          <p><span className="font-semibold text-gray-600">Coordinates:</span> {position ? `${position[0].toFixed(4)}, ${position[1].toFixed(4)}` : 'Missing'}</p>
                        </>
                      ) : (
                        <>
                          <p><span className="font-semibold text-indigo-700">Counties Traversed:</span> {formData.countiesTraversed || 'Missing'}</p>
                          <p><span className="font-semibold text-indigo-700">Alignment:</span> {formData.alignmentCoordinates || 'Missing'}</p>
                        </>
                      )}
                      <p><span className="font-semibold text-gray-600">Investment:</span> KES {formData.investmentCost ? Number(formData.investmentCost).toLocaleString() : 'Missing'}</p>
                      <p><span className="font-semibold text-gray-600">Lifespan:</span> {formData.operationalLifespan ? `${formData.operationalLifespan} years` : 'Missing'}</p>
                    </div>

                    <div className="space-y-2 bg-white p-4 rounded border border-gray-200">
                      <h5 className="font-bold text-gray-700 border-b pb-2 mb-3">Proponent Details</h5>
                      <p><span className="font-semibold text-gray-600">Name:</span> {formData.proponentName || 'Missing'}</p>
                      <p><span className="font-semibold text-gray-600">PIN:</span> {formData.pin || 'Missing'}</p>
                      {!formData.isMegaProject ? (
                        <p><span className="font-semibold text-gray-600">Plot:</span> {formData.plotNumber || 'Missing'} ({formData.landOwnership || 'Missing Tenure'})</p>
                      ) : (
                        <p><span className="font-semibold text-indigo-700">Land Tenure:</span> {formData.landTenureSummary || 'Missing'}</p>
                      )}
                      <p><span className="font-semibold text-gray-600">Lead Expert:</span> {formData.leadExpertReg}</p>
                      <p><span className="font-semibold text-gray-600">Receptors Found:</span> {Object.keys(formData.sensitiveReceptors).length}</p>
                      <p><span className="font-semibold text-gray-600">Stakeholder Groups:</span> {Object.keys(formData.stakeholderGroups).length}</p>
                    </div>

                    {formData.requiresRAP && (
                      <div className="space-y-2 bg-amber-50 p-4 rounded border border-amber-200 md:col-span-2">
                        <h5 className="font-bold text-amber-800 border-b border-amber-200 pb-2 mb-3">Resettlement & Land Acquisition (RAP)</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <p><span className="font-semibold text-amber-900">PAHs / PAPs:</span> {formData.rapPAHs || 'Missing'} Households / {formData.rapPAPs || 'Missing'} Persons</p>
                          <p><span className="font-semibold text-amber-900">Cut-off Date:</span> {formData.rapCutoffDate || 'Missing'}</p>
                          <p><span className="font-semibold text-amber-900">Structures:</span> {formData.rapStructures || 'Missing'}</p>
                          <p><span className="font-semibold text-amber-900">Methodology:</span> {formData.rapMethodology || 'Missing'}</p>
                        </div>
                      </div>
                    )}

                    {formData.requiresProtectedArea && (
                      <div className="space-y-2 bg-rose-50 p-4 rounded border border-rose-200 md:col-span-2">
                        <h5 className="font-bold text-rose-800 border-b border-rose-200 pb-2 mb-3">Protected Area Overlap</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <p><span className="font-semibold text-rose-900">Protected Area:</span> {formData.protectedAreaName || 'Missing'}</p>
                          <p><span className="font-semibold text-rose-900">Authority:</span> {formData.managingAuthority || 'Missing'}</p>
                          <p><span className="font-semibold text-rose-900">Overlap Area:</span> {formData.overlapArea ? `${formData.overlapArea} ha` : 'Missing'}</p>
                          <p><span className="font-semibold text-rose-900">Affected Components:</span> {formData.affectedComponents || 'Missing'}</p>
                        </div>
                      </div>
                    )}

                    {formData.requiresContamination && (
                      <div className="space-y-2 bg-purple-50 p-4 rounded border border-purple-200 md:col-span-2">
                        <h5 className="font-bold text-purple-800 border-b border-purple-200 pb-2 mb-3">Contaminated Land & Remediation (Brownfield)</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <p><span className="font-semibold text-purple-900">Prior Use:</span> {formData.priorSiteUse || 'Missing'}</p>
                          <p><span className="font-semibold text-purple-900">Contaminants:</span> {formData.contaminantsOfConcern || 'Missing'}</p>
                          <p><span className="font-semibold text-purple-900">Max Soil Level:</span> {formData.maxSoilContamination || 'Missing'}</p>
                          <p><span className="font-semibold text-purple-900">Max Water Level:</span> {formData.maxWaterContamination || 'Missing'}</p>
                          <p className="md:col-span-2"><span className="font-semibold text-purple-900">Remediation Strategy:</span> {formData.remediationStrategy || 'Missing'}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input type="checkbox" name="attestation" className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" 
                             checked={formData.attestation || false} 
                             onChange={(e) => setFormData({...formData, attestation: e.target.checked})} />
                      <div>
                        <span className="text-sm font-bold text-gray-800">Lead Expert Attestation</span>
                        <p className="text-xs text-gray-500 mt-1">
                          I, {formData.leadExpertReg}, confirm that the data provided in this wizard accurately reflects the baseline conditions, engineering designs, and stakeholder engagement records for this project. I authorize the EcoSense AI to generate a pre-approval ESIA draft based solely on this locked dataset.
                        </p>
                      </div>
                    </label>
                  </div>
                </>
              );
            })()}
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
          disabled={isUploading || (currentPhase === 1 && !position) || (currentPhase === 5 && (!formData.attestation || ['projectName', 'siteArea', 'county', 'plotNumber', 'proponentName', 'pin', 'investmentCost', 'timelineMonths', 'operationalLifespan', 'newspaperName', 'barazaDate'].some(f => !formData[f])))}
          className="flex items-center px-6 py-2 rounded-lg font-medium text-white transition-colors shadow-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Saving...</>
          ) : currentPhase === 5 ? (
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

