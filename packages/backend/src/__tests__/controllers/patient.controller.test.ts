import express from 'express';
import request from 'supertest';
import { query } from '../../config/db';
import { errorHandler, notFoundHandler } from '../../middleware/errorHandler.middleware';
import patientRoutes from '../../routes/patient.routes';

jest.mock('../../config/db', () => ({ query: jest.fn() }));

// The real `authenticate`/`authorize` verify a signed JWT — for a
// controller-level test we only care that *a* patient is attached to
// `req.user`, so the auth layer itself is mocked rather than minting a
// real token per request.
jest.mock('../../middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = { id: 42, role: 'patient', email: 'jane@example.com', name: 'Jane Doe' };
    next();
  },
  authorize: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
}));

const mockedQuery = query as jest.MockedFunction<typeof query>;

function queryResult<T>(rows: T[]) {
  return { rows, rowCount: rows.length, command: '', oid: 0, fields: [] } as never;
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/patient', patientRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe('patient.controller (via /api/v1/patient routes)', () => {
  const app = buildApp();

  describe('GET /profile', () => {
    it('returns the authenticated patient profile', async () => {
      mockedQuery.mockResolvedValueOnce(
        queryResult([{ patientid: 42, name: 'Jane Doe', email: 'jane@example.com', phone: null }])
      );

      const res = await request(app).get('/api/v1/patient/profile');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        profile: { patientid: 42, name: 'Jane Doe', email: 'jane@example.com', phone: null },
      });
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM Patient WHERE patientID = $1'),
        [42]
      );
    });

    it('404s when the patient row is missing', async () => {
      mockedQuery.mockResolvedValueOnce(queryResult([]));

      const res = await request(app).get('/api/v1/patient/profile');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ success: false, error: 'Patient not found' });
    });
  });

  describe('PUT /profile', () => {
    it('updates only the provided fields', async () => {
      mockedQuery.mockResolvedValueOnce(
        queryResult([{ patientid: 42, name: 'Jane Smith', email: 'jane@example.com', phone: null }])
      );

      const res = await request(app).put('/api/v1/patient/profile').send({ name: 'Jane Smith' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Profile updated successfully');
      expect(mockedQuery).toHaveBeenCalledWith(expect.stringContaining('SET name = $1'), [
        'Jane Smith',
        42,
      ]);
    });

    it('rejects an update with no fields (validation)', async () => {
      const res = await request(app).put('/api/v1/patient/profile').send({});

      expect(res.status).toBe(400);
      expect(mockedQuery).not.toHaveBeenCalled();
    });
  });

  describe('GET /history', () => {
    it('aggregates patient, history, reports, and appointments', async () => {
      mockedQuery
        .mockResolvedValueOnce(
          queryResult([{ patientid: 42, name: 'Jane Doe', email: 'jane@example.com', phone: null }])
        )
        .mockResolvedValueOnce(
          queryResult([{ historyid: 1, history_text: 'Note', recorded_date: '2026-07-01' }])
        )
        .mockResolvedValueOnce(queryResult([]))
        .mockResolvedValueOnce(queryResult([]));

      const res = await request(app).get('/api/v1/patient/history');

      expect(res.status).toBe(200);
      expect(res.body.patient.patientid).toBe(42);
      expect(res.body.history).toHaveLength(1);
      expect(res.body.reports).toEqual([]);
      expect(res.body.appointments).toEqual([]);
    });
  });

  describe('GET /reports', () => {
    it('returns the reports list', async () => {
      mockedQuery.mockResolvedValueOnce(
        queryResult([{ reportid: 1, ai_diagnosis: 'Migraine', status: 'PENDING' }])
      );

      const res = await request(app).get('/api/v1/patient/reports');

      expect(res.status).toBe(200);
      expect(res.body.reports).toHaveLength(1);
      expect(res.body.reports[0].ai_diagnosis).toBe('Migraine');
    });

    it('propagates a database error as a 500 through the shared error handler', async () => {
      mockedQuery.mockRejectedValueOnce(new Error('connection reset'));

      const res = await request(app).get('/api/v1/patient/reports');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
});
