import React, { useState } from 'react';
import { Upload, FileText, Users, FlaskConical, CheckCircle2, ChevronRight, ChevronLeft, MapPin, Building, Loader2, Printer, ShieldAlert, FileCheck, X, Eye } from 'lucide-react';
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
  const [mapTileMode, setMapTileMode] = useState('satellite'); // 'satellite' | 'streets'
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);
  const [formData, setFormData] = useState({
    statutoryTrack: 'SPR', // 'SPR' (Summary Project Report - Low Risk) | 'CPR' (Comprehensive Project Report - Medium/High Risk)
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
    expertTier: 'LEAD', // 'LEAD' | 'ASSOCIATE'
    supervisingLeadExpert: '',
    waterSupplySource: 'Municipal / County Water Utility (e.g. NCWSC)',
    effluentDischargeM3Day: '',
    effluentDisposalMethod: '',
    effluentDischargePermitStatus: 'Not Applicable',
    leadExpertReg: 'NEMA/EIA/1234', // Auto-filled from user context
    // Questionnaire & Public Participation Analytics
    questionnairesAdministered: '',
    supportWithoutReservation: '',
    supportWithConditions: '',
    objectionsCount: '',
    objectionReasons: '',
    immediateNeighborsCount: '',
    acrossRoadCount: '',
    withinRadiusCount: '',
    areaChiefConsulted: '',
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
            
            {/* STATUTORY REGULATORY TRACK SELECTOR (Legal Notices 31 & 32 of 2019) */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 p-5 rounded-xl border-2 border-emerald-300 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📜</span>
                  <span className="text-base font-extrabold text-emerald-950">Statutory NEMA Application Track</span>
                </div>
                <span className="text-xs bg-emerald-200 text-emerald-800 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">EMCA Cap 387 / LN 31 & 32 (2019)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  onClick={() => setFormData({...formData, statutoryTrack: 'SPR'})}
                  className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${formData.statutoryTrack === 'SPR' ? 'bg-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20' : 'bg-white/70 border-gray-200 hover:border-emerald-300 opacity-75'}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                      <input type="radio" checked={formData.statutoryTrack === 'SPR'} onChange={() => {}} className="text-emerald-600 focus:ring-emerald-500 w-4 h-4" />
                      Summary Project Report (SPR)
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Low Risk</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Perimeter walls, single residential, boreholes, small commercial retail, access roads.</p>
                  <div className="mt-3 pt-2 border-t border-gray-100 text-[11px] font-semibold text-emerald-800 flex items-center justify-between">
                    <span>⚡ 5–7 Day NEMA Review</span>
                    <span>💵 Flat KES 10,000 Fee</span>
                  </div>
                </div>

                <div 
                  onClick={() => setFormData({...formData, statutoryTrack: 'CPR'})}
                  className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${formData.statutoryTrack === 'CPR' ? 'bg-white border-blue-600 shadow-md ring-2 ring-blue-500/20' : 'bg-white/70 border-gray-200 hover:border-blue-300 opacity-75'}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                      <input type="radio" checked={formData.statutoryTrack === 'CPR'} onChange={() => {}} className="text-blue-600 focus:ring-blue-500 w-4 h-4" />
                      Comprehensive Project Report (CPR / Full Study)
                    </span>
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Medium / High Risk</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Multi-story apartments, petrol stations, industrial facilities, major infrastructure.</p>
                  <div className="mt-3 pt-2 border-t border-gray-100 text-[11px] font-semibold text-blue-800 flex items-center justify-between">
                    <span>📋 30–60 Day Review</span>
                    <span>📊 Full 10-Chapter ESIA</span>
                  </div>
                </div>
              </div>
            </div>

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
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Investment Cost (KES) *</label>
                    <input type="number" name="investmentCost" value={formData.investmentCost} onChange={handleInputChange} 
                           className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border font-medium" placeholder="e.g. 1500000000" />
                    {Number(formData.investmentCost || 0) > 0 && (
                      <div className="mt-1.5 flex items-center justify-between text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded border border-emerald-200">
                        <span>Statutory NEMA Processing Fee Reference (0.1% Capital Investment):</span>
                        <strong className="font-mono text-emerald-900">KES {Number(formData.investmentCost * 0.001).toLocaleString(undefined, {maximumFractionDigits: 0})}</strong>
                      </div>
                    )}
                    {(() => {
                      const cost = Number(formData.investmentCost || 0);
                      const area = Number(formData.siteArea || 0);
                      const isSuspiciouslyLow = (cost > 0 && area > 0 && cost < 1000000) || (cost > 0 && ['Real Estate', 'Manufacturing', 'Infrastructure', 'Energy'].includes(formData.projectCategory) && cost < 2500000);
                      if (isSuspiciouslyLow) {
                        return (
                          <div className="mt-2 p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-800 leading-snug">
                            <span className="font-bold">⚠️ Certified BQ Alignment Advisory:</span> The declared investment cost (KES {cost.toLocaleString()}) appears unusually low for a {formData.projectCategory} project of this scale ({area} ha). NEMA Technical Advisory Committees cross-examine certified Bills of Quantities (BQs) to prevent statutory levy evasion. Ensure the BQ summary matches this declaration.
                          </div>
                        );
                      }
                      return null;
                    })()}
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

            {/* Proponent & Consultant Profile */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">2. Proponent Profile & EIA Consultant Certification</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Proponent Name (Company / Agency) *</label>
                    <input type="text" name="proponentName" value={formData.proponentName} onChange={handleInputChange} 
                           className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border" placeholder="e.g. KeNHA / Developer Ltd" />
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

                  {/* Consultant Tiering (Lead vs Associate Expert) */}
                  <div className="col-span-1 md:col-span-2 pt-3 border-t border-gray-100">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-2">
                      EIA/EA Consultant Licensing Tier (LN 101 Reg 13(2) vs Reg 2 & 7(3))
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Consultant Registration Tier *</label>
                        <select
                          name="expertTier"
                          value={formData.expertTier || 'LEAD'}
                          onChange={handleInputChange}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border bg-white text-sm"
                        >
                          <option value="LEAD">Lead Expert — Licensed for CPR, Full Study & SPR (Reg 13(2))</option>
                          <option value="ASSOCIATE">Associate Expert — Licensed for Low-Risk SPR only (Reg 2 & 7(3))</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Expert Practicing License / Reg No. *</label>
                        <input
                          type="text"
                          name="leadExpertReg"
                          value={formData.leadExpertReg}
                          onChange={handleInputChange}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border text-sm"
                          placeholder="e.g. NEMA/EIA/0876"
                        />
                      </div>
                    </div>

                    {/* Tier-Specific Regulatory Notice */}
                    {formData.expertTier === 'ASSOCIATE' && formData.statutoryTrack === 'CPR' && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <strong>Regulatory Notice (LN 101 Reg 13(2)):</strong> Comprehensive Project Reports (CPR) and full EIA Studies must be supervised and signed by a certified <strong>Lead Expert</strong>. Please provide the supervising Lead Expert of record:
                            <input
                              type="text"
                              name="supervisingLeadExpert"
                              value={formData.supervisingLeadExpert || ''}
                              onChange={handleInputChange}
                              className="mt-2 w-full rounded border-amber-300 p-1.5 border text-xs bg-white"
                              placeholder="e.g. Dr. Peninah Wanjiru (Lead Expert - NEMA/EIA/0123)"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {formData.expertTier === 'ASSOCIATE' && formData.statutoryTrack === 'SPR' && (
                      <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
                        <span><strong>Statutory Authorization (LN 101 Reg 2 & 7(3)):</strong> Registered Associate Experts are legally authorized to independently author and submit low-risk Summary Project Reports (SPRs).</span>
                      </div>
                    )}
                  </div>
                </div>
            </div>

            {/* 2B. Water Resources & Trade Effluent Permitting */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <h4 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center justify-between">
                  <span>2B. Water Supply & Trade Effluent Permitting (EMCA 2006 & Water Act 2016)</span>
                  <span className="text-xs bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded border border-blue-200 font-semibold">WRA & NEMA Compliance</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Water Supply Source *</label>
                    <select
                      name="waterSupplySource"
                      value={formData.waterSupplySource || 'Municipal / County Water Utility (e.g. NCWSC)'}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border bg-white text-sm"
                    >
                      <option value="Municipal / County Water Utility (e.g. NCWSC)">Municipal / County Water Utility (e.g. NCWSC, RUWASCO)</option>
                      <option value="Commercial Groundwater Borehole">Commercial Groundwater Borehole (On-site)</option>
                      <option value="River / Surface Water Abstraction">River / Surface Water Direct Abstraction</option>
                      <option value="Water Bowsers / Commercial Tankers">Water Bowsers / Private Commercial Tankers</option>
                      <option value="Rainwater Harvesting & Shallow Well">Rainwater Harvesting & Shallow Well</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Trade / Domestic Effluent (m³/day)</label>
                    <input
                      type="number"
                      name="effluentDischargeM3Day"
                      value={formData.effluentDischargeM3Day || ''}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border text-sm"
                      placeholder="e.g. 25 (0 for closed loop / zero discharge)"
                    />
                  </div>

                  {/* Water Act Alert for Borehole/River */}
                  {['Commercial Groundwater Borehole', 'River / Surface Water Abstraction'].includes(formData.waterSupplySource) && (
                    <div className="md:col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                      <strong>Section 36 Water Act 2016 Notice:</strong> Ground or surface water abstraction requires a <strong>Water Resources Authority (WRA) Abstraction Permit</strong> and an accredited Hydrogeological Assessment Report. Ensure the hydrogeological report is attached in Phase 2.
                    </div>
                  )}

                  {/* Effluent Disposal Options */}
                  {(Number(formData.effluentDischargeM3Day) > 0 || ['Manufacturing', 'Industrial', 'Mining', 'Real Estate'].includes(formData.projectCategory)) && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Effluent Treatment & Disposal Method *</label>
                        <select
                          name="effluentDisposalMethod"
                          value={formData.effluentDisposalMethod || 'Municipal Sewer Mains Connection'}
                          onChange={handleInputChange}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border bg-white text-sm"
                        >
                          <option value="Municipal Sewer Mains Connection">Municipal Sewer Mains Connection</option>
                          <option value="On-site Effluent Treatment Plant (ETP)">On-site Effluent Treatment Plant (ETP)</option>
                          <option value="Bio-digester & Polishing Reed Bed">Bio-digester & Polishing Reed Bed / Constructed Wetland</option>
                          <option value="Septic Tank & Soakage Pit">Septic Tank & Soakage Pit (Domestic Only)</option>
                          <option value="Closed-Loop / Zero Liquid Discharge (ZLD)">Closed-Loop / Zero Liquid Discharge (ZLD)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Effluent Discharge Licensing Status (EDL)</label>
                        <select
                          name="effluentDischargePermitStatus"
                          value={formData.effluentDischargePermitStatus || 'Application Prepared / Pending'}
                          onChange={handleInputChange}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border bg-white text-sm"
                        >
                          <option value="Not Applicable / Zero Discharge">Not Applicable / Zero Liquid Discharge</option>
                          <option value="Application Prepared / Pending">WRA / NEMA Discharge License Application Prepared / Pending</option>
                          <option value="NEMA Effluent Discharge License (EDL) Issued">Statutory NEMA Effluent Discharge License (EDL) Issued</option>
                          <option value="Municipal Sewer Connection Agreement Secured">Municipal Sewer Wayleave / Discharge Agreement Secured</option>
                        </select>
                      </div>

                      <div className="md:col-span-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 leading-relaxed">
                        <strong>EMCA (Water Quality) Regulations 2006 Notice:</strong> Discharging trade or domestic effluent into any surface water, open storm drain, or aquifer requires a valid <strong>Effluent Discharge License (EDL)</strong> from NEMA and continuous monitoring against Third Schedule discharge benchmarks.
                      </div>
                    </>
                  )}
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
                      {/* Interactive County Badges & Statutory Alignment Alert */}
                      {(() => {
                        const raw = formData.countiesTraversed || '';
                        if (!raw.trim()) return null;
                        const entries = raw.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
                        if (entries.length === 0) return null;
                        return (
                          <div className="mt-2.5 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                                Cross-Jurisdictional Corridor Authorities Detected ({entries.length}):
                              </span>
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo-200/60 text-indigo-800 rounded">
                                EMCA §40 Multi-County CEAP
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {entries.map((item, idx) => (
                                <span key={idx} className="inline-flex items-center px-2 py-1 bg-white border border-indigo-200 rounded text-indigo-800 font-medium shadow-xs text-xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5"></span>
                                  {item}
                                </span>
                              ))}
                            </div>
                            <p className="text-[11px] text-indigo-800 leading-relaxed border-t border-indigo-100 pt-1.5">
                              <strong>Statutory Requirement (EMCA §40 & Physical and Land Use Planning Act 2019):</strong> For multi-county corridor projects, the ESIA must synthesize and reconcile each traversed County's <strong>County Environment Action Plan (CEAP)</strong> and devolved physical planning zoning bylaws. In Phase 3, distinct public barazas and questionnaire registers must be documented for each traversed sub-county/ward.
                            </p>
                          </div>
                        );
                      })()}
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
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700 flex items-center">
                        <MapPin className="w-4 h-4 mr-1 text-emerald-600" />
                        Spatial Boundary & Aerial Satellite Context *
                      </label>
                      <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs">
                        <button
                          type="button"
                          onClick={() => setMapTileMode('satellite')}
                          className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 ${mapTileMode === 'satellite' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                          <span>🛰️</span> Satellite
                        </button>
                        <button
                          type="button"
                          onClick={() => setMapTileMode('streets')}
                          className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 ${mapTileMode === 'streets' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                          <span>🗺️</span> Streets
                        </button>
                      </div>
                    </div>

                    <div className="h-[280px] w-full rounded-xl border-2 border-gray-300 overflow-hidden relative z-0 shadow-inner">
                      <MapContainer center={position || [-1.2921, 36.8219]} zoom={position ? 15 : 11} className="w-full h-full">
                        {mapTileMode === 'satellite' ? (
                          <TileLayer 
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
                            attribution="Tiles &copy; Esri, Maxar, Earthstar Geographics"
                            maxZoom={18}
                          />
                        ) : (
                          <TileLayer 
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                            attribution="&copy; OpenStreetMap contributors"
                          />
                        )}
                        <LocationPicker position={position} setPosition={setPosition} />
                      </MapContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Centroid Latitude</label>
                        <input type="number" step="0.0001" value={position ? position[0] : ''} 
                               onChange={(e) => setPosition([parseFloat(e.target.value) || 0, position ? position[1] : 36.8219])}
                               className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-1.5 border text-sm" placeholder="e.g. -1.2921" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Centroid Longitude</label>
                        <input type="number" step="0.0001" value={position ? position[1] : ''} 
                               onChange={(e) => setPosition([position ? position[0] : -1.2921, parseFloat(e.target.value) || 0])}
                               className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-1.5 border text-sm" placeholder="e.g. 36.8219" />
                      </div>
                    </div>

                    {/* SATELLITE SENSITIVITY VERIFICATION CARD */}
                    {position && (
                      <div className="mt-3 p-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl shadow-md border border-slate-700 animate-fadeIn text-xs">
                        <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                          <span className="font-extrabold flex items-center gap-1.5 text-emerald-400">
                            <span>🛰️</span> Aerial Satellite & Statutory Screening Active
                          </span>
                          <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                            {position[0].toFixed(5)}, {position[1].toFixed(5)}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <span className="text-blue-400 font-bold">✓</span>
                            <span>Water Act 2016: 30m Riparian Buffer Layer auto-computed</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-emerald-400 font-bold">✓</span>
                            <span>Figure 1.2 (Cadastral Boundary on High-Res Aerial) linked to Ch. 2</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
            
            {/* Dynamic Statutory Track Banner */}
            {formData.statutoryTrack === 'SPR' ? (
              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg">
                <div className="flex items-start">
                  <ShieldAlert className="w-5 h-5 text-emerald-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900">Summary Project Report (SPR) — Low-Risk Track (LN 31 & 32 of 2019)</h4>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      Under Legal Notices No. 31 and 32 of 2019, low-risk undertakings (boreholes, boundary walls, single residential dwellings) require localized Consultation and Public Participation (CPP) administered with <strong>5 to 15 immediate boundary neighbors</strong> and local administration (Area Chief / Nyumba Kumi). 
                      <span className="font-semibold text-emerald-950"> National daily newspaper advertisements and mass public barazas are statutory waived.</span>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <div className="flex items-start">
                  <Users className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-blue-900">Comprehensive Project Report (CPR / Full Study) — High-Risk Track (EMCA §59 & LN 101 Reg 17)</h4>
                    <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                      For medium to high-impact projects, NEMA mandates a multi-tiered consultation strategy: <strong>minimum 30+ stakeholder questionnaires</strong> across multiple catchments, <strong>mandatory publication in two (2) national daily newspapers</strong> with a 14-day notice window, and <strong>formal public baraza(s)</strong> with local leadership observing the two-thirds gender rule.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 1. NEMA Questionnaires & Audit Trail Dossier */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b mb-4 gap-2">
                <div>
                  <h4 className="font-bold text-gray-800 text-base">1. Stakeholder Questionnaires & Verification Dossier</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Primary physical evidence required by NEMA TAC under EMCA Section 59 & LN 101 Reg 17</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuestionnaireModal(true)}
                  className="flex items-center text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 font-semibold px-3 py-1.5 rounded-lg shadow-sm transition"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Print Official NEMA Questionnaire (7 Sections)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Questionnaires Administered *
                  </label>
                  <input
                    type="number"
                    name="questionnairesAdministered"
                    value={formData.questionnairesAdministered || ''}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border font-semibold text-emerald-900"
                    placeholder={formData.statutoryTrack === 'SPR' ? 'e.g. 10 (5-15 required)' : 'e.g. 35 (30+ required)'}
                  />
                  <span className="text-[11px] text-gray-500 mt-0.5 block">
                    {formData.statutoryTrack === 'SPR' ? 'Statutory SPR quota: 5 - 15 forms' : 'Statutory CPR quota: 30+ forms'}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Support Without Reservation *</label>
                  <input
                    type="number"
                    name="supportWithoutReservation"
                    value={formData.supportWithoutReservation || ''}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border text-green-700 font-medium"
                    placeholder="e.g. 8"
                  />
                  <span className="text-[11px] text-gray-500 mt-0.5 block">Unconditional endorsement</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Support With Conditions *</label>
                  <input
                    type="number"
                    name="supportWithConditions"
                    value={formData.supportWithConditions || ''}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border text-amber-700 font-medium"
                    placeholder="e.g. 2"
                  />
                  <span className="text-[11px] text-gray-500 mt-0.5 block">E.g., dust, noise, local jobs</span>
                </div>
              </div>

              {/* Spatial Proximity Breakdown */}
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4">
                <span className="text-xs font-bold text-gray-700 block mb-2 uppercase tracking-wide">
                  Physical Proximity of Respondents to Site Boundary
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Immediate Boundary Neighbors</label>
                    <input
                      type="number"
                      name="immediateNeighborsCount"
                      value={formData.immediateNeighborsCount || ''}
                      onChange={handleInputChange}
                      className="w-full rounded border-gray-300 p-1.5 border text-sm bg-white"
                      placeholder="e.g. 5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Across the Access Road</label>
                    <input
                      type="number"
                      name="acrossRoadCount"
                      value={formData.acrossRoadCount || ''}
                      onChange={handleInputChange}
                      className="w-full rounded border-gray-300 p-1.5 border text-sm bg-white"
                      placeholder="e.g. 3"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Within 500m – 1km Radius</label>
                    <input
                      type="number"
                      name="withinRadiusCount"
                      value={formData.withinRadiusCount || ''}
                      onChange={handleInputChange}
                      className="w-full rounded border-gray-300 p-1.5 border text-sm bg-white"
                      placeholder="e.g. 2"
                    />
                  </div>
                </div>
              </div>

              {/* Objections Tracking */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Objections Count</label>
                  <input
                    type="number"
                    name="objectionsCount"
                    value={formData.objectionsCount || ''}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 p-2 border text-red-600 font-medium"
                    placeholder="0"
                  />
                  <span className="text-[11px] text-gray-500 mt-0.5 block">Total adverse/dissenting returns</span>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Area Administration Consulted (Chief / Nyumba Kumi)
                  </label>
                  <input
                    type="text"
                    name="areaChiefConsulted"
                    value={formData.areaChiefConsulted || ''}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border text-sm"
                    placeholder="e.g. Chief Francis Mwangi (0722XXXXXX) & Nyumba Kumi Elder J. Kamau"
                  />
                </div>
              </div>

              {parseInt(formData.objectionsCount || 0) > 0 && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <label className="block text-xs font-bold text-red-800 mb-1">
                    Grounds for Objections & Proponent Conflict Resolution Proposal *
                  </label>
                  <textarea
                    name="objectionReasons"
                    value={formData.objectionReasons || ''}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full rounded border-red-300 p-2 border text-sm bg-white"
                    placeholder="Detail specific grounds (e.g. stormwater runoff direction, boundary setback concerns) and engineering commitments made."
                  />
                </div>
              )}

              {/* Upload Scanned Questionnaires */}
              <div className="p-4 border-2 border-dashed border-emerald-300 rounded-lg bg-emerald-50/50 hover:bg-emerald-50 transition-colors">
                <label className="flex flex-col items-center justify-center cursor-pointer">
                  <Upload className="w-6 h-6 text-emerald-600 mb-1" />
                  <span className="text-sm font-semibold text-emerald-900">
                    Upload Scanned Filled & Signed Questionnaires [PDF] *
                  </span>
                  <span className="text-xs text-emerald-700 mt-0.5">
                    {files.signed_questionnaires ? files.signed_questionnaires.name : 'Bound into Statutory Annex 5 as physical proof of consultation'}
                  </span>
                  <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileChange('signed_questionnaires', e)} />
                </label>
              </div>
            </div>

            {/* 2. Public Notification (Reg 17) - Dynamic SPR vs CPR */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="font-bold text-gray-800 mb-3 border-b pb-2 flex justify-between items-center">
                <span>2. Public Notification (Reg 17)</span>
                {formData.statutoryTrack === 'SPR' ? (
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                    LN 31/32 Statutory Waiver Active
                  </span>
                ) : (
                  <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-300">
                    Mandatory 2 Dailies (14-Day Notice)
                  </span>
                )}
              </h4>

              {formData.statutoryTrack === 'SPR' ? (
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 leading-relaxed">
                    <strong>Statutory Exemption Applied:</strong> Summary Project Reports (SPRs) for low-risk developments do not legally require newspaper advertisements in national dailies. Notification is conducted directly via on-site neighbor visits and local administrative notice.
                  </div>
                  <label className="flex items-center space-x-2 text-xs text-gray-700 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={formData.showOptionalNotice || false}
                      onChange={(e) => setFormData({ ...formData, showOptionalNotice: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    />
                    <span>Optional: Proponent voluntarily published an on-site signboard, local radio, or newspaper notice</span>
                  </label>
                  {formData.showOptionalNotice && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Notification Medium</label>
                        <input
                          type="text"
                          name="otherNotification"
                          value={formData.otherNotification || ''}
                          onChange={handleInputChange}
                          className="w-full rounded border-gray-300 p-2 border text-sm"
                          placeholder="e.g. On-site Signboard, Chief's Notice Board"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Date Erected / Broadcast</label>
                        <input
                          type="date"
                          name="publicationDate"
                          value={formData.publicationDate || ''}
                          onChange={handleInputChange}
                          className="w-full rounded border-gray-300 p-2 border text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Newspaper Name *</label>
                      <input
                        type="text"
                        name="newspaperName"
                        value={formData.newspaperName || ''}
                        onChange={handleInputChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border"
                        placeholder="e.g. Daily Nation / The Standard"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Publication Date *</label>
                      <input
                        type="date"
                        name="publicationDate"
                        value={formData.publicationDate || ''}
                        onChange={handleInputChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notice Period (Days) *</label>
                      <input
                        type="number"
                        name="noticePeriod"
                        value={formData.noticePeriod || '14'}
                        onChange={handleInputChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border"
                        placeholder="14"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Second Medium (e.g. Radio / Kenya Gazette)</label>
                      <input
                        type="text"
                        name="otherNotification"
                        value={formData.otherNotification || ''}
                        onChange={handleInputChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border"
                        placeholder="e.g. Local Vernacular Radio / Chief Baraza"
                      />
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

            {/* 3. Consultation Meetings / Baraza Logistics */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">
                {formData.statutoryTrack === 'SPR' ? '3. Localized Neighbor Consultation & Administration Dialogue' : '3. Public Baraza Logistics & Stakeholder Representation'}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.statutoryTrack === 'SPR' ? 'Date of Neighbor Consultation Visit *' : 'Date of Public Baraza *'}
                  </label>
                  <input
                    type="date"
                    name="barazaDate"
                    value={formData.barazaDate || ''}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.statutoryTrack === 'SPR' ? 'Venue / Meeting Location *' : 'Venue / Baraza Location *'}
                  </label>
                  <input
                    type="text"
                    name="barazaVenue"
                    value={formData.barazaVenue || ''}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border"
                    placeholder={formData.statutoryTrack === 'SPR' ? 'e.g. On-Site & Immediate Boundaries' : "e.g. Chief's Camp, Rongai"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Persons Consulted / Attendees *</label>
                  <input
                    type="number"
                    name="attendeeCount"
                    value={formData.attendeeCount || ''}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border"
                    placeholder={formData.statutoryTrack === 'SPR' ? 'e.g. 12' : 'e.g. 150'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Male Count</label>
                  <input
                    type="number"
                    name="attendeesMale"
                    value={formData.attendeesMale || ''}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border"
                    placeholder="e.g. 7"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Female Count</label>
                  <input
                    type="number"
                    name="attendeesFemale"
                    value={formData.attendeesFemale || ''}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border"
                    placeholder="e.g. 5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Facilitator / Lead Expert *</label>
                  <input
                    type="text"
                    name="facilitatingOfficer"
                    value={formData.facilitatingOfficer || ''}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border"
                    placeholder="e.g. Dr. Peninah Wanjiru (NEMA/EIA/0876)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Language(s) Used</label>
                  <input
                    type="text"
                    name="barazaLanguage"
                    value={formData.barazaLanguage || ''}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border"
                    placeholder="e.g. English, Kiswahili"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Stakeholder Groups Consulted (Check all present)</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['Local Administration (Chief/Nyumba Kumi)', 'Immediate Neighbors (Boundaries)', 'Area Residents Association', 'Business Operators', 'County Officials', 'Women Representatives', 'Youth Representatives', 'Lead Agencies (WRMA/KWS/NCA)'].map((group) => (
                    <label key={group} className="flex items-center space-x-2 p-2 border rounded bg-gray-50 hover:bg-white cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={!!formData.stakeholderGroups[group]}
                        onChange={() => handleStakeholderToggle(group)}
                        className="text-emerald-600 rounded"
                      />
                      <span className="text-gray-700">{group}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-3 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-white transition-colors">
                <label className="flex flex-col items-center justify-center cursor-pointer">
                  <Upload className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-sm font-medium text-gray-600">
                    {formData.statutoryTrack === 'SPR' ? 'Upload Signed Consultation Notes / Register (PDF) *' : 'Upload Signed Baraza Attendance Sheets & Minutes (PDF) *'}
                  </span>
                  <span className="text-xs text-gray-400">{files.baraza_minutes ? files.baraza_minutes.name : 'Missing'}</span>
                  <input type="file" className="hidden" onChange={(e) => handleFileChange('baraza_minutes', e)} />
                </label>
              </div>
            </div>

            {/* 4. Inclusion & Grievance Redress */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">4. Inclusion & Grievance Redress</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vulnerable / Marginalized Groups Addressed</label>
                  <input
                    type="text"
                    name="vulnerableGroups"
                    value={formData.vulnerableGroups || ''}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border text-sm"
                    placeholder="e.g. Universal ramps provided, vulnerable elderly neighbors consulted"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grievance Redress Mechanism (GRM) Proposed?</label>
                  <select
                    name="grmEstablished"
                    value={formData.grmEstablished || 'Yes'}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border bg-white mb-2 text-sm"
                  >
                    <option value="Yes">Yes - GRM Committee Formed / Proposed</option>
                    <option value="No">No GRM</option>
                  </select>
                  {formData.grmEstablished === 'Yes' && (
                    <input
                      type="text"
                      name="grmContact"
                      value={formData.grmContact || ''}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 p-2 border text-sm"
                      placeholder="GRM Contact Officer / Phone Number"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* 5. Documented Concerns & Responses */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">5. Documented Concerns & Proponent Mitigations</h4>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {formData.communityConcerns.map((item, index) => (
                  <div key={index} className="flex flex-col gap-3 border p-3 rounded-lg bg-gray-50">
                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Community Concern #{index + 1}</label>
                        <textarea
                          value={item.concern}
                          onChange={(e) => handleConcernChange(index, 'concern', e.target.value)}
                          rows={2}
                          className="w-full rounded border-gray-300 p-2 border text-sm bg-white"
                          placeholder="e.g. Dust during construction affecting neighboring residential homes"
                        />
                      </div>
                      <div className="w-full md:w-1/3">
                        <label className="block text-xs text-gray-500 mb-1">Category</label>
                        <select
                          value={item.category}
                          onChange={(e) => handleConcernChange(index, 'category', e.target.value)}
                          className="w-full rounded border-gray-300 p-2 border text-sm bg-white"
                        >
                          <option value="Environmental">Environmental</option>
                          <option value="Social">Social</option>
                          <option value="Economic">Economic</option>
                          <option value="Labor">Labor / Health</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-emerald-600 mb-1 font-medium">Proponent Response / ESMP Mitigation</label>
                      <textarea
                        value={item.response}
                        onChange={(e) => handleConcernChange(index, 'response', e.target.value)}
                        rows={2}
                        className="w-full rounded border-gray-300 p-2 border text-sm bg-white"
                        placeholder="e.g. Daily water sprinkling 3x daily and perimeter dust-screens erected"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addConcern}
                className="mt-4 text-sm text-emerald-600 font-medium hover:text-emerald-700 flex items-center"
              >
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
              const isCPR = formData.statutoryTrack === 'CPR';
              const baseRequired = ['projectName', 'siteArea', 'proponentName', 'pin', 'investmentCost', 'timelineMonths', 'operationalLifespan', 'questionnairesAdministered'];
              if (formData.isMegaProject) {
                baseRequired.push('countiesTraversed');
              } else {
                baseRequired.push('county', 'plotNumber');
              }
              if (isCPR) {
                baseRequired.push('newspaperName', 'barazaDate');
                if (formData.expertTier === 'ASSOCIATE') {
                  baseRequired.push('supervisingLeadExpert');
                }
              }
              const requiredFields = baseRequired;
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
                      <p><span className="font-semibold text-gray-600">Track:</span> <span className={`font-bold px-2 py-0.5 rounded text-xs ${formData.statutoryTrack === 'SPR' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>{formData.statutoryTrack === 'SPR' ? 'Summary Project Report (SPR - Low Risk)' : 'Comprehensive Project Report (CPR / Full Study)'}</span></p>
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
                      {Number(formData.investmentCost || 0) > 0 && (
                        <p><span className="font-semibold text-emerald-700">NEMA Processing Levy (0.1%):</span> KES {Number(formData.investmentCost * 0.001).toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                      )}
                      <p><span className="font-semibold text-gray-600">Lifespan:</span> {formData.operationalLifespan ? `${formData.operationalLifespan} years` : 'Missing'}</p>
                    </div>

                    <div className="space-y-2 bg-white p-4 rounded border border-gray-200">
                      <h5 className="font-bold text-gray-700 border-b pb-2 mb-3">Proponent & Consultant</h5>
                      <p><span className="font-semibold text-gray-600">Name:</span> {formData.proponentName || 'Missing'}</p>
                      <p><span className="font-semibold text-gray-600">PIN:</span> {formData.pin || 'Missing'}</p>
                      {!formData.isMegaProject ? (
                        <p><span className="font-semibold text-gray-600">Plot:</span> {formData.plotNumber || 'Missing'} ({formData.landOwnership || 'Missing Tenure'})</p>
                      ) : (
                        <p><span className="font-semibold text-indigo-700">Land Tenure:</span> {formData.landTenureSummary || 'Missing'}</p>
                      )}
                      <p><span className="font-semibold text-gray-600">Consultant Tier:</span> <span className="font-bold">{formData.expertTier === 'ASSOCIATE' ? 'Associate Expert (Reg 2 & 7(3))' : 'Lead Expert (Reg 13(2))'}</span></p>
                      <p><span className="font-semibold text-gray-600">Practicing Reg:</span> {formData.leadExpertReg}</p>
                      {formData.expertTier === 'ASSOCIATE' && formData.statutoryTrack === 'CPR' && (
                        <p><span className="font-semibold text-amber-700">Supervising Lead:</span> {formData.supervisingLeadExpert || <span className="text-red-500 font-bold">Missing Required Lead Expert</span>}</p>
                      )}
                      <p><span className="font-semibold text-gray-600">Water Supply:</span> {formData.waterSupplySource || 'Municipal Utility'}</p>
                      {formData.effluentDisposalMethod && (
                        <p><span className="font-semibold text-gray-600">Effluent Disposal:</span> {formData.effluentDisposalMethod} ({formData.effluentDischargePermitStatus || 'Pending'})</p>
                      )}
                      <p><span className="font-semibold text-gray-600">Receptors Found:</span> {Object.keys(formData.sensitiveReceptors).length}</p>
                    </div>

                    {/* Stakeholder Consultation Summary Card */}
                    <div className="space-y-2 bg-white p-4 rounded border border-gray-200 md:col-span-2">
                      <h5 className="font-bold text-gray-700 border-b pb-2 mb-3 flex justify-between items-center">
                        <span>Stakeholder Consultation & Questionnaire Ledger (Statutory Annex 5)</span>
                        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${isCPR ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {isCPR ? 'CPR Multi-Tier Track' : 'SPR Low-Risk Track (LN 31/32 Waiver Active)'}
                        </span>
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
                          <span className="text-gray-500 block">Questionnaires Administered</span>
                          <span className="text-base font-bold text-emerald-800">{formData.questionnairesAdministered || '0'}</span>
                          <span className="text-[11px] text-gray-500 block mt-1">
                            Direct: {formData.immediateNeighborsCount || 0} | Road: {formData.acrossRoadCount || 0} | Radius: {formData.withinRadiusCount || 0}
                          </span>
                        </div>
                        <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
                          <span className="text-gray-500 block">Sentiment Breakdown</span>
                          <span className="text-xs font-semibold text-gray-800 block mt-1">
                            Endorse: <strong className="text-green-700">{formData.supportWithoutReservation || 0}</strong> | Conditional: <strong className="text-amber-700">{formData.supportWithConditions || 0}</strong> | Objections: <strong className="text-red-700">{formData.objectionsCount || 0}</strong>
                          </span>
                          <span className="text-[11px] text-gray-500 block mt-1">
                            Admin Consulted: {formData.areaChiefConsulted ? 'Yes' : 'Pending'}
                          </span>
                        </div>
                        <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
                          <span className="text-gray-500 block">Statutory Evidence Attached</span>
                          <span className="text-xs font-semibold text-gray-800 block mt-1">
                            Questionnaires: {files.signed_questionnaires ? <span className="text-emerald-700 font-bold">PDF Attached</span> : <span className="text-amber-600 font-medium">Pending Upload</span>}
                          </span>
                          <span className="text-[11px] text-gray-500 block mt-1">
                            {isCPR ? `Newspaper: ${formData.newspaperName || 'Missing'}` : 'Newspaper: Waived (LN 31/32)'}
                          </span>
                        </div>
                      </div>
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
                        <span className="text-sm font-bold text-gray-800">
                          {formData.expertTier === 'ASSOCIATE' ? 'Associate & Supervising Lead Expert Attestation' : 'Lead Expert Attestation'}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          I, {formData.leadExpertReg} {formData.expertTier === 'ASSOCIATE' && formData.supervisingLeadExpert ? `(under the direct supervision and counter-signature of ${formData.supervisingLeadExpert})` : ''}, confirm that the data provided in this wizard accurately reflects the baseline conditions, engineering designs, and stakeholder engagement records for this project. I authorize the EcoSense AI to generate a pre-approval ESIA draft based solely on this locked dataset.
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
          disabled={
            isUploading || 
            (currentPhase === 1 && !position) || 
            (currentPhase === 5 && (
              !formData.attestation || 
              (() => {
                const baseRequired = ['projectName', 'siteArea', 'proponentName', 'pin', 'investmentCost', 'timelineMonths', 'operationalLifespan', 'questionnairesAdministered'];
                if (formData.isMegaProject) {
                  baseRequired.push('countiesTraversed');
                } else {
                  baseRequired.push('county', 'plotNumber');
                }
                if (formData.statutoryTrack === 'CPR') {
                  baseRequired.push('newspaperName', 'barazaDate');
                  if (formData.expertTier === 'ASSOCIATE') {
                    baseRequired.push('supervisingLeadExpert');
                  }
                }
                return baseRequired.some(f => !formData[f]);
              })()
            ))
          }
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

      {/* Official 7-Section NEMA Questionnaire Printable Modal */}
      {showQuestionnaireModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 print:p-0 print:bg-white print:static">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-gray-200 overflow-hidden my-8 print:my-0 print:border-none print:shadow-none">
            {/* Modal Controls Bar (Hidden during print) */}
            <div className="bg-gray-900 text-white px-6 py-3 flex justify-between items-center print:hidden">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-sm tracking-wide">Official NEMA Stakeholder Consultation Instrument</span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow transition"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Print Field Questionnaires
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuestionnaireModal(false)}
                  className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Questionnaire Body */}
            <div className="p-8 text-gray-900 text-xs sm:text-sm font-serif print:text-black">
              {/* Header */}
              <div className="text-center border-b-2 border-black pb-4 mb-4">
                <p className="font-bold text-base tracking-wider uppercase">Republic of Kenya</p>
                <p className="font-bold text-sm uppercase text-gray-700">National Environment Management Authority (NEMA)</p>
                <h3 className="font-extrabold text-base sm:text-lg uppercase mt-1">
                  Environmental Impact Assessment (EIA) Stakeholder Consultation Questionnaire
                </h3>
                <p className="text-[11px] italic text-gray-600 mt-1">
                  (Administered pursuant to Section 59 of EMCA, Cap 387 and Regulation 17 of Legal Notice No. 101: EIA/EA Regulations & Legal Notices 31/32 of 2019)
                </p>
              </div>

              {/* Project Particulars */}
              <div className="bg-gray-50 print:bg-transparent border border-gray-300 p-3 mb-4 rounded text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <p><strong>Proposed Project:</strong> {formData.projectName || '____________________________________________'}</p>
                  <p><strong>Project Proponent:</strong> {formData.proponentName || '____________________________________________'}</p>
                  <p><strong>Plot / L.R. No:</strong> {formData.plotNumber || '________________________'} | <strong>County:</strong> {formData.county || '________________________'}</p>
                  <p><strong>Sub-County:</strong> {formData.subCounty || '________________________'} | <strong>Ward:</strong> {formData.ward || '________________________'}</p>
                  <p className="col-span-2"><strong>Lead Expert / Firm of Experts:</strong> {formData.leadExpertReg || 'NEMA Registered Expert'} | <strong>Track:</strong> {formData.statutoryTrack === 'SPR' ? 'Summary Project Report (SPR - Low Risk)' : 'Comprehensive Project Report (CPR)'}</p>
                </div>
              </div>

              {/* Section A */}
              <div className="mb-4">
                <h5 className="font-bold text-xs uppercase bg-gray-200 print:bg-gray-100 p-1 mb-2 border border-gray-400">
                  Section A: Respondent Particulars (Mandatory for NEMA Audit Trail Verification)
                </h5>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>1. Full Name of Respondent: _____________________________________________</div>
                  <div>2. National ID / Passport No: ____________________________________________</div>
                  <div>3. Mobile / Telephone Number: ___________________________________________</div>
                  <div>4. Gender: [  ] Male    [  ] Female    [  ] Youth / Vulnerable</div>
                  <div className="col-span-2">
                    5. Relationship to Project Site:<br />
                    <span className="inline-block mr-4">[  ] Immediate Neighbor (Direct Boundary)</span>
                    <span className="inline-block mr-4">[  ] Neighbor Across Access Road</span>
                    <span className="inline-block mr-4">[  ] Resident within 500m–1km</span>
                    <span className="inline-block mr-4">[  ] Local Trader/Business</span>
                    <span className="inline-block">[  ] Area Leader (Chief / Nyumba Kumi)</span>
                  </div>
                  <div>6. Approximate Distance from Site: ________ Meters / Km</div>
                  <div>7. Duration lived/operated in area: ________ Years</div>
                </div>
              </div>

              {/* Section B */}
              <div className="mb-4">
                <h5 className="font-bold text-xs uppercase bg-gray-200 print:bg-gray-100 p-1 mb-2 border border-gray-400">
                  Section B: Project Awareness & Perception
                </h5>
                <div className="space-y-1 text-xs">
                  <p>8. Are you aware of the proposed project mentioned above? &nbsp;&nbsp;&nbsp;&nbsp; [  ] YES &nbsp;&nbsp;&nbsp;&nbsp; [  ] NO</p>
                  <p>9. If YES, how did you first learn of this undertaking?</p>
                  <p className="pl-4">
                    [  ] Consultant / Enumerator Visit &nbsp;&nbsp;&nbsp;&nbsp;
                    [  ] On-site Poster / Signboard &nbsp;&nbsp;&nbsp;&nbsp;
                    [  ] Area Chief / Baraza &nbsp;&nbsp;&nbsp;&nbsp;
                    [  ] Newspaper Notice &nbsp;&nbsp;&nbsp;&nbsp;
                    [  ] Word of Mouth
                  </p>
                </div>
              </div>

              {/* Section C */}
              <div className="mb-4">
                <h5 className="font-bold text-xs uppercase bg-gray-200 print:bg-gray-100 p-1 mb-2 border border-gray-400">
                  Section C: Anticipated Positive Impacts (Benefits)
                </h5>
                <p className="text-xs mb-1">10. What positive environmental, social, or economic benefits do you anticipate from the project?</p>
                <div className="space-y-1 text-xs pl-2">
                  <p>[  ] Creation of direct & indirect employment opportunities for local youth and women</p>
                  <p>[  ] Improvement of local access roads, drainage, and public utility infrastructure</p>
                  <p>[  ] Growth of local commerce, retail trading, and demand for construction materials</p>
                  <p>[  ] Enhancement of property values and neighborhood security</p>
                  <p>Other anticipated benefits: ____________________________________________________________________________________</p>
                </div>
              </div>

              {/* Section D */}
              <div className="mb-4">
                <h5 className="font-bold text-xs uppercase bg-gray-200 print:bg-gray-100 p-1 mb-2 border border-gray-400">
                  Section D: Anticipated Negative Environmental & Social Concerns
                </h5>
                <p className="text-xs mb-1">11. What negative impacts or concerns do you anticipate during construction and operation?</p>
                <div className="space-y-1 text-xs pl-2">
                  <p>[  ] Generation of dust, exhaust emissions, and degraded air quality</p>
                  <p>[  ] Excessive noise and ground vibrations from machinery, excavation, or heavy haulage</p>
                  <p>[  ] Increased stormwater runoff, localized soil erosion, or blockage of natural drainage channels</p>
                  <p>[  ] Disruption of traffic flow and potential damage to existing community access tracks</p>
                  <p>[  ] Pressure on public utilities (municipal water supply mains or electricity grid)</p>
                  <p>[  ] Accumulation of solid waste, construction debris, or inadequate sewage management</p>
                  <p>Other specific concerns: ____________________________________________________________________________________</p>
                </div>
              </div>

              {/* Section E */}
              <div className="mb-4">
                <h5 className="font-bold text-xs uppercase bg-gray-200 print:bg-gray-100 p-1 mb-2 border border-gray-400">
                  Section E: Recommended Mitigation Measures
                </h5>
                <p className="text-xs mb-1">12. What specific measures should the project proponent and contractor implement to prevent or mitigate these concerns?</p>
                <div className="border border-dashed border-gray-400 p-2 min-h-[48px] text-xs">
                  ________________________________________________________________________________________________________________________<br />
                  ________________________________________________________________________________________________________________________
                </div>
              </div>

              {/* Section F */}
              <div className="mb-4">
                <h5 className="font-bold text-xs uppercase bg-gray-200 print:bg-gray-100 p-1 mb-2 border border-gray-400">
                  Section F: Overall Perception & Verdict
                </h5>
                <div className="space-y-1.5 text-xs">
                  <p>13. Given the proposed mitigation measures, what is your overall recommendation regarding this project?</p>
                  <p className="pl-4">[  ] <strong>I SUPPORT the project without reservation</strong> (it will benefit our community)</p>
                  <p className="pl-4">[  ] <strong>I SUPPORT the project with conditions</strong> (mitigations specified above must be strictly implemented)</p>
                  <p className="pl-4">[  ] <strong>I OBJECT to the proposed project</strong> (reasons stated in Section D/E above)</p>
                </div>
              </div>

              {/* Section G */}
              <div className="border-t-2 border-black pt-3">
                <h5 className="font-bold text-xs uppercase mb-2">Section G: Respondent Solemn Declaration & Sign-Off</h5>
                <p className="text-[11px] italic mb-3">
                  I solemnly confirm that the views and opinions expressed in this questionnaire are given freely, accurately reflect my genuine sentiments regarding the proposed undertaking, and may be submitted to NEMA as verifiable public participation evidence.
                </p>
                <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                  <div>
                    Respondent Signature / Thumbprint: _______________________<br /><br />
                    Date: ________________________________________________
                  </div>
                  <div>
                    Consultant / Enumerator Name: __________________________<br /><br />
                    Enumerator Signature & Date: ___________________________
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhasedIntakeWizard;

