import { renderHook } from '@testing-library/react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors } from '@/constants/theme';

/**
 * useColorScheme is provided by React Native. jest-expo auto-mocks it to
 * return null, which causes useThemeColor to default to 'light'.
 * We explicitly control the return value here.
 */
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn(),
}));
import { useColorScheme } from '@/hooks/use-color-scheme';
const mockUseColorScheme = useColorScheme as jest.MockedFunction<typeof useColorScheme>;

// ─── Light mode ───────────────────────────────────────────────────────────────

describe('useThemeColor — light mode', () => {
  beforeEach(() => {
    mockUseColorScheme.mockReturnValue('light');
  });

  it('returns the light prop value when provided', () => {
    const { result } = renderHook(() =>
      useThemeColor({ light: '#FF0000', dark: '#00FF00' }, 'text'),
    );
    expect(result.current).toBe('#FF0000');
  });

  it('falls back to Colors.light[colorName] when no light prop is given', () => {
    const { result } = renderHook(() =>
      useThemeColor({}, 'text'),
    );
    expect(result.current).toBe(Colors.light.text);
  });

  it('falls back to Colors.light[colorName] when light prop is undefined', () => {
    const { result } = renderHook(() =>
      useThemeColor({ dark: '#00FF00' }, 'background'),
    );
    expect(result.current).toBe(Colors.light.background);
  });

  it('returns correct tint color from theme', () => {
    const { result } = renderHook(() =>
      useThemeColor({}, 'tint'),
    );
    expect(result.current).toBe(Colors.light.tint);
  });
});

// ─── Dark mode ────────────────────────────────────────────────────────────────

describe('useThemeColor — dark mode', () => {
  beforeEach(() => {
    mockUseColorScheme.mockReturnValue('dark');
  });

  it('returns the dark prop value when provided', () => {
    const { result } = renderHook(() =>
      useThemeColor({ light: '#FF0000', dark: '#00FF00' }, 'text'),
    );
    expect(result.current).toBe('#00FF00');
  });

  it('falls back to Colors.dark[colorName] when no dark prop is given', () => {
    const { result } = renderHook(() =>
      useThemeColor({}, 'text'),
    );
    expect(result.current).toBe(Colors.dark.text);
  });

  it('falls back to Colors.dark[colorName] when dark prop is undefined', () => {
    const { result } = renderHook(() =>
      useThemeColor({ light: '#FF0000' }, 'surface'),
    );
    expect(result.current).toBe(Colors.dark.surface);
  });
});

// ─── Null / missing scheme ────────────────────────────────────────────────────

describe('useThemeColor — null color scheme (defaults to light)', () => {
  beforeEach(() => {
    mockUseColorScheme.mockReturnValue(null);
  });

  it('defaults to light theme when useColorScheme returns null', () => {
    const { result } = renderHook(() =>
      useThemeColor({}, 'text'),
    );
    // null ?? 'light' → Colors.light.text
    expect(result.current).toBe(Colors.light.text);
  });

  it('prefers the light prop over the Colors fallback when scheme is null', () => {
    const { result } = renderHook(() =>
      useThemeColor({ light: '#CUSTOM' }, 'text'),
    );
    expect(result.current).toBe('#CUSTOM');
  });
});

// ─── All color keys are reachable ─────────────────────────────────────────────

describe('useThemeColor — covers all Colors keys', () => {
  it('returns a non-empty string for every key in Colors.light', () => {
    mockUseColorScheme.mockReturnValue('light');

    (Object.keys(Colors.light) as Array<keyof typeof Colors.light>).forEach((key) => {
      const { result } = renderHook(() => useThemeColor({}, key));
      expect(typeof result.current).toBe('string');
      expect(result.current.length).toBeGreaterThan(0);
    });
  });

  it('returns a non-empty string for every key in Colors.dark', () => {
    mockUseColorScheme.mockReturnValue('dark');

    (Object.keys(Colors.dark) as Array<keyof typeof Colors.dark>).forEach((key) => {
      const { result } = renderHook(() => useThemeColor({}, key));
      expect(typeof result.current).toBe('string');
      expect(result.current.length).toBeGreaterThan(0);
    });
  });
});
