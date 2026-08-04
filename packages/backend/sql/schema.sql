-- ============================================================
-- MedAssist AI — PostgreSQL schema.
--
-- Reverse-engineered from the queries actually run by
-- packages/backend/src/{controllers,services}/*.ts (there was no schema
-- file in the repo before this one — see config/db.ts's pg.Pool and every
-- `query(...)` call site for the source of truth this was built from).
--
-- Column names are unquoted everywhere the app queries them (e.g.
-- `patientID`), so Postgres folds them to lowercase on both sides — the
-- app's queries and this file agree as long as neither one quotes an
-- identifier. Don't add double-quoted mixed-case columns here.
--
-- Usage:
--   psql -U postgres -d medassist -f packages/backend/sql/schema.sql
-- ============================================================

-- Lets us seed working bcrypt password hashes below without a separate
-- Node script (crypt()/gen_salt('bf') produces the same $2a$/$2b$ format
-- the app's own bcrypt.compare() understands).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Doctor ----------
CREATE TABLE IF NOT EXISTS Doctor (
  doctorID          SERIAL PRIMARY KEY,
  name              VARCHAR(120)  NOT NULL,
  email             VARCHAR(255)  NOT NULL UNIQUE,
  password_hash     VARCHAR(255)  NOT NULL,
  specialization    VARCHAR(120)  NOT NULL,
  experience_years  INTEGER       NOT NULL DEFAULT 0,
  consultation_fee  NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_available      BOOLEAN       NOT NULL DEFAULT true,
  is_active         BOOLEAN       NOT NULL DEFAULT true,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_doctor_specialization ON Doctor (specialization);

-- ---------- Patient ----------
CREATE TABLE IF NOT EXISTS Patient (
  patientID             SERIAL PRIMARY KEY,
  name                  VARCHAR(120)  NOT NULL,
  email                 VARCHAR(255)  NOT NULL UNIQUE,
  password_hash         VARCHAR(255)  NOT NULL,
  phone                 VARCHAR(20),
  date_of_birth         DATE,
  blood_group           VARCHAR(5),
  is_active             BOOLEAN       NOT NULL DEFAULT true,
  last_appointment_date TIMESTAMP,
  created_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------- Report (AI diagnosis, reviewed by a doctor) ----------
CREATE TABLE IF NOT EXISTS Report (
  reportID          SERIAL PRIMARY KEY,
  patientID         INTEGER       NOT NULL REFERENCES Patient (patientID) ON DELETE CASCADE,
  doctorID          INTEGER       REFERENCES Doctor (doctorID) ON DELETE SET NULL,
  symptoms          TEXT          NOT NULL,
  ai_diagnosis      VARCHAR(255)  NOT NULL,
  ai_confidence     NUMERIC(5,2)  NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'PENDING'
                       CHECK (status IN ('PENDING', 'REVIEWED', 'COMPLETED')),
  doctor_notes      TEXT,
  prescription      TEXT,
  doctor_diagnosis  VARCHAR(255),
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at       TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_report_patient ON Report (patientID);
CREATE INDEX IF NOT EXISTS idx_report_doctor ON Report (doctorID);
CREATE INDEX IF NOT EXISTS idx_report_status ON Report (status);

-- ---------- AppointmentSlot ----------
CREATE TABLE IF NOT EXISTS AppointmentSlot (
  slotID             SERIAL PRIMARY KEY,
  doctorID           INTEGER      NOT NULL REFERENCES Doctor (doctorID) ON DELETE CASCADE,
  patientID          INTEGER      NOT NULL REFERENCES Patient (patientID) ON DELETE CASCADE,
  appointment_date   DATE         NOT NULL,
  appointment_time   VARCHAR(5)   NOT NULL, -- "HH:MM", 24h
  status             VARCHAR(20)  NOT NULL DEFAULT 'SCHEDULED'
                        CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
  reason             TEXT,
  created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_appointment_patient ON AppointmentSlot (patientID);
CREATE INDEX IF NOT EXISTS idx_appointment_doctor ON AppointmentSlot (doctorID);
CREATE INDEX IF NOT EXISTS idx_appointment_date ON AppointmentSlot (appointment_date);

-- ---------- MedicalHistory (append-only activity log per patient) ----------
CREATE TABLE IF NOT EXISTS MedicalHistory (
  historyID       SERIAL PRIMARY KEY,
  patientID       INTEGER   NOT NULL REFERENCES Patient (patientID) ON DELETE CASCADE,
  history_text    TEXT      NOT NULL,
  recorded_date   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_history_patient ON MedicalHistory (patientID);

-- ---------- NotificationLog ----------
CREATE TABLE IF NOT EXISTS NotificationLog (
  notificationID  SERIAL PRIMARY KEY,
  patientID       INTEGER   NOT NULL REFERENCES Patient (patientID) ON DELETE CASCADE,
  message         TEXT      NOT NULL,
  is_read         BOOLEAN   NOT NULL DEFAULT false,
  sent_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notification_patient ON NotificationLog (patientID);

-- ---------- EmergencyAlert ----------
CREATE TABLE IF NOT EXISTS EmergencyAlert (
  alertID          SERIAL PRIMARY KEY,
  patientID        INTEGER   NOT NULL REFERENCES Patient (patientID) ON DELETE CASCADE,
  severity         VARCHAR(20) NOT NULL,
  alert_timestamp  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_emergency_patient ON EmergencyAlert (patientID);

-- ---------- SymptomAnalysisLog (every /ai/analyze call, guest or patient) ----------
CREATE TABLE IF NOT EXISTS SymptomAnalysisLog (
  logID            SERIAL PRIMARY KEY,
  patientID        INTEGER   REFERENCES Patient (patientID) ON DELETE SET NULL, -- null for guests
  symptoms_input   TEXT      NOT NULL,
  input_type       VARCHAR(10) NOT NULL DEFAULT 'TEXT' CHECK (input_type IN ('TEXT', 'VOICE')),
  ai_response      VARCHAR(255) NOT NULL,
  severity         VARCHAR(20)  NOT NULL,
  log_timestamp    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_symptomlog_patient ON SymptomAnalysisLog (patientID);

-- ---------- Feedback ----------
CREATE TABLE IF NOT EXISTS Feedback (
  feedbackID  SERIAL PRIMARY KEY,
  patientID   INTEGER      NOT NULL REFERENCES Patient (patientID) ON DELETE CASCADE,
  doctorID    INTEGER      REFERENCES Doctor (doctorID) ON DELETE SET NULL,
  rating      SMALLINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comments    TEXT,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_feedback_patient ON Feedback (patientID);
CREATE INDEX IF NOT EXISTS idx_feedback_doctor ON Feedback (doctorID);

-- ---------- SessionLog ----------
-- Referenced by auth.controller.ts's logout handler (UPDATE ... WHERE
-- sessionID = $1) but nothing in the current codebase INSERTs a row here
-- yet — logout is a no-op unless a sessionId is explicitly supplied, so an
-- empty table doesn't block anything. Included for schema completeness.
CREATE TABLE IF NOT EXISTS SessionLog (
  sessionID   SERIAL PRIMARY KEY,
  patientID   INTEGER REFERENCES Patient (patientID) ON DELETE CASCADE,
  doctorID    INTEGER REFERENCES Doctor (doctorID) ON DELETE CASCADE,
  start_time  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_time    TIMESTAMP
);

-- ---------- fn_CalculateSeverityScore ----------
-- patient.controller.ts's getStats calls this directly:
--   SELECT fn_CalculateSeverityScore($1) AS severity
-- Heuristic: an EmergencyAlert in the last 30 days always wins (CRITICAL);
-- otherwise fall back to the patient's most recent symptom-analysis severity.
CREATE OR REPLACE FUNCTION fn_CalculateSeverityScore(p_patient_id INTEGER)
RETURNS VARCHAR(20) AS $$
DECLARE
  recent_emergency BOOLEAN;
  latest_severity VARCHAR(20);
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM EmergencyAlert
    WHERE patientID = p_patient_id
      AND alert_timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'
  ) INTO recent_emergency;

  IF recent_emergency THEN
    RETURN 'CRITICAL';
  END IF;

  SELECT severity INTO latest_severity
  FROM SymptomAnalysisLog
  WHERE patientID = p_patient_id
  ORDER BY log_timestamp DESC
  LIMIT 1;

  RETURN COALESCE(latest_severity, 'MILD');
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- Seed data — a handful of doctors covering every specialization
-- ai.controller.ts's KEYWORD_DOCTOR_MAP can resolve, so a fresh dev
-- database has someone real for symptom analysis / booking to assign to.
-- Password for all seeded doctors: "Doctor123!"
-- ============================================================
-- Names are stored WITHOUT a "Dr." prefix — the frontend prepends it at
-- display time everywhere (e.g. AppointmentBooking.tsx: `Dr. {doctor.name}`),
-- matching the rest of the app's convention, so a prefix baked in here would
-- render as "Dr. Dr. Farid Rahimi".
INSERT INTO Doctor (name, email, password_hash, specialization, experience_years, consultation_fee, is_available)
SELECT * FROM (VALUES
  ('Aisha Khan',      'aisha.khan@medassist.dev',      crypt('Doctor123!', gen_salt('bf', 10)), 'General Physician',              8,  30.00, true),
  ('Marcus Reyes',    'marcus.reyes@medassist.dev',    crypt('Doctor123!', gen_salt('bf', 10)), 'Cardiologist',                   15, 80.00, true),
  ('Priya Nair',      'priya.nair@medassist.dev',      crypt('Doctor123!', gen_salt('bf', 10)), 'Neurologist',                    12, 75.00, true),
  ('Tom Becker',      'tom.becker@medassist.dev',      crypt('Doctor123!', gen_salt('bf', 10)), 'Pulmonologist',                  10, 65.00, true),
  ('Elena Petrova',   'elena.petrova@medassist.dev',   crypt('Doctor123!', gen_salt('bf', 10)), 'Gastroenterologist',             9,  70.00, true),
  ('Samuel Osei',     'samuel.osei@medassist.dev',     crypt('Doctor123!', gen_salt('bf', 10)), 'Dermatologist',                  6,  55.00, true),
  ('Lina Haddad',     'lina.haddad@medassist.dev',     crypt('Doctor123!', gen_salt('bf', 10)), 'Rheumatologist',                 11, 60.00, true),
  ('Kenji Watanabe',  'kenji.watanabe@medassist.dev',  crypt('Doctor123!', gen_salt('bf', 10)), 'Urologist',                      14, 68.00, true),
  ('Grace Mwangi',    'grace.mwangi@medassist.dev',    crypt('Doctor123!', gen_salt('bf', 10)), 'Pediatrician',                   7,  50.00, true),
  ('Farid Rahimi',    'farid.rahimi@medassist.dev',    crypt('Doctor123!', gen_salt('bf', 10)), 'Infectious Disease Specialist',  13, 72.00, true)
) AS seed(name, email, password_hash, specialization, experience_years, consultation_fee, is_available)
WHERE NOT EXISTS (SELECT 1 FROM Doctor WHERE Doctor.email = seed.email);
