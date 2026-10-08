#!/usr/bin/env node
// Command-line front end for legal-binder-tools. Each command prints plain
// text by default, or JSON with --json.

import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import {
  batesSequence,
  generateSequence,
  exhibitIds,
  exhibitList,
  exhibitListCsv,
  exhibitListMarkdown,
  exhibitLabel,
  recommendCut,
  cutOptions,
  tabLayout,
  binderPlan,
  capacityChart,
  PAPER,
} from "../index.js";

const HELP = `Usage: legal-binder-tools <command> [options]

Commands:
  bates      --prefix ABC --start 1 --count 5 [--digits 6] [--suffix=-CONF]
  sequence   --style numbers|letters|roman|months [--start 1] --count 10
  exhibits   [--numbering numbers|letters|roman] [--start 1] [--prefix PX-]
             [--party "Plaintiff's"] --count 5
  list       --file descriptions.txt [--format csv|markdown] [--numbering ...]
             [--start 1] [--prefix PX-]   (one description per line; "-" reads stdin)
  cut        --tabs 12 [--cut 5] [--edge 11]
  binder     --sheets 250 [--paper 20|24|28] [--tabs 10] [--tab-stock 90|110|poly]
             [--protectors 0]
  chart      binder capacity chart (sheets per ring size)

Options:
  --json     print JSON instead of text
  --help     show this help
`;

const options = {
  prefix: { type: "string" },
  suffix: { type: "string" },
  start: { type: "string" },
  count: { type: "string" },
  digits: { type: "string" },
  style: { type: "string" },
  numbering: { type: "string" },
  party: { type: "string" },
  file: { type: "string" },
  format: { type: "string" },
  tabs: { type: "string" },
  cut: { type: "string" },
  edge: { type: "string" },
  sheets: { type: "string" },
  paper: { type: "string" },
  "tab-stock": { type: "string" },
  protectors: { type: "string" },
  json: { type: "boolean" },
  help: { type: "boolean", short: "h" },
};

function int(v, name, fallback) {
  if (v === undefined) {
    if (fallback === undefined) throw new Error(`--${name} is required`);
    return fallback;
  }
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`--${name} must be a number (got "${v}")`);
  return n;
}

const inches = (x) => `${x.toFixed(2)}"`;

function run(argv) {
  const { values: o, positionals } = parseArgs({ args: argv, options, allowPositionals: true });
  const cmd = positionals[0];
  if (o.help || !cmd) return { text: HELP };

  switch (cmd) {
    case "bates": {
      const out = batesSequence({
        prefix: o.prefix ?? "",
        suffix: o.suffix ?? "",
        digits: int(o.digits, "digits", 6),
        start: int(o.start, "start", 1),
        count: int(o.count, "count"),
      });
      return { json: out, text: out.join("\n") };
    }
    case "sequence": {
      if (!o.style) throw new Error("--style is required");
      const out = generateSequence(o.style, o.start ?? "", int(o.count, "count"));
      return { json: out, text: out.join("\n") };
    }
    case "exhibits": {
      const ids = exhibitIds({ prefix: o.prefix ?? "", numbering: o.numbering ?? "numbers", start: o.start }, int(o.count, "count"));
      const out = o.party ? ids.map((id) => exhibitLabel(o.party, id)) : ids;
      return { json: out, text: out.join("\n") };
    }
    case "list": {
      if (!o.file) throw new Error("--file is required");
      const text = readFileSync(o.file === "-" ? 0 : o.file, "utf8");
      const rows = exhibitList({ descriptions: text, prefix: o.prefix ?? "", numbering: o.numbering ?? "numbers", start: o.start });
      const format = o.format ?? "csv";
      if (format !== "csv" && format !== "markdown") throw new Error('--format must be "csv" or "markdown"');
      return { json: rows, text: (format === "csv" ? exhibitListCsv(rows) : exhibitListMarkdown(rows)).trimEnd() };
    }
    case "cut": {
      const tabs = int(o.tabs, "tabs");
      const edgeIn = int(o.edge, "edge", 11);
      if (o.cut !== undefined) {
        const layout = tabLayout(tabs, int(o.cut, "cut"), { edgeIn });
        const lines = [
          `1/${layout.cut} cut, ${layout.edgeIn}" edge, ${layout.workingIn}" working length: ${layout.banks} bank(s), tabs ${inches(layout.tabIn)} long`,
          ...layout.positions.map((p) => `tab ${p.tab}: bank ${p.bank}, position ${p.position}, ${inches(p.startIn)} to ${inches(p.endIn)} from the top`),
        ];
        return { json: layout, text: lines.join("\n") };
      }
      const best = recommendCut(tabs, { edgeIn });
      const all = cutOptions(tabs, { edgeIn });
      const lines = [
        `Recommended: 1/${best.cut} cut, ${best.banks} bank(s), tabs ${inches(best.tabIn)} long`,
        "",
        "cut   banks  layout          tab length",
        ...all.map((c) => {
          const layout = c.banks === 1 ? `${tabs} in one bank` : `${c.banks - 1} x ${c.cut} + ${c.lastBank}`;
          return `1/${String(c.cut).padEnd(4)}${String(c.banks).padEnd(7)}${layout.padEnd(16)}${inches(c.tabIn)}`;
        }),
      ];
      return { json: { recommended: best, options: all }, text: lines.join("\n") };
    }
    case "binder": {
      const plan = binderPlan({
        sheets: int(o.sheets, "sheets"),
        paper: o.paper ?? "20",
        tabs: int(o.tabs, "tabs", 0),
        tabStock: o["tab-stock"] ?? "90",
        protectors: int(o.protectors, "protectors", 0),
      });
      const lines = [
        `Stack: ${inches(plan.stack)} (${inches(plan.need)} with 15% headroom)`,
        `Round ring: ${plan.round ? plan.round.label : "none large enough (round rings stop at 3\")"}`,
        `D-ring:     ${plan.dRing ? plan.dRing.label : "none large enough; split into two binders"}`,
      ];
      return { json: plan, text: lines.join("\n") };
    }
    case "chart": {
      const rows = capacityChart();
      const head = ["ring", ...PAPER.map((p) => `${p.id}# round`), ...PAPER.map((p) => `${p.id}# D`)];
      const lines = [
        head.map((h) => h.padEnd(10)).join("").trimEnd(),
        ...rows.map((r) =>
          [r.label, ...PAPER.map((p) => r.round[p.id] ?? "-"), ...PAPER.map((p) => r.dRing[p.id])]
            .map((c) => String(c).padEnd(10))
            .join("")
            .trimEnd(),
        ),
      ];
      return { json: rows, text: lines.join("\n") };
    }
    default:
      throw new Error(`unknown command "${cmd}"\n\n${HELP}`);
  }
}

try {
  const argv = process.argv.slice(2);
  const result = run(argv);
  const wantJson = argv.includes("--json") && result.json !== undefined;
  process.stdout.write((wantJson ? JSON.stringify(result.json, null, 2) : result.text) + "\n");
} catch (err) {
  process.stderr.write(`legal-binder-tools: ${err.message}\n`);
  process.exitCode = 1;
}
