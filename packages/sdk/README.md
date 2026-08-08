# ration

SDK de TypeScript para consultar **tasas de cambio del dólar** en monedas sudamericanas — histórico y en tiempo real. Bolívar venezolano (oficial BCV y paralelo), peso argentino (oficial y paralelo), euro, peso colombiano y peso mexicano. Cero dependencias de runtime — usa exclusivamente `fetch` nativo (Node ≥ 18) — y build dual ESM/CJS con tipos incluidos.

## Monedas soportadas

| Moneda             | Código ISO | Fuentes (`source`)        |
| ------------------ | ---------- | ------------------------- |
| Bolívar venezolano | `VES`      | `bcv_oficial`, `paralelo` |
| Peso argentino     | `ARS`      | `oficial`, `paralelo`     |
| Euro               | `EUR`      | `oficial`                 |
| Peso colombiano    | `COP`      | `oficial`                 |
| Peso mexicano      | `MXN`      | `banxico_fix`             |

## Instalación

```bash
npm install @willslzr/ration
```

## Quickstart

El SDK necesita saber contra qué instancia de la [API Ratio](https://github.com/Willslzr/Ration-rate) hablar. Hay una instancia en vivo, gratis y pública en `https://ration-rate.onrender.com` — las lecturas no requieren API key, así que alcanza con apuntar `baseUrl` ahí (o desplegar la tuya propia siguiendo la guía de [Deploy](https://github.com/Willslzr/Ration-rate#deploy) del repo). La forma recomendada es vía variable de entorno, así el código nunca hardcodea la URL:

```bash
# .env
RATION_BASE_URL="https://ration-rate.onrender.com"   # o la URL de tu propio despliegue
```

```typescript
import ration from "@willslzr/ration";

const latest = await ration("VES");
console.log(latest);
// { isoCode: 'VES', rate: '748.78640000', source: 'bcv_oficial', extractedAt: 2026-08-03T21:52:02.719Z }
```

También se puede pasar explícitamente por opción, sin depender de la variable de entorno:

```typescript
import ration from "@willslzr/ration";

// Tasa más reciente
const latest = await ration("VES", undefined, { baseUrl: "https://ration-rate.onrender.com" });

// Tasa para una fecha específica (acepta 'DD/MM/YYYY', 'YYYY-MM-DD' o Date)
const historic = await ration("VES", "14/04/2026", {
  baseUrl: "https://ration-rate.onrender.com",
});
```

> Render's free tier duerme el proceso tras 15 min sin tráfico — la primera petición después de un rato inactivo puede tardar unos segundos en despertar el servicio antes de responder.

## Opciones

`ration(isoCode: string, date?: string | Date, options?: RationOptions)`

| Opción      | Tipo     | Default                       | Descripción                                                                                                                                                                    |
| ----------- | -------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `baseUrl`   | `string` | `process.env.RATION_BASE_URL` | URL base de tu instancia de la API Ratio. Requerido (por opción o env var).                                                                                                    |
| `apiKey`    | `string` | `process.env.RATION_API_KEY`  | Se envía como header `x-api-key`. No hace falta contra la instancia de referencia (las lecturas son públicas) — solo si corres tu propio fork con auth habilitada en lecturas. |
| `source`    | `string` | —                             | Filtra por fuente específica (ej. `"bcv_oficial"`, `"paralelo"`).                                                                                                              |
| `timeoutMs` | `number` | `10000`                       | Timeout de la petición, vía `AbortController`.                                                                                                                                 |

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
| `RationError`        | Clase base. También se usa directamente para errores de configuración (ej. falta `baseUrl`) o respuesta inesperada.     |
| `InvalidDateError`   | El parámetro `date` no es `'DD/MM/YYYY'`, `'YYYY-MM-DD'`, ni un `Date` válido, o la fecha no existe (ej. `31/02/2026`). |
| `RationApiError`     | La API respondió con un status fuera de 2xx. Expone `status` y `detail` (del cuerpo Problem Details).                   |
| `RationTimeoutError` | La petición no respondió dentro de `timeoutMs`. Expone `timeoutMs`.                                                     |
| `RationNetworkError` | Falló la conexión (DNS, red caída, etc.) antes de recibir una respuesta.                                                |

```typescript
import ration, { RationError, RationApiError } from "@willslzr/ration";

try {
  await ration("VES");
} catch (error) {
  if (error instanceof RationApiError && error.status === 404) {
    console.log("Sin datos para esa moneda");
  } else if (error instanceof RationError) {
    console.error("Error del SDK:", error.message);
  }
}
```

## Licencia

MIT © [willslzr](https://github.com/Willslzr)
