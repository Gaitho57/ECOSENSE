"""
EcoSense AI — NEMA Radar (Kenya Gazette Scraper & Matcher)

Monitors the weekly Kenya Gazette for Environmental Impact Assessment (EIA)
Study Report notices published by NEMA under Section 59 of EMCA (Cap 387)
and Regulation 21 of the Environmental (Impact Assessment and Audit) Regulations.

Automatically correlates published notices with active EcoSense projects,
tracks statutory 30-day public comment deadlines, and notifies experts.
"""

import re
import os
import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Q
from pypdf import PdfReader

from apps.reports.models import NEMAGazetteNotice, EIAReport
from apps.projects.models import Project

logger = logging.getLogger(__name__)


class GazetteRadarService:
    """
    Core engine for parsing, matching, and tracking Kenya Gazette NEMA notices.
    """

    @staticmethod
    def parse_text(text: str, gazette_issue="Weekly Kenya Gazette", publication_date=None, source_url=""):
        """
        Parses raw Kenya Gazette text to extract structured NEMA EIA study notices.
        Returns a list of created or updated NEMAGazetteNotice instances.
        """
        if publication_date is None:
            publication_date = timezone.now().date()
            
        # Pattern to isolate NEMA Gazette Notices
        # Typically formatted as:
        # GAZETTE NOTICE NO. [0-9]+
        # THE ENVIRONMENTAL MANAGEMENT AND CO-ORDINATION ACT
        # (Cap. 387)
        # INVITATION FOR PUBLIC COMMENTS ON AN ENVIRONMENTAL IMPACT ASSESSMENT STUDY REPORT...
        
        notice_blocks = re.split(r'(?=GAZETTE\s+NOTICE\s+NO\.\s*\d+)', text, flags=re.IGNORECASE)
        saved_notices = []

        for block in notice_blocks:
            if not block.strip():
                continue

            # Filter for NEMA / EMCA notices
            if "ENVIRONMENTAL MANAGEMENT AND CO-ORDINATION ACT" not in block.upper() and "CAP. 387" not in block.upper() and "NEMA" not in block.upper():
                continue

            # 1. Notice Number
            notice_num_match = re.search(r'GAZETTE\s+NOTICE\s+NO\.\s*(\d+)', block, re.IGNORECASE)
            notice_num = f"Gazette Notice No. {notice_num_match.group(1)}" if notice_num_match else "Gazette Notice No. [Unspecified]"

            # 2. Proponent
            proponent = ""
            proponent_match = re.search(r'(?:proponent\s*:\s*|proponent,\s*Messrs\.?\s*|by\s+Messrs\.?\s*|Proponent\s+)(.*?)(?:\n|\.|\,)', block, re.IGNORECASE)
            if proponent_match:
                proponent = proponent_match.group(1).strip()
            if not proponent:
                # Fallback: look for "proponent" in nearby sentences
                lines = block.split('\n')
                for line in lines:
                    if 'proponent' in line.lower() or 'ltd' in line.lower() or 'limited' in line.lower():
                        proponent = line.strip()
                        break

            # Strip leading punctuation and title prefix (e.g., ": Messrs ")
            proponent = re.sub(r'^(?:[:\-\s]|Messrs\.?\s*)+', '', proponent, flags=re.IGNORECASE).strip()

            # 3. Project Title & Location
            title = ""
            title_match = re.search(r'(?:PROPOSED|FOR\s+THE\s+PROPOSED)\s+([^\.]+?)(?:IN\s+|AT\s+|ON\s+LR|\.|\n\n)', block, re.IGNORECASE)
            if title_match:
                title = f"Proposed {title_match.group(1).strip()}"
            else:
                title = "Proposed Development (Title Pending Extraction)"

            # Clean up title artifacts
            title = re.sub(r'\s+', ' ', title).strip()

            # 4. Plot / LR Number
            plot_match = re.search(r'(?:L\.?R\.?\s*No\.?|Plot\s*No\.?)\s*([0-9\/\w\s\(\)]+?)(?:[\,\;\.\n]|$)', block, re.IGNORECASE)
            plot_no = plot_match.group(0).strip() if plot_match else ""

            # 5. County Extraction
            county = ""
            county_match = re.search(r'([A-Za-z\s]+?)\s+County', block, re.IGNORECASE)
            if county_match:
                county = f"{county_match.group(1).strip()} County"

            # 6. Public Comments Deadline
            # Typically 30 days from publication date
            deadline_date = publication_date + timedelta(days=30)
            deadline_match = re.search(r'(?:within\s*(\d+)\s*days|not\s+later\s+than\s+([A-Za-z0-9\,\s]+?\d{4}))', block, re.IGNORECASE)
            if deadline_match:
                if deadline_match.group(1):
                    try:
                        days = int(deadline_match.group(1))
                        deadline_date = publication_date + timedelta(days=days)
                    except ValueError:
                        pass

            # Create or update record
            notice, created = NEMAGazetteNotice.objects.update_or_create(
                notice_number=notice_num,
                publication_date=publication_date,
                defaults={
                    "gazette_issue": gazette_issue,
                    "project_title": title[:500],
                    "proponent_name": proponent[:300] or "Proponent Unspecified",
                    "county": county[:100],
                    "plot_number": plot_no[:200],
                    "location_description": block[:800],
                    "public_comments_deadline": deadline_date,
                    "source_url": source_url,
                    "raw_notice_text": block[:10000],
                }
            )
            saved_notices.append(notice)
            logger.info(f"Gazette Radar ingested: {notice_num} - {title[:60]}")

        # Run correlation matching immediately
        GazetteRadarService.match_notices_to_projects()
        return saved_notices

    @staticmethod
    def parse_pdf(file_path: str, gazette_issue="", publication_date=None):
        """
        Extracts text from a Kenya Gazette PDF and runs the radar parser.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Gazette PDF not found at {file_path}")

        reader = PdfReader(file_path)
        full_text = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                full_text += extracted + "\n"

        return GazetteRadarService.parse_text(
            text=full_text,
            gazette_issue=gazette_issue or os.path.basename(file_path),
            publication_date=publication_date,
            source_url=file_path
        )

    @staticmethod
    def match_notices_to_projects():
        """
        Cross-references unmatched gazette notices against active EcoSense projects.
        Matches by Plot Number, Proponent Name, or Project Title.
        """
        unmatched_notices = NEMAGazetteNotice.objects.filter(matched_project__isnull=True)
        projects = Project.objects.all()

        matched_count = 0

        for notice in unmatched_notices:
            best_match = None
            highest_confidence = 0.0
            reason = ""

            for proj in projects:
                confidence = 0.0
                reasons = []

                # Criterion A: Plot Number Match (Strongest signal)
                proj_plot = getattr(proj, 'plot_number', '')
                if not proj_plot:
                    # Check attached Title Deed documents or project description
                    title_docs = proj.documents.filter(doc_type='title_deed')
                    if title_docs.exists() and title_docs.first().reference_no:
                        proj_plot = title_docs.first().reference_no
                    elif proj.description:
                        proj_plot = proj.description

                if notice.plot_number and proj_plot:
                    clean_notice_plot = re.sub(r'[^\w\/]', '', notice.plot_number).lower()
                    clean_proj_plot = re.sub(r'[^\w\/]', '', proj_plot).lower()
                    if clean_proj_plot in clean_notice_plot or clean_notice_plot in clean_proj_plot:
                        confidence += 0.95
                        reasons.append("Exact/Close Cadastral Plot Match")

                # Criterion B: Proponent Name Match
                if notice.proponent_name and proj.proponent_name:
                    p1 = re.sub(r'^(?:[:\-\s]|messrs\.?\s*)+', '', notice.proponent_name.lower())
                    p1 = p1.replace("ltd", "").replace("limited", "").strip()
                    p2 = re.sub(r'^(?:[:\-\s]|messrs\.?\s*)+', '', proj.proponent_name.lower())
                    p2 = p2.replace("ltd", "").replace("limited", "").strip()
                    if p1 and p2 and (p1 in p2 or p2 in p1):
                        confidence = max(confidence, 0.90)
                        reasons.append("Proponent Name Match")

                # Criterion C: Project Title Keywords
                t1 = set(notice.project_title.lower().split())
                t2 = set(proj.name.lower().split())
                overlap = t1.intersection(t2)
                overlap.difference_update({"proposed", "the", "for", "and", "of", "in", "at", "project", "development"})
                if len(overlap) >= 3:
                    confidence = max(confidence, 0.85)
                    reasons.append(f"Title Keyword Overlap ({', '.join(overlap)})")

                # Criterion D: County Match confirmation
                proj_county = getattr(proj, 'county', '')
                if confidence > 0.6 and notice.county and proj_county:
                    if proj_county.lower() in notice.county.lower():
                        confidence = min(1.0, confidence + 0.05)

                if confidence > highest_confidence and confidence >= 0.75:
                    highest_confidence = confidence
                    best_match = proj
                    reason = " + ".join(reasons)

            if best_match and highest_confidence >= 0.75:
                notice.matched_project = best_match
                notice.match_confidence = round(highest_confidence, 2)
                notice.match_reason = reason
                notice.status = "matched"
                notice.save()

                # Update Project metadata automatically
                if not best_match.nema_ref:
                    best_match.nema_ref = notice.notice_number
                    best_match.status = "review"  # Move project to public review phase
                    best_match.save()

                # Sync with latest EIAReport
                latest_report = best_match.reports.first()
                if latest_report:
                    latest_report.submission_ref = notice.notice_number
                    if notice.public_comments_deadline:
                        latest_report.submission_deadline = timezone.make_aware(
                            datetime.combine(notice.public_comments_deadline, datetime.min.time())
                        )
                    latest_report.status = "submitted"
                    latest_report.save()

                matched_count += 1
                logger.info(f"RADAR HIT: Matched {notice.notice_number} to {best_match.name} (Confidence: {highest_confidence})")

        return matched_count

    @staticmethod
    def generate_demo_gazette_feed():
        """
        Generates realistic Kenya Gazette notices for testing the NEMA Radar engine.
        Includes a simulated notice for Athi River Industrial Park and Kitengela Logistics.
        """
        demo_text = """
