# ration

SDK de TypeScript para consultar **tasas de cambio del dólar** en monedas sudamericanas — histórico y en tiempo real. Bolívar venezolano (oficial BCV y paralelo), peso argentino (oficial y paralelo), euro y peso colombiano, con más monedas en camino (peso mexicano). Cero dependencias de runtime — usa exclusivamente `fetch` nativo (Node ≥ 18) — y build dual ESM/CJS con tipos incluidos.

## Monedas soportadas

| Moneda             | Código ISO | Fuentes (`source`)        |
| ------------------ | ---------- | ------------------------- |
| Bolívar venezolano | `VES`      | `bcv_oficial`, `paralelo` |
| Peso argentino     | `ARS`      | `oficial`, `paralelo`     |
| Euro               | `EUR`      | `oficial`                 |
| Peso colombiano    | `COP`      | `oficial`                 |

## Instalación

```bash
npm install @willslzr/ration
```

## Quickstart

El SDK necesita saber contra qué instancia de la [API Ratio](https://github.com/Willslzr/Ration-rate) hablar. La forma recomendada es vía variables de entorno, así el código nunca hardcodea la URL:

```bash
# .env
RATION_BASE_URL="https://tu-instancia-de-ratio.example.com"   # reemplaza por donde despliegues tu API
RATION_API_KEY="tu-api-key"
```

```typescript
import ration from "@willslzr/ration";

const latest = await ration("VES");
console.log(latest);
// { isoCode: 'VES', rate: '36.5842', source: 'bcv_oficial', extractedAt: 2026-08-02T10:00:00.000Z }
```

También se pueden pasar explícitamente por opción, sin depender de variables de entorno:

```typescript
import ration from "@willslzr/ration";

// Tasa más reciente
const latest = await ration("VES", undefined, {
  baseUrl: "https://tu-instancia-de-ratio.example.com",
  apiKey: "tu-api-key",
});

// Tasa para una fecha específica (acepta 'DD/MM/YYYY', 'YYYY-MM-DD' o Date)
const historic = await ration("VES", "14/04/2026", {
  baseUrl: "https://tu-instancia-de-ratio.example.com",
  apiKey: "tu-api-key",
});
```

## Opciones

`ration(isoCode: string, date?: string | Date, options?: RationOptions)`

| Opción      | Tipo     | Default                       | Descripción                                                                 |
| ----------- | -------- | ----------------------------- | --------------------------------------------------------------------------- |
| `baseUrl`   | `string` | `process.env.RATION_BASE_URL` | URL base de tu instancia de la API Ratio. Requerido (por opción o env var). |
| `apiKey`    | `string` | `process.env.RATION_API_KEY`  | Se envía como header `x-api-key`. Omitir si la API no lo requiere.          |
| `source`    | `string` | —                             | Filtra por fuente específica (ej. `"bcv_oficial"`, `"paralelo"`).           |
| `timeoutMs` | `number` | `10000`                       | Timeout de la petición, vía `AbortController`.                              |

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

## Release (publicar una nueva versión)

Publicar a npm es automático vía `.github/workflows/release.yml` — nunca se corre `npm publish` a mano. El flujo:

1. Sube la versión en `packages/sdk/package.json` (`"version": "0.1.1"`, siguiendo [semver](https://semver.org)) y commitea el cambio (ej. `chore(sdk): bump version to 0.1.1`).
2. Crea un tag con el prefijo `sdk-v` que coincida **exactamente** con esa versión:
   ```bash
   git tag sdk-v0.1.1
   git push origin sdk-v0.1.1
   ```
3. El push del tag dispara el workflow, que: verifica que la versión del tag coincide con `package.json` (falla si no coinciden), instala, compila el sdk y sus dependencias de workspace (`@ratio/core`, `@ratio/api`), corre solo los tests del sdk, y publica con `npm publish --provenance --access public`.

Requiere el secret `NPM_TOKEN` configurado en el repo (Settings → Secrets and variables → Actions), con un [access token](https://docs.npmjs.com/creating-and-viewing-access-tokens) de npm con permiso de publicación sobre `@willslzr/ration`.

## Licencia

MIT © [willslzr](https://github.com/Willslzr)
