import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyGoogleToken } from './google-auth';

describe('verifyGoogleToken', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('throws error when idToken is missing or not a string', async () => {
    await expect(verifyGoogleToken('')).rejects.toThrow('Missing or invalid ID token');
    await expect(verifyGoogleToken(null as unknown as string)).rejects.toThrow('Missing or invalid ID token');
  });

  it('successfully verifies token and returns user claims', async () => {
    const mockClaims = {
      sub: 'google-user-12345',
      email: 'player@example.com',
      email_verified: 'true',
      name: 'Grandmaster Kasparov',
      picture: 'https://example.com/avatar.jpg',
      aud: 'my-google-client-id.apps.googleusercontent.com',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockClaims,
    });

    const result = await verifyGoogleToken('valid-id-token', {
      clientId: 'my-google-client-id.apps.googleusercontent.com',
    });

    expect(result).toEqual({
      sub: 'google-user-12345',
      email: 'player@example.com',
      name: 'Grandmaster Kasparov',
      picture: 'https://example.com/avatar.jpg',
      emailVerified: true,
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/tokeninfo?id_token=valid-id-token',
      expect.objectContaining({
        method: 'GET',
        headers: { Accept: 'application/json' },
      })
    );
  });

  it('handles boolean email_verified properly', async () => {
    const mockClaims = {
      sub: 'google-user-12345',
      email: 'player@example.com',
      email_verified: true,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockClaims,
    });

    const result = await verifyGoogleToken('valid-id-token');
    expect(result.emailVerified).toBe(true);
  });

  it('handles false email_verified properly', async () => {
    const mockClaims = {
      sub: 'google-user-12345',
      email: 'unverified@example.com',
      email_verified: 'false',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockClaims,
    });

    const result = await verifyGoogleToken('valid-id-token');
    expect(result.emailVerified).toBe(false);
  });

  it('throws error when Google returns non-OK response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => '{"error": "invalid_token", "error_description": "Invalid Value"}',
    });

    await expect(verifyGoogleToken('bad-token')).rejects.toThrow(
      'Google token verification failed: 400 {"error": "invalid_token", "error_description": "Invalid Value"}'
    );
  });

  it('throws error when required claims (sub or email) are missing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ name: 'No Sub or Email' }),
    });

    await expect(verifyGoogleToken('incomplete-token')).rejects.toThrow(
      'Google token missing required claims (sub or email)'
    );
  });

  it('throws error when client ID mismatch occurs', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sub: 'google-user-12345',
        email: 'player@example.com',
        aud: 'wrong-client-id',
      }),
    });

    await expect(
      verifyGoogleToken('valid-token', { clientId: 'expected-client-id' })
    ).rejects.toThrow(
      'Token audience mismatch: expected expected-client-id, got wrong-client-id'
    );
  });
});
