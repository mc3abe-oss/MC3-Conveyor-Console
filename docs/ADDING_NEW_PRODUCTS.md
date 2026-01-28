# Adding New Products to MC3 Conveyor Console

## Overview

The MC3 Conveyor Console uses a multi-product architecture that cleanly separates different conveyor types while sharing common infrastructure.

**Architecture:**
- `src/products/` - Product modules (calculation logic, output schemas, UI config)
- `app/components/outputs/{product}/` - Product-specific UI components
- **Fail-closed gate** (`canRenderCard`) - Prevents cross-product bleed by blocking cards that require keys not in a product's schema

Each product defines its own `outputsSchema` which acts as the source of truth. If a UI card requires an output key that doesn't exist in the product's schema, the card won't render. This prevents magnetic conveyor outputs from appearing on belt conveyors and vice versa.

## Quick Reference

**4 steps to add a new product:**

1. Create product module in `src/products/{product}_v1/index.ts`
2. Register in `src/products/index.ts`
3. Create output components in `app/components/outputs/{product}/`
4. Wire to calculator app

## Step 1: Create Product Module

**Location:** `src/products/{product}_v1/index.ts`

```typescript
import type { ProductModule, ProductUIConfig, OutputFieldDef } from '../types';

// Import your existing calculation functions
// import { calculate } from '@/models/{product}_v1/calculate';
// import { validate } from '@/models/{product}_v1/validate';

// Types for your product
interface YourProductInputs {
  // Define input fields
  length_in: number;
  width_in: number;
  // ...
}

interface YourProductOutputs {
  // Define output fields
  example_output_key: number;
  another_output: string;
  // ...
}

// =============================================================================
// OUTPUT SCHEMA - ONLY keys this product produces
// =============================================================================
// This is the FAIL-CLOSED GATE - cards can only render if ALL their
// required keys exist in this schema.

const outputsSchema: OutputFieldDef[] = [
  // Geometry outputs
  { key: 'example_output_key', label: 'Example Output', type: 'number', unit: 'in', precision: 2, category: 'geometry' },
  { key: 'total_length_in', label: 'Total Length', type: 'number', unit: 'in', precision: 2, category: 'geometry' },

  // Load outputs
  { key: 'total_load_lb', label: 'Total Load', type: 'number', unit: 'lb', precision: 1, category: 'loads' },

  // Drive outputs
  { key: 'motor_hp', label: 'Motor HP', type: 'number', unit: 'HP', precision: 2, category: 'drive' },
  { key: 'gear_ratio', label: 'Gear Ratio', type: 'number', unit: ':1', precision: 2, category: 'drive' },

  // Status outputs
  { key: 'meets_requirements', label: 'Meets Requirements', type: 'boolean', category: 'status' },

  // Add ALL outputs from your calculate() function
];

// =============================================================================
// UI CONFIGURATION
// =============================================================================

const ui: ProductUIConfig = {
  tabs: [
    { id: 'summary', label: 'Summary', cardIds: ['config_summary', 'results_summary'] },
    { id: 'geometry', label: 'Geometry', cardIds: ['geometry_detail'] },
    { id: 'drive', label: 'Drive', cardIds: ['drive_detail'] },
    { id: 'issues', label: 'Issues', cardIds: ['issues_list'] },
  ],
  cards: [
    // requiresOutputKeys is the FAIL-CLOSED gate
    // Card only renders if ALL keys exist in outputsSchema
    { id: 'config_summary', title: 'Configuration', component: 'ConfigCard', requiresOutputKeys: [] },
    { id: 'results_summary', title: 'Results', component: 'ResultsCard', requiresOutputKeys: ['example_output_key'] },
    { id: 'geometry_detail', title: 'Geometry', component: 'GeometryCard', requiresOutputKeys: ['total_length_in'] },
    { id: 'drive_detail', title: 'Drive', component: 'DriveCard', requiresOutputKeys: ['motor_hp', 'gear_ratio'] },
    { id: 'issues_list', title: 'Issues', component: 'IssuesCard', requiresOutputKeys: [] },
  ],
};

// =============================================================================
// WRAPPER FUNCTIONS
// =============================================================================

function getDefaultInputs(): YourProductInputs {
  return {
    length_in: 120,
    width_in: 24,
    // Add all default input values
  };
}

function calculateWrapper(
  inputs: Record<string, unknown>,
  params?: Record<string, unknown>
): YourProductOutputs {
  // Call your actual calculation function
  // return calculate(inputs as YourProductInputs, params);

  // Placeholder - replace with actual calculation
  return {
    example_output_key: 42,
    another_output: 'result',
  } as YourProductOutputs;
}

function validateWrapper(inputs: Record<string, unknown>): Array<{ field: string; message: string; severity: 'error' | 'warning' }> {
  // Call your actual validation function
  // return validate(inputs as YourProductInputs);
  return [];
}

function buildOutputsV2(
  inputs: Record<string, unknown>,
  calcOutputs: YourProductOutputs
): {
  meta: { schema_version: string; generated_at_iso: string; source_model_version: string };
  inputs: Record<string, unknown>;
  outputs: YourProductOutputs;
  warnings: Array<{ message: string }>;
  errors: Array<{ message: string }>;
} {
  return {
    meta: {
      schema_version: '2.0.0',
      generated_at_iso: new Date().toISOString(),
      source_model_version: 'your_product_v1',
    },
    inputs,
    outputs: calcOutputs,
    warnings: (calcOutputs as any)?.warnings || [],
    errors: (calcOutputs as any)?.errors || [],
  };
}

// =============================================================================
// PRODUCT MODULE EXPORT
// =============================================================================

export const yourProductV1: ProductModule<YourProductInputs, YourProductOutputs> = {
  key: 'your_product_v1',
  name: 'Your Product Conveyor',
  version: '1.0.0',
  inputsSchema: [], // Define if needed
  outputsSchema,
  getDefaultInputs: getDefaultInputs as () => Record<string, unknown>,
  calculate: calculateWrapper as (inputs: Record<string, unknown>, params?: Record<string, unknown>) => Record<string, unknown>,
  validate: validateWrapper,
  buildOutputsV2: buildOutputsV2 as any,
  ui,
};

export default yourProductV1;
```

