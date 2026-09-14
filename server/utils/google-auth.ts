export interface GoogleUserClaims {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  emailVerified: boolean;
}

export interface VerifyGoogleTokenOptions {
  clientId?: string;
}

/**
 * Verifies a Google OAuth ID token using Google's tokeninfo endpoint.
 * Extracts user claims including sub (Google ID), email, name, and picture.
 */
export async function verifyGoogleToken(
  idToken: string,
  options?: VerifyGoogleTokenOptions
): Promise<GoogleUserClaims> {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Missing or invalid ID token');
  }

  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Google token verification failed: ${response.status} ${errorBody}`.trim());
  }

  const data = (await response.json()) as {
    sub?: string;
    email?: string;
    email_verified?: string | boolean;
    name?: string;
    picture?: string;
    aud?: string;
    exp?: string | number;
    error_description?: string;
  };

  if (!data.sub || !data.email) {
    throw new Error('Google token missing required claims (sub or email)');
  }

  if (options?.clientId && data.aud !== options.clientId) {
    throw new Error(`Token audience mismatch: expected ${options.clientId}, got ${data.aud}`);
  }

  const emailVerified =
    data.email_verified === true || data.email_verified === 'true';

  return {
    sub: data.sub,
    email: data.email,
    name: data.name,
    picture: data.picture,
    emailVerified,
  };
}
