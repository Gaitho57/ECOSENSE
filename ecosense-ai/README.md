# 🌍 EcoSense AI

**Transforming Environmental Impact Assessments into a Live, AI-Powered Compliance Ecosystem**

---

## Overview

EcoSense AI is a multi-tenant SaaS platform that digitises the full Environmental Impact Assessment (EIA) lifecycle. It replaces static paper reports with an intelligent, continuously updated compliance system — from automated baseline generation using satellite and GIS data, through AI-driven impact prediction, to post-approval IoT monitoring, ESG dashboards, and a blockchain-secured audit trail.

### Key Capabilities

| Module | Description |
|---|---|
| **Baseline Generation** | Automated environmental baseline from satellite imagery & GIS (Google Earth Engine, Sentinel-2) |
| **AI Impact Prediction** | XGBoost & scikit-learn models for predicting environmental impacts |
| **Community Engagement** | SMS/WhatsApp integration (Africa's Talking + Twilio) for stakeholder participation |
| **Report Generation** | Auto-generated NEMA-compliant EIA reports (PDF via WeasyPrint, DOCX via python-docx) |
| **Compliance Engine** | Real-time tracking against Kenyan & international environmental regulations |
| **Living EMP** | Post-approval Environmental Management Plan with IoT sensor monitoring (AWS IoT Core) |
| **ESG & Blockchain** | ESG scoring dashboards and immutable audit trail on Polygon network |

---

## Tech Stack

### Frontend
- React 18 + Vite
- Zustand (state management)
- React Router v6
- Mapbox GL JS v3
- Recharts
- React Hook Form + Zod
- Tailwind CSS v3
- Axios + React Query
- deck.gl / Three.js (3D visualisation)

### Backend
- Python 3.11
- Django 4.2 + Django REST Framework
- djangorestframework-simplejwt (JWT authentication)
- Celery + Redis (task queue)
- GeoPandas + Shapely + GDAL (geospatial)
- LangChain (AI orchestration)
- XGBoost + scikit-learn (ML models)
- WeasyPrint + python-docx (report generation)
- web3.py (blockchain integration)

### Database
- PostgreSQL 15 + PostGIS (spatial data)
- Redis 7 (cache + Celery broker)

### Infrastructure
- Docker + Docker Compose (local development)
- AWS (EC2 + RDS + S3 + IoT Core)
- GitHub Actions (CI/CD)

### Messaging
- Africa's Talking API (SMS + WhatsApp)
- Twilio (WhatsApp fallback)

### Blockchain
- Polygon network
- Hardhat (smart contract deployment)

### Storage
- AWS S3 (reports, media)
- AWS Secrets Manager (sensitive keys)

---

## Project Structure

```
ecosense-ai/
├── backend/
│   ├── core/              # Django project config
│   ├── apps/
│   │   ├── accounts/      # Auth + users
│   │   ├── projects/      # EIA projects
│   │   ├── baseline/      # Baseline aggregation
│   │   ├── predictions/   # AI predictions
│   │   ├── community/     # Community engagement
│   │   ├── reports/       # Report generation
│   │   ├── compliance/    # Legal compliance engine
│   │   ├── emp/           # Living EMP + IoT
│   │   └── esg/           # ESG + Blockchain
│   ├── requirements.txt
│   ├── manage.py
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── store/
│   │   ├── api/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.js
├── infra/
│   ├── docker-compose.yml
│   └── nginx/
├── contracts/             # Blockchain smart contracts
├── docs/
├── .github/workflows/
├── .gitignore
└── README.md
```

---

## Setup Instructions

> **Prerequisites:** Docker, Docker Compose, Node.js 18+, Python 3.11+, PostgreSQL 15 with PostGIS, Redis 7

### 1. Clone the repository
```bash
git clone https://github.com/your-org/ecosense-ai.git
cd ecosense-ai
```

### 2. Backend setup
```bash
cd backend
cp .env.example .env
# Fill in your environment variables in .env

python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 3. Frontend setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Run with Docker (recommended)
```bash
docker-compose -f infra/docker-compose.yml up --build
```

---

## License

Proprietary — All rights reserved.