**Key points:**
- `outputsSchema` keys MUST match what `calculate()` returns
- `requiresOutputKeys` controls card visibility via fail-closed gate
- If a card requires a key not in `outputsSchema`, it won't render
- Use type casting (`as unknown as`) when wrapping typed functions for the generic interface

## Step 2: Register the Product

**Location:** `src/products/index.ts`

```typescript
// Add import at top
import { yourProductV1 } from './your_product_v1';

// In initializeProducts():
export function initializeProducts(): void {
  registerProduct(magneticConveyorV1);
  registerProduct(beltConveyorV1);
  registerProduct(yourProductV1);  // Add this line
}

// Add to exports at bottom
export { magneticConveyorV1, beltConveyorV1, yourProductV1 };
```

## Step 3: Create Output Components

**Location:** `app/components/outputs/{product}/`

Create 4 files:

### {Product}SummaryCards.tsx

```typescript
'use client';

import { OutputCard, ResultGrid } from '../shared';
import type { ResultItem } from '../shared';

interface CardProps {
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
}

export function ConfigSummaryCard({ inputs }: CardProps) {
  const results: ResultItem[] = [
    { label: 'Length', value: inputs?.length_in, unit: 'in' },
    { label: 'Width', value: inputs?.width_in, unit: 'in' },
    // Add more input fields
  ];

  return (
    <OutputCard title="Configuration">
      <ResultGrid results={results} />
    </OutputCard>
  );
}

export function ResultsSummaryCard({ outputs }: CardProps) {
  const results: ResultItem[] = [
    { label: 'Example Output', value: outputs?.example_output_key, unit: 'in', precision: 2 },
    { label: 'Motor HP', value: outputs?.motor_hp, unit: 'HP', precision: 2 },
    // Add more output fields
  ];

  return (
    <OutputCard title="Results Summary">
      <ResultGrid results={results} />
    </OutputCard>
  );
}

export function DriveSummaryCard({ outputs }: CardProps) {
  const results: ResultItem[] = [
    { label: 'Motor HP', value: outputs?.motor_hp, unit: 'HP', precision: 2 },
    { label: 'Gear Ratio', value: outputs?.gear_ratio, unit: ':1', precision: 2 },
  ];

  return (
    <OutputCard title="Drive Requirements">
      <ResultGrid results={results} />
    </OutputCard>
  );
}
```