GAZETTE NOTICE NO. 14921
THE ENVIRONMENTAL MANAGEMENT AND CO-ORDINATION ACT
(Cap. 387)
THE NATIONAL ENVIRONMENT MANAGEMENT AUTHORITY (NEMA)
INVITATION FOR PUBLIC COMMENTS ON AN ENVIRONMENTAL IMPACT ASSESSMENT STUDY REPORT FOR THE PROPOSED ATHI RIVER INDUSTRIAL PARK REDEVELOPMENT

Pursuant to Regulation 21 of the Environmental (Impact Assessment and Audit) Regulations, 2003, the National Environment Management Authority (NEMA) has received an Environmental Impact Assessment (EIA) Study Report for the proposed Athi River Industrial Park Redevelopment.

The proponent, Messrs Sisal Valley Industrial Developers Ltd. (KRA PIN: P073619284S), proposes to redevelop a disused cement-bagging complex into a modern manufacturing park on LR No. 15920/6 (Machakos Registry), Athi River, Machakos County.
The project footprint occupies 11.2 hectares. Proposed components include industrial packaging facilities, stormwater detention ponds, perimeter access roads, and rail siding integration.

Potential Environmental and Social Impacts and Proposed Mitigation Measures:
1. Soil & Lead Contamination: Targeted excavation of lead-contaminated soil (890 mg/kg) around former battery recycling footprint and hardstanding encapsulation.
2. Riparian Buffer Encroachment: Conditional consent secured from the Water Resources Authority (WRA) for 0.4 ha buffer area and attenuation pond redesign.
3. Resettlement Action Plan (RAP): Livelihood restoration and unconditional relocation assistance grants for 12 Project-Affected Households.

