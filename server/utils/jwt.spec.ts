import { describe, it, expect, vi } from 'vitest';
import {
  signSessionToken,
  verifySessionToken,
  decodeSessionToken,
  DEFAULT_JWT_EXPIRY_SECONDS,
} from './jwt';

describe('JWT Session Manager (server/utils/jwt.ts)', () => {
  const mockSecret = 'super-secret-jwt-key-1234567890';
  const mockUserPayload = {
    userId: 'user_123456',
    email: 'magnus@chess.com',
    tier: 'free',
  };

  describe('signSessionToken', () => {
    it('should sign a valid JWT token with default expiration', async () => {
      const token = await signSessionToken(mockUserPayload, mockSecret);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const decoded = decodeSessionToken(token);
      expect(decoded.payload.userId).toBe('user_123456');
      expect(decoded.payload.email).toBe('magnus@chess.com');
      expect(decoded.payload.tier).toBe('free');
      expect(decoded.payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
      expect(decoded.payload.iat).toBeDefined();
    });

    it('should sign a JWT token with custom expiration in seconds', async () => {
      const expiresInSeconds = 3600; // 1 hour
      const nowSeconds = Math.floor(Date.now() / 1000);
      const token = await signSessionToken(mockUserPayload, mockSecret, {
        expiresInSeconds,
      });

      const decoded = decodeSessionToken(token);
      expect(decoded.payload.exp).toBeCloseTo(nowSeconds + expiresInSeconds, -1);
    });

    it('should allow explicitly passing exp timestamp', async () => {
      const explicitExp = Math.floor(Date.now() / 1000) + 1234;
      const token = await signSessionToken(
        { ...mockUserPayload, exp: explicitExp },
        mockSecret
      );

      const decoded = decodeSessionToken(token);
      expect(decoded.payload.exp).toBe(explicitExp);
    });

    it('should throw if secret is missing or empty', async () => {
      await expect(signSessionToken(mockUserPayload, '')).rejects.toThrow(
        'JWT secret is required'
      );
    });

    it('should throw if required payload fields are missing', async () => {
      await expect(
        signSessionToken({ ...mockUserPayload, userId: '' }, mockSecret)
      ).rejects.toThrow('Missing required user payload fields');

      await expect(
        signSessionToken({ ...mockUserPayload, email: '' }, mockSecret)
      ).rejects.toThrow('Missing required user payload fields');

      await expect(
        signSessionToken({ ...mockUserPayload, tier: '' }, mockSecret)
      ).rejects.toThrow('Missing required user payload fields');
    });
  });

  describe('verifySessionToken', () => {
    it('should successfully verify a valid JWT token', async () => {
      const token = await signSessionToken(mockUserPayload, mockSecret);
      const payload = await verifySessionToken(token, mockSecret);

      expect(payload.userId).toBe('user_123456');
      expect(payload.email).toBe('magnus@chess.com');
      expect(payload.tier).toBe('free');
      expect(payload.exp).toBeDefined();
    });

    it('should fail verification if signed with a different secret', async () => {
      const token = await signSessionToken(mockUserPayload, mockSecret);
      const wrongSecret = 'different-secret-key-abcdef';

      await expect(verifySessionToken(token, wrongSecret)).rejects.toThrow(
        /JWT verification failed/
      );
    });

    it('should fail verification if token has expired', async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 100; // expired 100s ago
      const token = await signSessionToken(
        { ...mockUserPayload, exp: pastExp },
        mockSecret
      );

      await expect(verifySessionToken(token, mockSecret)).rejects.toThrow(
        /JWT verification failed/
      );
    });

    it('should fail verification if token is tampered', async () => {
      const token = await signSessionToken(mockUserPayload, mockSecret);
      const parts = token.split('.');
      const tamperedPayload = Buffer.from(
        JSON.stringify({ ...mockUserPayload, tier: 'lifetime' })
      ).toString('base64url');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      await expect(verifySessionToken(tamperedToken, mockSecret)).rejects.toThrow(
        /JWT verification failed/
      );
    });

    it('should throw error if token or secret is empty or invalid', async () => {
      await expect(verifySessionToken('', mockSecret)).rejects.toThrow(
        'Missing or invalid token'
      );
      await expect(verifySessionToken('some.token', '')).rejects.toThrow(
        'JWT secret is required'
      );
    });

    it('should throw error if token payload is missing required claims', async () => {
      const { sign } = await import('hono/jwt');
      const incompleteToken = await sign(
        { userId: 'u123', exp: Math.floor(Date.now() / 1000) + 3600 },
        mockSecret,
        'HS256'
      );
      await expect(verifySessionToken(incompleteToken, mockSecret)).rejects.toThrow(
        'Token payload missing required claims (userId, email, tier, exp)'
      );
    });
  });

  describe('decodeSessionToken', () => {
    it('should decode header and payload without verifying signature', async () => {
      const token = await signSessionToken(mockUserPayload, mockSecret);
      const decoded = decodeSessionToken(token);

      expect(decoded.header).toBeDefined();
      expect(decoded.header.alg).toBe('HS256');
      expect(decoded.payload.userId).toBe('user_123456');
      expect(decoded.payload.email).toBe('magnus@chess.com');
      expect(decoded.payload.tier).toBe('free');
    });

    it('should throw on invalid token format', () => {
      expect(() => decodeSessionToken('')).toThrow('Missing or invalid token');
    });
  });
});
