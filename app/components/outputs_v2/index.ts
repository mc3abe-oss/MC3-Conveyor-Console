/**
 * Outputs V2 UI Components
 *
 * New intent-driven tab structure:
 * - Summary: "Is it ready?"
 * - Issues: "What needs fixing?"
 * - Vendor Specs: "What do I send?"
 * - Exports: "How do I save/share?"
 * - Details: "What are the internals?"
 */

// Main wrapper
export { default as OutputsV2Tabs } from './OutputsV2Tabs';

// New intent-driven tabs
export { default as SummaryTab } from './SummaryTab';
export { default as IssuesTab } from './IssuesTab';
export { default as VendorSpecsTab } from './VendorSpecsTab';
export { default as ExportsTab } from './ExportsTab';
export { default as DetailsTab } from './DetailsTab';

// Legacy tabs (used internally by DetailsTab)
export { default as OverviewTab } from './OverviewTab';
export { default as BeltTab } from './BeltTab';
export { default as PulleysRollersTab } from './PulleysRollersTab';
export { default as DriveTab } from './DriveTab';
export { default as SupportsTab } from './SupportsTab';
export { default as ValidationTab } from './ValidationTab';

// Shared components
export { default as ComponentCard, ComponentField } from './ComponentCard';
export { default as CopyBlock } from './CopyBlock';
