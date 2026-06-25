# StartupBridge

A platform connecting startup founders with investors, mediated by an admin.

**Live Demo:** [https://startup-bridge-frontend.onrender.com/](https://startup-bridge-frontend.onrender.com/)

**Stack:** React 18 + Vite + Tailwind CSS | Express 4 + Prisma 5 | PostgreSQL 16 | JWT auth

---

## For new teammates — setup from scratch (do this once)

### Prerequisites (install these first if you haven't)
- [Node.js 20 LTS](https://nodejs.org/) — check with `node -v`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — must be **running** before Step 3

### Steps

**1. Clone the repo**
```
git clone <repo-url>
cd Webdev
```

**2. Create your .env file**
```
cd backend
cp .env.example .env
```
Open `backend/.env` and paste the `JWT_SECRET` value shared over WhatsApp/Discord.
Everything else (DATABASE_URL, PORT, etc.) is already filled in — don't change it.

**3. Start the database**
```
cd ..
docker-compose up -d
```
First run downloads the Postgres image (~113 MB). Subsequent runs start instantly.
Verify it worked: `docker-compose ps` should show `Up` status.

**4. Install backend packages**
```
cd backend
npm install
```

**5. Create database tables**
```
npx prisma db push
```

**6. Seed fake data (demo accounts + pitches)**
```
node prisma/seed.js
```

**7. Install frontend packages**
```
cd ../frontend
npm install
```

**8. Start both servers (two separate terminals)**

Terminal 1 — backend:
```
cd backend
npm run dev
```
Express runs on http://localhost:4000

Terminal 2 — frontend:
```
cd frontend
npm run dev
```
React runs on http://localhost:5173 — open this in your browser.

---

## Demo accounts (all use password: `Demo1234!`)

| Email | Role | Status |
|---|---|---|
| admin@demo.test | Admin | Approved |
| arjun@demo.test | Investor | Approved |
| priya@demo.test | Investor | Approved |
| ravi@demo.test | Investor | **Pending** (demo admin approval) |
| kavya@demo.test | Startup | Approved |
| nikhil@demo.test | Startup | Approved |
| meera@demo.test | Startup | **Pending** (demo admin approval) |

---

## Verify everything is working

After starting both servers:
- Backend health check → http://localhost:4000/api/health (should return `{"status":"ok"}`)
- Frontend → http://localhost:5173
- Database viewer → http://localhost:5555 (run `npx prisma studio` first)

---

## Day-to-day commands

```bash
# Start database (if Docker isn't running)
docker-compose up -d

# Stop database
docker-compose down

# View database visually (opens http://localhost:5555)
cd backend && npx prisma studio

# Re-seed (wipe and refill fake data)
cd backend && node prisma/seed.js

# After pulling schema changes from a teammate
cd backend && npx prisma db push
```

---

## If a teammate changes schema.prisma

Person B owns the schema. When they push a schema change:
1. Pull the latest code: `git pull`
2. Run: `cd backend && npx prisma db push`
3. That's it — your local tables are updated.

---

## Folder structure

```
Webdev/
├── docker-compose.yml        Postgres container config
├── .env.example              Template — copy to .env and fill JWT_SECRET
├── .gitignore
├── README.md
├── backend/
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma     7 database models
│   │   └── seed.js           Fake data for development
│   └── src/                  Express app (built during sprints)
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/                  React app (built during sprints)
```
