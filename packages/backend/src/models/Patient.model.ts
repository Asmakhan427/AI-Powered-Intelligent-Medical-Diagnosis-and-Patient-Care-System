import { Schema, model, Document, Model, Types } from 'mongoose';
import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN, BCRYPT_SALT_ROUNDS } from '../config/env';

/* ------------------------------------------------------------------ */
/* Sub-document interfaces & schemas                                  */
/* ------------------------------------------------------------------ */

export interface IMedicalHistoryEntry {
  historyId: string;
  text: string;
  recordedDate: Date;
}

const MedicalHistoryEntrySchema = new Schema<IMedicalHistoryEntry>(
  {
    historyId: { type: String, required: true },
    text: { type: String, required: true, trim: true, maxlength: 5000 },
    recordedDate: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

export interface IPatientReportSummary {
  reportId: string;
  symptoms: string;
  aiDiagnosis: string;
  status: 'PENDING' | 'REVIEWED' | 'COMPLETED';
  doctorId?: Types.ObjectId;
}

const PatientReportSummarySchema = new Schema<IPatientReportSummary>(
  {
    reportId: { type: String, required: true },
    symptoms: { type: String, required: true, trim: true },
    aiDiagnosis: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['PENDING', 'REVIEWED', 'COMPLETED'],
      default: 'PENDING',
    },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },
  },
  { _id: false }
);

export interface IPatientAppointmentSummary {
  appointmentId: string;
  doctorId: Types.ObjectId;
  date: Date;
  time: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
}

const PatientAppointmentSummarySchema = new Schema<IPatientAppointmentSummary>(
  {
    appointmentId: { type: String, required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    status: {
      type: String,
      enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
      default: 'SCHEDULED',
    },
  },
  { _id: false }
);

/* ------------------------------------------------------------------ */
/* Patient document interface                                         */
/* ------------------------------------------------------------------ */

export interface IPatient extends Document {
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  dateOfBirth?: Date;
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  medicalHistory: IMedicalHistoryEntry[];
  reports: IPatientReportSummary[];
  appointments: IPatientAppointmentSummary[];
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  age: number | null;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateToken(): string;
}

/* ------------------------------------------------------------------ */
/* Patient schema                                                      */
/* ------------------------------------------------------------------ */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PatientSchema = new Schema<IPatient>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_REGEX, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // never returned by default queries
      minlength: 8,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9+\-\s()]{7,20}$/, 'Please provide a valid phone number'],
    },
    dateOfBirth: {
      type: Date,
      validate: {
        validator: (value: Date) => !value || value <= new Date(),
        message: 'Date of birth cannot be in the future',
      },
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    medicalHistory: { type: [MedicalHistoryEntrySchema], default: [] },
    reports: { type: [PatientReportSummarySchema], default: [] },
    appointments: { type: [PatientAppointmentSummarySchema], default: [] },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete (ret as { passwordHash?: string }).passwordHash;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

/* ------------------------------------------------------------------ */
/* Indexes                                                             */
/* ------------------------------------------------------------------ */

PatientSchema.index({ email: 1 }, { unique: true });
PatientSchema.index({ 'reports.status': 1 });
PatientSchema.index({ 'appointments.date': 1 });
PatientSchema.index({ createdAt: -1 });

/* ------------------------------------------------------------------ */
/* Virtuals                                                             */
/* ------------------------------------------------------------------ */

PatientSchema.virtual('age').get(function (this: IPatient): number | null {
  if (!this.dateOfBirth) return null;
  const diffMs = Date.now() - this.dateOfBirth.getTime();
  const ageDate = new Date(diffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
});

/* ------------------------------------------------------------------ */
/* Middleware                                                           */
/* ------------------------------------------------------------------ */

PatientSchema.pre('save', async function (next) {
  const patient = this as IPatient;

  if (!patient.isModified('passwordHash')) {
    return next();
  }

  try {
    patient.passwordHash = await bcrypt.hash(patient.passwordHash, BCRYPT_SALT_ROUNDS);
    next();
  } catch (err) {
    next(err as Error);
  }
});

/* ------------------------------------------------------------------ */
/* Instance methods                                                    */
/* ------------------------------------------------------------------ */

PatientSchema.methods.comparePassword = async function (
  this: IPatient,
  candidatePassword: string
): Promise<boolean> {
  // Callers must fetch this document with `.select('+passwordHash')`
  // since the field is excluded from default query projections.
  if (!this.passwordHash) {
    throw new Error(
      'passwordHash not loaded on this document — use .select("+passwordHash") when querying for authentication.'
    );
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

PatientSchema.methods.generateToken = function (this: IPatient): string {
  return jwt.sign({ id: this._id.toString(), role: 'patient', email: this.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as SignOptions);
};

/* ------------------------------------------------------------------ */
/* Model                                                                */
/* ------------------------------------------------------------------ */

export type PatientModel = Model<IPatient>;

export default model<IPatient, PatientModel>('Patient', PatientSchema);
