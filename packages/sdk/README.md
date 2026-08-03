# ration

Cliente ligero para consumir la API de tasas de cambio Ratio. Cero dependencias de
runtime — usa exclusivamente `fetch` nativo (Node ≥ 18) — y build dual ESM/CJS con
tipos incluidos.

## Instalación

```bash
npm install ration
```

## Quickstart

```typescript
import ration from "ration";

// Tasa más reciente
const latest = await ration("ARS", undefined, { baseUrl: "https://api.ratio.example.com" });

// Tasa para una fecha específica (acepta 'DD/MM/YYYY', 'YYYY-MM-DD' o Date)
const historic = await ration("ARS", "14/04/2026", {
  baseUrl: "https://api.ratio.example.com",
});

console.log(latest);
// { isoCode: 'ARS', rate: '1234.56', source: 'bcv_oficial', extractedAt: 2026-08-02T10:00:00.000Z }
```

`baseUrl` y `apiKey` también pueden venir de las variables de entorno
`RATION_BASE_URL` y `RATION_API_KEY`, así que en un proyecto con `.env` cargado
alcanza con:

```typescript
import ration from "ration";

const latest = await ration("ARS");
```

## Opciones

`ration(isoCode: string, date?: string | Date, options?: RationOptions)`

| Opción      | Tipo     | Default                       | Descripción                                                             |
| ----------- | -------- | ----------------------------- | ----------------------------------------------------------------------- |
| `baseUrl`   | `string` | `process.env.RATION_BASE_URL` | URL base de la API Ratio. Requerido (por opción o variable de entorno). |
| `apiKey`    | `string` | `process.env.RATION_API_KEY`  | Se envía como header `x-api-key`. Omitir si la API no lo requiere.      |
| `source`    | `string` | —                             | Filtra por fuente específica (ej. `"bcv_oficial"`, `"paralelo"`).       |
| `timeoutMs` | `number` | `10000`                       | Timeout de la petición, vía `AbortController`.                          |

## Resultado

```typescript
interface ExchangeRateResult {
  isoCode: string;
  rate: string; // decimal como string, nunca number
  source: string;
  extractedAt: Date;
}
```

## Errores

Todos los errores del SDK extienden `RationError`, así que se pueden capturar en
conjunto o distinguir por tipo:

| Clase                | Cuándo se lanza                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `RationError`        | Clase base. También se usa directamente para errores de configuración (ej. falta `baseUrl`).                            |
| `InvalidDateError`   | El parámetro `date` no es `'DD/MM/YYYY'`, `'YYYY-MM-DD'`, ni un `Date` válido, o la fecha no existe (ej. `31/02/2026`). |
| `RationApiError`     | La API respondió con un status fuera de 2xx. Expone `status` y `detail` (del cuerpo Problem Details).                   |
| `RationTimeoutError` | La petición no respondió dentro de `timeoutMs`. Expone `timeoutMs`.                                                     |
| `RationNetworkError` | Falló la conexión (DNS, red caída, etc.) antes de recibir una respuesta.                                                |

```typescript
import ration, { RationError, RationApiError } from "ration";

try {
  await ration("XXX", undefined, { baseUrl: "https://api.ratio.example.com" });
} catch (error) {
  if (error instanceof RationApiError && error.status === 404) {
    console.log("Sin datos para esa moneda");
  } else if (error instanceof RationError) {
    console.error("Error del SDK:", error.message);
  }
}
```
