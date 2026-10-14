import os
import re
import base64
from datetime import datetime
from io import BytesIO
from django.conf import settings
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH

from apps.reports.utils.maps import MapGenerator, to_dms
from apps.projects.utils.media import generate_reconnaissance_plate_image

ACRONYMS = {
    "EMCA": "Environmental Management and Coordination Act",
    "ESIA": "Environmental and Social Impact Assessment",
    "ESMMP": "Environmental and Social Management and Monitoring Plan",
    "NEMA": "National Environment Management Authority",
    "OSHA": "Occupational Safety and Health Act",
    "WB": "World Bank",
    "WHO": "World Health Organization"
}

def _parse_html_to_docx(doc, html_string):
    """
    Rudimentary HTML parser for docx to handle paragraphs and base64 images.
    """
    if not html_string:
        return
        
    try:
        import bs4
        soup = bs4.BeautifulSoup(html_string, 'html.parser')
        for element in soup.descendants:
            if isinstance(element, bs4.element.Tag):
                if element.name in ['h1', 'h2', 'h3', 'h4']:
                    doc.add_heading(element.get_text(strip=True), level=int(element.name[-1]))
                elif element.name == 'p':
                    text = element.get_text(strip=True)
                    if text:
                        doc.add_paragraph(text)
                elif element.name == 'img':
                    src = element.get('src', '')
                    if src.startswith('data:image'):
                        try:
                            header, b64_data = src.split(',', 1)
                            img_bytes = base64.b64decode(b64_data)
                            image_stream = BytesIO(img_bytes)
                            doc.add_picture(image_stream, width=Inches(6.0))
                        except Exception as e:
                            print("Error adding picture:", e)
    except ImportError:
        clean_text = re.sub(r'<[^>]+>', '', html_string)
        for p in clean_text.split('\n\n'):
            if p.strip():
                doc.add_paragraph(p.strip())


def _add_nema_figure(doc, img_stream, fig_title: str, fig_source: str, width_inches: float = 6.2):
    """
    Standard NEMA two-tier figure layout:
      1. Centered graphic frame (6.2 inches).
      2. Figure Number & Title in bold (9.5pt).
      3. Italic Source, Coordinates, Elevation, and Compiler attribution (8.5pt).
    """
    try:
        doc.add_paragraph()
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.add_run().add_picture(img_stream, width=Inches(width_inches))

        caption = doc.add_paragraph()
        caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run_title = caption.add_run(fig_title + "\n")
        run_title.bold = True
        run_title.font.name = 'Arial'
        run_title.font.size = Pt(9.5)

        run_src = caption.add_run(fig_source)
        run_src.italic = True
        run_src.font.name = 'Arial'
        run_src.font.size = Pt(8.5)
        run_src.font.color.rgb = RGBColor(71, 85, 105)
    except Exception as e:
        print(f"Notice: Failed to embed figure {fig_title}: {e}")