### {Product}DetailCards.tsx

```typescript
'use client';

import { OutputCard, ResultGrid } from '../shared';
import type { ResultItem } from '../shared';

interface CardProps {
  outputs: Record<string, unknown>;
}

export function GeometryDetailCard({ outputs }: CardProps) {
  const results: ResultItem[] = [
    { label: 'Total Length', value: outputs.total_length_in, unit: 'in', precision: 2 },
    // Add geometry-specific outputs
  ];

  return (
    <OutputCard title="Geometry Details">
      <ResultGrid results={results} />
    </OutputCard>
  );
}

export function DriveDetailCard({ outputs }: CardProps) {
  const results: ResultItem[] = [
    { label: 'Motor HP', value: outputs.motor_hp, unit: 'HP', precision: 2 },
    { label: 'Gear Ratio', value: outputs.gear_ratio, unit: ':1', precision: 2 },
    // Add drive-specific outputs
  ];

  return (
    <OutputCard title="Drive Details">
      <ResultGrid results={results} />
    </OutputCard>
  );
}

export function LoadDetailCard({ outputs }: CardProps) {
  const results: ResultItem[] = [
    { label: 'Total Load', value: outputs.total_load_lb, unit: 'lb', precision: 1 },
    // Add load-specific outputs
  ];

  return (
    <OutputCard title="Load Analysis">
      <ResultGrid results={results} />
    </OutputCard>
  );
}
```

### {Product}OutputsTabs.tsx

```typescript
'use client';

import { useState } from 'react';
import { IssuesList } from '../shared';
import {
  ConfigSummaryCard,
  ResultsSummaryCard,
  DriveSummaryCard,
} from './{Product}SummaryCards';
import {
  GeometryDetailCard,
  DriveDetailCard,
  LoadDetailCard,
} from './{Product}DetailCards';

interface OutputsTabsProps {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  warnings?: Array<{ severity: 'error' | 'warning' | 'info'; field?: string; code?: string; message: string }>;
  errors?: Array<{ severity: 'error' | 'warning' | 'info'; field?: string; code?: string; message: string }>;
  className?: string;
}

type TabId = 'summary' | 'geometry' | 'drive' | 'issues';

export function YourProductOutputsTabs({
  inputs,
  outputs,
  warnings = [],
  errors = [],
  className = '',
}: OutputsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('summary');

  const allIssues = [...errors.map(e => ({ ...e, severity: 'error' as const })), ...warnings];
  const errorCount = errors.length;
  const warningCount = warnings.length;
  const totalIssues = errorCount + warningCount;

  const tabs: { id: TabId; label: string; badge?: number; badgeType?: 'error' | 'warning' }[] = [
    { id: 'summary', label: 'Summary' },
    { id: 'geometry', label: 'Geometry' },
    { id: 'drive', label: 'Drive' },
    {
      id: 'issues',
      label: 'Issues',
      badge: totalIssues > 0 ? totalIssues : undefined,
      badgeType: errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : undefined,
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ConfigSummaryCard inputs={inputs} />
            <ResultsSummaryCard outputs={outputs} />
            <DriveSummaryCard outputs={outputs} />
          </div>
        );
      case 'geometry':
        return (
          <div className="space-y-4">
            <GeometryDetailCard outputs={outputs} />
          </div>
        );
      case 'drive':
        return (
          <div className="space-y-4">
            <DriveDetailCard outputs={outputs} />
            <LoadDetailCard outputs={outputs} />
          </div>
        );
      case 'issues':
        return <IssuesList issues={allIssues} />;
      default:
        return null;
    }
  };

  return (
    <div className={'bg-white border border-gray-200 rounded-lg overflow-hidden ' + className}>
      {/* Tab Header */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={
                'px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ' +
                (activeTab === tab.id
                  ? 'border-blue-500 text-blue-700 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100')
              }
            >
              <span className="flex items-center gap-1.5">
                {tab.label}
                {tab.badge !== undefined && (
                  <span
                    className={
                      'px-1.5 py-0.5 text-xs rounded-full ' +
                      (tab.badgeType === 'error'
                        ? 'bg-red-100 text-red-700'
                        : tab.badgeType === 'warning'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-700')
                    }
                  >
                    {tab.badge}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4">{renderTabContent()}</div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-500 flex justify-between">
        <span>Your Product v1</span>
        <span>
          {errorCount === 0 ? (
            <span className="text-green-600">&#10003; Ready</span>
          ) : (
            <span className="text-red-600">{errorCount} error(s)</span>
          )}
        </span>
      </div>
    </div>
  );
}

export default YourProductOutputsTabs;
```

