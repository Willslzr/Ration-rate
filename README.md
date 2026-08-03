# Ratio

API y SDK para consultar tasas de cambio históricas de monedas sudamericanas y el Euro frente al dólar estadounidense.

## Estructura del monorepo

```
ratio/
├── packages/
│   ├── core/   # Dominio puro: entidades, value objects, puertos y casos de uso
│   ├── api/    # Adaptadores: persistencia, scraping, notificaciones y servidor HTTP
│   └── sdk/    # Paquete NPM publicable "ration"
```

## Docker

### Quickstart

```bash
cp .env.example .env   # opcional: todas las variables tienen default en docker-compose.yml
docker compose up -d --build
curl http://localhost:3000/health
# => {"status":"ok","database":"ok"}
```

`docker compose up` levanta dos servicios:

- **postgres** (`postgres:16`): datos persistidos en el volumen nombrado `postgres-data`, con `pg_isready` como healthcheck.
- **api**: construida desde el `Dockerfile` de la raíz. Arranca solo cuando `postgres` está `healthy` (`depends_on: condition: service_healthy`), corre las migraciones y expone el puerto `3000`.

### Flujo de migración

El contenedor de la API corre `prisma migrate deploy` en cada arranque, **antes** de levantar el servidor (ver `docker-entrypoint.sh`). Es idempotente: las migraciones ya aplicadas se saltan, así que reiniciar el contenedor (o escalarlo) no reintenta nada innecesario. No hay un paso de migración manual — es parte del ciclo de vida del contenedor.

### Dos schemas de Prisma, un mismo modelo

Las migraciones de Prisma (y el motor de consultas del cliente generado) son específicas por proveedor, así que un solo `schema.prisma` no puede servir tanto a SQLite como a PostgreSQL a la vez:

|             | SQLite (dev/tests)                  | PostgreSQL (Docker/producción)                 |
| ----------- | ----------------------------------- | ---------------------------------------------- |
| Schema      | `packages/api/prisma/schema.prisma` | `packages/api/prisma/postgresql/schema.prisma` |
| Migraciones | `packages/api/prisma/migrations/`   | `packages/api/prisma/postgresql/migrations/`   |
| Config      | `packages/api/prisma.config.ts`     | `packages/api/prisma.postgresql.config.ts`     |

Ambos schemas definen el mismo modelo `ExchangeRate`; solo cambia `provider` y el historial de migraciones. `createPrismaClient()` elige el driver adapter correcto (`@prisma/adapter-better-sqlite3` o `@prisma/adapter-pg`) según el esquema de `DATABASE_URL` — pero el **cliente generado** debe corresponder al mismo proveedor (por eso la imagen de Docker corre `prisma generate --config=prisma.postgresql.config.ts` en su etapa de build). Esto se verificó de punta a punta contra un Postgres real antes de escribir el Dockerfile.

### Por qué la imagen no incluye Chromium

El `Dockerfile` **no** instala las dependencias del sistema que necesita Playwright/Chromium. El único target de tipo `'spa'` en `targets.config.ts` está `active: false`; el target real (`bcv_oficial`) es `'html'` (Cheerio, sin navegador). Instalar Chromium agregaría ~300+ MB para una ruta de código que nunca se ejecuta hoy. Si se activa un target `'spa'` real, el propio `Dockerfile` documenta el comando a agregar:

```dockerfile
RUN pnpm --filter @ratio/api exec playwright install --with-deps chromium
```

### Variables de entorno (docker-compose)

Ver `.env.example` en la raíz. Todas tienen un default en `docker-compose.yml`, así que `docker compose up` funciona sin crear un `.env`; copiarlo solo es necesario para cambiar algo (claves de API reales, credenciales de Postgres, webhooks, etc.).

> Este README se ampliará en la fase final del proyecto con arquitectura, endpoints y ejemplos de uso del SDK.
