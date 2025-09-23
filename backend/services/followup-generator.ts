// FollowupGeneratorService: セクション別のフォローアップサブクエリを多様化して生成
// 目的: 同質なクエリが連発しないように、時期/ドメイン/文書種/エンティティの軸でバラしつつ
//       既出クエリ・既出ドメインとの被りを抑える（負のヒント、MMR選択）。

export interface OrchestratorState {
  seen: {
    queryStrings: Set<string>;
    urls: Set<string>;
    domains: Set<string>;
  };
}

export interface FollowupContext {
  sectionKey: string;
  userQuery: string;
  baseSubqueries: string[];
  asOfDate?: string;
  state: OrchestratorState;
  iter: number; // 1..N の反復番号
  k?: number; // 返す最大クエリ数（既定5）
  entities?: Entities; // 既取得から抽出したエンティティ
  seenEntities?: Set<string>; // 生成済みエンティティ語の記録
}

export interface Entities {
  speakers: Set<string>;
  parties: Set<string>;
  meetings: Set<string>;
}

export class FollowupGeneratorService {
  generate(ctx: FollowupContext): string[] {
    const k = ctx.k ?? 5;
    const candidates: string[] = [];

    // 1) テンプレ拡張（セクション別 / 反復別ドメイングループ）
    candidates.push(
      ...this.templateExpansions(ctx.sectionKey, ctx.userQuery, ctx.asOfDate, ctx.iter),
    );

    // 2) ベースサブクエリも候補に含める
    candidates.push(...ctx.baseSubqueries);

    // 2.5) エンティティ拡張（話者・委員会/会議名など）
    if (ctx.entities) {
      const ents = this.entityExpansions(ctx.sectionKey, ctx.userQuery, ctx.entities);
      const filtered = ctx.seenEntities ? ents.filter((e) => !ctx.seenEntities!.has(e)) : ents;
      candidates.push(...filtered);
      filtered.forEach((e) => ctx.seenEntities?.add(e));
    }

    // 3) 重複・近似重複の除去
    let uniq = dedupStrings(candidates);
    uniq = dedupByJaccard(uniq, 0.7);

    // 4) 既出クエリを除外
    uniq = uniq.filter((q) => !ctx.state.seen.queryStrings.has(q));

    // 5) MMR選択（関連性 − 既存/相互多様性）
    const selected = mmrSelectQueries(uniq, ctx.userQuery, ctx.state, k, 0.6, 0.2);

    // 6) 負のヒント注入（既出ドメインの上位を外す）
    const negative = Array.from(ctx.state.seen.domains).slice(0, 3);
    const final = selected.map((q) => injectNegativeHints(q, negative));

    return final;
  }

  private templateExpansions(
    section: string,
    q: string,
    asOfDate: string | undefined,
    _iter: number,
  ): string[] {
    // ドメイングループによる絞り込みは一旦無効化
    const s = (v?: string) => (v ? ` ${v}` : "");
    const site = "";

    switch (section) {
      case "timeline":
        return [
          `${q} 年表${site}`,
          `${q} タイムライン${site}`,
          `${q} 経緯${s(asOfDate)}${site}`,
          `${q} 第16回 部会 議事要旨${site}`,
        ];
      case "purpose_overview":
        return [
          `${q} 目的${site}`,
          `${q} 概要${site}`,
          `${q} 趣旨${site}`,
          `${q} 要綱${site}`,
        ];
      case "current_status":
        return [
          `${q} 現在の審議状況${s(asOfDate)}${site}`,
          `${q} 進捗${s(asOfDate)}${site}`,
          `${q} 最新動向${s(asOfDate)}${site}`,
        ];
      case "key_points":
        return [
          `${q} 重要ポイント${site}`,
          `${q} 要点${site}`,
          `${q} ポイント${site}`,
        ];
      case "background":
        return [
          `${q} 背景${site}`,
          `${q} 経緯${site}`,
          `${q} 狙い${site}`,
        ];
      case "main_issues":
        return [
          `${q} 論点${site}`,
          `${q} 課題${site}`,
          `${q} 争点${site}`,
        ];
      case "past_debates_summary":
        return [
          `${q} 国会議事録`,
          `${q} 質疑応答`,
        ];
      case "status_notes":
        return [
          `${q} 注意点${s(asOfDate)}${site}`,
          `${q} 確認メモ${s(asOfDate)}${site}`,
        ];
      case "related_links":
        return [
          `${q} 公式${site}`,
          `${q} 一次情報${site}`,
          `${q} 準一次情報${site}`,
        ];
      default:
        return [`${q}${site}`];
    }
  }

  // エンティティを用いた拡張（話者・会議名など）
  private entityExpansions(section: string, q: string, entities: Entities): string[] {
    const out: string[] = [];
    const sp = Array.from(entities.speakers);
    const mt = Array.from(entities.meetings);
    // セクションに応じてエンティティ軸の重み付け（簡易）
    const preferMeeting = section === "timeline" || section === "past_debates_summary";
    if (!preferMeeting) {
      for (const s of sp.slice(0, 5)) out.push(`${q} ${s}`);
    }
    for (const m of mt.slice(0, 5)) out.push(`${q} ${m}`);
    // 組合せ（少数）
    for (const s of sp.slice(0, 3)) {
      for (const m of mt.slice(0, 2)) out.push(`${q} ${s} ${m}`);
    }
    return out;
  }
}

// ---- helpers ----
function dedupStrings(arr: string[]): string[] {
  const s = new Set<string>();
  const out: string[] = [];
  for (const v of arr) {
    if (!s.has(v)) {
      s.add(v);
      out.push(v);
    }
  }
  return out;
}

function tokenizeJP(t: string): string[] {
  return t.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((x) => x.length >= 2);
}

function jaccard(a: string, b: string): number {
  const A = new Set(tokenizeJP(a));
  const B = new Set(tokenizeJP(b));
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union > 0 ? inter / union : 0;
}

function dedupByJaccard(arr: string[], tau: number): string[] {
  const out: string[] = [];
  for (const q of arr) {
    if (out.some((p) => jaccard(q, p) >= tau)) continue;
    out.push(q);
  }
  return out;
}

function mmrSelectQueries(
  cands: string[],
  userQuery: string,
  state: OrchestratorState,
  k: number,
  lambda: number,
  alpha: number,
): string[] {
  const selected: string[] = [];
  const rel = (q: string) => jaccard(q, userQuery);
  const overlapAxes = (q: string) => {
    // 既出ドメインが site: 指定に含まれていたらペナルティ
    const ds = Array.from(state.seen.domains);
    const hits = ds.filter((d) => q.includes(`site:${d}`)).length;
    return hits > 0 ? 1 : 0;
  };
  const sim = (a: string, b: string) => jaccard(a, b);

  const pool = [...cands];
  while (pool.length && selected.length < k) {
    let bestIdx = 0;
    let bestVal = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const q = pool[i];
      const div = selected.length ? Math.max(...selected.map((s) => sim(q, s))) : 0;
      const val = lambda * rel(q) - (1 - lambda) * Math.max(div, alpha * overlapAxes(q));
      if (val > bestVal) {
        bestVal = val;
        bestIdx = i;
      }
    }
    selected.push(pool.splice(bestIdx, 1)[0]);
  }
  return selected;
}

function injectNegativeHints(q: string, domains: string[]): string {
  if (!domains.length) return q;
  const neg = domains.map((d) => `-site:${d}`).join(" ");
  return `${q} ${neg}`.trim();
}