### index.ts

```typescript
export { YourProductOutputsTabs } from './YourProductOutputsTabs';
export {
  ConfigSummaryCard,
  ResultsSummaryCard,
  DriveSummaryCard,
} from './YourProductSummaryCards';
export {
  GeometryDetailCard,
  DriveDetailCard,
  LoadDetailCard,
} from './YourProductDetailCards';
```

## Step 4: Wire to Calculator

### Option A: Create Standalone Calculator

Create `app/components/{Product}ConveyorCalculatorApp.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { getProduct } from '@/products';
import { YourProductOutputsTabs } from './outputs/your_product';

const PRODUCT_KEY = 'your_product_v1';

export function YourProductCalculatorApp() {
  const [inputs, setInputs] = useState<Record<string, unknown>>({});
  const [outputs, setOutputs] = useState<Record<string, unknown>>({});
  const [warnings, setWarnings] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);

  useEffect(() => {
    const product = getProduct(PRODUCT_KEY);
    if (product) {
      setInputs(product.getDefaultInputs());
    }
  }, []);

  const handleCalculate = () => {
    const product = getProduct(PRODUCT_KEY);
    if (!product) return;

    const validationErrors = product.validate(inputs);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const result = product.calculate(inputs);
    setOutputs(result);
    setWarnings((result as any).warnings || []);
    setErrors((result as any).errors || []);
  };

  return (
    <div>
      {/* Input form */}
      {/* ... */}

      {/* Results */}
      <YourProductOutputsTabs
        inputs={inputs}
        outputs={outputs}
        warnings={warnings}
        errors={errors}
      />
    </div>
  );
}
```

### Option B: Add to Existing Calculator

Modify `app/components/BeltConveyorCalculatorApp.tsx`:

```typescript
import { MagneticOutputsTabs } from './outputs/magnetic';
import { BeltOutputsTabs } from './outputs/belt';
import { YourProductOutputsTabs } from './outputs/your_product';

// In the render section:
{productKey === 'magnetic_conveyor_v1' ? (
  <MagneticOutputsTabs
    inputs={inputs}
    outputs={outputs}
    warnings={warnings}
    errors={errors}
  />
) : productKey === 'your_product_v1' ? (
  <YourProductOutputsTabs
    inputs={inputs}
    outputs={outputs}
    warnings={warnings}
    errors={errors}
  />
) : (
  <BeltOutputsTabs
    inputs={inputs}
    outputs={outputs}
    warnings={warnings}
    errors={errors}
  />
)}
```

## Step 5: Test

### Create Registry Tests

**Location:** `src/products/__tests__/{product}-registry.test.ts`

