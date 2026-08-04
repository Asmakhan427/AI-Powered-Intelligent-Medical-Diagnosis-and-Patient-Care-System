import bcrypt from 'bcrypt';
import { query } from '../../config/db';
import { verifyAccessToken, verifyRefreshToken } from '../../utils/token.util';
import * as authService from '../../services/auth.service';

jest.mock('../../config/db', () => ({ query: jest.fn() }));
jest.mock('bcrypt');

const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

function queryResult<T>(rows: T[]) {
  return { rows, rowCount: rows.length, command: '', oid: 0, fields: [] } as never;
}

describe('auth.service', () => {
  describe('registerPatient', () => {
    const input = { name: 'Jane Doe', email: 'jane@example.com', password: 'password1' };

    it('creates a new patient and returns a token pair', async () => {
      mockedQuery.mockResolvedValueOnce(queryResult([{ count: '0' }])); // duplicate-email check
      mockedBcrypt.hash.mockResolvedValueOnce('hashed-password' as never);
      mockedQuery.mockResolvedValueOnce(queryResult([{ patientid: 42 }])); // insert

      const result = await authService.registerPatient(input);

      expect(result.patientId).toBe(42);
      expect(result.user).toEqual({
        id: 42,
        name: input.name,
        email: input.email,
        role: 'patient',
      });
      expect(result.tokens.accessToken).toEqual(expect.any(String));
      expect(result.tokens.refreshToken).toEqual(expect.any(String));

      const insertCall = mockedQuery.mock.calls[1];
      expect(insertCall[0]).toMatch(/INSERT INTO Patient/);
      expect(insertCall[1]).toEqual([input.name, input.email, null, 'hashed-password', null, null]);
    });

    it('rejects registration when the email is already taken', async () => {
      mockedQuery.mockResolvedValueOnce(queryResult([{ count: '1' }]));

      await expect(authService.registerPatient(input)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Email already registered',
      });
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
    });
  });

  describe('loginUser', () => {
    const dbRow = {
      patientid: 7,
      name: 'Jane Doe',
      email: 'jane@example.com',
      password_hash: 'hashed',
      is_active: true,
    };

    it('logs in with correct credentials', async () => {
      mockedQuery.mockResolvedValueOnce(queryResult([dbRow]));
      mockedBcrypt.compare.mockResolvedValueOnce(true as never);

      const result = await authService.loginUser('jane@example.com', 'password1', 'patient');

      expect(result).toMatchObject({ userId: 7, name: 'Jane Doe', role: 'patient' });
      expect(result.tokens.accessToken).toEqual(expect.any(String));
    });

    it('rejects an unknown email', async () => {
      mockedQuery.mockResolvedValueOnce(queryResult([]));

      await expect(
        authService.loginUser('nobody@example.com', 'x', 'patient')
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid credentials',
      });
    });

    it('rejects an incorrect password without revealing which part was wrong', async () => {
      mockedQuery.mockResolvedValueOnce(queryResult([dbRow]));
      mockedBcrypt.compare.mockResolvedValueOnce(false as never);

      await expect(
        authService.loginUser('jane@example.com', 'wrong', 'patient')
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid credentials',
      });
    });

    it('rejects a deactivated account even with correct credentials', async () => {
      mockedQuery.mockResolvedValueOnce(queryResult([{ ...dbRow, is_active: false }]));

      await expect(
        authService.loginUser('jane@example.com', 'password1', 'patient')
      ).rejects.toMatchObject({
        statusCode: 403,
      });
      // Never even gets to comparing the password once we know the account is deactivated.
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('queries the Doctor table for role="doctor"', async () => {
      mockedQuery.mockResolvedValueOnce(queryResult([{ ...dbRow, doctorid: 3 }]));
      mockedBcrypt.compare.mockResolvedValueOnce(true as never);

      await authService.loginUser('jane@example.com', 'password1', 'doctor');

      expect(mockedQuery.mock.calls[0][0]).toMatch(/FROM Doctor/);
    });
  });

  describe('guestLogin', () => {
    it('issues a guest identity with a valid token pair and no DB access', () => {
      const result = authService.guestLogin();

      expect(result.role).toBe('guest');
      expect(result.guestId).toMatch(/^GUEST_[0-9a-f]{8}$/);
      expect(mockedQuery).not.toHaveBeenCalled();

      const payload = verifyAccessToken(result.tokens.accessToken);
      expect(payload.role).toBe('guest');
      expect(payload.id).toBe(result.guestId);
    });
  });

  describe('token generation', () => {
    it('issues an access token and a refresh token that verify back to the same identity', () => {
      const { tokens } = authService.guestLogin();

      const accessPayload = verifyAccessToken(tokens.accessToken);
      const refreshPayload = verifyRefreshToken(tokens.refreshToken);

      expect(accessPayload.type).toBe('access');
      expect(refreshPayload.type).toBe('refresh');
      expect(accessPayload.id).toBe(refreshPayload.id);
    });

    it('rejects a tampered token', () => {
      const { tokens } = authService.guestLogin();
      const tampered = tokens.accessToken.slice(0, -2) + 'xx';

      expect(() => verifyAccessToken(tampered)).toThrow();
    });
  });
});
