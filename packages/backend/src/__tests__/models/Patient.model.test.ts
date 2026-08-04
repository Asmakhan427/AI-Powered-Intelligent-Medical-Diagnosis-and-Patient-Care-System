import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Patient from '../../models/Patient.model';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  // Downloads a MongoDB binary on first run — slow on a cold cache (can take
  // several minutes over a slow connection), hence the generous timeout.
  // Once downloaded, mongodb-memory-server caches the binary on disk and
  // subsequent runs (including CI, if that cache dir is preserved) start in
  // seconds.
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  // Duplicate-email rejection relies on the unique index actually existing;
  // index builds happen asynchronously after model registration, so wait
  // for them explicitly rather than racing the first test against them.
  await Patient.init();
}, 900000);

afterEach(async () => {
  await Patient.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
}, 900000);

const validAttrs = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  passwordHash: 'password123', // hashed by the pre-save hook — see "hash password" below
};

describe('Patient model', () => {
  describe('create patient', () => {
    it('creates and persists a valid patient', async () => {
      const patient = await Patient.create(validAttrs);

      expect(patient._id).toBeDefined();
      expect(patient.name).toBe('Jane Doe');
      expect(patient.email).toBe('jane@example.com');
      expect(patient.medicalHistory).toEqual([]);
    });

    it('rejects a patient with no name', async () => {
      await expect(Patient.create({ ...validAttrs, name: undefined })).rejects.toThrow(
        /Name is required/
      );
    });

    it('rejects a name shorter than the minimum length', async () => {
      await expect(Patient.create({ ...validAttrs, name: 'J' })).rejects.toThrow();
    });
  });

  describe('validate email', () => {
    it('rejects a malformed email address', async () => {
      await expect(Patient.create({ ...validAttrs, email: 'not-an-email' })).rejects.toThrow(
        /valid email/
      );
    });

    it('lowercases and trims the email on save', async () => {
      const patient = await Patient.create({ ...validAttrs, email: '  Jane@EXAMPLE.com  ' });
      expect(patient.email).toBe('jane@example.com');
    });

    it('rejects a second patient with the same email', async () => {
      await Patient.create(validAttrs);
      await expect(Patient.create({ ...validAttrs, name: 'Someone Else' })).rejects.toThrow();
    });
  });

  describe('hash password', () => {
    it('stores a bcrypt hash on save, never the plain-text password', async () => {
      const patient = await Patient.create(validAttrs);
      const stored = await Patient.findById(patient._id).select('+passwordHash');

      expect(stored!.passwordHash).not.toBe('password123');
      expect(stored!.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt hash prefix
    });

    it('excludes passwordHash from default queries', async () => {
      const patient = await Patient.create(validAttrs);
      const stored = await Patient.findById(patient._id);
      expect(stored!.passwordHash).toBeUndefined();
    });

    it('does not re-hash an already-hashed password on an unrelated update', async () => {
      const patient = await Patient.create(validAttrs);
      const before = (await Patient.findById(patient._id).select('+passwordHash'))!.passwordHash;

      patient.phone = '+1 555 0100';
      await patient.save();

      const after = (await Patient.findById(patient._id).select('+passwordHash'))!.passwordHash;
      expect(after).toBe(before);
    });
  });

  describe('comparePassword', () => {
    it('resolves true for the correct password', async () => {
      await Patient.create(validAttrs);
      const stored = await Patient.findOne({ email: 'jane@example.com' }).select('+passwordHash');

      await expect(stored!.comparePassword('password123')).resolves.toBe(true);
    });

    it('resolves false for an incorrect password', async () => {
      await Patient.create(validAttrs);
      const stored = await Patient.findOne({ email: 'jane@example.com' }).select('+passwordHash');

      await expect(stored!.comparePassword('wrong-password')).resolves.toBe(false);
    });

    it('throws a helpful error if passwordHash was not selected', async () => {
      await Patient.create(validAttrs);
      const stored = await Patient.findOne({ email: 'jane@example.com' }); // no .select('+passwordHash')

      await expect(stored!.comparePassword('password123')).rejects.toThrow(/select/i);
    });
  });
});
