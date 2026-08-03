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
    // Placeholder for the VES "dólar paralelo" source — replace with a real,
    // vetted target and flip `active` to true once it's verified.
    isoCode: "VES",
    sourceName: "paralelo",
    url: "https://example.com/dolar-paralelo",
    type: "spa",
    selector: "#precio-paralelo",
    active: false,
  },
];

// Fail-fast: importing this module validates every target immediately.
validateTargets(targets);
