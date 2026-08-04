#!/usr/bin/env node
// ============================================================
// MedAssist AI — one-time PostgreSQL -> MongoDB data migration.
//
// Context: the backend is mid-migration off Postgres onto Mongoose
// models (see packages/backend/src/config/database.ts's header comment).
// Patient/Doctor/Report/Appointment now have Mongoose schemas, but the
// live data — created via the still-Postgres-backed
// auth/patient/doctor/appointment controllers — only exists in the
// relational tables. This script copies it across, reshaping the
// relational rows (Patient, Doctor, Report, AppointmentSlot,
// MedicalHistory) into the documents those Mongoose schemas expect,
// including denormalizing MedicalHistory/Report/AppointmentSlot into
// Patient.medicalHistory / .reports / .appointments the way
// Patient.model.ts's embedded sub-schemas expect.
//
// This is intentionally self-contained (inline schemas, not an import
// of the backend's TS models) so it can run standalone with plain
// `node`, independent of the backend's build and of whether
// Doctor/Report/Appointment.model.ts have been moved into
// packages/backend/src/models/ yet. Once they have, prefer importing
// the real compiled models instead of the copies below.
//
// Usage:
//   node scripts/migrate-data.js            # migrate (skips if Mongo already has data)
//   node scripts/migrate-data.js --force     # wipe target collections first
//   node scripts/migrate-data.js --dry-run   # read + transform only, write nothing
// ============================================================
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const mongoose = require('mongoose');

const FORCE = process.argv.includes('--force');
const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 500;

/* ------------------------------------------------------------------ */
/* Minimal Mongoose schemas mirroring the real models (see header)     */
/* ------------------------------------------------------------------ */

const MedicalHistoryEntrySchema = new mongoose.Schema(
  { historyId: String, text: String, recordedDate: Date },
  { _id: false }
);
const PatientReportSummarySchema = new mongoose.Schema(
  {
    reportId: String,
    symptoms: String,
    aiDiagnosis: String,
    status: { type: String, enum: ['PENDING', 'REVIEWED', 'COMPLETED'], default: 'PENDING' },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  },
  { _id: false }
);
const PatientAppointmentSummarySchema = new mongoose.Schema(
  {
    appointmentId: String,
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    date: Date,
    time: String,
    status: {
      type: String,
      enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
      default: 'SCHEDULED',
    },
  },
  { _id: false }
);

const PatientSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
    phone: String,
    dateOfBirth: Date,
    bloodGroup: String,
    medicalHistory: [MedicalHistoryEntrySchema],
    reports: [PatientReportSummarySchema],
    appointments: [PatientAppointmentSummarySchema],
  },
  { timestamps: true }
);

const DoctorSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
    specialization: String,
    experienceYears: Number,
    consultationFee: Number,
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ReportSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    symptoms: String,
    aiDiagnosis: String,
    aiConfidence: Number,
    status: { type: String, enum: ['PENDING', 'REVIEWED', 'COMPLETED'], default: 'PENDING' },
    doctorNotes: String,
    prescription: String,
    doctorDiagnosis: String,
    reviewedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const AppointmentSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    appointmentDate: Date,
    appointmentTime: String,
    status: {
      type: String,
      enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
      default: 'SCHEDULED',
    },
    reason: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const Patient = mongoose.model('Patient', PatientSchema);
const Doctor = mongoose.model('Doctor', DoctorSchema);
const Report = mongoose.model('Report', ReportSchema);
const Appointment = mongoose.model('Appointment', AppointmentSchema);

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function log(msg) {
  // eslint-disable-next-line no-console
  console.log(`[migrate] ${msg}`);
}

async function insertInBatches(Model, docs) {
  if (DRY_RUN || docs.length === 0) return docs.map(() => null);
  const inserted = [];
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    // insertMany deliberately bypasses `save` middleware (unlike
    // `.create()`), which matters here: passwordHash coming from Postgres
    // is *already* a bcrypt hash, and Patient/DoctorSchema's real pre-save
    // hook re-hashes on every save() because `isModified()` is always true
    // for a brand-new document — that would double-hash every migrated
    // password and silently break login post-migration.
    const result = await Model.insertMany(chunk, { ordered: true });
    inserted.push(...result);
  }
  return inserted;
}

/* ------------------------------------------------------------------ */
/* Migration                                                            */
/* ------------------------------------------------------------------ */

