# CLAUDE.md — Proyecto "Ratio"

## 1. Qué es

Backend que extrae tasas de cambio (monedas sudamericanas y EUR frente a USD, foco en BCV oficial y paralelo de Venezuela), las persiste como histórico inmutable y las expone vía API REST + SDK NPM (`ration`).

Monorepo pnpm con arquitectura hexagonal:

```
packages/
├── core/   # Dominio puro: entidades, value objects, puertos, casos de uso. Sin dependencias externas.
├── api/    # Adaptadores: Prisma, scrapers (Cheerio/Playwright), notificadores, servidor Fastify, cron.
└── sdk/    # Paquete NPM publicable "ration". Solo depende de fetch nativo.
```

**Regla de dependencias:** `api` y `sdk` pueden depender de `core`; `core` no depende de nadie. Toda la lógica de negocio vive en `core`; los adaptadores solo implementan los puertos definidos allí.

## 2. Comandos

Desde la raíz (corren en todos los workspaces):

```
pnpm build       # tsc por paquete
pnpm lint        # eslint .
pnpm format      # prettier --write .
pnpm typecheck   # tsc --noEmit por paquete
pnpm test        # vitest run (proyectos por workspace)
```

Para correr un solo paquete:

```
pnpm --filter @ratio/core run typecheck
pnpm --filter @ratio/api run build
pnpm --filter ration run test
```

Nota: `pnpm typecheck` corre `build` primero — cuando un paquete importa de otro del monorepo (ej. `api` de `@ratio/core`), TypeScript resuelve esos tipos vía el `dist/` del paquete dependido, no desde su código fuente. Sin este build previo, un checkout limpio rompe el typecheck.

## 3. Convenciones de código

- TypeScript `strict` en todo el monorepo. **Nunca `any` explícito** (ESLint lo bloquea como error).
- Arquitectura hexagonal: los **puertos** (interfaces) viven en `core`; los **adaptadores** (Prisma, Cheerio, Playwright, Fastify, webhooks) viven en `api` e implementan esos puertos. `core` nunca importa nada de `api`.
- Inyección de dependencias por constructor: los casos de uso reciben interfaces, nunca implementaciones concretas ni instancian adaptadores.
- Errores de dominio siempre tipados (clases que extienden `DomainError`, con `code`). Prohibido `throw` de strings o errores genéricos sin tipar.
- Las tasas de cambio se manejan **siempre como `string` decimal**, nunca como `number`/float, ni en dominio ni en persistencia (evita errores de coma flotante).

## 4. Testing

- Todo caso de uso y todo adaptador lleva tests (Vitest).
- Los tests de scraping usan **fixtures HTML locales**; nunca dependen de red real ni de sitios externos.

## 5. Regla de commits (crítica)

Después de cada funcionalidad, fix o refactor completado y **con tests en verde**, hacer inmediatamente un commit atómico:

- Conventional Commits con scope del paquete cuando aplique, ej: `feat(core): add CurrencyCode value object`.
- **Prohibido** acumular varios cambios sin relación en un mismo commit.
- `main` siempre en verde: lint + typecheck + tests deben pasar en cada commit.