```typescript
import { getProduct, canRenderCard, getProductKeys, hasOutputKey } from '../index';

describe('Your Product Registry', () => {
  describe('Registration', () => {
    it('should be registered', () => {
      expect(getProductKeys()).toContain('your_product_v1');
    });

    it('should have correct metadata', () => {
      const product = getProduct('your_product_v1');
      expect(product).toBeDefined();
      expect(product?.name).toBe('Your Product Conveyor');
      expect(product?.version).toBe('1.0.0');
    });

    it('should have outputsSchema', () => {
      const product = getProduct('your_product_v1');
      expect(product?.outputsSchema.length).toBeGreaterThan(0);
    });
  });

  describe('Output Keys', () => {
    it('should have product-specific keys', () => {
      expect(hasOutputKey('your_product_v1', 'example_output_key')).toBe(true);
      expect(hasOutputKey('your_product_v1', 'motor_hp')).toBe(true);
      expect(hasOutputKey('your_product_v1', 'gear_ratio')).toBe(true);
    });

    it('should NOT have magnetic-specific keys', () => {
      expect(hasOutputKey('your_product_v1', 'qty_magnets')).toBe(false);
      expect(hasOutputKey('your_product_v1', 'chain_length_in')).toBe(false);
      expect(hasOutputKey('your_product_v1', 'total_torque_in_lb')).toBe(false);
    });

    it('should NOT have belt-specific keys', () => {
      expect(hasOutputKey('your_product_v1', 'drive_T1_lbf')).toBe(false);
      expect(hasOutputKey('your_product_v1', 'drive_T2_lbf')).toBe(false);
      expect(hasOutputKey('your_product_v1', 'drive_pulley_diameter_in')).toBe(false);
    });
  });

  describe('Fail-Closed Gate (canRenderCard)', () => {
    it('should allow product-specific keys', () => {
      expect(canRenderCard('your_product_v1', ['example_output_key'])).toBe(true);
      expect(canRenderCard('your_product_v1', ['motor_hp', 'gear_ratio'])).toBe(true);
    });

    it('should BLOCK magnetic keys', () => {
      expect(canRenderCard('your_product_v1', ['qty_magnets'])).toBe(false);
      expect(canRenderCard('your_product_v1', ['total_torque_in_lb'])).toBe(false);
    });

    it('should BLOCK belt keys', () => {
      expect(canRenderCard('your_product_v1', ['drive_T1_lbf'])).toBe(false);
      expect(canRenderCard('your_product_v1', ['drive_pulley_diameter_in'])).toBe(false);
    });

    it('should BLOCK mixed keys', () => {
      expect(canRenderCard('your_product_v1', ['example_output_key', 'qty_magnets'])).toBe(false);
    });

    it('should allow empty keys (config cards)', () => {
      expect(canRenderCard('your_product_v1', [])).toBe(true);
    });
  });

  describe('Cross-Product Isolation', () => {
    it('your product keys should be BLOCKED on magnetic', () => {
      expect(canRenderCard('magnetic_conveyor_v1', ['example_output_key'])).toBe(false);
    });

    it('your product keys should be BLOCKED on belt', () => {
      expect(canRenderCard('belt_conveyor_v1', ['example_output_key'])).toBe(false);
    });
  });
});
```

### Run Tests

```bash
# Type check
npm run typecheck

# Run your product's tests
npm test -- src/products/__tests__/your-product-registry.test.ts

# Run all registry tests
npm test -- src/products/__tests__/

# Run test script if created
npx tsx scripts/test-your-product.ts
```

## Example: Adding CDLR Conveyor

CDLR (Chain Driven Live Roller) would have these specific outputs:

```typescript
const outputsSchema: OutputFieldDef[] = [
  // Roller outputs
  { key: 'roller_diameter_in', label: 'Roller Diameter', type: 'number', unit: 'in', precision: 3, category: 'rollers' },
  { key: 'roller_spacing_in', label: 'Roller Spacing', type: 'number', unit: 'in', precision: 2, category: 'rollers' },
  { key: 'roller_length_in', label: 'Roller Length', type: 'number', unit: 'in', precision: 2, category: 'rollers' },
  { key: 'roller_count', label: 'Number of Rollers', type: 'number', precision: 0, category: 'rollers' },

  // Chain/sprocket outputs
  { key: 'chain_pitch_in', label: 'Chain Pitch', type: 'number', unit: 'in', precision: 3, category: 'chain' },
  { key: 'sprocket_teeth', label: 'Sprocket Teeth', type: 'number', precision: 0, category: 'chain' },
  { key: 'sprocket_pd_in', label: 'Sprocket PD', type: 'number', unit: 'in', precision: 3, category: 'chain' },

  // Zone outputs
  { key: 'zone_count', label: 'Zone Count', type: 'number', precision: 0, category: 'zones' },
  { key: 'zone_length_in', label: 'Zone Length', type: 'number', unit: 'in', precision: 2, category: 'zones' },

  // Performance outputs
  { key: 'line_speed_fpm', label: 'Line Speed', type: 'number', unit: 'FPM', precision: 1, category: 'performance' },
  { key: 'accumulation_pressure_psi', label: 'Accumulation Pressure', type: 'number', unit: 'PSI', precision: 1, category: 'performance' },

  // Drive outputs
  { key: 'motor_hp', label: 'Motor HP', type: 'number', unit: 'HP', precision: 2, category: 'drive' },
  { key: 'gear_ratio', label: 'Gear Ratio', type: 'number', unit: ':1', precision: 2, category: 'drive' },
];
```

