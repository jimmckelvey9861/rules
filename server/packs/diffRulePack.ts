/**
 * Pack diff — what changed between two packs for the same location.
 *
 * A consumer that holds last month's pack asks "what is different now?" and
 * gets: rules added and removed, rules whose content changed (by hash, with the
 * fields that differ), and the calendar events between the two asOf dates:
 * rules that took effect, rules that expired, and rules still upcoming.
 */

import { stableJson } from "./buildRulePack.js";
import type { PackRule, RulePack } from "./types.js";

export interface PackRuleRef {
  id: string;
  title: string;
  jurisdiction: string;
  topic: string;
  effectiveFrom: string;
  effectiveTo?: string;
  supersedes?: string;
  supersededBy?: string;
}

export interface ChangedPackRule extends PackRuleRef {
  /** Top-level PackRule fields whose value differs */
  fields: string[];
}

export interface PackSnapshotRef {
  asOf: string;
  generatedAt: string;
  rulesVersion: string;
  checksum: string;
  rules: number;
}

export interface PackDiff {
  location: string;
  from: PackSnapshotRef;
  to: PackSnapshotRef;
  /** In the new pack only */
  added: PackRuleRef[];
  /** In the old pack only */
  removed: PackRuleRef[];
  /** In both, with different content */
  changed: ChangedPackRule[];
  /** Rules whose effectiveFrom falls after from.asOf and on or before to.asOf (now in force) */
  tookEffect: PackRuleRef[];
  /** Rules whose effectiveTo falls on or after from.asOf and before to.asOf (no longer in force) */
  expired: PackRuleRef[];
  /** Rules in the new pack that take effect after to.asOf */
  upcoming: PackRuleRef[];
  summary: { added: number; removed: number; changed: number; tookEffect: number; expired: number; upcoming: number; unchanged: number };
}

/** Fields that describe a build rather than a rule's content; never reported as a change. */
const BOOKKEEPING = new Set(["hash", "satisfiedBy", "upcoming"]);

export function toRef(r: PackRule): PackRuleRef {
  return {
    id: r.id, title: r.title, jurisdiction: r.jurisdiction, topic: r.topic, effectiveFrom: r.effectiveFrom,
    ...(r.effectiveTo ? { effectiveTo: r.effectiveTo } : {}),
    ...(r.supersedes ? { supersedes: r.supersedes } : {}),
    ...(r.supersededBy ? { supersededBy: r.supersededBy } : {}),
  };
}

function snapshot(p: RulePack): PackSnapshotRef {
  return { asOf: p.asOf, generatedAt: p.generatedAt, rulesVersion: p.rulesVersion, checksum: p.checksum, rules: p.rules.length };
}

function changedFields(a: PackRule, b: PackRule): string[] {
  const left = a as unknown as Record<string, unknown>;
  const right = b as unknown as Record<string, unknown>;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  const out: string[] = [];
  for (const k of keys) {
    if (BOOKKEEPING.has(k)) continue;
    if (stableJson(left[k]) !== stableJson(right[k])) out.push(k);
  }
  return out.sort();
}

export function diffRulePacks(from: RulePack, to: RulePack): PackDiff {
  if (from.location.id !== to.location.id) {
    throw new Error(`Packs are for different locations: "${from.location.id}" vs "${to.location.id}"`);
  }
  const before = new Map(from.rules.map(r => [r.id, r]));
  const after = new Map(to.rules.map(r => [r.id, r]));

  const added: PackRuleRef[] = [];
  const changed: ChangedPackRule[] = [];
  let unchanged = 0;
  for (const r of to.rules) {
    const prev = before.get(r.id);
    if (!prev) { added.push(toRef(r)); continue; }
    const fields = prev.hash === r.hash ? [] : changedFields(prev, r);
    // A rule that was upcoming and is now in force has not changed in content.
    if (fields.length === 0) { unchanged++; continue; }
    changed.push({ ...toRef(r), fields });
  }
  const removed = from.rules.filter(r => !after.has(r.id)).map(toRef);

  const everyRule = new Map<string, PackRule>([...from.rules, ...to.rules].map(r => [r.id, r]));
  const all = [...everyRule.values()];
  const tookEffect = all.filter(r => r.effectiveFrom > from.asOf && r.effectiveFrom <= to.asOf).map(toRef);
  const expired = all.filter(r => r.effectiveTo && r.effectiveTo >= from.asOf && r.effectiveTo < to.asOf).map(toRef);
  const upcoming = to.rules.filter(r => r.upcoming).map(toRef);

  const byId = (a: PackRuleRef, b: PackRuleRef) => a.id.localeCompare(b.id);
  for (const list of [added, removed, changed, tookEffect, expired, upcoming]) list.sort(byId);

  return {
    location: to.location.id,
    from: snapshot(from),
    to: snapshot(to),
    added, removed, changed, tookEffect, expired, upcoming,
    summary: { added: added.length, removed: removed.length, changed: changed.length, tookEffect: tookEffect.length, expired: expired.length, upcoming: upcoming.length, unchanged },
  };
}

/** One line per change, for the command line. */
export function formatPackDiff(d: PackDiff): string {
  const lines: string[] = [];
  const s = d.summary;
  lines.push(`${d.location}: ${d.from.asOf} -> ${d.to.asOf}: ${s.added} added, ${s.removed} removed, ${s.changed} changed, ${s.unchanged} unchanged; ${s.tookEffect} took effect, ${s.expired} expired, ${s.upcoming} upcoming`);
  const line = (tag: string, r: PackRuleRef, extra = "") => lines.push(`  ${tag} ${r.id} (${r.jurisdiction}, ${r.effectiveFrom}${r.effectiveTo ? ` to ${r.effectiveTo}` : ""})${extra}`);
  d.added.forEach(r => line("+", r));
  d.removed.forEach(r => line("-", r));
  d.changed.forEach(r => line("~", r, `: ${r.fields.join(", ")}`));
  d.tookEffect.forEach(r => line("effective", r, r.supersedes ? ` replaces ${r.supersedes}` : ""));
  d.expired.forEach(r => line("expired", r, r.supersededBy ? ` replaced by ${r.supersededBy}` : ""));
  d.upcoming.forEach(r => line("upcoming", r, r.supersedes ? ` will replace ${r.supersedes}` : ""));
  return lines.join("\n");
}
