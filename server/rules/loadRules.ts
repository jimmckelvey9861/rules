/**
 * Rule Loader — reads every data/rules/*.json file, validates each rule with
 * the same validator used for hand-written rules, and cross-checks topic and
 * jurisdiction against the reference data.
 *
 * Fault-tolerant: bad rules are reported and skipped. The server always starts.
 */

import type { Rule } from "./types.js";
import { tryCreateRule } from "./createRule.js";
import type { ValidationError } from "./conditions.js";
import { listJsonFiles, readJsonFile } from "../reference/dataFiles.js";
import { resolveTopic, legacyTopicFor } from "../reference/taxonomy.js";
import { isKnownJurisdiction, findPreemptingAncestor } from "../reference/jurisdictions.js";

export interface RulesFile {
  $schema?: string;
  topic: string;
  rules: Rule[];
}

export interface SkippedRule {
  id: string;
  file: string;
  errors: ValidationError[];
}

export interface LoadResult {
  rules: Rule[];
  skipped: SkippedRule[];
}

export const RULES_DIR = "rules";

/**
 * Checks that go beyond the rule's own shape: references into the reference data.
 */
function crossCheck(rule: Rule, fileTopic: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const node = resolveTopic(rule.topic);
  if (!node) {
    errors.push({ path: "topic", message: `Unknown topic "${rule.topic}" (not in data/taxonomy.json)` });
  } else if (node.level !== "subtopic") {
    errors.push({ path: "topic", message: `Topic "${rule.topic}" is a ${node.level}; rules must carry a sub-topic code` });
  } else if (node.topicCode !== fileTopic) {
    errors.push({ path: "topic", message: `rule topic "${rule.topic}" belongs to "${node.topicCode}", not to file topic "${fileTopic}"` });
  }
  if (!isKnownJurisdiction(rule.jurisdiction)) {
    errors.push({ path: "jurisdiction", message: `Unknown jurisdiction "${rule.jurisdiction}" (not in data/jurisdictions.json)` });
  } else {
    const legacy = legacyTopicFor(rule.topic);
    const preemptor = legacy ? findPreemptingAncestor(rule.jurisdiction, legacy) : undefined;
    if (preemptor) {
      errors.push({ path: "jurisdiction", message: `${preemptor.name} preempts local "${legacy}" rules; a ${rule.jurisdiction} rule cannot apply` });
    }
  }
  return errors;
}

export function loadRulesFromData(): LoadResult {
  const rules: Rule[] = [];
  const skipped: SkippedRule[] = [];
  const seenIds = new Map<string, string>();

  for (const file of listJsonFiles(RULES_DIR)) {
    let parsed: RulesFile;
    try {
      parsed = readJsonFile<RulesFile>(file);
    } catch (e: any) {
      skipped.push({ id: "(file)", file, errors: [{ path: file, message: `Could not parse: ${e.message}` }] });
      continue;
    }
    if (!parsed.topic || !Array.isArray(parsed.rules)) {
      skipped.push({ id: "(file)", file, errors: [{ path: file, message: "Rules file needs a topic and a rules array" }] });
      continue;
    }

    for (const candidate of parsed.rules) {
      const id = candidate?.id || "(no id)";
      const { rule, errors } = tryCreateRule(candidate);
      const allErrors = [...errors, ...(rule ? crossCheck(rule, parsed.topic) : [])];
      if (seenIds.has(id)) {
        allErrors.push({ path: "id", message: `Duplicate rule id; first seen in ${seenIds.get(id)}` });
      }
      if (allErrors.length > 0 || !rule) {
        skipped.push({ id, file, errors: allErrors });
        continue;
      }
      seenIds.set(id, file);
      rules.push(rule);
    }
  }

  return { rules, skipped };
}