The full report is available for inspection during normal working hours at NEMA Headquarters, Popo Road, South C, Nairobi, and the County Director of Environment, Machakos County.
NEMA invites members of the public to submit oral or written comments not later than thirty (30) days from the date of publication of this notice to the Director-General, NEMA.

Dated the 10th October, 2026.
M. A. OTIENO,
for Director-General,
National Environment Management Authority.

--------------------------------------------------------------------------------

GAZETTE NOTICE NO. 14922
THE ENVIRONMENTAL MANAGEMENT AND CO-ORDINATION ACT
(Cap. 387)
INVITATION FOR PUBLIC COMMENTS ON AN ENVIRONMENTAL IMPACT ASSESSMENT STUDY REPORT FOR THE PROPOSED KITENGELA LOGISTICS AND WAREHOUSING CENTRE

Pursuant to Section 59 of EMCA Cap 387, the Authority has received a Study Report for the proposed Kitengela Logistics and Warehousing Centre situated on 5 acres in Kitengela, Kajiado County.
Proponent: Messrs Rift Valley Logistics Ltd.
Activities include construction of two warehouses, truck parking for 20 vehicles, and stormwater drainage.
Members of the public are invited to submit comments within thirty (30) days.

Dated the 10th October, 2026.
M. A. OTIENO,
for Director-General, NEMA.
"""
        return GazetteRadarService.parse_text(
            text=demo_text,
            gazette_issue="Vol. CXXVIII - No. 94 (Simulated Kenya Gazette)",
            publication_date=timezone.now().date()
        )
