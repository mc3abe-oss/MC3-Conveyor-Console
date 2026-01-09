-- Migration: Add HOLLOW_SHAFT_BUSHING to vendor_component_type enum
-- This component type is for bushings that reduce the hollow shaft bore diameter
-- for NORD FLEXBLOC gear units.

-- Add new enum value
ALTER TYPE vendor_component_type ADD VALUE IF NOT EXISTS 'HOLLOW_SHAFT_BUSHING';
