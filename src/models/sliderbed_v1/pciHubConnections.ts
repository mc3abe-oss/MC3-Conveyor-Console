/**
 * PCI Hub Connection Types and Bushing Systems
 *
 * Source: PCI Pulley Selection Guide (Pages 12-14)
 *
 * This file provides the single source of truth for hub connection options,
 * compression bushing systems, and associated guidance.
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Hub Connection Types (PCI Pages 12-14)
 * Keys are stable identifiers; labels are for display.
 */
export enum HubConnectionType {
  FixedStubShafts = 'FIXED_STUB_SHAFTS',
  RemovableStubShafts = 'REMOVABLE_STUB_SHAFTS',
  KeyedHubSetScrew = 'KEYED_HUB_SET_SCREW',
  ErStyleInternalBearings = 'ER_INTERNAL_BEARINGS',
  WeldOnHubCompressionBushings = 'WELD_ON_HUB_COMPRESSION_BUSHINGS',
  KeylessLockingDevices = 'KEYLESS_LOCKING_DEVICES',
  FlatEndDiskIntegralHub = 'FLAT_END_DISK_INTEGRAL_HUB',
  ContouredEndDiskIntegralHub = 'CONTOURED_END_DISK_INTEGRAL_HUB',
  DeadShaftAssembly = 'DEAD_SHAFT_ASSEMBLY',
}

/**
 * Compression Bushing Systems (PCI Page 13)
 * Only applicable when hub connection uses compression bushings.
 */
export enum BushingSystemType {
  QD = 'QD',
  XT = 'XT',
  TaperLock = 'TAPER_LOCK',
  /** @deprecated Legacy/obsolete - hidden by default */
  HE = 'HE',
}

// ============================================================================
// DATA STRUCTURES
// ============================================================================

export interface HubConnectionOption {
  key: HubConnectionType;
  label: string;
  shortDescription: string; // "Best for" one-liner
  pros: string[];
  cons: string[];
  /** If true, show bushing system selector when this option is selected */
  requiresBushingSystem: boolean;
  /** If true, not ideal as drive pulley (show warning) */
  notIdealForDrive?: boolean;
}

export interface BushingSystemOption {
  key: BushingSystemType;
  label: string;
  description: string;
  /** If true, hide from default selector (legacy only) */
  hidden?: boolean;
  /** Warning to show when selected */
  warning?: string;
}

// ============================================================================
// HUB CONNECTION OPTIONS DATA
// ============================================================================

export const HUB_CONNECTION_OPTIONS: HubConnectionOption[] = [
  {
    key: HubConnectionType.FixedStubShafts,
    label: 'Fixed Stub Shafts',
    shortDescription: 'Best for small pulleys requiring max fatigue life',
    pros: [
      'Ideal for small diameter pulleys',
      'High fatigue safety factor with minimal shaft deflection',
      'Easy to install',
    ],
    cons: [
      'Parts not replaceable',
      'Expensive vs most other styles',
    ],
    requiresBushingSystem: false,
  },
  {
    key: HubConnectionType.RemovableStubShafts,
    label: 'Removable Stub Shafts',
    shortDescription: 'Best for small pulleys with serviceability needs',
    pros: [
      'Ideal for small diameter pulleys',
      'High fatigue safety factor with minimal shaft deflection',
      'Replaceable shaft enables economical maintenance',
    ],
    cons: [
      'Expensive vs most other styles',
    ],
    requiresBushingSystem: false,
  },
  {
    key: HubConnectionType.KeyedHubSetScrew,
    label: 'Keyed Hub with Set Screw',
    shortDescription: 'Best for light duty, budget-conscious applications',
    pros: [
      'Low cost',
      'Replaceable shaft',
    ],
    cons: [
      'Light duty only',
      'Can walk on shaft when overloaded',
      'Fretting may occur when overloaded',
    ],
    requiresBushingSystem: false,
  },
  {
    key: HubConnectionType.ErStyleInternalBearings,
    label: 'ER Style Internal Bearings',
    shortDescription: 'Best for tight spaces with minimal room for external bearings',
    pros: [
      'Shaft and bearings replaceable',
      'Ideal for tight spaces with minimal room for external bearings',
    ],
    cons: [
      'Not ideal as drive pulley',
      'Not suitable for heavy duty',
    ],
    requiresBushingSystem: false,
    notIdealForDrive: true,
  },
  {
    key: HubConnectionType.WeldOnHubCompressionBushings,
    label: 'Weld-On Hubs & Compression Bushings',
    shortDescription: 'Best for general purpose with good serviceability',
    pros: [
      'Shaft and bushings replaceable',
      'Less expensive than keyless',
      'Higher fatigue safety factor than fixed bore and keyed hubs',
    ],
    cons: [
      'Can cause end disk pre-stress during installation',
      'More expensive than fixed bore, keyed hubs, and internal bearings',
    ],
    requiresBushingSystem: true,
  },
  {
    key: HubConnectionType.KeylessLockingDevices,
    label: 'Keyless Locking Devices',
    shortDescription: 'Best for zero pre-stress and max alignment precision',
    pros: [
      'No end disk pre-stress',
      'Locking device and shaft replaceable',
      'Eliminates keyways and keyway stress concentrations',
    ],
    cons: [
      'Typically most expensive',
      'More complex installation',
    ],
    requiresBushingSystem: false,
  },
  {
    key: HubConnectionType.FlatEndDiskIntegralHub,
    label: 'Flat End Disk with Integral Hub',
    shortDescription: 'Best for eliminating weld stress concentrations',
    pros: [
      'Eliminates stress concentrations from sudden geometry changes in welded hubs',
      'Eliminates HAZ failure at hub-to-disk weld',
    ],
    cons: [
      'Generally more costly than weld-on hubs (especially small diameters)',
    ],
    requiresBushingSystem: false,
  },
  {
    key: HubConnectionType.ContouredEndDiskIntegralHub,
    label: 'Contoured End Disk with Integral Hub',
    shortDescription: 'Best for optimized stress distribution',
    pros: [
      'Contoured design distributes stress more evenly across disk',
      'More material where stress is higher',
    ],
    cons: [
      'Generally more costly than weld-on hubs (especially small diameters)',
    ],
    requiresBushingSystem: false,
  },
  {
    key: HubConnectionType.DeadShaftAssembly,
    label: 'Dead Shaft Assembly',
    shortDescription: 'Best for max shaft capacity without end disk fatigue risk',
    pros: [
      'Shaft and bearings replaceable',
      'Eliminates risk of end disk fatigue failure',
      'Greater shaft capacity than live shaft',
      'Can reduce cost and space',
    ],
    cons: [
      'Not ideal as drive pulley',
      'Generally more costly',
      'Does not allow easy conversion to varying shaft diameters',
    ],
    requiresBushingSystem: false,
    notIdealForDrive: true,
  },
];

