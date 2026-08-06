-- Vincular tareas a zonas y elementos de habitación
ALTER TABLE public.tasks
  ADD COLUMN zone_id uuid REFERENCES public.zones(id) ON DELETE SET NULL,
  ADD COLUMN measurement_id uuid REFERENCES public.measurements(id) ON DELETE SET NULL;
