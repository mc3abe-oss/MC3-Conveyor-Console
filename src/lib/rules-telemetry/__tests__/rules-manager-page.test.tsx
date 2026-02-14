/**
 * @jest-environment jsdom
 */

/**
 * Page-level tests for the Rules Manager admin page.
 *
 * Uses a small fixture dataset (12 rules) rather than the full 157
 * to keep tests fast and focused on behavior.
 */

import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ManagerRule } from '../rules-manager-data';

// ============================================================================
// Fixture data — 12 representative rules across all 4 sections & severities
// ============================================================================

const FIXTURE_RULES: ManagerRule[] = [
  // Application section — 3 rules
  {
    id: 'vi_temperature_red_hot',
    section: 'Application',
    category: 'Material Handling',
    categoryKey: 'material',
    name: 'Red Hot Parts Blocked',
    severity: 'error',
    condition: 'Part temperature is Red Hot',
    threshold: 'temperature_class = RED_HOT',
    action: 'Block configuration',
    message: 'Do not use belt conveyor for red hot parts.',
    fields: ['part_temperature_class'],
    sourceFunction: 'validateInputs',
    sourceLine: 150,
    hasTodo: false,
  },
  {
    id: 'ar_fluid_considerable',
    section: 'Application',
    category: 'Material Handling',
    categoryKey: 'material',
    name: 'Considerable Oil Warning',
    severity: 'warning',
    condition: 'Fluid type is Considerable Oil',
    threshold: 'fluid_type = CONSIDERABLE',
    action: 'Warn engineer about belt selection',
    message: 'Consider ribbed belt for oil resistance.',
    fields: ['fluid_type'],
    sourceFunction: 'applyApplicationRules',
    sourceLine: 500,
    hasTodo: false,
  },
  {
    id: 'ar_side_load_info',
    section: 'Application',
    category: 'Application & Environment',
    categoryKey: 'application',
    name: 'Side Load Detected',
    severity: 'info',
    condition: 'Side load direction is set',
    threshold: 'side_loading_direction != NONE',
    action: 'Inform engineer',
    message: 'Side loading detected — review tracking method.',
    fields: ['side_loading_direction'],
    sourceFunction: 'applyApplicationRules',
    sourceLine: 550,
    hasTodo: false,
  },
  // Physical section — 3 rules
  {
    id: 'vi_conveyor_length_zero',
    section: 'Physical',
    category: 'Geometry & Layout',
    categoryKey: 'geometry',
    name: 'Conveyor Length Required',
    severity: 'error',
    condition: 'Conveyor length is zero',
    threshold: 'length <= 0',
    action: 'Block configuration',
    message: 'Enter conveyor length to continue.',
    fields: ['conveyor_length_cc_in'],
    sourceFunction: 'validateInputs',
    sourceLine: 160,
    hasTodo: false,
  },
  {
    id: 'ar_incline_20_cleat_warning',
    section: 'Physical',
    category: 'Geometry & Layout',
    categoryKey: 'geometry',
    name: 'Incline 20 Cleats Warning',
    severity: 'warning',
    condition: 'Incline angle exceeds 20 degrees',
    threshold: '20 < incline <= 35',
    action: 'Warn engineer about cleats',
    message: 'Cleats typically required at this incline.',
    fields: ['conveyor_incline_deg'],
    sourceFunction: 'applyApplicationRules',
    sourceLine: 600,
    hasTodo: false,
  },
  {
    id: 'ar_belt_catalog_drive_pulley_min',
    section: 'Physical',
    category: 'Pulley Diameter',
    categoryKey: 'pulley',
    name: 'Drive Pulley Below Belt Minimum',
    severity: 'warning',
    condition: 'Drive pulley diameter below belt minimum',
    threshold: 'drive_pulley < belt_min_pulley',
    action: 'Warn engineer',
    message: 'Drive pulley below belt minimum.',
    fields: ['pulley_diameter_in'],
    sourceFunction: 'applyApplicationRules',
    sourceLine: 1450,
    hasTodo: true,
    todoNote: 'Severity may need to be ERROR. Engineering review needed.',
  },
  // Drive & Controls section — 3 rules
  {
    id: 'vi_belt_speed_zero',
    section: 'Drive & Controls',
    category: 'Speed & RPM',
    categoryKey: 'speed',
    name: 'Belt Speed Zero',
    severity: 'error',
    condition: 'Belt speed is zero in Belt Speed mode',
    threshold: 'belt_speed <= 0',
    action: 'Block configuration',
    message: 'Enter a belt speed greater than zero.',
    fields: ['belt_speed_fpm'],
    sourceFunction: 'validateInputs',
    sourceLine: 250,
    hasTodo: true,
    todoNote: 'Placeholder default behavior needs review.',
  },
  {
    id: 'ar_speed_exceeds_300',
    section: 'Drive & Controls',
    category: 'Speed & RPM',
    categoryKey: 'speed',
    name: 'Belt Speed Exceeds 300 FPM',
    severity: 'warning',
    condition: 'Belt speed exceeds 300 FPM',
    threshold: 'belt_speed > 300',
    action: 'Warn engineer',
    message: 'Belt speed exceeds 300 FPM. Verify intentional.',
    fields: ['belt_speed_fpm'],
    sourceFunction: 'applyApplicationRules',
    sourceLine: 700,
    hasTodo: false,
  },
  {
    id: 'ar_gear_ratio_low',
    section: 'Drive & Controls',
    category: 'Drive & Gearbox',
    categoryKey: 'drive',
    name: 'Gear Ratio Below 5:1',
    severity: 'warning',
    condition: 'Gear ratio below 5',
    threshold: 'gear_ratio < 5',
    action: 'Warn engineer',
    message: 'Very low gear ratio — may need special gearbox.',
    fields: ['gear_ratio'],
    sourceFunction: 'applyApplicationRules',
    sourceLine: 800,
    hasTodo: false,
  },
  // Build Options section — 3 rules
  {
    id: 'vi_cleat_height_range',
    section: 'Build Options',
    category: 'Cleats',
    categoryKey: 'cleat',
    name: 'Cleat Height Out of Range',
    severity: 'error',
    condition: 'Cleat height outside allowed range',
    threshold: '0.5 <= height <= 6',
    action: 'Block configuration',
    message: 'Cleat height must be between 0.5 and 6 inches.',
    fields: ['cleat_height_in'],
    sourceFunction: 'validateInputs',
    sourceLine: 350,
    hasTodo: false,
  },
  {
    id: 'ar_cleat_snub_clearance',
    section: 'Build Options',
    category: 'Cleats',
    categoryKey: 'cleat',
    name: 'Cleats Snub Roller Clearance',
    severity: 'warning',
    condition: 'Cleats and snub rollers both enabled',
    threshold: 'cleats = true AND snub_rollers = true',
    action: 'Warn engineer',
    message: 'Verify clearance between cleats and snub rollers.',
    fields: ['cleats_enabled'],
    sourceFunction: 'applyApplicationRules',
    sourceLine: 900,
    hasTodo: false,
  },
  {
    id: 'vp_safety_factor_range',
    section: 'Build Options',
    category: 'Calculation Parameters',
    categoryKey: 'parameter',
    name: 'Safety Factor Out of Range',
    severity: 'error',
    condition: 'Safety factor outside allowed range',
    threshold: '1.0 <= SF <= 5.0',
    action: 'Block configuration',
    message: 'Safety factor must be between 1.0 and 5.0.',
    fields: ['safety_factor'],
    sourceFunction: 'validateParameters',
    sourceLine: 1900,
    hasTodo: false,
  },
];

