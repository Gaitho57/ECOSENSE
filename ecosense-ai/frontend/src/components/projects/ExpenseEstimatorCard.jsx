import React, { useState } from 'react';
import { 
  Calculator, FileSignature, Landmark, ShieldCheck, 
  AlertCircle, ChevronDown, ChevronUp, FileText, CheckCircle2, 
  Sparkles, DollarSign, ArrowRight, Printer 
} from 'lucide-react';

export default function ExpenseEstimatorCard({ 
  statutoryTrack = 'SPR', 
  investmentCost = 0, 
  isMegaProject = false,
  expertTier = 'LEAD',
  onOpenContractModal,
  compact = false
}) {
  const [activeTab, setActiveTab] = useState(statutoryTrack === 'CPR' ? 'CPR' : 'SPR');
  const [showSpecialistEstimates, setShowSpecialistEstimates] = useState(false);
  const [customCost, setCustomCost] = useState(investmentCost || '');

  // Keep activeTab synced if statutoryTrack prop changes and user hasn't toggled manually
  const track = activeTab;
  const isSPR = track === 'SPR';

  const rawCost = Number(customCost || investmentCost || 0);
  // Statutory 0.1% processing fee, minimum KES 10,000
  const nemaLevy = Math.max(10000, Math.round(rawCost * 0.001));

  // Itemized disbursements
  const newspaperCost = isSPR ? 0 : 90000;
  const barazaCost = isSPR ? 0 : 35000;
  const questionnairesCost = isSPR ? 3000 : 18000;
  const printingCost = isSPR ? 3500 : 12000;
  const baselineAirNoise = isSPR ? 0 : 60000;
  const baselineHydroWater = isSPR ? 0 : 45000;
  const associateSupervisionFee = (!isSPR && expertTier === 'ASSOCIATE') ? 100000 : 0;

  // Base disbursements (mandatory logistics & public participation)
  const baseDisbursements = newspaperCost + barazaCost + questionnairesCost + printingCost + associateSupervisionFee;
  // Full disbursements including specialist scientific testing
  const fullDisbursements = baseDisbursements + baselineAirNoise + baselineHydroWater;

  // Recommended Professional Consultant Fee
  const recommendedConsultantFee = isSPR ? 250000 : (isMegaProject ? 1200000 : 650000);
  const totalClientOutlay = nemaLevy + baseDisbursements + recommendedConsultantFee;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all hover:border-emerald-300">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-emerald-950 text-white p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-400/30 text-emerald-300">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight">Statutory Expense & Disbursement Estimator</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 uppercase tracking-wider">
                  EMCA Cap 387
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-0.5">
                Deterministic cost reconciliation: Proponent eCitizen statutory fees vs Reimbursables vs Expert Retainer
              </p>
            </div>
          </div>

          {/* Quick Track Switcher Toggle */}
          <div className="flex items-center bg-gray-800/80 p-1 rounded-xl border border-gray-700/80 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('SPR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isSPR 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              SPR (Low Risk)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CPR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !isSPR 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              CPR (Full Study)
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Track Banner & Statutory Reference */}
        <div className={`p-4 rounded-xl border flex items-start space-x-3 ${
          isSPR 
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
            : 'bg-amber-50/70 border-amber-200 text-amber-950'
        }`}>
          <div className="mt-0.5">
            {isSPR ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600" />
            )}
          </div>
          <div className="text-xs space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <span className="font-extrabold uppercase tracking-wide">
                {isSPR ? 'Summary Project Report (LN 31 & 32 of 2019)' : 'Comprehensive Project Report / Study (LN 101 Reg 17)'}
              </span>
              <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-white/80 border border-current">
                {isSPR ? 'Statutory Waiver Active' : 'Mandatory Adverts & 3 Barazas'}
              </span>
            </div>
            <p className="text-gray-600 leading-relaxed">
              {isSPR 
                ? 'Exempt from national daily newspapers and public barazas. Consultation quota limited to 5–15 immediate neighbors. Minimal reimbursable disbursements.'
                : 'Mandates 2 national newspaper notices (Daily Nation/Standard), radio broadcasts, min 3 public barazas, 30+ questionnaires, and comprehensive multi-agency review copies.'}
            </p>
          </div>
        </div>

        {/* 3-Column Cost Architecture */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pillar 1: Statutory Government Levy */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Pillar 1: Statutory Levy</span>
                <Landmark className="w-4 h-4 text-slate-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">0.1% NEMA Processing Fee</h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Paid by Proponent directly via eCitizen PRN (Min KES 10,000, no cap under Gazette 13211).
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Proponent Liability</span>
              <div className="text-xl font-black text-slate-900 font-mono">
                KES {nemaLevy.toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                {rawCost > 0 ? `Computed on KES ${rawCost.toLocaleString()} BQ` : 'Minimum statutory threshold'}
              </span>
            </div>
          </div>

          {/* Pillar 2: Operational Disbursements */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Pillar 2: Field Logistics</span>
                <DollarSign className="w-4 h-4 text-slate-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Public Participation & Outlay</h4>
              <p className="text-[11px] text-slate-500 mt-1">
                {isSPR 
                  ? 'Printing 10-20 questionnaires, local transport & elder courtesy tokens.' 
                  : '2 national dailies, 3 baraza venues/chairs/PA, 30+ questionnaires, 10 hard copies.'}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Reimbursable Outlay</span>
              <div className="text-xl font-black text-slate-900 font-mono">
                KES {baseDisbursements.toLocaleString()}
              </div>
              <span className="text-[10px] text-gray-500 block mt-0.5">
                {isSPR ? 'Waived adverts (Saved ~KES 125,000)' : 'Itemized statutory disbursements'}
              </span>
            </div>
          </div>

          {/* Pillar 3: Net Consultant Retainer */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase text-emerald-700 tracking-wider">Pillar 3: Professional Fee</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <h4 className="text-sm font-bold text-emerald-950">Expert Professional Retainer</h4>
              <p className="text-[11px] text-emerald-800 mt-1">
                Statutory scoping, baseline GIS, predictive modeling, mitigation matrix & Form 1/1B upload.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-200">
              <span className="text-[10px] text-emerald-700 uppercase font-semibold">Proposed Benchmark Retainer</span>
              <div className="text-xl font-black text-emerald-900 font-mono">
                KES {recommendedConsultantFee.toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                30% / 30% / 30% / 10% Milestone Schedule
              </span>
            </div>
          </div>
        </div>

        {/* Itemized Comparison Table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-100/80 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between text-xs font-extrabold text-gray-700 uppercase tracking-wider">
            <span>Itemized Statutory Disbursement Breakdown</span>
            <span>Est. Rate (KES)</span>
          </div>
          <div className="divide-y divide-gray-100 text-xs">
            <div className="px-4 py-2.5 flex items-center justify-between">
              <div>
                <span className="font-semibold text-gray-800">1. National Daily Newspapers (2 circulations)</span>
                <p className="text-[11px] text-gray-500">EMCA §59 & Reg 17(2)(a) — Daily Nation & The Standard</p>
              </div>
              <div className="text-right">
                {isSPR ? (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[11px]">
                    Statutory Waiver (KES 0)
                  </span>
                ) : (
                  <span className="font-mono font-bold text-gray-900">KES 90,000</span>
                )}
              </div>
            </div>

            <div className="px-4 py-2.5 flex items-center justify-between">
              <div>
                <span className="font-semibold text-gray-800">2. Stakeholder Public Barazas</span>
                <p className="text-[11px] text-gray-500">Reg 17(2)(b) — Venue hire, PA system, chairs, Chief facilitation</p>
              </div>
              <div className="text-right">
                {isSPR ? (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[11px]">
                    Statutory Waiver (KES 0)
                  </span>
                ) : (
                  <span className="font-mono font-bold text-gray-900">KES 35,000</span>
                )}
              </div>
            </div>

            <div className="px-4 py-2.5 flex items-center justify-between">
              <div>
                <span className="font-semibold text-gray-800">3. Field Questionnaires & Public Participation</span>
                <p className="text-[11px] text-gray-500">
                  {isSPR ? '5–15 physical questionnaires (Annex 5)' : '30+ physical questionnaires & door-to-door enumeration'}
                </p>
              </div>
              <div className="text-right font-mono font-bold text-gray-900">
                KES {questionnairesCost.toLocaleString()}
              </div>
            </div>

            <div className="px-4 py-2.5 flex items-center justify-between">
              <div>
                <span className="font-semibold text-gray-800">4. Physical Hard-Bound Binding & Submissions</span>
                <p className="text-[11px] text-gray-500">
                  {isSPR ? '3 copies (County Director of Environment)' : '10 copies (NEMA HQ, CDE & Lead Agencies)'}
                </p>
              </div>
              <div className="text-right font-mono font-bold text-gray-900">
                KES {printingCost.toLocaleString()}
              </div>
            </div>

            {!isSPR && expertTier === 'ASSOCIATE' && (
              <div className="px-4 py-2.5 flex items-center justify-between bg-amber-50/50">
                <div>
                  <span className="font-semibold text-amber-900">5. Supervising Lead Expert Countersignature</span>
                  <p className="text-[11px] text-amber-700">LN 101 Reg 13(2) mandatory peer-review fee for Associate Expert on CPR</p>
                </div>
                <div className="text-right font-mono font-bold text-amber-900">
                  KES {associateSupervisionFee.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Specialist Scientific Testing */}
        <div>
          <button
            type="button"
            onClick={() => setShowSpecialistEstimates(!showSpecialistEstimates)}
            className="flex items-center justify-between w-full p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 transition-colors"
          >
            <span className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Specialist Scientific Testing Disbursements (Air, Acoustic, Water Baselines)</span>
            </span>
            {showSpecialistEstimates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showSpecialistEstimates && (
            <div className="mt-2 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-800">PM2.5 / PM10 Ambient Air & Acoustic Noise Survey</span>
                  <p className="text-[11px] text-gray-500">Calibrated sound level meter & particulate counter (LN 61 of 2007 compliance)</p>
                </div>
                <span className="font-mono font-bold text-gray-900">KES 60,000</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <div>
                  <span className="font-bold text-gray-800">Hydrogeological Survey & Water Quality Analysis</span>
                  <p className="text-[11px] text-gray-500">Required if borehole drilling or effluent discharge to natural watercourses</p>
                </div>
                <span className="font-mono font-bold text-gray-900">KES 45,000</span>
              </div>
              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 italic">
                * Note: Specialist lab testing disbursements are only required when triggered by site sensitivities or industrial effluent profiles.
              </div>
            </div>
          )}
        </div>

        {/* Total Outlay Reconciliation Bar & CTA */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
          <div>
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-widest block">
              Estimated Total Proponent Outlay (Levies + Logistics + Retainer)
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white mt-1">
              KES {totalClientOutlay.toLocaleString()}
            </div>
            <p className="text-xs text-emerald-200/80 mt-1">
              Provides client with complete financial predictability, protecting expert cash-flow.
            </p>
          </div>

          {onOpenContractModal && (
            <button
              type="button"
              onClick={onOpenContractModal}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg transition-transform active:scale-95 shrink-0"
            >
              <FileSignature className="w-4 h-4 text-emerald-700" />
              <span>Generate Fee Proposal & Agreement</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