// ============================================================================
// BUSHING SYSTEM OPTIONS DATA
// ============================================================================

export const BUSHING_SYSTEM_OPTIONS: BushingSystemOption[] = [
  {
    key: BushingSystemType.XT,
    label: 'XT®',
    description: 'Preferred for two-hub pulleys. Uses 4+ evenly spaced bolts for better alignment.',
  },
  {
    key: BushingSystemType.QD,
    label: 'QD®',
    description: 'Quick Disconnect style. Common general-purpose option.',
  },
  {
    key: BushingSystemType.TaperLock,
    label: 'Taper-Lock®',
    description: 'Traditional taper bushing. Simple installation.',
    warning: 'PCI: Not recommended for two-hub pulleys. Some sizes use only 2 bolts at ~170° which can introduce shaft bending and higher runout. Prefer XT® for improved alignment.',
  },
  {
    key: BushingSystemType.HE,
    label: 'HE (Obsolete)',
    description: 'Legacy bushing system. Not recommended for new designs.',
    hidden: true,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get hub connection option by key
 */
export function getHubConnectionOption(key: HubConnectionType | string): HubConnectionOption | undefined {
  return HUB_CONNECTION_OPTIONS.find(opt => opt.key === key);
}

/**
 * Get bushing system option by key
 */
export function getBushingSystemOption(key: BushingSystemType | string): BushingSystemOption | undefined {
  return BUSHING_SYSTEM_OPTIONS.find(opt => opt.key === key);
}

/**
 * Get visible bushing system options (excludes hidden/legacy)
 */
export function getVisibleBushingSystemOptions(): BushingSystemOption[] {
  return BUSHING_SYSTEM_OPTIONS.filter(opt => !opt.hidden);
}

/**
 * Check if a hub connection type requires a bushing system selector
 */
export function requiresBushingSystem(hubConnectionType: HubConnectionType | string): boolean {
  const option = getHubConnectionOption(hubConnectionType);
  return option?.requiresBushingSystem ?? false;
}

/**
 * Check if a hub connection type is not ideal for drive pulley
 */
export function isNotIdealForDrive(hubConnectionType: HubConnectionType | string): boolean {
  const option = getHubConnectionOption(hubConnectionType);
  return option?.notIdealForDrive ?? false;
}

// ============================================================================
// LABEL MAPS (for UI display)
// ============================================================================

export const HUB_CONNECTION_LABELS: Record<HubConnectionType, string> = {
  [HubConnectionType.FixedStubShafts]: 'Fixed Stub Shafts',
  [HubConnectionType.RemovableStubShafts]: 'Removable Stub Shafts',
  [HubConnectionType.KeyedHubSetScrew]: 'Keyed Hub with Set Screw',
  [HubConnectionType.ErStyleInternalBearings]: 'ER Style Internal Bearings',
  [HubConnectionType.WeldOnHubCompressionBushings]: 'Weld-On Hubs & Compression Bushings',
  [HubConnectionType.KeylessLockingDevices]: 'Keyless Locking Devices',
  [HubConnectionType.FlatEndDiskIntegralHub]: 'Flat End Disk with Integral Hub',
  [HubConnectionType.ContouredEndDiskIntegralHub]: 'Contoured End Disk with Integral Hub',
  [HubConnectionType.DeadShaftAssembly]: 'Dead Shaft Assembly',
};

export const BUSHING_SYSTEM_LABELS: Record<BushingSystemType, string> = {
  [BushingSystemType.QD]: 'QD®',
  [BushingSystemType.XT]: 'XT®',
  [BushingSystemType.TaperLock]: 'Taper-Lock®',
  [BushingSystemType.HE]: 'HE (Obsolete)',
};

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/** Default hub connection type for drive pulley */
export const DEFAULT_DRIVE_HUB_CONNECTION_TYPE = HubConnectionType.KeyedHubSetScrew;

/** Default hub connection type for tail pulley */
export const DEFAULT_TAIL_HUB_CONNECTION_TYPE = HubConnectionType.ErStyleInternalBearings;

/** @deprecated Use position-specific defaults instead */
export const DEFAULT_HUB_CONNECTION_TYPE = HubConnectionType.KeyedHubSetScrew;

/** Default bushing system when hub connection requires one */
export const DEFAULT_BUSHING_SYSTEM = BushingSystemType.XT;
