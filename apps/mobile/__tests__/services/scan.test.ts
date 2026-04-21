import { analyzeScan, getScanHistory, type ScanAnalyzeResponse, type ScanHistoryItem } from '@/services/scan';

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

import api from '@/services/api';
const mockedApi = api as jest.Mocked<typeof api>;

// ─── Test doubles ─────────────────────────────────────────────────────────────

/** Intercepts FormData.append calls so we can assert on the arguments. */
let capturedAppendCalls: Array<{ key: string; value: any }> = [];

/** Stub for global fetch. */
const mockFetch = jest.fn();

/** Stub for AbortController.abort so we can verify timeout triggering. */
const mockAbort = jest.fn();

const MOCK_RESPONSE: ScanAnalyzeResponse = {
  session_id: 'abc-123',
  measurements: { waist: 32, chest: 40 },
  body_composition: {
    bmi: 22.5,
    body_fat_percentage: 15.0,
    fat_mass_lbs: 25.0,
    lean_mass_lbs: 145.0,
    waist_to_hip_ratio: 0.82,
  },
  health_assessment: {
    category: 'Normal Weight',
    risk_level: 'Low',
    recommendation: 'Maintain current activity level.',
  },
};

const BASE_PARAMS = {
  baseUrl: 'http://localhost:8000',
  token: 'test-bearer-token',
  front: { uri: 'file://front.jpg' },
  side: { uri: 'file://side.jpg' },
  back: { uri: 'file://back.jpg' },
};

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeAll(() => {
  // Replace global fetch with our stub
  global.fetch = mockFetch;

  // Replace FormData with a spy-able class
  (global as any).FormData = class {
    append(key: string, value: any) {
      capturedAppendCalls.push({ key, value });
    }
  };

  // Replace AbortController with a predictable stub
  (global as any).AbortController = class {
    abort = mockAbort;
    signal = { aborted: false };
  };
});

beforeEach(() => {
  capturedAppendCalls = [];
  jest.useFakeTimers();
  // Default: a successful 200 response
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(MOCK_RESPONSE),
  });
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Network / HTTP behaviour ─────────────────────────────────────────────────

describe('analyzeScan — HTTP behaviour', () => {
  it('sends POST to <baseUrl>/scan/analyze with the Authorization header', async () => {
    await analyzeScan(BASE_PARAMS);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/scan/analyze',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-bearer-token',
          Accept: 'application/json',
        }),
      }),
    );
  });

  it('returns the parsed JSON body on a 200 response', async () => {
    const result = await analyzeScan(BASE_PARAMS);
    expect(result).toEqual(MOCK_RESPONSE);
  });

  it('throws with the server detail message on an HTTP error that has a detail field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ detail: 'Invalid image format' }),
    });

    await expect(analyzeScan(BASE_PARAMS)).rejects.toThrow('Invalid image format');
  });

  it('throws a generic "<status>" message when the error response has no detail', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    await expect(analyzeScan(BASE_PARAMS)).rejects.toThrow('Upload failed (500)');
  });

  it('throws the generic message when the error body is not parseable JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: () => Promise.reject(new Error('SyntaxError')),
    });

    await expect(analyzeScan(BASE_PARAMS)).rejects.toThrow('Upload failed (503)');
  });
});

// ─── Error wrapping ───────────────────────────────────────────────────────────

describe('analyzeScan — error wrapping', () => {
  it('throws a user-friendly timeout message when fetch is aborted (AbortError)', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValueOnce(abortError);

    await expect(analyzeScan(BASE_PARAMS)).rejects.toThrow(
      'Scan timed out — the server took too long to respond.',
    );
  });

  it('wraps generic network failures with a descriptive "Network error" message', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

    await expect(analyzeScan(BASE_PARAMS)).rejects.toThrow('Network error');
  });

  it('appends the original network error message for diagnostics', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

    await expect(analyzeScan(BASE_PARAMS)).rejects.toThrow('Failed to fetch');
  });
});

// ─── FormData construction ────────────────────────────────────────────────────

