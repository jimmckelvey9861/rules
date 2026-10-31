/**
 * Classify citations — fills in `kind` on every citation in data/rules that
 * does not have one yet, from the wording of its `source`.
 *
 * Idempotent: a citation that already carries a kind is left alone, so a
 * human correction survives re-runs. Prints what it could not classify.
 *
 * Usage: npm run classify-citations
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR, listJsonFiles } from "../server/reference/dataFiles.js";
import type { Citation, CitationKind } from "../server/rules/types.js";

interface RulesFile { topic: string; rules: { id: string; citations: Citation[] }[]; [k: string]: unknown }

const REGULATION = [
  /\bC\.?F\.?R\.?\b/i, /\bNYCRR\b/, /\bCMR\b/, /\bN\.J\.A\.C\./, /\bOAR\b/, /\bWAC\b/, /\bNDAC\b/, /\bND Admin Code\b/i,
  /\bCOMPS Order\b/i, /\bIWC (Wage )?Orders?\b/i, /\bMun\. Regs\b/i, /\bRegs\.?\b/i, /\bRule \d/i,
];
const ORDINANCE = [
  /\bMunicipal Code\b/i, /\bAdmin(istrative)? Code\b/i, /\bCode of Ordinances\b/i, /\bOrdinance\b/i, /\bCity Code\b/i,
  /\bRevised Code\b/i, /\bCounty Code\b/i, /\bPhiladelphia Code\b/i, /\bNYC\b/, /\bSeattle\b/, /\bChicago\b/, /\bMinneapolis\b/,
  /\bMontgomery County\b/i, /\bSan Francisco\b/, /\bLos Angeles\b/, /\bDenver\b/,
];
const CONSTITUTION = [/\bConst\.?\b/];
const CASE = [/\bv\.\s/, /\bIn re\b/];
const STATUTE = [
  /§/, /\bU\.S\.C\./, /\bStat\.?\b/, /\bCode\b/, /\bILCS\b/, /\bRSA\b/, /\bMRSA\b/, /\bV\.?S\.?A\.?\b/, /\bRCW\b/, /\bORS\b/,
  /\bNRS\b/, /\bKRS\b/, /\bHRS\b/, /\bMGL\b/, /\bMCL\b/, /\bNCGS\b/, /\bNDCC\b/, /\bSDCL\b/, /\bO\.S\.\b/, /\bP\.S\.\b/,
  /\bC\.R\.S\./, /\bRSMo\b/, /\bARS\b/, /\bAS\b/, /\bNMSA\b/, /\bNJSA\b/, /\bN\.J\.S\.A\./, /\bMCA\b/, /\bIC\b/, /\bK\.S\.A\./,
  /\bO\.C\.G\.A\./, /\bORC\b/, /\bLa\. R\.S\./, /\bAct\b/, /\bLaw\b/, /\bDel\. C\./, /\bCYEPA\b/, /\bHFWA\b/, /\bPFML\b/, /\bPFL\b/,
  /\bFAMLI\b/, /\bTCI\b/, /\b[AS]B \d+\b/, /\bFLI\b/, /\bPaid Leave\b/i, /\bPaid Family\b/i, /\bPSLAA\b/, /\bHWA\b/, /\bIWOWA\b/, /\bFair Labor Standards\b/,
];

export function classifySource(source: string, url?: string): CitationKind | undefined {
  // Order matters: a NYC Admin Code section mentions "Code" (statute) but is an ordinance;
  // an IWC Wage Order mentions "Order" and must beat the statute patterns.
  if (/^no state .* law/i.test(source)) return "guidance";
  if (CONSTITUTION.some(re => re.test(source))) return "constitution";
  if (CASE.some(re => re.test(source))) return "case";
  // A state statute that merely mentions a city ("NYC Minimum Wage (NY Labor Law §652)") is still a statute.
  if (/\b(NY|New York) Labor Law\b/.test(source) && !/Admin(istrative)? Code/i.test(source)) {
    return /NYCRR/.test(source) ? "regulation" : "statute";
  }
  if (REGULATION.some(re => re.test(source))) return "regulation";
  if (ORDINANCE.some(re => re.test(source))) return "ordinance";
  if (STATUTE.some(re => re.test(source))) return "statute";
  if (url && /\b(dol\.gov|dir\.ca\.gov|lni\.wa\.gov|labor\.|dli\.|dws\.|dlt\.|dwd\.)/.test(url)) return "guidance";
  return undefined;
}

function main() {
  let filled = 0, kept = 0;
  const unclassified: string[] = [];
  for (const file of listJsonFiles("rules")) {
    const path = join(DATA_DIR, file);
    const parsed = JSON.parse(readFileSync(path, "utf8")) as RulesFile;
    let touched = false;
    for (const rule of parsed.rules) {
      for (const c of rule.citations) {
        if (c.kind) { kept++; continue; }
        const kind = classifySource(c.source, c.url);
        if (kind) { c.kind = kind; filled++; touched = true; }
        else unclassified.push(`${rule.id}: ${c.source}`);
      }
    }
    if (touched) writeFileSync(path, JSON.stringify(parsed, null, 2) + "\n");
  }
  console.log(`Classified ${filled} citation(s); ${kept} already had a kind.`);
  if (unclassified.length) {
    console.log(`\n${unclassified.length} citation(s) could not be classified. Set "kind" by hand:`);
    for (const u of unclassified) console.log(`  - ${u}`);
  }
}

main();
