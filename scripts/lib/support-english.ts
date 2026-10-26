import { createHash } from "node:crypto";
import type { SupportPassive } from "../../src/supportPassives";

export const supportSourceHash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export interface SupportCopy {
  entries: Record<string, { sourceHash: string; name: string; effect: string }>;
  keywords: { sourceHash: string; term: string; desc: string }[];
}

/** コード別に訳名と全文を固定し、同名の別パッシブとの取り違えを防ぐ。 */
export function bindSupportCopy(passives: SupportPassive[], copy: SupportCopy): Record<string, string> {
  const messages: Record<string, string> = {};
  if (Object.keys(copy.entries).length !== passives.length) throw new Error("サポートパッシブの英訳件数が一致しない");
  for (const passive of passives) {
    const entry = copy.entries[passive.code];
    if (!entry || entry.sourceHash !== supportSourceHash(passive)) throw new Error(`サポートパッシブの原文が更新されている: ${passive.code}`);
    if (!entry.name?.trim() || !entry.effect?.trim()) throw new Error(`サポートパッシブの英訳が空: ${passive.code}`);
    messages[`support-passive:${passive.code}:name`] = entry.name;
    messages[`support-passive:${passive.code}:effect`] = entry.effect;
  }
  const terms = [...new Map(passives.flatMap(passive => passive.keywords).map(keyword => [keyword.desc, keyword])).values()];
  if (copy.keywords.length !== terms.length) throw new Error("サポートパッシブの用語説明の英訳件数が一致しない");
  for (const term of terms) {
    const entry = copy.keywords.find(entry => entry.sourceHash === supportSourceHash(term));
    if (!entry) throw new Error(`サポートパッシブの用語説明の原文が更新されている: ${term.term}`);
    if (!entry.term?.trim() || !entry.desc?.trim()) throw new Error(`サポートパッシブの用語説明の英訳が空: ${term.term}`);
    messages[`support-keyword:${term.term}:term`] = entry.term;
    messages[`support-keyword:${term.term}:desc`] = entry.desc;
  }
  return messages;
}
