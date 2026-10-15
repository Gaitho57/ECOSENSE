import React, { useState } from 'react';
import { 
  X, Printer, Copy, Check, FileSignature, ShieldAlert, 
  CreditCard, DollarSign, AlertCircle, FileCheck, Landmark, CheckCircle2 
} from 'lucide-react';

export default function FeeProposalModal({ isOpen, onClose, projectData = {} }) {
  if (!isOpen) return null;

  // Determine statutory track (SPR vs CPR)
  const isSPR = (projectData.statutoryTrack || projectData.nema_category || '').toUpperCase().includes('SPR') || 
                (projectData.nema_category === 'low') || 
                (projectData.statutoryTrack === 'SPR');

  const defaultFee = isSPR ? 250000 : 650000;
  const [professionalFee, setProfessionalFee] = useState(defaultFee);
  const [copied, setCopied] = useState(false);

  // Proponent & Project parameters
  const projectName = projectData.projectName || projectData.name || 'Proposed Development Undertaking';
  const proponentName = projectData.proponentName || projectData.proponent_name || 'Project Proponent Ltd';
  const proponentPin = projectData.pin || projectData.proponent_pin || 'P051234567Z';
  const plotNo = projectData.plotNumber || projectData.plot_number || 'Registered Cadastral Plot';
  const county = projectData.county || 'Kenya';
  const subCounty = projectData.subCounty || projectData.sub_county || 'Local Sub-County';
  const expertReg = projectData.leadExpertReg || projectData.consultant_reg || 'NEMA/EIA/1234';
  const expertTier = projectData.expertTier || (isSPR ? 'Associate / Lead Expert' : 'Lead Expert');

  // Investment cost & NEMA levy calculation
  const rawCost = parseFloat(projectData.investmentCost || projectData.investment_cost || 0);
  const nemaLevy = Math.max(10000, rawCost * 0.001);

  // Milestone fee breakdowns (30% / 30% / 30% / 10%)
  const milestone1 = Math.round(professionalFee * 0.30);
  const milestone2 = Math.round(professionalFee * 0.30);
  const milestone3 = Math.round(professionalFee * 0.30);
  const milestone4 = Math.round(professionalFee * 0.10);

  // Third-party disbursement estimates
  const newspaperCost = isSPR ? 0 : 90000;
  const barazaCost = isSPR ? 0 : 35000;
  const questionnairesCost = isSPR ? 2500 : 15000;
  const printingCost = isSPR ? 2500 : 8000;
  const totalDisbursements = newspaperCost + barazaCost + questionnairesCost + printingCost;

  const handlePrint = () => {
    window.print();
  };

  const agreementText = `
ENVIRONMENTAL IMPACT ASSESSMENT (EIA) CONSULTING SERVICES
TERMS OF ENGAGEMENT, FEE PROPOSAL & STATUTORY DISBURSEMENTS AGREEMENT
Pursuant to EMCA Cap 387, Legal Notice 101 of 2003, and Legal Notices 31 & 32 of 2019

PROJECT TITLE: ${projectName}
PROPONENT: ${proponentName} (KRA PIN: ${proponentPin})
LOCATION: Plot ${plotNo}, ${subCounty}, ${county} County
STATUTORY TRACK: ${isSPR ? 'Summary Project Report (SPR - Low Risk)' : 'Comprehensive Project Report (CPR - Medium/High Risk)'}
EIA PRACTITIONER: ${expertReg} (${expertTier})

1. SCOPE OF TECHNICAL SERVICES
- Baseline environmental screening, spatial GIS mapping, and site reconnaissance.
- Administration and synthesis of stakeholder consultation questionnaires.
- Compilation of statutory ESIA Project Report and ESMP in compliance with NEMA benchmarks.
- Digital uploading and processing on the NEMA licensing portal.
- Addressing Technical Advisory Committee (TAC) or County Director of Environment (CDE) review queries.

2. STATUTORY GOVERNMENT LEVIES (EXCLUSIONS)
- NEMA EIA Licensing Levy: Calculated at 0.1% of Capital Investment (KES ${nemaLevy.toLocaleString()}). Payable directly by Proponent to NEMA via eCitizen upon PRN generation.
- County Physical Planning and Lead Agency permit fees remain direct proponent obligations.

3. REIMBURSABLE THIRD-PARTY DISBURSEMENTS
${isSPR ? '- National Newspaper Notices: WAIVED (Legal Notices 31 & 32 of 2019).' : '- Mandatory Publication in 2 National Daily Newspapers: Direct Proponent Cost (~KES 90,000).'}
${isSPR ? '- Formal Public Barazas: WAIVED for low-risk SPR.' : '- Public Baraza Logistics (Venue hire, PA sound system, security, Chief allowances): Direct Proponent Cost (~KES 35,000).'}
- Questionnaires & Printing: Estimated at KES ${questionnairesCost.toLocaleString()} + KES ${printingCost.toLocaleString()} for hard copies.

4. VERIFIABLE PAYMENT MILESTONES (Total Fee: KES ${professionalFee.toLocaleString()})
- Milestone 1: Mobilization & Site Reconnaissance (30%): KES ${milestone1.toLocaleString()}
- Milestone 2: Draft Submission & Consultation Records (30%): KES ${milestone2.toLocaleString()}
- Milestone 3: Final NEMA Portal Upload & PRN Generation (30%): KES ${milestone3.toLocaleString()}
- Milestone 4: License Issuance / Statutory Retainer (10%): KES ${milestone4.toLocaleString()}

5. DOCUMENT CUSTODY & PORTAL PROTECTION CLAUSE
- All draft reports carry the watermark: "DRAFT — FOR CLIENT REVIEW ONLY — NOT FOR NEMA SUBMISSION".
- Signed Form 1 / 1B statutory declaration sheets and practicing seals are released ONLY upon settlement of Milestone 3 (90% cumulative).

ACCEPTED FOR PROPONENT: _______________________ DATE: ______________
ACCEPTED FOR CONSULTANT: ______________________ DATE: ______________
`.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(agreementText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Toolbar (Screen Only) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 bg-gray-900 text-white border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>EIA Fee Proposal & Retainer Contract</span>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                  isSPR ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {isSPR ? 'SPR Low-Risk Track' : 'CPR High-Risk Track'}
                </span>
              </h3>
              <p className="text-xs text-gray-400">Legally Insulated Kenyan Engagement Agreement (EMCA Cap 387 & LN 101)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700 text-xs">
              <span className="text-gray-400 font-medium">Prof. Fee:</span>
              <span className="font-bold text-emerald-400">KES</span>
              <input
                type="number"
                step="10000"
                value={professionalFee}
                onChange={(e) => setProfessionalFee(Math.max(10000, Number(e.target.value) || 0))}
                className="w-24 bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 text-right font-mono text-white text-xs focus:border-emerald-500 outline-none"
              />
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-700 transition"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-sm"
              title="Print or export as PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Contract Content */}
        <div className="p-8 overflow-y-auto space-y-6 text-gray-800 bg-white font-sans text-xs leading-relaxed print:p-0 print:text-black print:overflow-visible">
          
          {/* Official Letterhead Header */}
          <div className="text-center border-b-2 border-gray-900 pb-4 space-y-1">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-500">REPUBLIC OF KENYA</h4>
            <h1 className="text-lg font-black text-gray-900 tracking-tight">
              ENVIRONMENTAL IMPACT ASSESSMENT (EIA) CONSULTING SERVICES
            </h1>
            <h2 className="text-sm font-extrabold text-emerald-800 tracking-normal">
              TERMS OF ENGAGEMENT, STATUTORY FEE PROPOSAL & SERVICE AGREEMENT
            </h2>
            <p className="text-[11px] text-gray-600 italic">
              Governed under Section 58 & 59 of the Environmental Management and Co-ordination Act (EMCA Cap 387), 
              Legal Notice No. 101 of 2003, and Legal Notices No. 31 & 32 of 2019
            </p>
          </div>

          {/* Project & Client Identification Grid */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="font-bold text-gray-700 block">Proposed Project:</span>
              <span className="text-gray-900 font-semibold">{projectName}</span>
            </div>
            <div>
              <span className="font-bold text-gray-700 block">Statutory Track:</span>
              <span className="text-emerald-800 font-bold">
                {isSPR ? 'Summary Project Report (SPR — Low Risk)' : 'Comprehensive Project Report (CPR — Medium/High Risk)'}
              </span>
            </div>
            <div>
              <span className="font-bold text-gray-700 block">Project Proponent:</span>
              <span className="text-gray-900">{proponentName} (KRA PIN: {proponentPin})</span>
            </div>
            <div>
              <span className="font-bold text-gray-700 block">Cadastral Location:</span>
              <span className="text-gray-900">Plot / L.R. No. {plotNo}, {subCounty}, {county} County</span>
            </div>
            <div>
              <span className="font-bold text-gray-700 block">EIA Consultant of Record:</span>
              <span className="text-gray-900">{expertReg} ({expertTier})</span>
            </div>
            <div>
              <span className="font-bold text-gray-700 block">Statutory NEMA Processing Fee:</span>
              <span className="text-emerald-900 font-mono font-bold">
                KES {nemaLevy.toLocaleString(undefined, {maximumFractionDigits: 0})} (0.1% BQ — Proponent eCitizen Levy)
              </span>
            </div>
          </div>

          {/* Section 1: Scope of Technical Services */}
          <div>
            <h3 className="text-xs font-black uppercase text-gray-900 border-b pb-1 mb-2">
              1. Scope of Professional Technical Services
            </h3>
            <p className="text-gray-700 mb-2">
              The professional consulting fee quoted covers the end-to-end technical responsibilities of the EIA Expert(s), including:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-700">
              <li>Preliminary environmental scoping, on-site ground-truthing, and spatial boundary coordinates mapping.</li>
              <li>Formulation, administration, and statistical synthesis of Consultation and Public Participation (CPP) questionnaires.</li>
              <li>Compilation of the comprehensive Environmental and Social Impact Assessment Report and Environmental and Social Management Plan (ESMP).</li>
              <li>Direct processing and upload of the statutory submission bundle onto the National Environment Management Authority (NEMA) portal.</li>
              <li>Representation and drafting of official technical clarifications in response to queries issued by the NEMA Technical Advisory Committee (TAC) or the County Director of Environment (CDE).</li>
            </ul>
          </div>

          {/* Section 2: Statutory Government Levies (Exclusions) */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
            <h3 className="text-xs font-black uppercase text-amber-950 flex items-center gap-1.5 mb-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
              <span>2. Statutory Government Levies & Third-Party Fees (Strict Exclusions)</span>
            </h3>
            <p className="text-amber-900 text-[11px] leading-relaxed">
              The professional fee <strong>strictly excludes</strong> statutory government processing levies, which remain the direct financial obligation of the Proponent:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-amber-900 text-[11px] mt-1.5">
              <li>
                <strong>NEMA Statutory EIA Licensing Levy:</strong> Calculated at <strong>0.1% of the certified Bill of Quantities (BQ)</strong> investment cost (minimum KES 10,000, reference Gazette Notice 13211). Payable directly by the Proponent to NEMA via the official government portal (eCitizen) upon generation of the statutory Payment Reference Number (PRN).
              </li>
              <li>
                <strong>Ancillary Regulatory Approvals:</strong> County Physical Planning development approvals, Water Resources Authority (WRA) abstraction permits, and National Construction Authority (NCA) project registration fees are separate from this agreement.
              </li>
            </ul>
          </div>

          {/* Section 3: Reimbursable & Third-Party Disbursements */}
          <div>
            <h3 className="text-xs font-black uppercase text-gray-900 border-b pb-1 mb-2">
              3. Reimbursable Operational Disbursements & Field Logistics
            </h3>
            <p className="text-gray-700 mb-2">
              Third-party procedure expenses shall either be paid directly by the Proponent or reimbursed to the Consultant at certified cost:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <div className="border border-gray-200 rounded p-2.5 bg-gray-50/50">
                <span className="font-bold text-gray-800 block mb-1">Public Notification & Dailies</span>
                {isSPR ? (
                  <p className="text-emerald-800 text-[11px]">
                    <strong>Statutory Waiver Active:</strong> Low-risk SPRs are formally exempt from costly national daily advertisements under Legal Notices 31 & 32 of 2019 (Statutory Cost: <strong>KES 0</strong>).
                  </p>
                ) : (
                  <p className="text-gray-700 text-[11px]">
                    <strong>Mandatory 2 National Dailies:</strong> EMCA §59 mandates publication in two nationwide newspapers (approx. KES 80,000 – KES 120,000 billed directly to Proponent).
                  </p>
                )}
              </div>

              <div className="border border-gray-200 rounded p-2.5 bg-gray-50/50">
                <span className="font-bold text-gray-800 block mb-1">Public Baraza Logistics</span>
                {isSPR ? (
                  <p className="text-emerald-800 text-[11px]">
                    <strong>Statutory Waiver Active:</strong> Formal barazas waived. Public consultation conducted via localized neighbor visits (5–15 questionnaires).
                  </p>
                ) : (
                  <p className="text-gray-700 text-[11px]">
                    <strong>Community Barazas:</strong> Venue hire, PA sound system, security, and administrative honoraria for local leadership (approx. KES 35,000).
                  </p>
                )}
              </div>

              <div className="border border-gray-200 rounded p-2.5 bg-gray-50/50">
                <span className="font-bold text-gray-800 block mb-1">Laboratory Testing (Where Triggered)</span>
                <p className="text-gray-700 text-[11px]">
                  Specialist baseline noise surveys, ambient particulate air assays, or effluent lab tests from NEMA-designated laboratories are billed at certified lab invoice cost.
                </p>
              </div>

              <div className="border border-gray-200 rounded p-2.5 bg-gray-50/50">
                <span className="font-bold text-gray-800 block mb-1">Hard-Copy Binding & Courier</span>
                <p className="text-gray-700 text-[11px]">
                  Printing, binding, and physical courier of 3 to 10 hard-bound copies required by the NEMA County Director of Environment and Lead Agencies.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Verifiable Payment Milestones */}
          <div>
            <h3 className="text-xs font-black uppercase text-gray-900 border-b pb-1 mb-2">
              4. Professional Fee Schedule & Verifiable Milestone Deliverables
            </h3>
            <p className="text-gray-700 mb-2">
              Professional technical consulting fees for this undertaking are agreed at a fixed sum of <strong>KES {professionalFee.toLocaleString()}</strong>, payable against verifiable statutory triggers:
            </p>

            <table className="w-full border-collapse border border-gray-300 text-xs mt-2">
              <thead>
                <tr className="bg-gray-100 text-gray-900 text-left">
                  <th className="border border-gray-300 p-2 font-bold w-1/4">Milestone Trigger</th>
                  <th className="border border-gray-300 p-2 font-bold w-1/2">Statutory Verifiable Deliverable</th>
                  <th className="border border-gray-300 p-2 font-bold text-center w-1/8">% Due</th>
                  <th className="border border-gray-300 p-2 font-bold text-right w-1/8">Amount (KES)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-2 font-semibold">Milestone 1: Mobilization</td>
                  <td className="border border-gray-300 p-2">Execution of Engagement Agreement, site ground-truthing & GPS cadastral delineation</td>
                  <td className="border border-gray-300 p-2 text-center font-bold">30%</td>
                  <td className="border border-gray-300 p-2 text-right font-mono font-bold">{milestone1.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2 font-semibold">Milestone 2: Draft Submission</td>
                  <td className="border border-gray-300 p-2">Delivery of Pre-Submission Draft ESIA Report & Public Questionnaire Ledger for Client Review</td>
                  <td className="border border-gray-300 p-2 text-center font-bold">30%</td>
                  <td className="border border-gray-300 p-2 text-right font-mono font-bold">{milestone2.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2 font-semibold">Milestone 3: Portal Submission</td>
                  <td className="border border-gray-300 p-2">Final Report Polish, NEMA eCitizen Upload & Generation of Statutory PRN Tracking Code</td>
                  <td className="border border-gray-300 p-2 text-center font-bold">30%</td>
                  <td className="border border-gray-300 p-2 text-right font-mono font-bold text-emerald-700">{milestone3.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2 font-semibold">Milestone 4: Review Retainer</td>
                  <td className="border border-gray-300 p-2">Receipt of Official NEMA Approval / EIA License (or expiration of statutory 60-day review period)</td>
                  <td className="border border-gray-300 p-2 text-center font-bold">10%</td>
                  <td className="border border-gray-300 p-2 text-right font-mono font-bold">{milestone4.toLocaleString()}</td>
                </tr>
                <tr className="bg-gray-50 font-bold">
                  <td colSpan="2" className="border border-gray-300 p-2 text-right uppercase">Total Professional Remuneration:</td>
                  <td className="border border-gray-300 p-2 text-center">100%</td>
                  <td className="border border-gray-300 p-2 text-right font-mono text-emerald-900 text-sm">KES {professionalFee.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 5: Document Custody & Portal Protection Clause */}
          <div className="p-3 bg-red-50/60 border border-red-200 rounded-lg text-[11px] leading-relaxed text-red-950">
            <h4 className="font-bold text-xs uppercase text-red-900 mb-1 flex items-center gap-1.5">
              <span>5. Document Custody, Digital Copyright & Portal Submission Lock</span>
            </h4>
            <p>
              <strong>Review Watermark:</strong> All preview drafts issued prior to Milestone 3 settlement carry digital review watermarks (<em>"DRAFT — FOR CLIENT REVIEW ONLY — NOT FOR NEMA SUBMISSION"</em>).
            </p>
            <p className="mt-1">
              <strong>Statutory Declaration Withholding:</strong> Original signed <strong>Lead Expert Statutory Declarations (Form 1 / Form 1B)</strong>, certified practicing licenses, and embossed rubber stamps are released and submitted to NEMA <strong>strictly upon cumulative settlement of Milestone 3 (90% payment)</strong>. The Consultant reserves all rights to suspend portal filing if payment obligations are not honored.
            </p>
          </div>

          {/* Section 6: Statutory Track Variation Clause */}
          <div className="text-[11px] text-gray-600 border-t pt-3">
            <span className="font-bold text-gray-800">6. Statutory Track Variation Order: </span>
            In the event that NEMA, County Authorities, or emerging environmental constraints mandate that an SPR undertaking be escalated to a Comprehensive Project Report (CPR) or full EIA Study, a supplementary scope and disbursement schedule will be issued reflecting mandatory newspaper notices, baraza logistics, and expanded baseline studies.
          </div>

          {/* Signature Execution Blocks */}
          <div className="pt-6 border-t-2 border-gray-900 grid grid-cols-2 gap-8 text-xs">
            <div className="space-y-3">
              <span className="font-bold text-gray-900 block uppercase tracking-wide">FOR THE PROPONENT (CLIENT):</span>
              <p className="text-gray-600 text-[11px]">I confirm acceptance of the technical scope, payment terms, and statutory exclusion clauses stated herein.</p>
              <div className="pt-8 border-b border-gray-400"></div>
              <div className="space-y-1">
                <p>Authorized Signatory: _________________________________</p>
                <p>Designation / Title: ___________________________________</p>
                <p>Date of Execution: ___________________________________</p>
              </div>
            </div>

            <div className="space-y-3">
              <span className="font-bold text-gray-900 block uppercase tracking-wide">FOR THE EIA LEAD CONSULTANT:</span>
              <p className="text-gray-600 text-[11px]">I confirm commitment to executing this assignment strictly pursuant to EMCA Cap 387 and NEMA codes of practice.</p>
              <div className="pt-8 border-b border-gray-400"></div>
              <div className="space-y-1">
                <p>Lead Expert Name: ____________________________________</p>
                <p>NEMA Practicing Reg No: <span className="font-mono font-bold text-gray-900">{expertReg}</span></p>
                <p>Date of Execution: ___________________________________</p>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer (Screen Only) */}
        <div className="print:hidden px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Ready for client signing • Print directly or export as PDF</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg transition"
            >
              {copied ? 'Copied Contract Text!' : 'Copy Text'}
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-sm flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Agreement</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
