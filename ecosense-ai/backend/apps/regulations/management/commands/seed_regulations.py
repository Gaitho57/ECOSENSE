"""
Management command to seed the Regulation Registry with Kenya's core environmental laws.
Run: python manage.py seed_regulations
"""
from django.core.management.base import BaseCommand
from apps.regulations.models import Regulation

REGULATIONS = [
    # ── EMCA ────────────────────────────────────────────────────────
    {
        "code": "EMCA-S58",
        "title": "Environmental Impact Assessment Requirement",
        "act_name": "Environmental Management and Coordination Act (EMCA) Cap 387",
        "section": "Section 58",
        "category": "act",
        "sectors": ["all"],
        "counties": ["all"],
        "description": "No person shall implement a project likely to have a significant effect on the environment without a valid EIA licence from NEMA.",
        "requirement": "A full Environmental Impact Assessment Study or Environmental Project Report must be submitted to NEMA and approved prior to project commencement.",
        "penalty": "Fine not exceeding KES 500,000 or imprisonment not exceeding 2 years, or both.",
        "pdf_reference": "Amended-EMCA-2015.pdf",
        "effective_date": "1999-01-14",
        "amended_date": "2015-07-01",
    },
    {
        "code": "EMCA-EIA-REG-2003",
        "title": "Environmental Impact Assessment and Audit Regulations",
        "act_name": "Environmental (Impact Assessment and Audit) Regulations, 2003",
        "section": "Legal Notice No. 101",
        "category": "regulation",
        "sectors": ["all"],
        "counties": ["all"],
        "description": "Provides detailed procedural requirements for conducting EIAs in Kenya, including scoping, public participation, and content of study reports.",
        "requirement": "Study reports must follow the content outlined in the Second Schedule. Public participation must span a minimum 21-day statutory period.",
        "penalty": "As per EMCA Section 58.",
        "pdf_reference": "Amended-EMCA-2015.pdf",
        "effective_date": "2003-05-13",
    },
    {
        "code": "EMCA-WASTE-REG-2006",
        "title": "Environmental Management and Coordination (Waste Management) Regulations",
        "act_name": "EMCA Waste Management Regulations, 2006",
        "section": "Legal Notice No. 121",
        "category": "regulation",
        "sectors": ["waste_management", "manufacturing", "health_facilities", "construction"],
        "counties": ["all"],
        "description": "Regulates the generation, handling, transportation, and disposal of all categories of waste including hazardous, biomedical, and solid waste.",
        "requirement": "All waste generators must prepare a Waste Management Plan. Biomedical waste must be treated prior to disposal. Landfill sites require NEMA approval.",
        "penalty": "Fine not exceeding KES 350,000 or imprisonment not exceeding 18 months.",
        "pdf_reference": "National-Solid-Waste-Management-Strategy-.pdf",
        "effective_date": "2006-09-01",
    },
    {
        "code": "SWMA-2022",
        "title": "Sustainable Waste Management Act",
        "act_name": "Sustainable Waste Management Act, 2022",
        "section": "Full Act",
        "category": "act",
        "sectors": ["waste_management", "manufacturing", "construction"],
        "counties": ["all"],
        "description": "Establishes a modern framework for sustainable waste management including Extended Producer Responsibility (EPR), plastic regulation, and county waste authorities.",
        "requirement": "Producers of specified products must register under EPR schemes. Single-use plastic items are regulated. County governments must establish waste management plans.",
        "pdf_reference": "SWMA-2022.pdf",
        "effective_date": "2022-07-07",
    },
    {
        "code": "EMCA-AIR-2014",
        "title": "Environmental Management and Coordination (Air Quality) Regulations",
        "act_name": "EMCA Air Quality Regulations, 2014",
        "section": "Legal Notice No. 110",
        "category": "regulation",
        "sectors": ["manufacturing", "energy", "infrastructure", "construction"],
        "counties": ["all"],
        "description": "Establishes ambient air quality standards and emission limits for stationary and mobile sources.",
        "requirement": "PM10 ≤ 50 µg/m³ (24hr), PM2.5 ≤ 25 µg/m³ (24hr). Industrial stacks must undergo continuous emission monitoring.",
        "effective_date": "2014-09-25",
    },
    {
        "code": "EMCA-NOISE-2009",
        "title": "Environmental Management and Coordination (Noise and Excessive Vibration) Regulations",
        "act_name": "EMCA Noise Regulations, 2009",
        "section": "Legal Notice No. 61",
        "category": "regulation",
        "sectors": ["construction", "manufacturing", "infrastructure", "mining"],
        "counties": ["all"],
        "description": "Sets permissible noise levels for residential, commercial, and industrial zones.",
        "requirement": "Residential areas: 55 dBA (day), 45 dBA (night). Industrial areas: 70 dBA (day), 60 dBA (night).",
        "effective_date": "2009-06-05",
    },
    # ── Water Act ────────────────────────────────────────────────────
    {
        "code": "WATER-ACT-2016",
        "title": "Water Resources Management and Allocation",
        "act_name": "Water Act, 2016",
        "section": "Part IV",
        "category": "act",
        "sectors": ["borehole", "water_resources", "agriculture", "health_facilities"],
        "counties": ["all"],
        "description": "Governs water resource management, abstraction permits, and protection of water towers and riparian reserves.",
        "requirement": "Any water abstraction exceeding 5,000 litres/day requires a permit from WRMA. Riparian reserves of 30m from riverbanks must be protected.",
        "effective_date": "2016-09-01",
    },
    # ── Physical Planning ────────────────────────────────────────────
    {
        "code": "PHYS-PLAN-1999",
        "title": "Physical Planning Act",
        "act_name": "Physical Planning Act, Cap 286",
        "section": "Section 30",
        "category": "act",
        "sectors": ["construction", "infrastructure", "tourism"],
        "counties": ["all"],
        "description": "Requires development permission (change of use) from county authorities before any land use change or new development.",
        "requirement": "A development permission must be obtained from the relevant County Physical Planning Department before EIA submission.",
        "effective_date": "1999-01-01",
    },
    # ── OSHA ─────────────────────────────────────────────────────────
    {
        "code": "OSHA-2007",
        "title": "Occupational Safety and Health Requirements",
        "act_name": "Occupational Safety and Health Act, 2007",
        "section": "Part IV, Section 15",
        "category": "act",
        "sectors": ["all"],
        "counties": ["all"],
        "description": "Requires all workplaces with 20+ employees to develop and implement an Occupational Health and Safety management system.",
        "requirement": "Safety Officer must be appointed. Workers must receive health and safety training. OHS Management Plan must be part of the ESMP.",
        "effective_date": "2007-10-26",
    },
    # ── Asbestos ─────────────────────────────────────────────────────
    {
        "code": "EMCA-ASBESTOS-2011",
        "title": "Asbestos Regulations",
        "act_name": "Environmental Management and Coordination (Controlled Substances) Regulations, 2011",
        "section": "Schedule — Asbestos",
        "category": "regulation",
        "sectors": ["construction", "manufacturing", "infrastructure"],
        "counties": ["all"],
        "description": "Prohibits the use of asbestos in new construction. Existing asbestos must be managed by licensed professionals. Demolition of asbestos-containing structures requires an asbestos survey.",
        "requirement": "An Asbestos Management Plan must be submitted for any demolition or renovation of structures built before 1995. Disposal only to NEMA-licensed landfills.",
        "pdf_reference": "Asbestos-Guidelines.pdf",
        "effective_date": "2011-01-01",
    },
    # ── IFC Performance Standards ─────────────────────────────────────
    {
        "code": "IFC-PS1",
        "title": "IFC Performance Standard 1 — Assessment and Management of Environmental and Social Risks",
        "act_name": "IFC Performance Standards on Environmental and Social Sustainability (2012)",
        "section": "PS1",
        "category": "international",
        "sectors": ["all"],
        "counties": ["all"],
        "description": "Requires a comprehensive Environmental and Social Assessment (E&SA) and an Environmental and Social Management System (ESMS) for all IFC-financed projects.",
        "requirement": "Projects must demonstrate a hierarchy of mitigation: Avoid → Minimize → Mitigate → Offset.",
        "effective_date": "2012-01-01",
    },
    {
        "code": "IFC-PS6",
        "title": "IFC Performance Standard 6 — Biodiversity Conservation and Sustainable Management of Living Natural Resources",
        "act_name": "IFC Performance Standards on Environmental and Social Sustainability (2012)",
        "section": "PS6",
        "category": "international",
        "sectors": ["all"],
        "counties": ["all"],
        "description": "Requires a Critical Habitat Assessment (CHA) for all projects. Projects in Critical Habitats must achieve net gain in biodiversity.",
        "requirement": "If Critical Habitat is triggered, a Biodiversity Management Plan (BMP) is mandatory. No net loss in natural habitats; net gain in critical habitats.",
        "effective_date": "2012-01-01",
    },
    # ── Sector-Specific ───────────────────────────────────────────────
    {
        "code": "MINING-ACT-2016",
        "title": "Mining Act",
        "act_name": "Mining Act, 2016",
        "section": "Part VIII",
        "category": "act",
        "sectors": ["mining"],
        "counties": ["all"],
        "description": "Requires an EIA and a Mine Closure and Rehabilitation Plan before any mining licence is granted.",
        "requirement": "Financial assurance (bond) for site rehabilitation must be deposited with the Ministry of Mining before operations commence.",
        "effective_date": "2016-05-27",
    },
    {
        "code": "EPRA-ENERGY-2019",
        "title": "Energy Act — Environmental Compliance",
        "act_name": "Energy Act, 2019",
        "section": "Section 173",
        "category": "act",
        "sectors": ["energy"],
        "counties": ["all"],
        "description": "All energy generation projects must obtain both EPRA licensing and a NEMA EIA licence before commencement.",
        "requirement": "Solar, wind, and hydro projects above 1 MW require a full EIA Study. Transmission line projects require Environmental and Social Impact Assessment.",
        "effective_date": "2019-03-14",
    },
]


class Command(BaseCommand):
    help = "Seeds the Regulation Registry with Kenya's core environmental laws."

    def handle(self, *args, **options):
        created = 0
        updated = 0
        for reg_data in REGULATIONS:
            obj, was_created = Regulation.objects.update_or_create(
                code=reg_data["code"],
                defaults=reg_data
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS(
            f"✓ Regulation Registry seeded: {created} created, {updated} updated. "
            f"Total: {Regulation.objects.count()} regulations."
        ))