describe('analyzeScan — image field construction', () => {
  it('appends front, side, and back fields in that order', async () => {
    await analyzeScan(BASE_PARAMS);

    const keys = capturedAppendCalls.map((c) => c.key);
    expect(keys).toEqual(['front', 'side', 'back']);
  });

  it('uses the explicitly provided mimeType when available', async () => {
    await analyzeScan({
      ...BASE_PARAMS,
      front: { uri: 'file://photo.jpg', mimeType: 'image/png' },
    });

    const frontCall = capturedAppendCalls.find((c) => c.key === 'front')!;
    expect(frontCall.value.type).toBe('image/png');
  });

  it('infers image/png for a .png URI when no mimeType is provided', async () => {
    await analyzeScan({
      ...BASE_PARAMS,
      front: { uri: 'file://photo.png' },
    });

    const frontCall = capturedAppendCalls.find((c) => c.key === 'front')!;
    expect(frontCall.value.type).toBe('image/png');
  });

  it('defaults to image/jpeg for non-png extensions when no mimeType is provided', async () => {
    for (const ext of ['jpg', 'jpeg', 'heic', 'heif', 'bmp', 'tiff']) {
      capturedAppendCalls = [];
      await analyzeScan({
        ...BASE_PARAMS,
        front: { uri: `file://photo.${ext}` },
      });

      const frontCall = capturedAppendCalls.find((c) => c.key === 'front')!;
      expect(frontCall.value.type).toBe('image/jpeg');
    }
  });

  it('uses the explicit fileName when provided instead of generating one', async () => {
    await analyzeScan({
      ...BASE_PARAMS,
      front: { uri: 'file://photo.jpg', fileName: 'custom-name.jpg' },
    });

    const frontCall = capturedAppendCalls.find((c) => c.key === 'front')!;
    expect(frontCall.value.name).toBe('custom-name.jpg');
  });

  it('generates a filename like "<view>.<ext>" for known extensions', async () => {
    await analyzeScan({
      ...BASE_PARAMS,
      front: { uri: 'file://some-path/image.heic' },
      side: { uri: 'file://some-path/image.png' },
      back: { uri: 'file://some-path/image.jpeg' },
    });

    const [frontCall, sideCall, backCall] = capturedAppendCalls;
    expect(frontCall.value.name).toBe('front.heic');
    expect(sideCall.value.name).toBe('side.png');
    expect(backCall.value.name).toBe('back.jpeg');
  });

  it('falls back to .jpg in the generated filename for unknown extensions', async () => {
    await analyzeScan({
      ...BASE_PARAMS,
      front: { uri: 'file://photo.bmp' },
    });

    const frontCall = capturedAppendCalls.find((c) => c.key === 'front')!;
    expect(frontCall.value.name).toBe('front.jpg');
  });
});

// ─── getScanHistory ───────────────────────────────────────────────────────────

const MOCK_HISTORY: ScanHistoryItem[] = [
  {
    session_id: 'aaa-111',
    created_at: '2026-04-20T10:00:00Z',
    health_category: 'Fit',
    health_risk_level: 'low',
    body_fat_percentage: 14.0,
    bmi: 22.5,
  },
  {
    session_id: 'bbb-222',
    created_at: '2026-03-15T09:00:00Z',
    health_category: 'Acceptable',
    health_risk_level: 'moderate',
    body_fat_percentage: 22.0,
    bmi: 25.1,
  },
];

describe('getScanHistory', () => {
  it('calls GET /scan/history and returns the response data', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: MOCK_HISTORY });

    const result = await getScanHistory();

    expect(mockedApi.get).toHaveBeenCalledWith('/scan/history');
    expect(result).toEqual(MOCK_HISTORY);
  });

  it('returns an empty array when the server returns no scans', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] });

    const result = await getScanHistory();

    expect(result).toEqual([]);
  });

  it('propagates errors thrown by the API client', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network error'));

    await expect(getScanHistory()).rejects.toThrow('Network error');
  });
});
