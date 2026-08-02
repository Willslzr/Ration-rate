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

> Este README se ampliará en la fase final del proyecto con arquitectura, quickstart, endpoints y variables de entorno.