**CDLR does NOT have:**
- `qty_magnets`, `chain_length_in`, `total_torque_in_lb` (magnetic-specific)
- `drive_T1_lbf`, `drive_T2_lbf`, `drive_pulley_diameter_in` (belt-specific)

**CDLR tabs would be:**
- Summary | Rollers | Chain | Zones | Drive | Issues

## Checklist

- [ ] `src/products/{product}_v1/index.ts` created with `outputsSchema`
- [ ] Product registered in `src/products/index.ts`
- [ ] `app/components/outputs/{product}/` created with all components:
  - [ ] `{Product}SummaryCards.tsx`
  - [ ] `{Product}DetailCards.tsx`
  - [ ] `{Product}OutputsTabs.tsx`
  - [ ] `index.ts`
- [ ] Calculator wired to use new `OutputsTabs`
- [ ] Tests created in `src/products/__tests__/`
- [ ] `npm run typecheck` passes
- [ ] Cross-product isolation verified (`canRenderCard` tests)
- [ ] Manual testing: product-specific outputs appear, other product outputs do NOT appear

## Troubleshooting

### Card not rendering?

Check that ALL keys in `requiresOutputKeys` exist in `outputsSchema`. The fail-closed gate blocks if ANY key is missing.

```typescript
// If this card isn't rendering:
{ id: 'my_card', requiresOutputKeys: ['key_a', 'key_b'] }

// Verify BOTH keys exist:
hasOutputKey('your_product_v1', 'key_a')  // Must be true
hasOutputKey('your_product_v1', 'key_b')  // Must be true
```

### Wrong values showing?

Check field name mapping between `calculate()` output and `outputsSchema` keys. They must match exactly.

```typescript
// If calculate() returns:
{ myOutput: 42 }

// Then outputsSchema must have:
{ key: 'myOutput', ... }  // NOT 'my_output' or 'MyOutput'
```

### Import errors?

Check barrel exports in `index.ts` files:

```typescript
// src/products/index.ts
export { yourProductV1 } from './your_product_v1';

// app/components/outputs/your_product/index.ts
export { YourProductOutputsTabs } from './YourProductOutputsTabs';
```

### Type errors?

Ensure `ProductModule` interface is fully satisfied. Common issues:

1. Missing `getDefaultInputs`, `calculate`, `validate`, or `buildOutputsV2`
2. Wrong return types - use type casting if needed:
   ```typescript
   getDefaultInputs: getDefaultInputs as () => Record<string, unknown>,
   calculate: calculateWrapper as (inputs: Record<string, unknown>) => Record<string, unknown>,
   ```

### canRenderCard always returning false?

1. Check product is registered: `getProductKeys()` should include your product
2. Check initialization: `initializeProducts()` must be called before using registry
3. Check key spelling: keys are case-sensitive

## Architecture Reference

```
src/products/
├── index.ts                 # Registry + exports
├── types.ts                 # ProductModule, OutputFieldDef interfaces
├── registry.ts              # registerProduct, getProduct, canRenderCard
├── magnetic_conveyor_v1/
│   └── index.ts            # Magnetic product module (27 outputs)
├── belt_conveyor_v1/
│   └── index.ts            # Belt product module (56 outputs)
└── __tests__/
    ├── registry.test.ts
    ├── belt-registry.test.ts
    └── magnetic-registry.test.ts

app/components/outputs/
├── shared/
│   ├── OutputCard.tsx      # Reusable card wrapper
│   ├── ResultGrid.tsx      # Key-value display grid
│   ├── ResultRow.tsx       # Single row component
│   ├── IssuesList.tsx      # Errors/warnings display
│   ├── StatusBadge.tsx     # Status indicators
│   ├── formatValue.ts      # Value formatting utility
│   └── index.ts
├── magnetic/
│   ├── MagneticSummaryCards.tsx
│   ├── MagneticDetailCards.tsx
│   ├── MagneticOutputsTabs.tsx
│   └── index.ts
└── belt/
    ├── BeltSummaryCards.tsx
    ├── BeltDetailCards.tsx
    ├── BeltOutputsTabs.tsx
    └── index.ts
```
