import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '@/contexts/auth';
import * as SecureStore from 'expo-secure-store';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// expo-secure-store is mocked via __mocks__/expo-secure-store.ts
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore> & {
  __reset: () => void;
};

// Mock the API module so no real HTTP requests are made
jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));
import api from '@/services/api';
const mockApi = api as jest.Mocked<typeof api>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_USER = {
  id: 1,
  email: 'test@example.com',
  username: 'testuser',
  first_name: 'Test',
  last_name: 'User',
  age: 28,
  weight: 165,
  height: 70,
  fitness_goal: 'lose_weight',
  gender: 'male',
};

const MOCK_TOKENS = {
  access_token: 'access-abc',
  refresh_token: 'refresh-xyz',
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

// ─── Session restore on mount ─────────────────────────────────────────────────

describe('AuthProvider — session restore', () => {
  beforeEach(() => {
    mockSecureStore.__reset();
    jest.clearAllMocks();
  });

  it('starts in a loading state before the stored session is checked', () => {
    // Mock get to hang so we can observe the loading state
    mockApi.get.mockImplementation(() => new Promise(() => {}));
    // Simulate a stored token
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('some-token');

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('restores user from a valid stored token', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('valid-token');
    mockApi.get.mockResolvedValueOnce({ data: MOCK_USER });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toEqual(MOCK_USER);
    expect(result.current.token).toBe('valid-token');
  });

  it('clears tokens when the stored token is invalid (API throws)', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('expired-token');
    mockApi.get.mockRejectedValueOnce(new Error('401 Unauthorized'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
  });

  it('sets isLoading to false even when no token is stored', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
  });
});

// ─── login ────────────────────────────────────────────────────────────────────

describe('useAuth — login', () => {
  beforeEach(() => {
    mockSecureStore.__reset();
    jest.clearAllMocks();
    // Suppress session restore for these tests
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
  });

  it('stores tokens and sets user state on successful login', async () => {
    mockApi.post.mockResolvedValueOnce({ data: MOCK_TOKENS });
    mockApi.get.mockResolvedValueOnce({ data: MOCK_USER });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('testuser', 'password123');
    });

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('token', MOCK_TOKENS.access_token);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('refresh_token', MOCK_TOKENS.refresh_token);
    expect(result.current.token).toBe(MOCK_TOKENS.access_token);
    expect(result.current.user).toEqual(MOCK_USER);
  });

  it('sends credentials as URL-encoded form data (OAuth2 spec)', async () => {
    mockApi.post.mockResolvedValueOnce({ data: MOCK_TOKENS });
    mockApi.get.mockResolvedValueOnce({ data: MOCK_USER });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('myuser', 'mypass');
    });

    const [url, body, config] = mockApi.post.mock.calls[0];
    expect(url).toBe('/users/token');
    expect(body).toContain('username=myuser');
    expect(body).toContain('password=mypass');
    expect(config?.headers?.['Content-Type']).toBe('application/x-www-form-urlencoded');
  });

  it('propagates API errors so the caller can display them', async () => {
    mockApi.post.mockRejectedValueOnce(new Error('Invalid credentials'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      act(async () => { await result.current.login('bad', 'creds'); }),
    ).rejects.toThrow('Invalid credentials');

    expect(result.current.user).toBeNull();
  });
});

// ─── register ─────────────────────────────────────────────────────────────────

describe('useAuth — register', () => {
  beforeEach(() => {
    mockSecureStore.__reset();
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
  });

  it('creates account then auto-logs in with the same credentials', async () => {
    mockApi.post
      .mockResolvedValueOnce({ data: {} })          // POST /users/register
      .mockResolvedValueOnce({ data: MOCK_TOKENS }); // POST /users/token (auto-login)
    mockApi.get.mockResolvedValueOnce({ data: MOCK_USER });

    const registerData = {
      email: 'new@example.com',
      username: 'newuser',
      password: 'secret',
    };

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.register(registerData);
    });

    // Should have called register endpoint
    expect(mockApi.post).toHaveBeenCalledWith('/users/register', registerData);
    // And then auto-logged in
    expect(result.current.user).toEqual(MOCK_USER);
    expect(result.current.token).toBe(MOCK_TOKENS.access_token);
  });

  it('propagates registration errors without logging in', async () => {
    mockApi.post.mockRejectedValueOnce(new Error('Email already in use'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      act(async () => {
        await result.current.register({
          email: 'dup@example.com',
          username: 'dup',
          password: 'pass',
        });
      }),
    ).rejects.toThrow('Email already in use');

    expect(result.current.user).toBeNull();
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────

describe('useAuth — logout', () => {
  beforeEach(() => {
    mockSecureStore.__reset();
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
  });

  it('deletes stored tokens and clears in-memory state', async () => {
    // First log in
    mockApi.post.mockResolvedValueOnce({ data: MOCK_TOKENS });
    mockApi.get.mockResolvedValueOnce({ data: MOCK_USER });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('testuser', 'password');
    });
    expect(result.current.user).toEqual(MOCK_USER);

    // Now log out
    await act(async () => {
      await result.current.logout();
    });

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });
});

// ─── updateProfile ────────────────────────────────────────────────────────────

describe('useAuth — updateProfile', () => {
  beforeEach(() => {
    mockSecureStore.__reset();
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
  });

  it('calls PUT /users/me and updates the user state with the server response', async () => {
    // Log in first
    mockApi.post.mockResolvedValueOnce({ data: MOCK_TOKENS });
    mockApi.get.mockResolvedValueOnce({ data: MOCK_USER });

    const updatedUser = { ...MOCK_USER, first_name: 'Updated', weight: 170 };
    mockApi.put.mockResolvedValueOnce({ data: updatedUser });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('testuser', 'password');
    });

    await act(async () => {
      await result.current.updateProfile({ first_name: 'Updated', weight: 170 });
    });

    expect(mockApi.put).toHaveBeenCalledWith('/users/me', {
      first_name: 'Updated',
      weight: 170,
    });
    expect(result.current.user?.first_name).toBe('Updated');
    expect(result.current.user?.weight).toBe(170);
  });

  it('propagates API errors from the update', async () => {
    mockApi.post.mockResolvedValueOnce({ data: MOCK_TOKENS });
    mockApi.get.mockResolvedValueOnce({ data: MOCK_USER });
    mockApi.put.mockRejectedValueOnce(new Error('Validation error'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('testuser', 'password');
    });

    await expect(
      act(async () => {
        await result.current.updateProfile({ age: -1 });
      }),
    ).rejects.toThrow('Validation error');
  });
});

// ─── useAuth guard ────────────────────────────────────────────────────────────

describe('useAuth', () => {
  it('throws a descriptive error when called outside of AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider',
    );
  });
});
