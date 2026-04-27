# Arquitectura de la implementacion actual

## Enfoque

La solucion actual implementa un **monolito modular ejecutable** que prioriza:

- validar el flujo del negocio,
- mantener el viaje como eje financiero-operativo,
- evitar dependencias externas para que el MVP corra de inmediato,
- dejar una migracion simple hacia un stack con frontend y backend separados.

## Capas

### `src/domain`

Contiene datos iniciales del dominio: usuarios, maestros, viajes, gastos, cuentas y movimientos.

### `src/services`

Contiene la logica del negocio:

- rentabilidad por viaje,
- saldo pendiente de cuentas por cobrar y pagar,
- impacto en caja y bancos,
- generacion de auditoria,
- dashboard y reportes.

### `src/api`

Expone la logica por HTTP con un contrato REST basico:

- `GET /api/bootstrap`
- `GET /api/dashboard`
- `GET|POST /api/trips`
- `POST /api/trips/:id/expenses`
- `GET /api/receivables`
- `POST /api/receivables/:id/payments`
- `GET /api/payables`
- `POST /api/payables/:id/payments`
- `GET /api/cash-movements`
- `GET /api/reports/profitability`
- `GET /api/audit-logs`

### `public`

SPA ligera con navegacion por vistas, formularios para acciones principales y paneles de lectura.

## Reglas implementadas

- El viaje recalcula utilidad con anticipo y gastos asociados.
- Un gasto pagado impacta caja/bancos de inmediato.
- Un gasto pendiente genera una cuenta por pagar.
- Un cobro impacta caja/bancos y reduce la cuenta por cobrar.
- Un pago a proveedor impacta caja/bancos y reduce la cuenta por pagar.
- Toda accion de escritura genera un registro en auditoria.

## Evolucion sugerida

### Hacia produccion

- Reemplazar la capa en memoria por PostgreSQL + ORM.
- Separar frontend en React/Next.js y backend en NestJS/FastAPI.
- Incorporar autenticacion JWT/sesiones y middleware de permisos.
- Agregar estados cerrados con anulacion en vez de eliminacion.
- Añadir soporte de adjuntos, exportaciones y alertas.

### Modulos futuros

- mantenimiento de flota,
- rendicion de anticipos,
- multi-sucursal,
- tablero gerencial avanzado,
- integracion fiscal/contable segun pais.
