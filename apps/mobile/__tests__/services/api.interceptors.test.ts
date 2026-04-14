/**
 * Tests for the api.ts axios instance interceptors.
 *
 * Strategy: we import the real `api` instance and inject a mock adapter via
 * `api.defaults.adapter`. Axios calls the adapter for every request, so the
 * interceptors (which wrap the adapter call) execute normally. This lets us
 * test the token-attachment and 401-refresh logic without making real HTTP
 * requests, and without touching the mockable module boundaries.
 */

import api from '@/services/api';
import * as SecureStore from 'expo-secure-store';

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore> & { __reset: () => void };

/** Build a minimal axios adapter response shape. */
function adapterResponse(
  status: number,
  data: any,
  config: any = {},
): any {
  return { status, data, headers: {}, config, statusText: String(status) };
}

/** Build a minimal axios error that looks like a 401 response error. */
function adapterError(status: number, url: string = '/any'): any {
  const err: any = new Error(`Request failed with status code ${status}`);
  err.isAxiosError = true;
  err.response = { status, data: {}, headers: {} };
  err.config = { url, headers: {}, _retry: false };
  return err;
}

// ─── Request interceptor — Authorization header ───────────────────────────────

describe('api request interceptor — Authorization header', () => {
  let mockAdapter: jest.Mock;

  beforeEach(() => {
    mockSecureStore.__reset();
    mockAdapter = jest.fn().mockResolvedValue(adapterResponse(200, {}));
    api.defaults.adapter = mockAdapter;
  });

  it('adds Bearer token from SecureStore when a token is stored', async () => {
    await SecureStore.setItemAsync('token', 'my-access-token');

    await api.get('/test');

    const requestConfig = mockAdapter.mock.calls[0][0];
    expect(requestConfig.headers?.Authorization).toBe('Bearer my-access-token');
  });

  it('does not add an Authorization header when no token is stored', async () => {
    // No token stored — getItemAsync returns null

    await api.get('/test');

    const requestConfig = mockAdapter.mock.calls[0][0];
    expect(requestConfig.headers?.Authorization).toBeUndefined();
  });
});

// ─── Response interceptor — non-401 pass-through ─────────────────────────────

describe('api response interceptor — non-401 responses', () => {
  let mockAdapter: jest.Mock;

  beforeEach(() => {
    mockSecureStore.__reset();
    mockAdapter = jest.fn();
    api.defaults.adapter = mockAdapter;
  });

  it('passes a 200 response through unchanged', async () => {
    const data = { id: 1, name: 'test' };
    mockAdapter.mockResolvedValueOnce(adapterResponse(200, data));

    const result = await api.get('/data');

    expect(result.data).toEqual(data);
  });

  it('rejects with non-401 errors without attempting a token refresh', async () => {
    const err = adapterError(500);
    mockAdapter.mockRejectedValueOnce(err);

    await expect(api.get('/data')).rejects.toMatchObject({
      response: { status: 500 },
    });

    // Only one adapter call (no refresh attempt)
    expect(mockAdapter).toHaveBeenCalledTimes(1);
  });

  it('rejects 403 errors without attempting a token refresh', async () => {
    mockAdapter.mockRejectedValueOnce(adapterError(403));

    await expect(api.get('/protected')).rejects.toMatchObject({
      response: { status: 403 },
    });

    expect(mockAdapter).toHaveBeenCalledTimes(1);
  });
});

// ─── Response interceptor — 401 on the token endpoint itself ─────────────────

describe('api response interceptor — 401 on /users/token (no refresh loop)', () => {
  let mockAdapter: jest.Mock;

  beforeEach(() => {
    mockSecureStore.__reset();
    mockAdapter = jest.fn();
    api.defaults.adapter = mockAdapter;
  });

  it('does NOT attempt a refresh when the token endpoint itself returns 401', async () => {
    const err = adapterError(401, '/users/token');
    mockAdapter.mockRejectedValueOnce(err);

    await expect(api.post('/users/token', {})).rejects.toMatchObject({
      response: { status: 401 },
    });

    // Must not trigger a second call (refresh attempt would cause infinite loop)
    expect(mockAdapter).toHaveBeenCalledTimes(1);
  });
});

// ─── Response interceptor — 401 triggers token refresh ───────────────────────

describe('api response interceptor — 401 triggers token refresh', () => {
  let mockAdapter: jest.Mock;

  beforeEach(() => {
    mockSecureStore.__reset();
    mockAdapter = jest.fn();
    api.defaults.adapter = mockAdapter;
  });

  it('clears tokens from SecureStore when refresh fails (no refresh token stored)', async () => {
    // 1st call: the original request returns 401
    mockAdapter.mockRejectedValueOnce(adapterError(401, '/data'));
    // 2nd call: the refresh attempt also fails (401 on /users/token/refresh)
    mockAdapter.mockRejectedValueOnce(adapterError(401, '/users/token/refresh'));

    await expect(api.get('/data')).rejects.toBeDefined();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
  });

  it('retries the original request with the new token after a successful refresh', async () => {
    await SecureStore.setItemAsync('refresh_token', 'refresh-xyz');

    // 1st call: original request → 401
    mockAdapter.mockRejectedValueOnce(adapterError(401, '/data'));
    // 2nd call: POST /users/token/refresh → 200 with new tokens
    mockAdapter.mockResolvedValueOnce(
      adapterResponse(200, { access_token: 'new-access', refresh_token: 'new-refresh' }),
    );
    // 3rd call: retried original request → 200
    mockAdapter.mockResolvedValueOnce(adapterResponse(200, { id: 99 }));

    const result = await api.get('/data');

    expect(result.data).toEqual({ id: 99 });
    expect(mockAdapter).toHaveBeenCalledTimes(3);
  });

  it('stores new tokens in SecureStore after a successful refresh', async () => {
    await SecureStore.setItemAsync('refresh_token', 'refresh-xyz');

    mockAdapter.mockRejectedValueOnce(adapterError(401, '/data'));
    mockAdapter.mockResolvedValueOnce(
      adapterResponse(200, { access_token: 'new-access', refresh_token: 'new-refresh' }),
    );
    mockAdapter.mockResolvedValueOnce(adapterResponse(200, {}));

    await api.get('/data');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('token', 'new-access');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('refresh_token', 'new-refresh');
  });
});
