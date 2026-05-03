# EcoSenseEIA — Deployment Guide

This guide outlines the professional, zero-cost (or low-cost) infrastructure for deploying **EcoSenseEIA** at `eia.ecosensehq.co.ke`.

## 🏗️ Architecture Overview
- **Frontend**: Vercel (Hobby Tier) — Fast, Global Edge CDN.
- **Backend**: Railway or Render (Free/Pay-as-you-go) — Django + Celery.
- **Database**: Neon (Free Tier) — Serverless PostgreSQL + PostGIS.
- **Cache/Broker**: Upstash (Free Tier) — Redis for Celery.
- **Storage**: AWS S3 (Free Tier) — Report storage.

---

## 🚀 1. Database (Neon)
1. Sign up at [neon.tech](https://neon.tech).
2. Create a new project called `ecosense-ai`.
3. Enable the **PostGIS** extension in the Neon console.
4. Copy your `DATABASE_URL`.

## 🛰️ 2. Frontend (Vercel)
1. Sign up at [vercel.com](https://vercel.com).
2. Connect your GitHub repository.
3. Set **Root Directory** to `frontend/`.
4. Add the following **Environment Variables**:
   - `VITE_API_URL`: The URL of your Railway backend (see below).
5. Deploy.
6. In **Settings > Domains**, add `eia.ecosensehq.co.ke`. Follow the DNS instructions at your domain registrar.

## ⚙️ 3. Backend (Railway)
1. Sign up at [railway.app](https://railway.app).
2. Create a new project from your GitHub repo.
3. Set **Root Directory** to `backend/`.
4. Add **Environment Variables**:
   - `DATABASE_URL`: Your Neon URL.
   - `REDIS_URL`: Your Upstash Redis URL.
   - `CELERY_BROKER_URL`: Same as Redis URL.
   - `ALLOWED_HOSTS`: `*` (or your domain).
   - `SECRET_KEY`: A long random string.
   - `DEBUG`: `False` (for production).
5. Railway will automatically detect the `Dockerfile` or `requirements.txt`.

## 📝 4. Domain (DNS)
In your domain registrar (e.g., Safaricom, GoDaddy, Namecheap):
- Create a **CNAME** record for `eia` pointing to Vercel's address.
- Ensure your backend URL is allowed in the `CORS_ALLOWED_ORIGINS` on the backend.

---

## 🛡️ Maintenance Commands
To sync your database after deployment:
```bash
python manage.py migrate
python manage.py create_demo_user admin@ecosensehq.co.ke "Admin" --credits 100
```
