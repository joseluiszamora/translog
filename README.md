# TransLog Control Financiero

Aplicacion web MVP para control financiero y operativo de una empresa de transporte de carga. La primera version esta construida como un monolito modular con:

- servidor Node.js sin dependencias externas,
- API REST para viajes, cuentas por cobrar, cuentas por pagar, tesoreria, reportes y auditoria,
- SPA responsive servida desde `public/`,
- datos seed listos para demo y validacion funcional.

## Ejecutar

```bash
npm start
```

Luego abre `http://localhost:3000`.

## Scripts

- `npm start`: ejecuta el servidor
- `npm run dev`: ejecuta el servidor en modo watch

## Modulos implementados

- Seguridad administrativa base con usuario actual, roles, permisos y parametros
- Maestros operativos: clientes, proveedores, vehiculos, conductores, rutas y categorias
- Viajes con ingreso esperado, anticipo, costos asociados y utilidad
- Cuentas por cobrar con cobros parciales
- Cuentas por pagar con pagos parciales
- Caja y bancos con movimientos derivados
- Dashboard financiero
- Reporte de rentabilidad
- Bitacora de auditoria

## Estructura

- `src/server.js`: servidor HTTP y entrega de archivos estaticos
- `src/api/router.js`: rutas REST
- `src/services/data-store.js`: dominio en memoria, reglas y calculos financieros
- `src/domain/seed-data.js`: datos iniciales
- `public/`: interfaz web responsive
- `docs/architecture.md`: decisiones arquitectonicas y evolucion sugerida

## Limitaciones actuales

- Los datos viven en memoria y se reinician al reiniciar el servidor
- La autenticacion esta simulada con un usuario administrador seed
- No hay base de datos PostgreSQL real todavia
- No existe cierre contable ni anulacion formal de documentos

## Siguiente evolucion recomendada

1. Sustituir `data-store.js` por repositorios sobre PostgreSQL.
2. Agregar autenticacion real y permisos por endpoint.
3. Introducir adjuntos para comprobantes y rendiciones.
4. Incorporar exportaciones, alertas y conciliacion bancaria.
