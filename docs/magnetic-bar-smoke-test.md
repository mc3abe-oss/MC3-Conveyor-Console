# Magnetic Bar Configuration - UI Smoke Test Checklist

> **Version:** 1.0
> **Last Updated:** January 2026

## Pre-requisites

- [ ] Dev server running (`npm run dev`)
- [ ] Database seeded with magnet catalog data

## Test Cases

### 1. Create New Magnetic Conveyor Quote

- [ ] Navigate to magnetic conveyor configurator
- [ ] Verify magnet bar configuration section is visible (collapsible)
- [ ] Default state shows "Bar Template" tab active

### 2. Bar Builder - Quick Fill

- [ ] Click "Ceramic Only" quick fill button
- [ ] Verify bar preview shows 3 ceramic magnets (for 12" bar)
- [ ] Verify capacity displays ~0.362 lb
- [ ] Click "+1 Neo" quick fill
- [ ] Verify bar shows 2 ceramic + 1 Neo
- [ ] Verify capacity increases to ~0.52 lb
- [ ] Click "+2 Neo" quick fill
- [ ] Verify bar shows 1 ceramic + 2 Neo
- [ ] Verify capacity displays ~0.717 lb

### 3. Bar Builder - Manual Configuration

- [ ] Clear bar configuration
- [ ] Add ceramic magnet via magnet selector
- [ ] Verify magnet appears in bar preview
- [ ] Add Neo magnet
- [ ] Verify capacity updates in real-time
- [ ] Remove a magnet
- [ ] Verify capacity updates

### 4. Pattern Configuration

- [ ] Switch to "Pattern" tab
- [ ] Default mode is "All Same"
- [ ] Pattern preview shows all bars same color
- [ ] Select "Alternating" mode
- [ ] Verify secondary template selector appears
- [ ] Pattern preview shows A-B-A-B pattern
- [ ] Select "Interval" mode
- [ ] Verify interval count input appears
- [ ] Set interval to 4
- [ ] Pattern preview shows A-A-A-B-A-A-A-B pattern

### 5. Throughput Integration

- [ ] Configure bar with ceramic + 2 Neo
- [ ] Verify "Achieved Throughput" output updates
- [ ] Verify "Throughput Margin" shows in outputs
- [ ] Compare ceramic-only vs Neo throughput (Neo should be higher)

### 6. Save and Reload

- [ ] Save quote/configuration
- [ ] Close and reopen quote
- [ ] Verify bar configuration persists:
  - [ ] Ceramic count matches
  - [ ] Neo count matches
  - [ ] Pattern mode matches
  - [ ] Capacity values match

### 7. Edge Cases

- [ ] Change magnet width to 24"
- [ ] Verify more magnets fit in bar
- [ ] Change to Heavy Duty class
- [ ] Verify coefficient of friction shows 0.15
- [ ] Verify safety factor shows 1.5

### 8. Validation

- [ ] Set very high load requirement (10000 lbs/hr)
- [ ] Set low belt speed (10 FPM)
- [ ] Verify low throughput margin warning appears
- [ ] Upgrade bar to max Neo
- [ ] Verify margin improves

## Test Results

| Test Case | Pass/Fail | Notes |
|-----------|-----------|-------|
| Create Quote | | |
| Quick Fill | | |
| Manual Config | | |
| Pattern Config | | |
| Throughput | | |
| Save/Reload | | |
| Edge Cases | | |
| Validation | | |

## Issues Found

| Issue | Severity | Description |
|-------|----------|-------------|
| | | |

---

Tested by: _______________
Date: _______________
