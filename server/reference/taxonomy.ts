/**
 * Rule Taxonomy — category > topic > sub-topic tree loaded from data/taxonomy.json.
 *
 * Every rule carries a sub-topic code (e.g. "pay.minimum_wage.general").
 * Topics and sub-topics may also declare a `legacyTopic`, the engine's
 * historical topic string, which the coverage matrix and the jurisdiction
 * preemption flags still use.
 */

import { readJsonFile } from "./dataFiles.js";

export type EnforcementTarget = "kronto" | "payroll" | "hr" | "informational";

export interface TaxonomySubtopic {
  code: string;
  name: string;
  legacyTopic?: string;
}

export interface TaxonomyTopic {
  code: string;
  name: string;
  enforcement: EnforcementTarget;
  legacyTopic?: string;
  subtopics: TaxonomySubtopic[];
}

export interface TaxonomyCategory {
  code: string;
  name: string;
  topics: TaxonomyTopic[];
}

export interface TaxonomyFile {
  version: string;
  enforcementTargets: EnforcementTarget[];
  categories: TaxonomyCategory[];
}

/** A flattened node with its ancestry, for lookups and display. */
export interface TaxonomyNode {
  code: string;
  name: string;
  level: "category" | "topic" | "subtopic";
  categoryCode: string;
  topicCode?: string;
  enforcement?: EnforcementTarget;
  legacyTopic?: string;
}

export const TAXONOMY: TaxonomyFile = readJsonFile<TaxonomyFile>("taxonomy.json");

const NODES: TaxonomyNode[] = [];
const BY_CODE = new Map<string, TaxonomyNode>();
const BY_LEGACY = new Map<string, TaxonomyNode>();

for (const cat of TAXONOMY.categories) {
  NODES.push({ code: cat.code, name: cat.name, level: "category", categoryCode: cat.code });
  for (const topic of cat.topics) {
    NODES.push({
      code: topic.code, name: topic.name, level: "topic", categoryCode: cat.code,
      topicCode: topic.code, enforcement: topic.enforcement, legacyTopic: topic.legacyTopic,
    });
    for (const sub of topic.subtopics) {
      NODES.push({
        code: sub.code, name: sub.name, level: "subtopic", categoryCode: cat.code,
        topicCode: topic.code, enforcement: topic.enforcement, legacyTopic: sub.legacyTopic,
      });
    }
  }
}

for (const node of NODES) {
  if (BY_CODE.has(node.code)) throw new Error(`Duplicate taxonomy code: ${node.code}`);
  BY_CODE.set(node.code, node);
  if (node.legacyTopic) {
    if (BY_LEGACY.has(node.legacyTopic)) throw new Error(`Legacy topic mapped twice: ${node.legacyTopic}`);
    BY_LEGACY.set(node.legacyTopic, node);
  }
}

/** Every node in the tree, in document order. */
export function getAllTaxonomyNodes(): readonly TaxonomyNode[] {
  return NODES;
}

/** Resolve a rule's topic — either a taxonomy code or a legacy topic string. */
export function resolveTopic(topic: string): TaxonomyNode | undefined {
  return BY_CODE.get(topic) ?? BY_LEGACY.get(topic);
}

export function isKnownTopic(topic: string): boolean {
  return resolveTopic(topic) !== undefined;
}

/** Who can act on a rule with this topic. */
export function getEnforcementTarget(topic: string): EnforcementTarget | undefined {
  return resolveTopic(topic)?.enforcement;
}

/** The topic-level code a topic or sub-topic belongs to, e.g. "pay.minimum_wage.general" -> "pay.minimum_wage". */
export function topicCodeOf(topic: string): string | undefined {
  return resolveTopic(topic)?.topicCode;
}

/**
 * The legacy topic string for a code: the node's own `legacyTopic`, else its
 * parent topic's. Used where the engine still keys on the historical topic
 * names (jurisdiction preemption flags, coverage matrix rows).
 */
export function legacyTopicFor(topic: string): string | undefined {
  const node = resolveTopic(topic);
  if (!node) return undefined;
  if (node.legacyTopic) return node.legacyTopic;
  return node.topicCode ? BY_CODE.get(node.topicCode)?.legacyTopic : undefined;
}
