-- Ampliar categorías de medidas para incluir muebles e instalaciones
ALTER TABLE public.measurements DROP CONSTRAINT measurements_category_check;
ALTER TABLE public.measurements ADD CONSTRAINT measurements_category_check
  CHECK (category IN ('door','window','wall','floor','ceiling','radiator','furniture','fixture','other'));

-- Política SELECT que permite al creador ver su hogar recién creado
-- (antes de que se añada como miembro)
create policy "Creador puede ver su hogar"
  on public.households for select
  using (created_by = auth.uid());