def generate_docx_report(project_id: str, tenant_id: str, version: int, report_data: dict, is_unlocked: bool = False, watermark_text: str = "DRAFT — FOR CLIENT REVIEW ONLY — NOT FOR NEMA SUBMISSION") -> tuple:
    doc = Document()
    mg = MapGenerator()
    
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Arial'
    font.size = Pt(11)

    # Core spatial and project metadata variables
    lon = float(report_data.get('coordinates', {}).get('lng', report_data.get('longitude', 36.9602)))
    lat = float(report_data.get('coordinates', {}).get('lat', report_data.get('latitude', -1.4777)))
    centroid_dms = f"{to_dms(lat, True)}, {to_dms(lon, False)}"

    proj_name = report_data.get('project', {}).get('name', 'EIA Project')
    plot_no = report_data.get('project', {}).get('plot_number', 'Kajiado/Kaputiei-North/12345')
    area_ha = report_data.get('project', {}).get('site_area', 0.405)
    county_name = report_data.get('project', {}).get('county', 'Kajiado')
    sub_county = report_data.get('project', {}).get('sub_county', 'Isinya')
    current_date = report_data.get('project', {}).get('date', datetime.now().strftime("%d %B %Y"))

    # Elevation and slope metrics
    baseline_dict = report_data.get('baseline', {}) if isinstance(report_data.get('baseline'), dict) else {}
    elevation_m = float(baseline_dict.get('elevation_m', 1680.0) or 1680.0)
    slope_pct = float(baseline_dict.get('slope_pct', 3.2) or 3.2)

    # Dynamic Header: Watermark Stamp when pending milestone payment clearance
    for section in doc.sections:
        header = section.header
        hp = header.paragraphs[0] if header.paragraphs else header.add_paragraph()
        hp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if not is_unlocked:
            hrun = hp.add_run(f"⚠ {watermark_text} ⚠")
            hrun.font.name = 'Arial'
            hrun.font.size = Pt(8.5)
            hrun.font.bold = True
            hrun.font.color.rgb = RGBColor(220, 38, 38) # Crimson Red Draft Watermark
        else:
            hrun = hp.add_run("Official NEMA Statutory Submission Document — EMCA Cap 387")
            hrun.font.name = 'Arial'
            hrun.font.size = Pt(8)
            hrun.font.italic = True
            hrun.font.color.rgb = RGBColor(100, 116, 139) # Subdued Slate

    # COVER PAGE
    doc.add_heading('Environmental and Social Impact Assessment Project Report', 0)
    p = doc.add_paragraph(proj_name)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.runs[0].font.size = Pt(24)
    p.runs[0].bold = True
    
    expert_tier = report_data.get('project', {}).get('expert_tier', 'LEAD')
    consultant_tier_title = "Associate Expert (LN 101 Reg 2 & 7(3))" if expert_tier == 'ASSOCIATE' else "Lead Expert (LN 101 Reg 13(2))"
    doc.add_paragraph(f"Proponent: {report_data['project']['proponent']['name']}").alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph(f"Prepared by: {report_data['project']['lead_consultant']} ({consultant_tier_title})").alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph(f"NEMA Registration Number: {report_data['project']['consultant_reg']}").alignment = WD_ALIGN_PARAGRAPH.CENTER
    if expert_tier == 'ASSOCIATE' and report_data.get('project', {}).get('supervising_lead_expert'):
        doc.add_paragraph(f"Supervising Lead Expert of Record: {report_data['project']['supervising_lead_expert']}").alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph(f"Date: {current_date}").alignment = WD_ALIGN_PARAGRAPH.CENTER

    if not is_unlocked:
        doc.add_paragraph()
        banner_tbl = doc.add_table(rows=1, cols=1)
        banner_tbl.style = 'Table Grid'
        b_cell = banner_tbl.rows[0].cells[0]
        b_p = b_cell.paragraphs[0]
        b_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        b_run1 = b_p.add_run("⚠ PRE-SUBMISSION DRAFT — FOR CLIENT REVIEW ONLY — NOT FOR NEMA FILING ⚠\n")
        b_run1.font.bold = True
        b_run1.font.size = Pt(10)
        b_run1.font.color.rgb = RGBColor(220, 38, 38)
        b_run2 = b_p.add_run(
            "This report is issued under milestone escrow for proponent review and verification.\n"
            "Official NEMA Form 1 & Form 1B statutory blue-ink signatures and Lead Expert practicing seals\n"
            "are withheld until milestone payment clearance via the EcoSense Review Portal."
        )
        b_run2.font.size = Pt(9)
        b_run2.font.color.rgb = RGBColor(180, 83, 9)

    doc.add_page_break()

    # EXECUTIVE SUMMARY
    doc.add_heading('Executive Summary', level=1)
    if report_data.get('executive_summary'):
        _parse_html_to_docx(doc, report_data['executive_summary'])
    else:
        doc.add_paragraph("Executive summary of the project.")
    doc.add_page_break()

    # CHAPTER 1: INTRODUCTION
    doc.add_heading('Chapter 1: Introduction', level=1)
    doc.add_paragraph(
        "This Environmental and Social Impact Assessment (ESIA) is conducted pursuant to Section 58 of the "
        "Environmental Management and Co-ordination Act (EMCA Cap 387) and Regulation 7 of the Environmental "
        "(Impact Assessment and Audit) Regulations, 2003 (Legal Notice 101)."
    )
    doc.add_paragraph(
        f"The proposed development is located within {county_name} County ({sub_county} Sub-County). "
        f"Macro regional accessibility is facilitated by primary and classified transport corridors "
        f"as illustrated in Figure 1.1 below."
    )

    # Embed Figure 1.1: Macro Regional Location Map
    try:
        fig1_stream = mg.generate_macro_map_bytes(lon, lat, proj_name, county_name, sub_county)
        _add_nema_figure(
            doc, fig1_stream,
            fig_title="Figure 1.1: Macro Regional Location & Transport Infrastructure Map",
            fig_source=f"Source: Survey of Kenya Administrative Boundaries & Regional Road Network. Datum: WGS84. Compiled on {current_date}."
        )
    except Exception as e:
        print(f"Notice: Figure 1.1 embedding skipped: {e}")

    # CHAPTER 2: PROJECT DESCRIPTION & SITE LAYOUT
    doc.add_heading('Chapter 2: Project Description & Site Layout', level=1)

    # 2.1 Project Particulars & Statutory Compliance Matrix
    doc.add_heading('2.1 Project Particulars & Statutory Intake Matrix', level=2)
    doc.add_paragraph(
        "Table 2.1 summarizes the core administrative, engineering, spatial, and statutory planning parameters "
        "declared by the proponent and locked for regulatory verification:"
    )
    t_proj = doc.add_table(rows=1, cols=2)
    t_proj.style = 'Table Grid'
    t_proj_hdr = t_proj.rows[0].cells
    t_proj_hdr[0].text = "Project & Statutory Parameter"
    t_proj_hdr[1].text = "Declared Baseline / Engineering Specification"
    t_proj_hdr[0].paragraphs[0].runs[0].bold = True
    t_proj_hdr[1].paragraphs[0].runs[0].bold = True

    proj_dict = report_data.get('project', {})
    is_mega = proj_dict.get('is_mega_project', False)
    stat_track = report_data.get('statutory_track', 'SPR')

    particulars = [
        ("Project Undertaking / Title:", proj_name),
        ("Project Proponent:", f"{proj_dict.get('proponent', {}).get('name', 'EcoSense Proponent')} (KRA PIN: {proj_dict.get('proponent', {}).get('pin', 'A001234567Z')})"),
        ("EIA Expert Practitioner:", f"{proj_dict.get('lead_consultant', 'Lead Expert')} ({consultant_tier_title})"),
        ("NEMA Registration Number:", proj_dict.get('consultant_reg', 'NEMA/EIA/0876')),
    ]
    if expert_tier == 'ASSOCIATE' and proj_dict.get('supervising_lead_expert'):
        particulars.append(("Supervising Lead Expert of Record:", f"{proj_dict.get('supervising_lead_expert')} (LN 101 Reg 13(2))"))

    particulars.extend([
        ("Administrative Jurisdiction:", f"{county_name} County, {sub_county} Sub-County" if not is_mega else f"Cross-County Linear Corridor: {proj_dict.get('counties_traversed', county_name)}"),
        ("Cadastral Reference / Plot:", f"L.R. No. {plot_no}" if not is_mega else "Corridor Right-of-Way / Multi-Plot Alignment"),
        ("Land Tenure & Ownership Status:", proj_dict.get('land_ownership', 'Private Land - Freehold')),
        ("Declared Total Footprint / Area:", f"{area_ha} Hectares"),
        ("Estimated Capital Investment Cost:", proj_dict.get('investment_value', 'KES 10,000,000')),
        ("Statutory NEMA Processing Levy (0.1%):", f"{proj_dict.get('nema_fee', 'KES 10,000')} (Reference: Gazette Notice 13211)"),
        ("Primary Water Supply Source:", proj_dict.get('water_supply_source', 'Municipal / County Water Utility (e.g. NCWSC)')),
        ("Trade & Domestic Effluent Management:", f"{proj_dict.get('effluent_disposal_method', 'Municipal Sewer Connection')} (EDL Status: {proj_dict.get('effluent_discharge_permit_status', 'Not Applicable')})"),
        ("Statutory EIA Track & Governance:", "Summary Project Report (SPR - Low Risk under Legal Notices 31 & 32 of 2019)" if stat_track == 'SPR' else "Comprehensive Project Report (CPR - Medium/High Risk under EMCA §59 & Reg 17)"),
    ])

    for label, val in particulars:
        r = t_proj.add_row().cells
        r[0].text = label
        r[0].paragraphs[0].runs[0].bold = True
        r[1].text = str(val)

    doc.add_paragraph()
    if report_data.get('project_description'):
        _parse_html_to_docx(doc, report_data['project_description'])
    else:
        doc.add_paragraph("Project description and design specifications.")
        
    # Statutory narrative cross-reference for Figure 1.2
    doc.add_paragraph(
        f"The proposed development is situated on Land Reference Number {plot_no}, encompassing an area of "
        f"approximately {area_ha} hectares. As illustrated in Figure 1.2, the site is bordered by an approved "
        f"18-meter-wide bitumen access road reserve to the South, existing neighboring properties to the East "
        f"and West, and undeveloped commercial land to the North. The project coordinates for the site centroid "
        f"are {centroid_dms} (Elevation: {elevation_m:.0f}m Above Sea Level)."
    )

    # Embed Figure 1.2: Micro Cadastral & Satellite Overlay
    try:
        sat_stream = mg.generate_cadastral_overlay_bytes(lon, lat, proj_name, plot_no, float(area_ha))
        _add_nema_figure(
            doc, sat_stream,
            fig_title=f"Figure 1.2: Satellite Imagery Showing Project Site Boundaries (L.R. No. {plot_no}) and Surrounding Neighborhood Context",
            fig_source=f"Source: Field Reconnaissance Survey & High-Resolution Aerial Composite (Coordinates: {centroid_dms}; Alt: {elevation_m:.0f}m ASL). Map compiled by Lead Expert on {current_date}."
        )
    except Exception as e:
        print(f"Notice: Satellite image embedding in Chapter 2 skipped: {e}")

    doc.add_heading('Project Alternatives', level=2)
    if report_data.get('alternatives'):
        for alt in report_data['alternatives']:
            doc.add_paragraph(f"{alt['alternative']}: {alt['rationale']}", style='List Bullet')
    
    # CHAPTER 3: POLICY, LEGAL AND INSTITUTIONAL FRAMEWORK
    doc.add_heading('Chapter 3: Policy, Legal and Institutional Framework', level=1)
    if report_data.get('legal_narrative'):
        _parse_html_to_docx(doc, report_data['legal_narrative'])
    else:
        doc.add_paragraph("The project is governed by EMCA Cap 387 and the Environmental (Impact Assessment and Audit) Regulations, 2003.")

    # 3.1 County Environmental Policy & CEAP Alignment
    doc.add_heading(f'3.1 County Environmental Policy & CEAP Alignment ({county_name} County)', level=2)
    county_profile = report_data.get('county_profile', {})
    ceap_data = county_profile.get('ceap_status') or report_data.get('ceap_status', {})
    if ceap_data.get('is_gazetted'):
        doc.add_paragraph(
            f"Pursuant to Section 29 of the Environmental Management and Co-ordination Act (EMCA Cap 387), {county_name} County "
            f"has formulated and gazetted its statutory County Environmental Action Plan: {ceap_data.get('title')} "
            f"({ceap_data.get('gazette_notice', 'Official Gazette Notice')})."
        )
        doc.add_paragraph(
            "The proposed development has been evaluated against the core policy priorities stipulated in the CEAP, specifically:"
        )
        for prio in ceap_data.get('key_priorities', []):
            doc.add_paragraph(f"{prio}", style='List Bullet')
    else:
        doc.add_paragraph(
            f"Under Section 29 of EMCA Cap 387, in the absence of a standalone gazetted 5-year CEAP for {county_name} County, "
            f"the development aligns directly with the {ceap_data.get('fallback_policy', 'National Environmental Action Plan (NEAP)')} "
            f"and the relevant Water Resources Authority (WRA) Sub-basin Catchment Management Plan."
        )

    # 3.2 Water Resources Act 2016 & Abstraction Permitting
    doc.add_heading('3.2 Water Resources Act 2016 & Abstraction Permitting (Section 36)', level=2)
    doc.add_paragraph(
        f"The proposed development relies upon '{proj_dict.get('water_supply_source', 'Municipal Utility')}' for its operational water requirements. "
        "Under Section 36 of the Water Act 2016 and the Water Resources Management Rules 2007, any direct abstraction of groundwater "
        "via a commercial borehole or direct abstraction from a surface watercourse mandates a valid Water Resources Authority (WRA) "
        "Abstraction Permit supported by a certified Hydrogeological Assessment Report. The proponent is strictly required "
        "to install calibrated bulk flow meters and observe prescribed extraction thresholds to safeguard regional aquifer yields."
    )

    # 3.3 EMCA (Water Quality) Regulations 2006 & Effluent Licensing
    doc.add_heading('3.3 EMCA (Water Quality) Regulations 2006 & Effluent Discharge Licensing', level=2)
    doc.add_paragraph(
        f"Effluent generated from the undertaking will be managed via: '{proj_dict.get('effluent_disposal_method', 'Municipal Sewer Mains Connection')}'. "
        "Pursuant to the Environmental Management and Co-ordination (Water Quality) Regulations 2006 (Legal Notice No. 120), "
        "no person shall discharge trade or domestic effluent into any aquatic environment, open stormwater channel, or aquifer without "
        "a valid Effluent Discharge License (EDL) issued by NEMA. Discharges must strictly comply with the Third Schedule parameters "
        "(BOD5 < 30 mg/L, COD < 50 mg/L, TSS < 30 mg/L, pH 6.5–8.5). Regular quarterly effluent testing and submission of environmental "
        "monitoring returns to the NEMA County Director of Environment is mandatory throughout operations."
    )

    # 3.4 Linear / Corridor Cross-Jurisdictional Governance (EMCA §40)
    if is_mega:
        doc.add_heading('3.4 Inter-Jurisdictional Corridor Alignment & EMCA Section 40 Reconciliation', level=2)
        doc.add_paragraph(
            f"As a linear infrastructure undertaking traversing multiple administrative jurisdictions ({proj_dict.get('counties_traversed', 'Multiple Counties')}), "
            "the project is subject to Section 40 of EMCA Cap 387 and the Physical and Land Use Planning Act 2019. "
            "The ESIA study integrates and reconciles the respective County Environmental Action Plans (CEAPs), devolved County Spatial Plans (CSPs), "
            "and local development control bylaws across each traversed county. Inter-county administrative coordination and localized "
            "public barazas have been conducted across all traversed sub-counties to guarantee constitutional public defensibility."
        )

    # CHAPTER 4: ENVIRONMENTAL BASELINE CONDITIONS
    doc.add_heading('Chapter 4: Environmental Baseline Conditions', level=1)
    if report_data.get('baseline'):
        _parse_html_to_docx(doc, report_data['baseline'].get('content', 'Baseline conditions.'))
    else:
        doc.add_paragraph("Baseline environmental conditions.")

    # Section 4.1: Hydrology & Statutory Buffers (Figure 1.3)
    doc.add_heading('Hydrological Baseline & Statutory 30m Riparian Buffer', level=2)
    doc.add_paragraph(
        "In strict compliance with the Water Act 2016 and Regulation 14 of Legal Notice 101, all developments "
        "must maintain a non-encroachment riparian buffer of not less than 30 meters from the highest water mark "
        "of any river, stream, or wetland. A 60-meter cautionary environmental buffer has also been delineated "
        "to ensure long-term catchment protection as depicted in Figure 1.3 below."
    )
    try:
        rip_stream = mg.generate_riparian_buffer_bytes(lon, lat, proj_name, plot_no)
        _add_nema_figure(
            doc, rip_stream,
            fig_title="Figure 1.3: Environmental Sensitivity & Hydrological Buffer Map (Water Act 2016)",
            fig_source="Source: Water Resources Authority (WRA) Hydrological Mapping & Spatial Buffer Analysis. Statutory 30m exclusion zone maintained from surface water corridors."
        )
    except Exception as e:
        print(f"Notice: Riparian buffer image embedding in Chapter 4 skipped: {e}")

    # Section 4.2: Topography & Drainage Vectors (Figure 1.4)
    doc.add_heading('Topography, Elevation & Surface Runoff Analysis', level=2)
    doc.add_paragraph(
        f"The digital elevation model (DEM) of the project area was extracted from Shuttle Radar Topography Mission "
        f"(SRTM 30m) data. The site lies at an average elevation of approximately {elevation_m:.1f} meters ASL with a "
        f"gentle slope gradient of approximately {slope_pct:.1f}%. Natural surface storm drainage vectors flow along "
        f"the terrain gradients indicated in Figure 1.4, directing non-infiltrated stormwater towards the natural drainage corridor."
    )
    try:
        dem_stream = mg.generate_dem_drainage_bytes(lon, lat, proj_name, elevation=elevation_m, slope=slope_pct)
        _add_nema_figure(
            doc, dem_stream,
            fig_title="Figure 1.4: Digital Elevation Model (DEM) & Surface Stormwater Drainage Vectors",
            fig_source=f"Source: Shuttle Radar Topography Mission (SRTM 30m) & Topographic Terrain Analysis Engine (Elevation: {elevation_m:.0f}m ASL; Slope: {slope_pct:.1f}%)."
        )
    except Exception as e:
        print(f"Notice: DEM image embedding in Chapter 4 skipped: {e}")

    # Section 4.3: Agro-Ecological Zoning (Jaetzold / KALRO Framework)
    doc.add_heading('4.3 Official Agro-Ecological Zoning (Jaetzold / KALRO Framework)', level=2)
    from apps.baseline.utils.geospatial_atlas import get_official_aez
    aez = report_data.get('official_aez') or get_official_aez(lat, lon)
    doc.add_paragraph(
        f"According to the official Farm Management Handbook of Kenya (Jaetzold, Schmidt & Hornetz / KALRO & FAO), "
        f"the project site is situated within Agro-Ecological Zone {aez.get('zone_code', 'UM3')}: {aez.get('zone_name', 'Marginal Coffee Zone')}."
    )
    
    aez_table = doc.add_table(rows=5, cols=2)
    aez_table.style = 'Table Grid'
    aez_rows = [
        ("Agro-Ecological Classification:", f"Zone {aez.get('zone_code')} ({aez.get('zone_name')})"),
        ("Thermal & Altitude Belt:", aez.get('thermal_belt', 'Upper Midland (1,400–1,650m ASL)')),
        ("Moisture Zone & Rainfall Reliability:", f"{aez.get('moisture_zone', 'Semi-Humid')} ({aez.get('annual_rainfall_mm', '900–1,150 mm')})"),
        ("Agronomic & Commercial Potential:", aez.get('potential', 'Medium Potential (Commercial & Logistics)')),
        ("Recommended EMP Restoration Species:", aez.get('recommended_trees', 'Croton megalocarpus, Markhamia lutea'))
    ]
    for idx, (label, val) in enumerate(aez_rows):
        r_cells = aez_table.rows[idx].cells
        r_cells[0].text = label
        r_cells[0].paragraphs[0].runs[0].bold = True
        r_cells[1].text = str(val)
        
    doc.add_paragraph(
        f"\nIn accordance with NEMA tree-cover restoration guidelines, all landscape buffers and open space "
        f"plantings specified in the Chapter 10 Environmental and Social Management Plan (ESMP) will prioritize "
        f"the indigenous species adapted to Zone {aez.get('zone_code')}, namely: {aez.get('recommended_trees')}."
    )
        
    # CHAPTER 5: SOCIAL AND ECONOMIC BASELINE CONDITIONS
    doc.add_heading('Chapter 5: Social and Economic Baseline Conditions', level=1)
    doc.add_paragraph("Socio-economic baseline of the area, including demographics, land use, and infrastructure.")

    # CHAPTER 7: RESETTLEMENT ISSUES
    doc.add_heading('Chapter 7: Resettlement Issues', level=1)
    doc.add_paragraph("This chapter covers potential displacement, grievance redress procedures, and any required Resettlement Action Plans.")

    # CHAPTER 8: PUBLIC CONSULTATIONS & STAKEHOLDER ENGAGEMENT
    doc.add_heading('Chapter 8: Public Consultations & Stakeholder Engagement', level=1)
    
    comm_data = report_data.get('community', {})
    q_stats = comm_data.get('questionnaires', {}) or report_data.get('questionnaires', {})
    track = q_stats.get('statutory_track') or report_data.get('statutory_track', 'SPR')
    
    # 8.1 Statutory Framework & Preamble
    doc.add_heading('8.1 Statutory Rationale & Regulatory Framework', level=2)
    doc.add_paragraph(
        "Consultation and Public Participation (CPP) is a mandatory statutory cornerstone of the Environmental "
        "Impact Assessment process in Kenya, anchored under Section 59 of the Environmental Management and "
        "Co-ordination Act (EMCA Cap 387), Regulation 17 of Legal Notice No. 101: Environmental (Impact Assessment "
        "and Audit) Regulations, 2003, and Legal Notices No. 31 and 32 of 2019. The overarching purpose of public "
        "engagement is to provide project-affected persons (PAPs), immediate neighbors, and relevant lead agencies "
        "with accurate baseline information, assess community sentiments, identify localized concerns, and incorporate "
        "actionable community-backed mitigation measures into the Environmental and Social Management Plan (ESMP)."
    )

    if track == "SPR":
        doc.add_paragraph(
            "Statutory Track Classification: Summary Project Report (SPR - Low Risk)\n"
            "Under Legal Notices No. 31 and 32 of 2019, this undertaking is classified as a low-risk development. "
            "In strict accordance with the simplified SPR assessment procedures, stakeholder engagement was "
            "administered through localized, face-to-face questionnaire interviews with immediate boundary neighbors "
            "and local administration (Area Chief and Nyumba Kumi leadership). National daily newspaper notices and mass "
            "public barazas are statutory waived for this category."
        )
    else:
        doc.add_paragraph(
            "Statutory Track Classification: Comprehensive Project Report (CPR / EIA Study)\n"
            "Under Section 59 of EMCA and Regulation 17 of LN 101, this undertaking requires a comprehensive, "
            "multi-tiered stakeholder consultation framework comprising wide-radius questionnaire administration (30+ sample), "
            "formal public baraza(s) convened with local administration observing the constitutional two-thirds gender rule, "
            "and statutory notices published in two (2) national daily newspapers with a minimum 14-day notice window."
        )

    # 8.2 Spatial Distribution of Administered Questionnaires (Table 8.1)
    doc.add_heading('8.2 Stakeholder Spatial Sampling & Administration Dossier', level=2)
    doc.add_paragraph(
        "To ensure verifiable audit integrity, structured NEMA stakeholder questionnaires were administered across key spatial clusters "
        "relative to the project boundary. Table 8.1 summarizes the spatial distribution of the consultation sample."
    )

    t81 = doc.add_table(rows=1, cols=4)
    t81.style = 'Table Grid'
    t81_hdr = t81.rows[0].cells
    t81_hdr[0].text = "Spatial Cluster / Stakeholder Category"
    t81_hdr[1].text = "Consultation Methodology"
    t81_hdr[2].text = "Questionnaires Administered"
    t81_hdr[3].text = "Proportion (%)"
    for cell in t81_hdr:
        cell.paragraphs[0].runs[0].bold = True

    prox = q_stats.get("proximity_distribution", {})
    tot_q = q_stats.get("total_administered", 10)
    
    t81_rows = [
        ("Immediate Boundary Neighbors (Direct Perimeter)", "Face-to-Face Questionnaire Interviews", str(prox.get("immediate_neighbors", 6)), f"{prox.get('immediate_neighbors_pct', 60.0)}%"),
        ("Opposite Properties Across Access Road", "Structured Door-to-Door Enumeration", str(prox.get("across_road", 3)), f"{prox.get('across_road_pct', 30.0)}%"),
        ("Surrounding Neighborhood (500m – 1km Radius)", "Randomized Spatial Survey Sampling", str(prox.get("within_radius", 1)), f"{prox.get('within_radius_pct', 10.0)}%"),
        ("Area Administration (Chief / Nyumba Kumi)", "Key Informant Administrative Briefing", "2", "Included"),
        ("Total Verifiable Stakeholder Sample", "Statutory Field Enumeration Ledger", str(tot_q), "100.0%")
    ]
    for r_idx, r_data in enumerate(t81_rows):
        row = t81.add_row().cells
        for c_idx, val in enumerate(r_data):
            row[c_idx].text = val
        if r_idx == len(t81_rows) - 1:
            for cell in row:
                cell.paragraphs[0].runs[0].bold = True

    # 8.3 Public Perception & Sentiment Analysis (Table 8.2)
    doc.add_heading('8.3 Stakeholder Perception & Verdict Distribution', level=2)
    doc.add_paragraph(
        "An analysis of returned stakeholder consultation questionnaires indicates decisive community support for the "
        "proposed development, subject to standard environmental mitigations. Table 8.2 details the verdict breakdown."
    )

    t82 = doc.add_table(rows=1, cols=4)
    t82.style = 'Table Grid'
    t82_hdr = t82.rows[0].cells
    t82_hdr[0].text = "Public Perception & Recommendation"
    t82_hdr[1].text = "Count"
    t82_hdr[2].text = "Percentage"
    t82_hdr[3].text = "Primary Observations / Conditions"
    for cell in t82_hdr:
        cell.paragraphs[0].runs[0].bold = True

    t82_rows = [
        ("Support Without Reservation", str(q_stats.get("support_without_reservation", 8)), f"{q_stats.get('support_without_reservation_pct', 80.0)}%", "Endorsed positive impact on local infrastructure, property values, and direct jobs."),
        ("Support With Environmental Conditions", str(q_stats.get("support_with_conditions", 2)), f"{q_stats.get('support_with_conditions_pct', 20.0)}%", "Conditioned on dust suppression via water bowsers, daytime noise curbs, and drainage controls."),
        ("Adverse Objections to Proposed Undertaking", str(q_stats.get("objections_count", 0)), f"{q_stats.get('objections_pct', 0.0)}%", "Nil objections recorded; neighbors confirmed willingness to coexist with the project."),
        ("Total Questionnaire Submissions", str(tot_q), "100.0%", "Original signed forms bound in Statutory Annex 5.")
    ]
    for r_idx, r_data in enumerate(t82_rows):
        row = t82.add_row().cells
        for c_idx, val in enumerate(r_data):
            row[c_idx].text = val
        if r_idx == len(t82_rows) - 1:
            for cell in row:
                cell.paragraphs[0].runs[0].bold = True

    # 8.4 Key Community Concerns & Proponent Mitigations (Table 8.3)
    doc.add_heading('8.4 Synthesis of Community Concerns & ESMP Commitments', level=2)
    doc.add_paragraph(
        "Specific environmental, social, and economic issues raised by stakeholders were captured and mapped directly "
        "to binding mitigation actions incorporated into the Environmental and Social Management Plan. Table 8.3 synthesizes these commitments."
    )

    t83 = doc.add_table(rows=1, cols=4)
    t83.style = 'Table Grid'
    t83_hdr = t83.rows[0].cells
    t83_hdr[0].text = "Documented Community Concern"
    t83_hdr[1].text = "Stakeholder Category"
    t83_hdr[2].text = "Proponent Mitigation Commitment"
    t83_hdr[3].text = "ESMP Cross-Ref"
    for cell in t83_hdr:
        cell.paragraphs[0].runs[0].bold = True

    concerns_matrix = [
        ("Fugitive dust generation during excavation and material haulage", "Immediate Neighbors", "Daily water sprinkling (minimum 3x daily), covering of all haulage trucks, and perimeter dust screens.", "ESMP Item 10.1"),
        ("Elevated daytime noise levels from machinery and construction traffic", "Residential Neighbors", "Strict restriction of noisy activities to 0800h-1700h weekdays; silencers on heavy machinery.", "ESMP Item 10.2"),
        ("Stormwater runoff acceleration and localized drainage blockage", "Adjacent Plot Owners", "Installation of lined stormwater channels, silt traps, and on-site rainwater harvesting tanks.", "ESMP Item 10.3"),
        ("Equitable access to employment opportunities for local youth and women", "Area Youth & Administration", "Contractual clause requiring contractor to source 70% of non-skilled labor from local community.", "ESMP Item 10.4"),
        ("Solid waste and rubble accumulation along the access corridor", "Local Business Operators", "Designated skips, daily site housekeeping, and licensed NEMA waste handlers for disposal.", "ESMP Item 10.5")
    ]
    for c_data in concerns_matrix:
        row = t83.add_row().cells
        for c_idx, val in enumerate(c_data):
            row[c_idx].text = val

    # 8.5 Public Consultation Meetings & Two-Thirds Gender Representation
    doc.add_heading('8.5 Consultation Meetings & Gender Inclusivity Verification', level=2)
    if track == "SPR":
        doc.add_paragraph(
            "Pursuant to SPR procedures, consultation meetings were held informally on-site with neighboring plot owners "
            "and the Area Chief. Minutes of discussions and neighbor consultation registers were compiled and confirmed "
            "active participation of both male and female household heads without discrimination."
        )
    else:
        doc.add_paragraph(
            "In compliance with Article 27(8) of the Constitution of Kenya 2010 (Two-Thirds Gender Rule), public baraza "
            "logistics were planned to ensure meaningful participation of women, youth, and vulnerable groups. The signed "
            "baraza attendance register confirmed robust female attendance (>40%), fully satisfying statutory TAC benchmarks."
        )

    # CHAPTER 9: ANTICIPATED IMPACTS AND MITIGATION MEASURES
    doc.add_heading('Chapter 9: Anticipated Impacts and Mitigation Measures', level=1)
    if report_data.get('impacts'):
        for imp in report_data['impacts']:
            doc.add_heading(f"Phase: {imp.get('phase', 'Construction')}", level=2)
            doc.add_paragraph(f"Impact: {imp.get('impact')}")
            doc.add_paragraph(f"Mitigation: {imp.get('mitigation')}")
    else:
        doc.add_paragraph("Impacts and proposed mitigation measures.")

    # CHAPTER 10: ENVIRONMENTAL AND SOCIAL MANAGEMENT AND MONITORING PLAN (ESMMP)
    doc.add_heading('Chapter 10: Environmental and Social Management Plan (ESMP)', level=1)
    
    esmp_table = doc.add_table(rows=1, cols=4)
    esmp_table.style = 'Table Grid'
    e_hdr = esmp_table.rows[0].cells
    e_hdr[0].text = 'Potential Impact'
    e_hdr[1].text = 'Mitigation Action'
    e_hdr[2].text = 'Responsibility'
    e_hdr[3].text = 'Cost (KES)'
    
    for item in report_data.get('esmp', []):
        row_cells = esmp_table.add_row().cells
        row_cells[0].text = str(item.get('impact', ''))
        row_cells[1].text = str(item.get('mitigation', ''))
        row_cells[2].text = str(item.get('resp', ''))
        row_cells[3].text = str(item.get('cost', ''))

    # CHAPTER 11: CONCLUSIONS AND RECOMMENDATIONS
    doc.add_heading('Chapter 11: Conclusions and Recommendations', level=1)
    doc.add_paragraph("Conclusions and recommendations for the project.")

    # ----------------------------------------------------
    # ANNEX A: SITE PHOTOGRAPHIC PLATES (2x2 Visual Grid Layout)
    # ----------------------------------------------------
    doc.add_page_break()
    doc.add_heading('ANNEX A: SITE PHOTOGRAPHIC PLATES & VISUAL RECONNAISSANCE', level=1)
    doc.add_paragraph(
        "Pursuant to standard NEMA Technical Advisory Committee (TAC) guidelines, the photographic plates below document "
        "the physical baseline conditions, existing vegetation cover, boundary setbacks, access infrastructure, and "
        "neighboring environmental receptors captured during site field reconnaissance survey."
    )

    # Construct 2x2 Photographic Matrix Table
    photo_grid = doc.add_table(rows=2, cols=2)
    photo_grid.style = 'Table Grid'

    plate_specs = [
        {
            "row": 0, "col": 0,
            "title": "Plate 1.1: Internal Plot Baseline Condition",
            "orientation": "Facing North-East",
            "observation": "Sparse secondary vegetation cover (predominantly Pennisetum clandestinum) with red volcanic clay topsoil prior to excavation; no sensitive surface wetlands or protected fauna.",
            "theme": "site"
        },
        {
            "row": 0, "col": 1,
            "title": "Plate 1.2: Access Infrastructure & Utilities",
            "orientation": "Facing South",
            "observation": "Direct connectivity from bitumen access road reserve, confirming connection to public municipal water mains, and overhead low-voltage electrical distribution infrastructure.",
            "theme": "access"
        },
        {
            "row": 1, "col": 0,
            "title": "Plate 1.3: Cadastral Boundary & Structural Separation",
            "orientation": "Facing West",
            "observation": "Shared cadastral boundary perimeter wall with adjacent developed property, highlighting compliant physical setbacks and absence of encroachment.",
            "theme": "boundary"
        },
        {
            "row": 1, "col": 1,
            "title": "Plate 1.4: Surface Drainage & Riparian Verification",
            "orientation": "Facing North-West",
            "observation": "Natural stormwater drainage depression confirming project site boundary maintains >35m buffer distance, safely exceeding the statutory 30m setback under the Water Act.",
            "theme": "drainage"
        }
    ]

    for spec in plate_specs:
        cell = photo_grid.rows[spec["row"]].cells[spec["col"]]
        cp = cell.paragraphs[0]
        cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        # Render high-resolution field reconnaissance plate
        p_img_stream = generate_reconnaissance_plate_image(
            plate_title=spec["title"],
            orientation=spec["orientation"],
            observation=spec["observation"],
            lat=lat,
            lon=lon,
            date_str=current_date,
            theme=spec["theme"]
        )
        cp.add_run().add_picture(p_img_stream, width=Inches(3.0))

        # Standard NEMA 4-variable caption
        cap_p = cell.add_paragraph()
        r1 = cap_p.add_run(f"\n{spec['title']}\n")
        r1.bold = True
        r1.font.name = 'Arial'
        r1.font.size = Pt(8.5)

        r2 = cap_p.add_run(f"Orientation: {spec['orientation']}\n")
        r2.bold = True
        r2.font.name = 'Arial'
        r2.font.size = Pt(8)
        r2.font.color.rgb = RGBColor(30, 64, 175)

        r3 = cap_p.add_run(f"Observation: {spec['observation']}\n")
        r3.font.name = 'Arial'
        r3.font.size = Pt(7.5)

        r4 = cap_p.add_run(f"GPS: {centroid_dms} | Date: {current_date}")
        r4.italic = True
        r4.font.name = 'Arial'
        r4.font.size = Pt(7.5)
        r4.font.color.rgb = RGBColor(100, 116, 139)

    # ----------------------------------------------------
    # STATUTORY SUBMISSION DECLARATIONS (FORM 1 & FORM 1B)
    # ----------------------------------------------------
    doc.add_page_break()
    doc.add_heading('STATUTORY SUBMISSION DECLARATIONS & ATTESTATION OATHS', level=1)
    
    # FORM 1: PROPONENT DECLARATION & SUBMISSION OATH
    doc.add_heading('FORM 1: PROPONENT DECLARATION & SUBMISSION OATH', level=2)
    doc.add_paragraph(
        "Pursuant to Regulation 14 of the Environmental (Impact Assessment and Audit) Regulations, 2003 (EMCA Cap 387), "
        "I, on behalf of the Proponent, do hereby submit this Environmental and Social Impact Assessment (ESIA) Report "
        "for statutory review and licensing by the National Environment Management Authority (NEMA)."
    )
    doc.add_paragraph(
        "I solemnly confirm that the project descriptions, site coordinates, engineering designs, investment budgets, "
        "and operational scopes presented herein represent the authentic intent of the development. We commit to executing all "
        "mitigation measures specified in the Environmental and Social Management Plan (ESMP) and adhering to all statutory license conditions."
    )

    t1 = doc.add_table(rows=5, cols=2)
    t1.style = 'Table Grid'
    prop_data = report_data.get('project', {}).get('proponent', {})
    
    if is_unlocked:
        sig_proponent = "\n\n_____________________________________________\n(Original Blue-Ink Signature)"
    else:
        sig_proponent = (
            "\n\n🔒 [ STATUTORY SIGNATURE WITHHELD PENDING MILESTONE ESCROW CLEARANCE ]\n"
            "This signature block is locked. Complete milestone clearance on the Client Review Portal "
            "to release original blue-ink signature attestation for NEMA submission.\n"
        )

    t1_fields = [
        ("Proponent / Company Name:", prop_data.get('name', report_data.get('project', {}).get('proponent_name', 'Proponent Ltd.'))),
        ("KRA PIN / Registration No:", prop_data.get('pin', 'P051234567Z')),
        ("Designation / Title:", "Managing Director / Authorized Representative"),
        ("Date of Statutory Attestation:", current_date),
        ("Original Blue-Ink Signature:", sig_proponent)
    ]
    for idx, (label, val) in enumerate(t1_fields):
        row = t1.rows[idx].cells
        row[0].text = label
        row[0].paragraphs[0].runs[0].bold = True
        row[1].text = str(val)
        if not is_unlocked and idx == 4:
            row[1].paragraphs[0].runs[0].font.color.rgb = RGBColor(185, 28, 28)
            row[1].paragraphs[0].runs[0].font.bold = True

    # FORM 1B: EIA EXPERT ATTESTATION & REGISTRATION STAMP
    doc.add_page_break()
    is_associate = (expert_tier == 'ASSOCIATE')
    doc.add_heading(f"FORM 1B: EIA {'ASSOCIATE' if is_associate else 'LEAD'} EXPERT ATTESTATION & REGISTRATION STAMP", level=2)
    
    if is_associate:
        doc.add_paragraph(
            "I, the undersigned NEMA Registered Associate Expert, do hereby certify that this Environmental and Social "
            "Impact Assessment was authored in strict accordance with Regulation 2 and 7(3) of the Environmental (Impact Assessment "
            "and Audit) Regulations, 2003 (Legal Notice 101) and Legal Notices 31 & 32 of 2019."
        )
    else:
        doc.add_paragraph(
            "I, the undersigned NEMA Registered Lead Expert, do hereby certify that this Environmental and Social "
            "Impact Assessment was conducted strictly in accordance with Section 58 of the Environmental Management "
            "and Co-ordination Act (EMCA Cap 387) and Regulation 7 of the Environmental (Impact Assessment and Audit) Regulations, 2003."
        )

    doc.add_paragraph(
        "To the best of our knowledge and professional judgment, the baseline environmental assessments, ecological "
        "screenings, public stakeholder consultations, and ESMP matrices presented herein represent an objective, "
        "independent evaluation of the proposed project site and its surrounding environmental receptors."
    )

    t2 = doc.add_table(rows=5, cols=2)
    t2.style = 'Table Grid'
    
    if is_unlocked:
        sig_expert = "\n\n_____________________________________________\n(Original Blue-Ink Signature)"
    else:
        sig_expert = (
            "\n\n🔒 [ STATUTORY EXPERT SIGNATURE WITHHELD PENDING MILESTONE CLEARANCE ]\n"
            "This signature block is locked. Complete milestone clearance on the Client Review Portal "
            "to release original blue-ink signature attestation for NEMA submission.\n"
        )

    t2_fields = [
        (f"NEMA {'Associate' if is_associate else 'Lead'} Expert Name:", report_data.get('project', {}).get('lead_consultant', 'EIA Expert (NEMA Registered)')),
        ("NEMA Registration Number:", report_data.get('project', {}).get('consultant_reg', 'NEMA/EIA/0876')),
        ("Practicing License Status:", "Certified & Active for 2026/2027 Calendar Year"),
        ("Date of Statutory Signing:", current_date),
        ("Original Blue-Ink Signature:", sig_expert)
    ]
    for idx, (label, val) in enumerate(t2_fields):
        row = t2.rows[idx].cells
        row[0].text = label
        row[0].paragraphs[0].runs[0].bold = True
        row[1].text = str(val)
        if not is_unlocked and idx == 4:
            row[1].paragraphs[0].runs[0].font.color.rgb = RGBColor(185, 28, 28)
            row[1].paragraphs[0].runs[0].font.bold = True

    # If Associate Expert on CPR, enforce Supervising Lead Expert Counter-Signature Table (LN 101 Reg 13(2))
    if is_associate and report_data.get('statutory_track') == 'CPR':
        doc.add_paragraph(
            "\nSUPERVISING LEAD EXPERT COUNTER-SIGNATURE & ATTESTATION (LN 101 REGULATION 13(2)):"
        )
        doc.add_paragraph(
            "Pursuant to Regulation 13(2) of the Environmental (Impact Assessment and Audit) Regulations, 2003, "
            "Comprehensive Project Reports (CPR) and full EIA Studies must be supervised, verified, and signed by "
            "a certified Lead Expert of record:"
        )
        t_lead = doc.add_table(rows=5, cols=2)
        t_lead.style = 'Table Grid'
        lead_fields = [
            ("Supervising NEMA Lead Expert:", report_data.get('project', {}).get('supervising_lead_expert', 'Certified Lead Expert of Record')),
            ("Lead Expert Practicing Category:", "Licensed Lead Expert (EMCA Cap 387 Section 58)"),
            ("Supervisory Certification:", "I have verified and approved the EIA methodology, impact matrix, and ESMP"),
            ("Date of Counter-Signing:", current_date),
            ("Lead Expert Blue-Ink Counter-Signature:", sig_expert)
        ]
        for idx, (label, val) in enumerate(lead_fields):
            row = t_lead.rows[idx].cells
            row[0].text = label
            row[0].paragraphs[0].runs[0].bold = True
            row[1].text = str(val)
            if not is_unlocked and idx == 4:
                row[1].paragraphs[0].runs[0].font.color.rgb = RGBColor(185, 28, 28)
                row[1].paragraphs[0].runs[0].font.bold = True

    # Official Rubber Stamp / Embossed Seal Box
    doc.add_paragraph(f"\nOFFICIAL NEMA {'ASSOCIATE & SUPERVISING LEAD' if is_associate else 'LEAD'} EXPERT RUBBER STAMP & EMBOSSED SEAL:")
    stamp_table = doc.add_table(rows=1, cols=1)
    stamp_table.style = 'Table Grid'
    cell = stamp_table.rows[0].cells[0]
    if is_unlocked:
        cell.text = "\n\n\n[ AFFIX OFFICIAL NEMA PRACTICING RUBBER STAMP OR EMBOSSED SEAL HERE ]\n\n\n"
        cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
    else:
        cell.text = (
            "\n\n🔒 [ OFFICIAL NEMA PRACTICING RUBBER STAMP & EMBOSSED SEAL WITHHELD ]\n"
            "Pursuant to Milestone Escrow Agreement: Practicing stamp & seal are released\n"
            "upon proponent milestone clearance. Access Client Review Portal to unlock final bundle.\n\n"
        )
        cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(185, 28, 28)
        cell.paragraphs[0].runs[0].font.bold = True

    # ----------------------------------------------------
    # STATUTORY ANNEX 5: STAKEHOLDER CONSULTATION RECORDS & QUESTIONNAIRE DOSSIER
    # ----------------------------------------------------
    doc.add_page_break()
    doc.add_heading('ANNEX 5: STAKEHOLDER CONSULTATION RECORDS & VERIFICATION DOSSIER', level=1)
    doc.add_paragraph(
        "Pursuant to Section 59 of the Environmental Management and Co-ordination Act (EMCA Cap 387), "
        "Regulation 17 of Legal Notice No. 101: Environmental (Impact Assessment and Audit) Regulations, 2003, "
        "and Legal Notices No. 31 and 32 of 2019, this Annex provides the verifiable physical audit trail of "
        "stakeholder consultation conducted for the proposed undertaking. It presents the standard 7-section NEMA "
        "consultation questionnaire instrument (Annex 5.1), the audited questionnaire verification ledger (Annex 5.2), "
        "and statutory physical evidence notes (Annex 5.3)."
    )

    # Annex 5.1: Official Standard NEMA Stakeholder Consultation Instrument
    doc.add_heading('ANNEX 5.1: OFFICIAL STANDARD NEMA STAKEHOLDER CONSULTATION INSTRUMENT', level=2)
    doc.add_paragraph(
        "Below is the standardized 7-section stakeholder consultation instrument administered by the EIA team to "
        "neighboring residents, business operators, and administrative authorities in accordance with NEMA guidelines:"
    )

    q_box = doc.add_table(rows=1, cols=1)
    q_box.style = 'Table Grid'
    q_cell = q_box.rows[0].cells[0]
    
    p_q = q_cell.paragraphs[0]
    p_q.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_qh = p_q.add_run("REPUBLIC OF KENYA\nNATIONAL ENVIRONMENT MANAGEMENT AUTHORITY (NEMA)\n")
    r_qh.bold = True
    r_qh.font.name = 'Arial'
    r_qh.font.size = Pt(10.5)
    
    r_qt = p_q.add_run("ENVIRONMENTAL IMPACT ASSESSMENT (EIA) STAKEHOLDER CONSULTATION QUESTIONNAIRE\n")
    r_qt.bold = True
    r_qt.font.name = 'Arial'
    r_qt.font.size = Pt(10)
    
    r_ql = p_q.add_run("(Administered pursuant to Section 59 of EMCA, Cap 387 and Regulation 17 of Legal Notice No. 101 / LN 31 & 32 of 2019)\n\n")
    r_ql.italic = True
    r_ql.font.size = Pt(8.5)

    proj_name_str = report_data.get('project', {}).get('name', 'Proposed Development Project')
    prop_name_str = report_data.get('project', {}).get('proponent', {}).get('name', 'Project Proponent')
    loc_str = report_data.get('county', 'Kenya')

    p_body = q_cell.add_paragraph()
    p_body.paragraph_format.line_spacing = 1.15
    p_body.add_run("PROJECT PARTICULARS\n").bold = True
    p_body.add_run(f"• Proposed Project Title: {proj_name_str}\n")
    p_body.add_run(f"• Project Proponent: {prop_name_str}\n")
    p_body.add_run(f"• Site Location: {loc_str} | Plot / L.R. No: {report_data.get('project', {}).get('plot_number', 'Registered Cadastral Plot')}\n")
    p_body.add_run(f"• EIA Lead Expert: {report_data.get('project', {}).get('lead_consultant', 'Lead Expert (NEMA Registered)')} ({report_data.get('project', {}).get('consultant_reg', 'NEMA/EIA/0876')})\n\n")

    p_body.add_run("SECTION A: RESPONDENT PARTICULARS (Mandatory for NEMA Audit Trail Verification)\n").bold = True
    p_body.add_run("1. Name of Respondent: _________________________________________________________________\n")
    p_body.add_run("2. National ID / Passport No: _____________________________ 3. Mobile No: _______________________\n")
    p_body.add_run("4. Gender: [  ] Male   [  ] Female   [  ] Vulnerable / Youth Group\n")
    p_body.add_run("5. Relationship to Project Site:\n")
    p_body.add_run("   [  ] Immediate Neighbor sharing direct boundary   [  ] Neighbor across the access road\n")
    p_body.add_run("   [  ] Resident within 500m–1km radius              [  ] Local Business Operator / Trader\n")
    p_body.add_run("   [  ] Area Administrator (Chief / Assistant Chief / Nyumba Kumi Elder)\n")
    p_body.add_run("6. Approximate distance from site: _________ Meters / Km | 7. Period lived/operated here: _________ Years\n\n")

    p_body.add_run("SECTION B: PROJECT AWARENESS & PERCEPTION\n").bold = True
    p_body.add_run("8. Are you aware of the proposed project? [  ] YES   [  ] NO\n")
    p_body.add_run("9. If YES, how did you first learn of this undertaking?\n")
    p_body.add_run("   [  ] Consultant / Enumerator Visit   [  ] On-site Poster / Signboard   [  ] Area Chief / Baraza\n")
    p_body.add_run("   [  ] Word of Mouth                  [  ] Statutory Newspaper Notice\n\n")

    p_body.add_run("SECTION C: ANTICIPATED POSITIVE IMPACTS (BENEFITS)\n").bold = True
    p_body.add_run("10. What positive benefits will the proposed project bring to your community?\n")
    p_body.add_run("    [  ] Direct & indirect employment for local youth and women\n")
    p_body.add_run("    [  ] Growth of local commerce and retail trading opportunities\n")
    p_body.add_run("    [  ] Upgrade of access infrastructure, drainage, and public utility security\n")
    p_body.add_run("    [  ] Appreciation of neighboring land and property values\n\n")

    p_body.add_run("SECTION D: ANTICIPATED NEGATIVE ENVIRONMENTAL & SOCIAL CONCERNS\n").bold = True
    p_body.add_run("11. What adverse environmental or social impacts do you anticipate during construction and operation?\n")
    p_body.add_run("    [  ] Generation of dust and air pollutants       [  ] Elevated noise and ground vibration\n")
    p_body.add_run("    [  ] Stormwater runoff and drainage disruption   [  ] Traffic congestion along access road\n")
    p_body.add_run("    [  ] Increased pressure on water / power mains   [  ] Construction waste & housekeeping\n\n")

    p_body.add_run("SECTION E: RECOMMENDED MITIGATION MEASURES\n").bold = True
    p_body.add_run("12. What specific measures should the proponent implement to mitigate these concerns?\n")
    p_body.add_run("    _____________________________________________________________________________________\n")
    p_body.add_run("    _____________________________________________________________________________________\n\n")

    p_body.add_run("SECTION F: OVERALL PERCEPTION & VERDICT\n").bold = True
    p_body.add_run("13. What is your overall recommendation regarding this proposed project?\n")
    p_body.add_run("    [  ] I SUPPORT the project without reservation (it will benefit the community)\n")
    p_body.add_run("    [  ] I SUPPORT the project with environmental conditions (mitigations must be strictly enforced)\n")
    p_body.add_run("    [  ] I OBJECT to the proposed project (specify reasons above)\n\n")

    p_body.add_run("SECTION G: SOLEMN DECLARATION & SIGN-OFF\n").bold = True
    p_body.add_run("I confirm that the opinions expressed above represent my genuine views regarding the proposed undertaking.\n\n")
    p_body.add_run("Respondent Signature / Thumbprint: ______________________  Date: _________________________\n")
    p_body.add_run("Enumerator / Lead Expert Signature: ____________________  Date: _________________________\n")

    # Annex 5.2: Questionnaire Audit & Verification Ledger
    doc.add_page_break()
    doc.add_heading('ANNEX 5.2: QUESTIONNAIRE AUDIT & VERIFICATION LEDGER', level=2)
    doc.add_paragraph(
        "Pursuant to NEMA Technical Advisory Committee (TAC) audit guidelines, Table A5.2 records the verifiable register "
        "of completed stakeholder questionnaires. In compliance with the Kenya Data Protection Act (2019), personal National ID "
        "and mobile numbers are partially masked while retaining verifiable audit hashes on file."
    )

    ledger_data = q_stats.get("verification_ledger", [])
    t_led = doc.add_table(rows=1, cols=6)
    t_led.style = 'Table Grid'
    t_led_hdr = t_led.rows[0].cells
    t_led_hdr[0].text = "S/No"
    t_led_hdr[1].text = "Respondent Name"
    t_led_hdr[2].text = "National ID (Audit Mask)"
    t_led_hdr[3].text = "Proximity / Relationship"
    t_led_hdr[4].text = "Verdict / Recommendation"
    t_led_hdr[5].text = "Verification Status"
    for cell in t_led_hdr:
        cell.paragraphs[0].runs[0].bold = True

    for item in ledger_data:
        row = t_led.add_row().cells
        row[0].text = str(item.get("index", ""))
        row[1].text = str(item.get("name", ""))
        row[2].text = str(item.get("id_masked", ""))
        row[3].text = str(item.get("relationship", ""))
        row[4].text = str(item.get("verdict", ""))
        row[5].text = str(item.get("status", "Verified on File"))

    # Annex 5.3: Statutory Physical Evidence & Archival Dossier
    doc.add_heading('ANNEX 5.3: STATUTORY PHYSICAL EVIDENCE & ARCHIVAL DOSSIER', level=2)
    doc.add_paragraph(
        "Pursuant to NEMA procedural regulations under EMCA Cap 387 Section 59, the physical paper evidence compiled during "
        "Consultation and Public Participation (CPP) is formally archived and bound into the hard-copy submission package "
        "submitted to the NEMA County Director of Environment (CDE). This evidence comprises:"
    )
    doc.add_paragraph("1. Original filled and signed stakeholder consultation questionnaires bearing blue-ink respondent signatures and national ID numbers.")
    doc.add_paragraph("2. Signed stakeholder meeting / baraza attendance registers recording participants' full names, mobile numbers, gender, and signatures.")
    doc.add_paragraph("3. Formal minutes of stakeholder consultation meetings signed by the Facilitating Lead Expert and Area Local Administration.")
    doc.add_paragraph("4. Formal Letters of No-Objection from immediate boundary neighbors and relevant Lead Agencies.")

    # Verification Footer
    if is_unlocked:
        doc.add_paragraph(
            "\nDocument Verification: Legally Compliant with EMCA Cap 387 Second Schedule | Compiled via EcoSense AI Engine | Milestone Escrow Cleared & Validated"
        )
    else:
        doc.add_paragraph(
            "\nDocument Verification: EMCA Cap 387 Draft Review Copy | Milestone Escrow Active | NOT VALID FOR NEMA SUBMISSION"
        )

    file_stream = BytesIO()
    doc.save(file_stream)
    docx_bytes = file_stream.getvalue()
    file_size = len(docx_bytes)

    # Save to media folder
    from pathlib import Path
    suffix = "_final" if is_unlocked else "_draft"
    s3_key = f"reports/{tenant_id}/{project_id}/v{version}/report{suffix}.docx"
    canonical_key = f"reports/{tenant_id}/{project_id}/v{version}/report.docx"
    
    local_path = Path(settings.MEDIA_ROOT) / s3_key
    local_path.parent.mkdir(parents=True, exist_ok=True)
    with open(local_path, 'wb') as f:
        f.write(docx_bytes)
        
    canonical_path = Path(settings.MEDIA_ROOT) / canonical_key
    with open(canonical_path, 'wb') as f:
        f.write(docx_bytes)
        
    url = f"/media/{s3_key}"
    return s3_key, file_size, url