async function migrate() {
  const pg = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'medassist',
    password: process.env.DB_PASSWORD || 'medassist123',
    database: process.env.DB_NAME || 'medassist',
  });

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/medassist_ai');
  log(`Connected. dry-run=${DRY_RUN} force=${FORCE}`);

  if (FORCE && !DRY_RUN) {
    log('Wiping target collections (--force)');
    await Promise.all([
      Patient.deleteMany({}),
      Doctor.deleteMany({}),
      Report.deleteMany({}),
      Appointment.deleteMany({}),
    ]);
  } else if (!DRY_RUN) {
    const existing = await Patient.estimatedDocumentCount();
    if (existing > 0) {
      log(
        `Patient collection already has ${existing} documents — pass --force to re-migrate. Aborting.`
      );
      await Promise.all([pg.end(), mongoose.disconnect()]);
      return;
    }
  }

  try {
    // ---------- Doctors ----------
    const { rows: doctorRows } = await pg.query('SELECT * FROM Doctor');
    const doctorDocs = doctorRows.map((d) => ({
      name: d.name,
      email: d.email,
      passwordHash: d.password_hash,
      specialization: d.specialization,
      experienceYears: d.experience_years ?? 0,
      consultationFee: Number(d.consultation_fee ?? 0),
      isAvailable: d.is_available ?? true,
      createdAt: d.created_at ?? new Date(),
    }));
    const insertedDoctors = await insertInBatches(Doctor, doctorDocs);
    const doctorIdMap = new Map(); // pg doctorID -> mongo ObjectId
    doctorRows.forEach((d, i) => doctorIdMap.set(d.doctorid, insertedDoctors[i]?._id));
    log(`Doctors: ${doctorRows.length} migrated`);

    // ---------- Patients (with embedded history/reports/appointments) ----------
    const { rows: patientRows } = await pg.query('SELECT * FROM Patient');
    const { rows: historyRows } = await pg.query('SELECT * FROM MedicalHistory');
    const { rows: reportRows } = await pg.query('SELECT * FROM Report');
    const { rows: apptRows } = await pg.query('SELECT * FROM AppointmentSlot');

    const historyByPatient = groupBy(historyRows, 'patientid');
    const reportsByPatient = groupBy(reportRows, 'patientid');
    const apptsByPatient = groupBy(apptRows, 'patientid');

    const patientDocs = patientRows.map((p) => ({
      name: p.name,
      email: p.email,
      passwordHash: p.password_hash,
      phone: p.phone ?? undefined,
      dateOfBirth: p.date_of_birth ?? undefined,
      bloodGroup: p.blood_group ?? undefined,
      createdAt: p.created_at ?? new Date(),
      medicalHistory: (historyByPatient.get(p.patientid) ?? []).map((h) => ({
        historyId: String(h.historyid),
        text: h.history_text,
        recordedDate: h.recorded_date,
      })),
      reports: (reportsByPatient.get(p.patientid) ?? []).map((r) => ({
        reportId: String(r.reportid),
        symptoms: r.symptoms,
        aiDiagnosis: r.ai_diagnosis,
        status: r.status ?? 'PENDING',
        doctorId: r.doctorid != null ? doctorIdMap.get(r.doctorid) : undefined,
      })),
      appointments: (apptsByPatient.get(p.patientid) ?? []).map((a) => ({
        appointmentId: String(a.slotid),
        doctorId: doctorIdMap.get(a.doctorid),
        date: a.appointment_date,
        time: a.appointment_time,
        status: a.status ?? 'SCHEDULED',
      })),
    }));
    const insertedPatients = await insertInBatches(Patient, patientDocs);
    const patientIdMap = new Map(); // pg patientID -> mongo ObjectId
    patientRows.forEach((p, i) => patientIdMap.set(p.patientid, insertedPatients[i]?._id));
    log(`Patients: ${patientRows.length} migrated (with embedded history/reports/appointments)`);

    // ---------- Reports (standalone collection) ----------
    const reportDocs = reportRows.map((r) => ({
      patientId: patientIdMap.get(r.patientid),
      doctorId: r.doctorid != null ? doctorIdMap.get(r.doctorid) : undefined,
      symptoms: r.symptoms,
      aiDiagnosis: r.ai_diagnosis,
      aiConfidence: Number(r.ai_confidence ?? 0),
      status: r.status ?? 'PENDING',
      doctorNotes: r.doctor_notes ?? undefined,
      prescription: r.prescription ?? undefined,
      doctorDiagnosis: r.doctor_diagnosis ?? undefined,
      reviewedAt: r.reviewed_at ?? undefined,
      createdAt: r.created_at ?? new Date(),
    }));
    await insertInBatches(Report, reportDocs);
    log(`Reports: ${reportRows.length} migrated`);

    // ---------- Appointments (standalone collection) ----------
    const apptDocs = apptRows.map((a) => ({
      doctorId: doctorIdMap.get(a.doctorid),
      patientId: patientIdMap.get(a.patientid),
      appointmentDate: a.appointment_date,
      appointmentTime: a.appointment_time,
      status: a.status ?? 'SCHEDULED',
      reason: a.reason ?? undefined,
      createdAt: a.created_at ?? new Date(),
    }));
    await insertInBatches(Appointment, apptDocs);
    log(`Appointments: ${apptRows.length} migrated`);

    log(DRY_RUN ? 'Dry run complete — nothing was written.' : 'Migration complete.');
  } finally {
    await Promise.all([pg.end(), mongoose.disconnect()]);
  }
}

function groupBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const k = row[key];
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  }
  return map;
}

migrate().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[migrate] Failed:', err);
  process.exit(1);
});
