-- Update belt_catalog PIW/PIL to realistic decimal values
-- PIW/PIL are lb/in belt weight coefficients, typically in 0.05-0.30 range

update public.belt_catalog
set piw = 0.109, pil = 0.090
where catalog_key = 'STD_PVC_120PIW';

update public.belt_catalog
set piw = 0.138, pil = 0.110
where catalog_key = 'FG_PU_CLEAR_MATTE_150PIW';

update public.belt_catalog
set piw = 0.175, pil = 0.140
where catalog_key = 'HD_PVC_200PIW';

update public.belt_catalog
set piw = 0.156, pil = 0.125
where catalog_key = 'URETHANE_180PIW';
