-- Esquema inicial de referencia para VAI BI

create table if not exists dim_periodo (
  id serial primary key,
  anio integer not null,
  mes integer not null,
  anio_mes varchar(7) not null unique,
  nombre_mes varchar(20) not null
);

create table if not exists fact_objetivos (
  id serial primary key,
  anio_mes varchar(7) not null,
  proceso varchar(50) not null,
  plan_ventas numeric,
  plan_instalaciones numeric,
  plan_bajas numeric,
  plan_instalaciones_rechazadas numeric,
  plan_facturacion numeric,
  plan_conexiones_finales numeric,
  plan_facturacion_acumulada numeric,
  plan_arpu numeric,
  plan_upselling numeric,
  source_sheet varchar(120),
  source_row integer,
  imported_at timestamptz not null default now()
);

create unique index if not exists fact_objetivos_anio_mes_proceso_idx
  on fact_objetivos(anio_mes, proceso);

create table if not exists objective_import_runs (
  id serial primary key,
  source_url text not null,
  workbook_name varchar(255),
  imported_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb
);

create table if not exists objective_sheet_rows (
  id bigserial primary key,
  import_id integer not null references objective_import_runs(id) on delete cascade,
  sheet_name varchar(150) not null,
  row_number integer not null,
  row_data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists objective_sheet_rows_import_sheet_idx
  on objective_sheet_rows(import_id, sheet_name, row_number);

create table if not exists objective_summary_metrics (
  id bigserial primary key,
  import_id integer not null references objective_import_runs(id) on delete cascade,
  metric_key varchar(120) not null,
  metric_label varchar(255) not null,
  metric_value_numeric numeric,
  metric_value_text text,
  source_sheet varchar(120) not null,
  source_row integer not null,
  created_at timestamptz not null default now()
);

create unique index if not exists objective_summary_metrics_import_metric_idx
  on objective_summary_metrics(import_id, metric_key);

create table if not exists fact_conexiones (
  conexion_id bigint primary key,
  cliente_id bigint not null,
  fecha_alta timestamp,
  fecha_baja timestamp,
  enabled boolean,
  deleted boolean,
  archived boolean,
  plan_nombre varchar(255),
  precio_plan numeric,
  tecnologia varchar(50),
  zona varchar(100),
  origen_comercial varchar(100),
  motivo_baja varchar(100)
);

create table if not exists mart_directorio_mensual (
  anio_mes varchar(7) primary key,
  conexiones_activas integer,
  ventas integer,
  bajas integer,
  facturacion numeric,
  cobranza numeric,
  arpu numeric
);

create table if not exists sync_snapshots (
  id serial primary key,
  kind varchar(100) not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
