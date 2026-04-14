import { getTodayWaterSummary, createWaterLog } from '@/services/water';

// Mock the shared axios instance so no real HTTP calls occur.
// We only mock the methods used; the interceptor logic is tested in api.test.ts.
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import api from '@/services/api';
const mockedApi = api as jest.Mocked<typeof api>;

// ─── getTodayWaterSummary ─────────────────────────────────────────────────────

describe('getTodayWaterSummary', () => {
  it('calls GET /water/today and returns the response data', async () => {
    const payload = { total_oz: 48, goal_oz: 64 };
    mockedApi.get.mockResolvedValueOnce({ data: payload });

    const result = await getTodayWaterSummary();

    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(mockedApi.get).toHaveBeenCalledWith('/water/today');
    expect(result).toEqual(payload);
  });

  it('propagates network errors thrown by the API client', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'));

    await expect(getTodayWaterSummary()).rejects.toThrow('Network Error');
  });

  it('returns data even when total_oz is 0 (user has logged nothing yet)', async () => {
    const payload = { total_oz: 0, goal_oz: 64 };
    mockedApi.get.mockResolvedValueOnce({ data: payload });

    const result = await getTodayWaterSummary();

    expect(result.total_oz).toBe(0);
    expect(result.goal_oz).toBe(64);
  });
});

// ─── createWaterLog ───────────────────────────────────────────────────────────

describe('createWaterLog', () => {
  it('calls POST /water/logs with the provided payload and returns response data', async () => {
    const payload = { amount_oz: 16 };
    const serverResponse = { id: 42, amount_oz: 16, logged_at: '2024-01-15T10:00:00Z' };
    mockedApi.post.mockResolvedValueOnce({ data: serverResponse });

    const result = await createWaterLog(payload);

    expect(mockedApi.post).toHaveBeenCalledTimes(1);
    expect(mockedApi.post).toHaveBeenCalledWith('/water/logs', payload);
    expect(result).toEqual(serverResponse);
  });

  it('forwards the optional logged_at timestamp in the payload', async () => {
    const payload = { amount_oz: 8, logged_at: '2024-01-15T08:30:00Z' };
    mockedApi.post.mockResolvedValueOnce({ data: {} });

    await createWaterLog(payload);

    expect(mockedApi.post).toHaveBeenCalledWith('/water/logs', payload);
  });

  it('propagates server errors (e.g., 422 Unprocessable Entity)', async () => {
    const serverError = Object.assign(new Error('Request failed with status code 422'), {
      response: { status: 422, data: { detail: 'amount_oz must be positive' } },
    });
    mockedApi.post.mockRejectedValueOnce(serverError);

    await expect(createWaterLog({ amount_oz: -5 })).rejects.toThrow(
      'Request failed with status code 422',
    );
  });

  it('propagates network errors when the server is unreachable', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('Network Error'));

    await expect(createWaterLog({ amount_oz: 8 })).rejects.toThrow('Network Error');
  });
});
