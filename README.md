# SlotZero — Conflict-Free Clinical Appointment Scheduling Platform

SlotZero is an enterprise-grade healthcare appointment scheduling platform designed for deterministic, zero-collision operations across international timezones. Built with a modern MERN architecture, SlotZero guarantees strict concurrency control via MongoDB replica-set transactions and 15-minute quantized atomic slot locks, dynamically calculated safety buffers, and timezone precision across London, New York, and Kolkata.

---

## 🏥 Key Architectural Highlights

1. **Zero Double-Bookings (Atomic Concurrency Control)**:
   - Uses MongoDB replica-set transactions.
   - Granular **15-minute slot locks** stored in the `SlotLock` collection.
   - Enforced by a unique compound index: `{ doctorId: 1, startAt: 1 }`.
   - Any concurrent request attempting to claim an overlapping consultation or buffer period fails atomically at the database level and returns **HTTP 409 Conflict**.
   - Includes idempotency keys (`idempotencyKey`) on booking requests to prevent accidental duplicate submissions.

2. **Dynamic Automatic Buffers**:
   - Doctor-configurable mandatory rest/sanitization breaks (0, 5, 10, 15, 20, 30 minutes) applied after each consultation.
   - Buffers are dynamically computed by the availability engine on the backend—**no fake appointment records are ever created**.
   - Buffers are automatically bounded within working intervals (never spills beyond doctor's shift).
   - Cancellation and rescheduling release or reassign the buffer locks atomically.

3. **Strict Multi-Timezone UTC Engine**:
   - All appointment timestamps are stored in UTC.
   - Timezone calculations powered by Luxon across three supported IANA timezones:
     - `Europe/London` (GMT / BST)
     - `America/New_York` (EST / EDT)
     - `Asia/Kolkata` (IST)
   - Doctors configure working hours in their local timezone; patients view and book slots in their local timezone.
   - Rejects nonexistent local times and handles daylight saving transitions reliably.

4. **Clinical UI System (Adheres to Medical Guardrails)**:
   - High-density asymmetrical split screen (35% filter drawer on the left, 65% scrollable doctor cards on the right).
   - Anti-modal inline calendar strip with micro-chips for `Available` and `Booked / Buffer Occupied`.
   - Flat clinical UI with obsidian text (`#121417`), soft slate backgrounds (`bg-neutral-50`), muted emerald accents (`emerald-700`), and hairline borders (`border-neutral-200`).

---

## 🔑 Seeded Demo Credentials

All four accounts use the same demo password: **`demoPassword123!`**.
The platform also includes a **1-Click Demo Quick-Switcher** on the landing page and navigation bar for instant evaluator testing without manual entry.

| Name | Role | Email | Timezone | Clinical Configuration |
|---|---|---|---|---|
| **Dr. Meera Patel** | `DOCTOR` | `meera@slotzero.io` | `Europe/London` | General Physician • 30m consultation • 15m buffer |
| **Dr. Alex Vance** | `DOCTOR` | `alex@slotzero.io` | `America/New_York` | Cardiologist • 30m consultation • 10m buffer |
| **Asha Sharma** | `PATIENT` | `asha@slotzero.io` | `Asia/Kolkata` | Patient • IST viewing |
| **Sam Miller** | `PATIENT` | `sam@slotzero.io` | `America/New_York` | Patient • EST/EDT viewing |

---

## 🛠️ Technology Stack

- **Frontend**:
  - React.js with Vite
  - JavaScript (ES Modules)
  - Tailwind CSS
  - React Router DOM
  - Axios
  - Lucide React icons
  - Luxon
  - React Hot Toast
- **Backend**:
  - Node.js & Express.js
  - MongoDB Atlas (Replica Set enabled for ACID transactions)
  - Mongoose
  - JWT Authentication
  - bcrypt for secure password hashing
  - Luxon for IANA timezone computations

---

## ⚙️ Environment Variables

### Backend (`backend/.env`):
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/slotzero?retryWrites=true&w=majority
JWT_SECRET=slotzero_jwt_secret_dev_key_secure_2026
```

---

## 🚀 Installation & Running Locally

### 1. Backend Setup
```bash
cd backend
npm install
npm run seed      # Seeds demo doctors and patients with synced compound indexes
npm run dev       # Starts Express backend on http://localhost:5000
```

To run the automated backend test suites (concurrency, buffers, timezones, audit logs):
```bash
npm test          # or node scripts/testSuite.js
node scripts/e2eLiveApiTest.js
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev       # Starts Vite dev server on http://localhost:3000
```
Open `http://localhost:3000/` in your browser. The Vite server automatically proxies `/api` requests to `http://localhost:5000/api`.

---

## 📡 REST API Reference

### Authentication
- `POST /api/auth/register` — Register a new Doctor or Patient
- `POST /api/auth/login` — Sign in and receive JWT token
- `GET /api/auth/me` — Retrieve current authenticated session

### Doctors & Availability
- `GET /api/doctors` — List board-certified physicians (supports `?search=` and `?specialization=`)
- `GET /api/doctors/:id` — Get physician details and profile
- `GET /api/doctors/:id/availability?date=YYYY-MM-DD&timezone=Asia/Kolkata` — Dynamic availability engine calculating working intervals, buffer spacing, and timezone conversions
- `PUT /api/doctors/profile` — Update physician profile & credentials (Doctor only)
- `PUT /api/doctors/schedule` — Configure daily working intervals (Doctor only)
- `PUT /api/doctors/appointment-settings` — Set consultation duration (15/30/60m) and buffer duration (0/5/10/15/20/30m) (Doctor only)
- `GET /api/doctors/blocked-slots` — List doctor's blocked time periods (Doctor only)
- `POST /api/doctors/blocked-slots` — Block clinical period (enforces active appointment guardrail) (Doctor only)
- `DELETE /api/doctors/blocked-slots/:id` — Delete a future blocked period (Doctor only)

### Appointments
- `POST /api/appointments` — Book an appointment atomically with 15-minute slot locks (Patient only)
- `GET /api/appointments/my` — List logged-in patient's appointments (Patient only)
- `GET /api/appointments/doctor` — List logged-in doctor's appointments (Doctor only)
- `GET /api/appointments/:id` — View appointment details (Doctor or Patient owner)
- `PATCH /api/appointments/:id/cancel` — Cancel appointment (enforces 2-hour deadline for patients, releases slot locks)
- `PATCH /api/appointments/:id/reschedule` — Atomically release old locks and acquire new locks
- `GET /api/appointments/:id/history` — Inspect appointment audit trail (`AuditLog`)

---

## 🧪 Important Scheduling Decisions & Verification

1. **How Concurrency is Prevented**:
   When booking 10:00–10:30 with a 15-minute buffer (until 10:45), the service breaks this occupied window into 15-minute slices (`10:00`, `10:15`, `10:30`). It writes each to `SlotLock` inside a MongoDB transaction. If a concurrent patient attempts to book an overlapping slot, MongoDB throws error 11000 on the unique compound index, the transaction rolls back, and HTTP 409 is returned.

2. **Automatic Breaks Are Dynamic**:
   Buffers are not fake appointments. If an appointment is cancelled, its associated buffer disappears immediately, reopening the doctor's availability for other patients.

3. **Strict Ownership**:
   Patients cannot view or manipulate other patients' appointments; doctors only manage their own clinical schedules and consultations.