// Count helpers for assertions
const FIXTURE_COUNTS = {
  total: FIXTURE_RULES.length,
  bySection: {
    Application: FIXTURE_RULES.filter((r) => r.section === 'Application').length,
    Physical: FIXTURE_RULES.filter((r) => r.section === 'Physical').length,
    'Drive & Controls': FIXTURE_RULES.filter((r) => r.section === 'Drive & Controls').length,
    'Build Options': FIXTURE_RULES.filter((r) => r.section === 'Build Options').length,
  },
  bySeverity: {
    error: FIXTURE_RULES.filter((r) => r.severity === 'error').length,
    warning: FIXTURE_RULES.filter((r) => r.severity === 'warning').length,
    info: FIXTURE_RULES.filter((r) => r.severity === 'info').length,
  },
  todos: FIXTURE_RULES.filter((r) => r.hasTodo).length,
};

// ============================================================================
// Mocks
// ============================================================================

// Mock next/link — render as plain anchor
jest.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
      <a href={href} {...props}>{children}</a>
    ),
  };
});

// Mock telemetry hook — default: no fired rules
const mockUseRuleTelemetry = jest.fn().mockReturnValue({
  events: [],
  enabled: false,
  sessionId: 'test',
  clear: jest.fn(),
  setEnabled: jest.fn(),
  eventCount: 0,
});

