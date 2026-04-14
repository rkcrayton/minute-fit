import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { analyzeScan } from '@/services/scan';
import { useAuth } from '@/contexts/auth';
import { useScanCapture, STEPS } from '@/hooks/use-scan-capture';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/contexts/auth', () => ({
  useAuth: jest.fn(() => ({ token: 'test-token' })),
}));

jest.mock('@/services/scan', () => ({
  analyzeScan: jest.fn(),
}));

jest.mock('@/services/api', () => ({
  getBaseURL: jest.fn(() => 'http://localhost:8000'),
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

// ─── Typed references ─────────────────────────────────────────────────────────

const mockImagePicker = ImagePicker as jest.Mocked<typeof ImagePicker>;
const mockAnalyzeScan = analyzeScan as jest.Mock;
const mockRouter = router as { push: jest.Mock };
const mockUseAuth = useAuth as jest.Mock;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_ASSET = {
  uri: 'file:///photos/front.jpg',
  fileName: 'front.jpg',
  mimeType: 'image/jpeg',
  fileSize: 1024 * 1024, // 1 MB
};

const MOCK_SCAN_RESPONSE = {
  session_id: 'abc-123',
  measurements: { waist: 32 },
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function grantAllPerms() {
  mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
  mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
}

function denyPerms() {
  mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ status: 'denied' } as any);
  mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'denied' } as any);
}

async function populateAllPhotos(result: ReturnType<typeof renderHook<ReturnType<typeof useScanCapture>, unknown>>['result']) {
  grantAllPerms();
  mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
    canceled: false,
    assets: [VALID_ASSET],
  } as any);

  // step 0 → front
  await act(async () => { await result.current.pickImage(false); });
  act(() => { result.current.goToStep(1); });

  // step 1 → side
  await act(async () => { await result.current.pickImage(false); });
  act(() => { result.current.goToStep(2); });

  // step 2 → back
  await act(async () => { await result.current.pickImage(false); });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ token: 'test-token' });
});

// ─── Initial state ────────────────────────────────────────────────────────────

describe('useScanCapture — initial state', () => {
  it('starts with step 0, no photos, not loading, and Next disabled', () => {
    const { result } = renderHook(() => useScanCapture());

    expect(result.current.step).toBe(0);
    expect(result.current.photos).toEqual({ front: null, side: null, back: null });
    expect(result.current.loading).toBe(false);
    expect(result.current.isLastStep).toBe(false);
    expect(result.current.allDone).toBe(false);
    expect(result.current.nextDisabled).toBe(true);
    expect(result.current.currentStep).toEqual(STEPS[0]);
    expect(result.current.currentPhoto).toBeNull();
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

describe('useScanCapture — goToStep', () => {
  it('jumps to the specified step and updates derived state', () => {
    const { result } = renderHook(() => useScanCapture());

    act(() => { result.current.goToStep(2); });

    expect(result.current.step).toBe(2);
    expect(result.current.currentStep).toEqual(STEPS[2]);
    expect(result.current.isLastStep).toBe(true);
  });
});

// ─── clearPhoto ───────────────────────────────────────────────────────────────

describe('useScanCapture — clearPhoto', () => {
  it('sets the current step photo back to null', async () => {
    const { result } = renderHook(() => useScanCapture());

    grantAllPerms();
    mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [VALID_ASSET],
    } as any);

    await act(async () => { await result.current.pickImage(false); });
    expect(result.current.photos.front).not.toBeNull();

    act(() => { result.current.clearPhoto(); });
    expect(result.current.photos.front).toBeNull();
  });
});

// ─── validateAsset (via pickImage) ────────────────────────────────────────────

describe('useScanCapture — validateAsset', () => {
  it('shows an alert and does not store an oversized photo', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { result } = renderHook(() => useScanCapture());

    grantAllPerms();
    mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ ...VALID_ASSET, fileSize: 25 * 1024 * 1024 }],
    } as any);

    await act(async () => { await result.current.pickImage(false); });

    expect(alertSpy).toHaveBeenCalledWith('Invalid photo', expect.stringContaining('too large'));
    expect(result.current.photos.front).toBeNull();
  });

  it('shows an alert and does not store a photo with a disallowed MIME type', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { result } = renderHook(() => useScanCapture());

    grantAllPerms();
    mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ ...VALID_ASSET, fileSize: 1024, mimeType: 'image/gif' }],
    } as any);

    await act(async () => { await result.current.pickImage(false); });

    expect(alertSpy).toHaveBeenCalledWith('Invalid photo', expect.stringContaining('Invalid file type'));
    expect(result.current.photos.front).toBeNull();
  });
});

