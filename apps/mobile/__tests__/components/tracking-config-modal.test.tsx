import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import TrackingConfigModal from '@/components/tracking/tracking-config-modal';
import { TrackingPreferencesProvider } from '@/contexts/tracking-preferences';
import { ALL_STATS, MAX_SELECTED_STATS, DEFAULT_STAT_IDS } from '@/constants/tracking-stats';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// ─── Wrapper ──────────────────────────────────────────────────────────────────

/**
 * TrackingConfigModal reads & writes to the TrackingPreferencesContext.
 * We always wrap in the provider so state flows correctly.
 */
function renderModal(props: { visible?: boolean; onClose?: () => void } = {}) {
  const { visible = true, onClose = jest.fn() } = props;
  return render(
    <TrackingPreferencesProvider>
      <TrackingConfigModal visible={visible} onClose={onClose} />
    </TrackingPreferencesProvider>,
  );
}

// ─── Content rendering ────────────────────────────────────────────────────────

describe('TrackingConfigModal — content rendering', () => {
  beforeEach(() => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(null); // use defaults
  });

  it('renders the sheet title when visible', () => {
    renderModal();
    expect(screen.getByText('Daily Tracking')).toBeTruthy();
  });

  it('renders all stat titles from ALL_STATS', () => {
    renderModal();
    ALL_STATS.forEach((stat) => {
      expect(screen.getByText(stat.title)).toBeTruthy();
    });
  });

  it('renders all stat descriptions', () => {
    renderModal();
    ALL_STATS.forEach((stat) => {
      expect(screen.getByText(stat.description)).toBeTruthy();
    });
  });

  it('renders Save Changes and Cancel buttons', () => {
    renderModal();
    expect(screen.getByText('Save Changes')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it(`shows the counter as "${DEFAULT_STAT_IDS.length} / ${MAX_SELECTED_STATS}" with default selection`, () => {
    renderModal();
    expect(
      screen.getByText(`${DEFAULT_STAT_IDS.length} / ${MAX_SELECTED_STATS}`),
    ).toBeTruthy();
  });
});

// ─── Toggle behaviour ─────────────────────────────────────────────────────────

describe('TrackingConfigModal — toggle behaviour', () => {
  beforeEach(() => {
    // Start with no selections stored so we use DEFAULT_STAT_IDS
    mockAsyncStorage.getItem.mockResolvedValueOnce(null);
  });

  it('does not crash when visible=false', () => {
    expect(() => renderModal({ visible: false })).not.toThrow();
  });
});

// ─── Save and Cancel ──────────────────────────────────────────────────────────

describe('TrackingConfigModal — Save Changes', () => {
  beforeEach(() => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(null);
  });

  it('calls onClose when Save Changes is pressed', () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    fireEvent.press(screen.getByText('Save Changes'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('persists to AsyncStorage when Save Changes is pressed', () => {
    renderModal();
    fireEvent.press(screen.getByText('Save Changes'));
    // The context's save() calls AsyncStorage.setItem
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'tracking_preferences',
      expect.any(String),
    );
  });

  it('saves the default selection (no toggles) correctly', () => {
    renderModal();
    fireEvent.press(screen.getByText('Save Changes'));

    const setItemCall = mockAsyncStorage.setItem.mock.calls[0];
    const saved = JSON.parse(setItemCall[1]);
    expect(saved).toEqual(DEFAULT_STAT_IDS);
  });
});

describe('TrackingConfigModal — Cancel', () => {
  beforeEach(() => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(null);
  });

  it('calls onClose when Cancel is pressed', () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    fireEvent.press(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call AsyncStorage.setItem when Cancel is pressed', () => {
    renderModal();
    // Clear any setItem calls from mount
    mockAsyncStorage.setItem.mockClear();
    fireEvent.press(screen.getByText('Cancel'));
    expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
  });
});

// ─── Max-selection enforcement ────────────────────────────────────────────────

describe('TrackingConfigModal — MAX_SELECTED_STATS enforcement', () => {
  it('shows the deselect hint text when all 8 stats are selected', async () => {
    // Pre-load all 8 stats as selected
    const all = ALL_STATS.map((s) => s.id);
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(all));

    renderModal();

    // The subtitle is a single Text node: "Select up to 8 stats to display. Deselect one to add another."
    // Use a regex to do a partial content match.
    await screen.findByText(/Deselect one to add another/);
  });

  it('shows the stat count as "8 / 8" when all stats are selected', async () => {
    const all = ALL_STATS.map((s) => s.id);
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(all));

    renderModal();

    await screen.findByText(`${MAX_SELECTED_STATS} / ${MAX_SELECTED_STATS}`);
  });
});