jest.mock('../../../../src/lib/rules-telemetry/useRuleTelemetry', () => ({
  useRuleTelemetry: () => mockUseRuleTelemetry(),
}));

// Mock rules-manager-data — use fixture instead of real 157 rules
jest.mock('../rules-manager-data', () => ({
  MANAGER_RULES: FIXTURE_RULES,
  MANAGER_RULE_COUNT: FIXTURE_RULES.length,
  SECTIONS: ['Application', 'Physical', 'Drive & Controls', 'Build Options'],
  MANAGER_RULES_MAP: new Map(FIXTURE_RULES.map((r) => [r.id, r])),
  SECTION_MAP: {},
}));

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ============================================================================
// Import component AFTER mocks
// ============================================================================

import RulesManagerPage from '../../../../app/console/admin/rules/page';

// ============================================================================
// Helpers
// ============================================================================

/** Find all StatusBadge buttons (small tracking-wide buttons with status text) */
function getStatusButtons(status: 'Unreviewed' | 'Confirmed' | 'Flagged') {
  return screen.queryAllByText(new RegExp(status)).filter(
    (el) => el.tagName === 'BUTTON' && el.classList.contains('tracking-wide')
  );
}

// ============================================================================
// Tests
// ============================================================================

beforeEach(() => {
  localStorageMock.clear();
  mockUseRuleTelemetry.mockReturnValue({
    events: [],
    enabled: false,
    sessionId: 'test',
    clear: jest.fn(),
    setEnabled: jest.fn(),
    eventCount: 0,
  });
});