// ─── pickImage ────────────────────────────────────────────────────────────────

describe('useScanCapture — pickImage', () => {
  it('shows a permissions alert and does not update photos when permissions are denied', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { result } = renderHook(() => useScanCapture());

    denyPerms();

    await act(async () => { await result.current.pickImage(true); });

    expect(alertSpy).toHaveBeenCalledWith('Permissions needed', expect.any(String));
    expect(result.current.photos).toEqual({ front: null, side: null, back: null });
  });

  it('does not update photos or show an alert when the picker is canceled', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { result } = renderHook(() => useScanCapture());

    grantAllPerms();
    mockImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: true } as any);

    await act(async () => { await result.current.pickImage(false); });

    expect(alertSpy).not.toHaveBeenCalled();
    expect(result.current.photos.front).toBeNull();
  });

  it('stores the photo for the current step on a valid camera pick', async () => {
    const { result } = renderHook(() => useScanCapture());

    grantAllPerms();
    mockImagePicker.launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [VALID_ASSET],
    } as any);

    await act(async () => { await result.current.pickImage(true); });

    expect(result.current.photos.front).toEqual({
      uri: VALID_ASSET.uri,
      fileName: VALID_ASSET.fileName,
      mimeType: VALID_ASSET.mimeType,
      fileSize: VALID_ASSET.fileSize,
    });
  });
});

// ─── handleNext ───────────────────────────────────────────────────────────────

describe('useScanCapture — handleNext', () => {
  it('increments the step when not on the last step', async () => {
    const { result } = renderHook(() => useScanCapture());

    grantAllPerms();
    mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [VALID_ASSET],
    } as any);
    await act(async () => { await result.current.pickImage(false); });

    act(() => { result.current.handleNext(); });

    expect(result.current.step).toBe(1);
  });

  it('calls analyzeScan when on the last step with all photos done', async () => {
    mockAnalyzeScan.mockResolvedValue(MOCK_SCAN_RESPONSE);
    const { result } = renderHook(() => useScanCapture());

    await populateAllPhotos(result);

    await act(async () => { result.current.handleNext(); });

    await waitFor(() => expect(mockAnalyzeScan).toHaveBeenCalledTimes(1));
  });
});

// ─── handleAnalyze ────────────────────────────────────────────────────────────

describe('useScanCapture — handleAnalyze', () => {
  it('does not call analyzeScan when there is no token', async () => {
    mockUseAuth.mockReturnValue({ token: null });
    const { result } = renderHook(() => useScanCapture());

    await populateAllPhotos(result);

    await act(async () => { result.current.handleNext(); });

    expect(mockAnalyzeScan).not.toHaveBeenCalled();
  });

  it('navigates to the results screen with the session ID on success', async () => {
    mockAnalyzeScan.mockResolvedValue(MOCK_SCAN_RESPONSE);
    const { result } = renderHook(() => useScanCapture());

    await populateAllPhotos(result);

    await act(async () => { result.current.handleNext(); });

    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/(tabs)/scan/results',
        params: { sessionId: MOCK_SCAN_RESPONSE.session_id },
      }),
    );
  });

  it('shows an alert and resets loading on failure', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    mockAnalyzeScan.mockRejectedValue(new Error('Server error'));
    const { result } = renderHook(() => useScanCapture());

    await populateAllPhotos(result);

    await act(async () => { result.current.handleNext(); });

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('Scan failed', 'Server error'),
    );
    expect(result.current.loading).toBe(false);
  });

  it('sets loading to true while the request is in-flight and false after', async () => {
    let resolveAnalyze!: (v: any) => void;
    mockAnalyzeScan.mockReturnValue(new Promise((res) => { resolveAnalyze = res; }));
    const { result } = renderHook(() => useScanCapture());

    await populateAllPhotos(result);

    // Fire without awaiting so we can observe the loading state
    act(() => { result.current.handleNext(); });

    await waitFor(() => expect(result.current.loading).toBe(true));

    act(() => { resolveAnalyze(MOCK_SCAN_RESPONSE); });

    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});
