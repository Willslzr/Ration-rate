import { validateTargets } from "@ratio/core";
import type { ScrapeTarget } from "@ratio/core";

export const targets: ScrapeTarget[] = [
  {
    isoCode: "VES",
    sourceName: "bcv_oficial",
    url: "https://www.bcv.org.ve/",
    type: "html",
    selector: "#dolar > div > div > div.col-sm-6.col-xs-6.centrado.textp > strong",
    active: true,
  },
  {
    isoCode: "VES",
    sourceName: "paralelo",
    url: "https://www.monitordedivisavenezuela.com/",
    type: "html",
    selector:
      "#radix-\\:Rkuscq\\:-content-exchange-rates > div > div > div.grid.gap-6.md\\:grid-cols-3.mb-8 > div.rounded-lg.text-card-foreground.border-0.bg-gradient-to-br.from-violet-50.to-purple-50.shadow-xl.hover\\:shadow-2xl.transition-all.duration-300.hover\\:scale-105.overflow-hidden > div.p-6.pt-4 > div.text-3xl.font-bold.text-slate-800.mb-2",
    active: true,
  },
  {
    isoCode: "ARS",
    sourceName: "oficial",
    url: "https://dolarhoy.com/",
    type: "html",
    selector:
      "#home_0 > div:nth-child(2) > section > div > div > div.tile.is-ancestor > div.tile.is-parent.is-9.cotizacion.is-vertical > div > div.tile.is-parent.is-5 > div > div.values > div.venta > div.val",
    active: true,
  },
  {
    isoCode: "ARS",
    sourceName: "paralelo",
    url: "https://dolarhoy.com/",
    type: "html",
    selector:
      "#home_0 > div:nth-child(2) > section > div > div > div.tile.is-ancestor > div.tile.is-parent.is-9.cotizacion.is-vertical > div > div.tile.is-parent.is-7.is-vertical > div:nth-child(2) > div.values > div.venta > div.venta-wrapper > div.val",
    active: true,
  },
  {
    isoCode: "EUR",
    sourceName: "oficial",
    url: "https://www.ecb.europa.eu/home/html/index.es.html",
    type: "html",
    selector:
      "#main-wrapper > main > section > div > div:nth-child(3) > table > tbody > tr:nth-child(1) > td.stats-table-points",
    active: true,
  },
  {
    isoCode: "COP",
    sourceName: "oficial",
    url: "https://www.dolar-colombia.com/",
    type: "html",
    selector:
      "body > div.wrapper > div.container > div:nth-child(4) > div:nth-child(1) > div > div.box__content > h2 > span",
    active: true,
  },
  {
    isoCode: "MXN",
    sourceName: "banxico_fix",
    url: "https://www.banxico.org.mx/SieInternet/consultarDirectorioInternetAction.do?sector=6&accion=consultarCuadro&idCuadro=CF373&locale=es",
    type: "html",
    selector: "#tablaObservaciones_nodo_1_SF63528 tr:not(.sr-only) td:last-child",
    active: true,
  },
];

// Fail-fast: importing this module validates every target immediately.
validateTargets(targets);