describe('RulesManagerPage', () => {
  describe('rendering', () => {
    it('renders all fixture rules', () => {
      render(<RulesManagerPage />);
      for (const rule of FIXTURE_RULES) {
        expect(screen.getByText(rule.name)).toBeInTheDocument();
      }
    });

    it('displays the correct total rule count', () => {
      render(<RulesManagerPage />);
      expect(screen.getByText(`${FIXTURE_COUNTS.total} rules across 4 sections`)).toBeInTheDocument();
    });

    it('renders the back-to-admin breadcrumb', () => {
      render(<RulesManagerPage />);
      const link = screen.getByText(/Admin/);
      expect(link.closest('a')).toHaveAttribute('href', '/console/admin');
    });

    it('displays the page title', () => {
      render(<RulesManagerPage />);
      expect(screen.getByText('Rules Manager')).toBeInTheDocument();
    });
  });

  describe('section tab filtering', () => {
    it('shows correct counts on each tab', () => {
      render(<RulesManagerPage />);
      // "All" tab shows total
      const allTab = screen.getByRole('button', { name: /All/ });
      expect(allTab).toHaveTextContent(String(FIXTURE_COUNTS.total));
    });

    it('filters to Application rules when tab clicked', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      const appTab = screen.getByRole('button', { name: /Application/ });
      await user.click(appTab);

      // Application rules visible
      expect(screen.getByText('Red Hot Parts Blocked')).toBeInTheDocument();
      expect(screen.getByText('Considerable Oil Warning')).toBeInTheDocument();
      // Physical rules hidden
      expect(screen.queryByText('Conveyor Length Required')).not.toBeInTheDocument();
    });

    it('filters to Physical rules when tab clicked', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      const physTab = screen.getByRole('button', { name: /Physical/ });
      await user.click(physTab);

      expect(screen.getByText('Conveyor Length Required')).toBeInTheDocument();
      expect(screen.queryByText('Red Hot Parts Blocked')).not.toBeInTheDocument();
    });

    it('filters to Drive & Controls rules when tab clicked', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      const driveTab = screen.getByRole('button', { name: /Drive & Controls/ });
      await user.click(driveTab);

      expect(screen.getByText('Belt Speed Zero')).toBeInTheDocument();
      expect(screen.getByText('Belt Speed Exceeds 300 FPM')).toBeInTheDocument();
      expect(screen.queryByText('Conveyor Length Required')).not.toBeInTheDocument();
    });

    it('filters to Build Options rules when tab clicked', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      const buildTab = screen.getByRole('button', { name: /Build Options/ });
      await user.click(buildTab);

      expect(screen.getByText('Cleat Height Out of Range')).toBeInTheDocument();
      expect(screen.queryByText('Red Hot Parts Blocked')).not.toBeInTheDocument();
    });

    it('returns to all rules when All tab clicked after filtering', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      // Go to Physical
      await user.click(screen.getByRole('button', { name: /Physical/ }));
      expect(screen.queryByText('Red Hot Parts Blocked')).not.toBeInTheDocument();

      // Back to All
      await user.click(screen.getByRole('button', { name: /All/ }));
      expect(screen.getByText('Red Hot Parts Blocked')).toBeInTheDocument();
      expect(screen.getByText('Conveyor Length Required')).toBeInTheDocument();
    });
  });

  describe('search', () => {
    it('filters by rule name', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      const searchInput = screen.getByPlaceholderText(/Search rules/);
      await user.type(searchInput, 'Red Hot');

      expect(screen.getByText('Red Hot Parts Blocked')).toBeInTheDocument();
      expect(screen.queryByText('Conveyor Length Required')).not.toBeInTheDocument();
    });

    it('filters by message text', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      const searchInput = screen.getByPlaceholderText(/Search rules/);
      await user.type(searchInput, 'ribbed belt');

      expect(screen.getByText('Considerable Oil Warning')).toBeInTheDocument();
      expect(screen.queryByText('Red Hot Parts Blocked')).not.toBeInTheDocument();
    });

    it('filters by condition text', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      const searchInput = screen.getByPlaceholderText(/Search rules/);
      await user.type(searchInput, 'Gear ratio below');

      expect(screen.getByText('Gear Ratio Below 5:1')).toBeInTheDocument();
      expect(screen.queryByText('Belt Speed Zero')).not.toBeInTheDocument();
    });

    it('filters by field name', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      const searchInput = screen.getByPlaceholderText(/Search rules/);
      await user.type(searchInput, 'safety_factor');

      expect(screen.getByText('Safety Factor Out of Range')).toBeInTheDocument();
      expect(screen.queryByText('Red Hot Parts Blocked')).not.toBeInTheDocument();
    });

    it('filters by rule ID', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      const searchInput = screen.getByPlaceholderText(/Search rules/);
      await user.type(searchInput, 'vi_cleat_height');

      expect(screen.getByText('Cleat Height Out of Range')).toBeInTheDocument();
      expect(screen.queryByText('Belt Speed Zero')).not.toBeInTheDocument();
    });

    it('shows empty state when no rules match', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      const searchInput = screen.getByPlaceholderText(/Search rules/);
      await user.type(searchInput, 'xyznonexistent');

      expect(screen.getByText('No rules match the current filters.')).toBeInTheDocument();
    });

    it('clears search via clear button', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      const searchInput = screen.getByPlaceholderText(/Search rules/);
      await user.type(searchInput, 'Red Hot');
      expect(screen.queryByText('Conveyor Length Required')).not.toBeInTheDocument();

      // Click the clear button (✕)
      const clearBtn = screen.getByText('\u2715');
      await user.click(clearBtn);

      // All rules visible again
      expect(screen.getByText('Conveyor Length Required')).toBeInTheDocument();
    });
  });

  describe('severity filter', () => {
    it('filters to errors only', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      const select = screen.getByDisplayValue('All severities');
      await user.selectOptions(select, 'error');

      // Error rules visible
      expect(screen.getByText('Red Hot Parts Blocked')).toBeInTheDocument();
      expect(screen.getByText('Conveyor Length Required')).toBeInTheDocument();
      // Warning rule hidden
      expect(screen.queryByText('Considerable Oil Warning')).not.toBeInTheDocument();
    });

    it('filters to warnings only', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      const select = screen.getByDisplayValue('All severities');
      await user.selectOptions(select, 'warning');

      expect(screen.getByText('Considerable Oil Warning')).toBeInTheDocument();
      expect(screen.queryByText('Red Hot Parts Blocked')).not.toBeInTheDocument();
    });

    it('filters to info only', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      const select = screen.getByDisplayValue('All severities');
      await user.selectOptions(select, 'info');

      expect(screen.getByText('Side Load Detected')).toBeInTheDocument();
      expect(screen.queryByText('Red Hot Parts Blocked')).not.toBeInTheDocument();
    });
  });

  describe('status filter', () => {
    it('defaults all rules to unreviewed', () => {
      render(<RulesManagerPage />);
      const unreviewedButtons = getStatusButtons('Unreviewed');
      expect(unreviewedButtons.length).toBe(FIXTURE_COUNTS.total);
    });

    it('filters to confirmed rules after status change', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      // Cycle first rule to confirmed
      const statusButtons = getStatusButtons('Unreviewed');
      await user.click(statusButtons[0]);

      // Now filter to confirmed
      const select = screen.getByDisplayValue('All statuses');
      await user.selectOptions(select, 'confirmed');

      // Only the confirmed rule should be visible
      const confirmedButtons = getStatusButtons('Confirmed');
      expect(confirmedButtons.length).toBe(1);
    });
  });

  describe('status cycling', () => {
    it('cycles from unreviewed to confirmed on click', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      const firstBadge = getStatusButtons('Unreviewed')[0];
      await user.click(firstBadge);

      expect(getStatusButtons('Confirmed').length).toBe(1);
    });

    it('cycles from confirmed to flagged on second click', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      await user.click(getStatusButtons('Unreviewed')[0]); // -> confirmed
      await user.click(getStatusButtons('Confirmed')[0]); // -> flagged

      expect(getStatusButtons('Flagged').length).toBe(1);
    });

    it('cycles from flagged back to unreviewed', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      await user.click(getStatusButtons('Unreviewed')[0]); // -> confirmed
      await user.click(getStatusButtons('Confirmed')[0]); // -> flagged
      await user.click(getStatusButtons('Flagged')[0]); // -> unreviewed

      expect(getStatusButtons('Unreviewed').length).toBe(FIXTURE_COUNTS.total);
    });

    it('persists status to localStorage', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      await user.click(getStatusButtons('Unreviewed')[0]);

      const storedValue = localStorage.getItem('mc3-rules-review-status:v1');
      expect(storedValue).not.toBeNull();
      expect(storedValue).toContain('confirmed');
    });

    it('loads persisted statuses on mount', () => {
      // Pre-populate localStorage before render
      const stored = { vi_temperature_red_hot: 'confirmed', vi_conveyor_length_zero: 'flagged' };
      localStorage.setItem('mc3-rules-review-status:v1', JSON.stringify(stored));

      render(<RulesManagerPage />);

      expect(getStatusButtons('Confirmed').length).toBe(1);
      expect(getStatusButtons('Flagged').length).toBe(1);
    });
  });

  describe('show active only', () => {
    it('shows all rules when no events fired', () => {
      render(<RulesManagerPage />);

      const toggle = screen.getByRole('button', { name: /Show active only/ });
      expect(toggle).toBeInTheDocument();

      // All rules visible
      for (const rule of FIXTURE_RULES) {
        expect(screen.getByText(rule.name)).toBeInTheDocument();
      }
    });

    it('filters to fired rules when toggled with telemetry data', async () => {
      const user = userEvent.setup();
      // Set up 2 fired rules
      mockUseRuleTelemetry.mockReturnValue({
        events: [
          { rule_id: 'vi_conveyor_length_zero', severity: 'error', message: '', product_key: 'belt', timestamp: 1, inputs_present: [], source_ref: '', event_id: '1' },
          { rule_id: 'ar_speed_exceeds_300', severity: 'warning', message: '', product_key: 'belt', timestamp: 2, inputs_present: [], source_ref: '', event_id: '2' },
        ],
        enabled: true,
        sessionId: 'test',
        clear: jest.fn(),
        setEnabled: jest.fn(),
        eventCount: 2,
      });

      render(<RulesManagerPage />);

      const toggle = screen.getByRole('button', { name: /Show active only/ });
      await user.click(toggle);

      // Only fired rules visible
      expect(screen.getByText('Conveyor Length Required')).toBeInTheDocument();
      expect(screen.getByText('Belt Speed Exceeds 300 FPM')).toBeInTheDocument();
      // Non-fired rules hidden
      expect(screen.queryByText('Red Hot Parts Blocked')).not.toBeInTheDocument();
    });

    it('shows ACTIVE badge on fired rules', () => {
      mockUseRuleTelemetry.mockReturnValue({
        events: [
          { rule_id: 'vi_conveyor_length_zero', severity: 'error', message: '', product_key: 'belt', timestamp: 1, inputs_present: [], source_ref: '', event_id: '1' },
        ],
        enabled: true,
        sessionId: 'test',
        clear: jest.fn(),
        setEnabled: jest.fn(),
        eventCount: 1,
      });

      render(<RulesManagerPage />);
      expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    });

    it('shows empty state when active-only toggled with no fired rules', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      const toggle = screen.getByRole('button', { name: /Show active only/ });
      await user.click(toggle);

      expect(screen.getByText('No rules match the current filters.')).toBeInTheDocument();
    });
  });

  describe('category grouping', () => {
    it('groups rules by category with headers', () => {
      render(<RulesManagerPage />);

      // Fixture has these categories
      expect(screen.getByText('Material Handling')).toBeInTheDocument();
      expect(screen.getByText('Geometry & Layout')).toBeInTheDocument();
      expect(screen.getByText('Speed & RPM')).toBeInTheDocument();
      expect(screen.getByText('Cleats')).toBeInTheDocument();
    });

    it('shows correct count next to category header', () => {
      render(<RulesManagerPage />);

      // Material Handling has 2 rules in fixture (Red Hot + Considerable Oil)
      const materialHeader = screen.getByText('Material Handling');
      const categoryGroup = materialHeader.closest('div')!.parentElement!;
      // Count span next to the divider shows "2"
      expect(within(categoryGroup).getByText('2')).toBeInTheDocument();
    });
  });

  describe('progress bar', () => {
    it('shows 0 reviewed initially', () => {
      render(<RulesManagerPage />);
      expect(screen.getByText(`Progress: 0/${FIXTURE_COUNTS.total} reviewed`)).toBeInTheDocument();
    });

    it('updates count when rules are confirmed', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      // Confirm first rule
      await user.click(getStatusButtons('Unreviewed')[0]);

      expect(
        screen.getByText((content) => content.includes('Progress: 1/') && content.includes('reviewed'))
      ).toBeInTheDocument();
    });
  });

  describe('TODO rules', () => {
    it('shows REVIEW badge on TODO rules in collapsed state', () => {
      render(<RulesManagerPage />);
      const reviewBadges = screen.queryAllByText('REVIEW');
      expect(reviewBadges.length).toBe(FIXTURE_COUNTS.todos);
    });

    it('shows engineering review callout when TODO rule is expanded', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      // Click on a TODO rule to expand it
      const todoRule = screen.getByText('Drive Pulley Below Belt Minimum');
      await user.click(todoRule);

      expect(screen.getByText(/Engineering Review Needed/)).toBeInTheDocument();
      expect(screen.getByText(/Severity may need to be ERROR/)).toBeInTheDocument();
    });
  });

  describe('expanded rule detail', () => {
    it('shows IF/THEN block when rule is expanded', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      // Click on a rule to expand
      const ruleName = screen.getByText('Red Hot Parts Blocked');
      await user.click(ruleName);

      expect(screen.getByText('IF')).toBeInTheDocument();
      expect(screen.getByText('THEN')).toBeInTheDocument();
      expect(screen.getByText('Part temperature is Red Hot')).toBeInTheDocument();
      expect(screen.getByText('Block configuration')).toBeInTheDocument();
    });

    it('shows threshold and rule ID in details grid', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      const ruleName = screen.getByText('Red Hot Parts Blocked');
      await user.click(ruleName);

      expect(screen.getByText('temperature_class = RED_HOT')).toBeInTheDocument();
      expect(screen.getByText('vi_temperature_red_hot')).toBeInTheDocument();
    });

    it('shows field pills in details grid', async () => {
      const user = userEvent.setup();
      render(<RulesManagerPage />);

      const ruleName = screen.getByText('Red Hot Parts Blocked');
      await user.click(ruleName);

      expect(screen.getByText('part_temperature_class')).toBeInTheDocument();
    });
  });
});
