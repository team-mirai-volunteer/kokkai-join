/**
 * 発言者名の正規化処理
 */

// 除去する敬称のリスト
const HONORIFICS = ['君', 'さん', '氏', '先生', '議員', '委員', '理事', '様', '殿'];

/**
 * 発言者名を正規化する
 * @param rawName 元の発言者名
 * @returns 正規化された名前
 */
export function normalizeSpeakerName(rawName: string): string {
  if (!rawName) return '';

  let normalized = rawName.trim();

  // 役職マーカー（○、●、△など）を削除
  normalized = normalized.replace(/^[○●△▲◇◆□■]/, '');

  // 括弧内の内容を処理
  // 「議長（山田太郎君）」→「山田太郎」
  // 「政府特別補佐人（田中一郎君）」→「田中一郎」
  const bracketMatch = normalized.match(/[（(]([^）)]+)[）)]/);
  if (
    bracketMatch &&
    (normalized.startsWith('議長') ||
      normalized.startsWith('政府') ||
      normalized.startsWith('参考人'))
  ) {
    normalized = bracketMatch[1];
  }

  // 役職を削除（「大臣」で終わる場合は名前部分のみ残す）
  if (normalized.endsWith('大臣')) {
    // 特定の大臣パターンを処理
    if (normalized.includes('内閣総理大臣')) {
      // 「安倍内閣総理大臣」→「安倍」
      normalized = normalized.replace('内閣総理大臣', '');
    } else if (normalized.includes('外務大臣')) {
      // 「山田外務大臣」→「山田」
      normalized = normalized.replace('外務大臣', '');
    } else if (normalized.includes('防衛大臣')) {
      // 「鈴木防衛大臣」→「鈴木」
      normalized = normalized.replace('防衛大臣', '');
    } else if (normalized.includes('国務大臣')) {
      // 「田中国務大臣」→「田中」
      normalized = normalized.replace('国務大臣', '');
    } else {
      // その他の大臣
      normalized = normalized.replace('大臣', '');
    }
  }

  // 敬称を削除（末尾から削除）
  for (const honorific of HONORIFICS) {
    const regex = new RegExp(`${honorific}$`, 'g');
    normalized = normalized.replace(regex, '');
  }

  // 前後の空白を削除
  normalized = normalized.trim();

  // 空白の正規化（全角スペース→半角スペース、連続スペース→単一スペース）
  normalized = normalized.replace(/　/g, ' ').replace(/\s+/g, ' ');

  return normalized;
}

/**
 * 発言者名が同一人物かどうかを判定
 * @param name1 発言者名1
 * @param yomi1 発言者名1のよみがな
 * @param name2 発言者名2
 * @param yomi2 発言者名2のよみがな
 * @returns 同一人物の可能性が高い場合true
 */
export function isSameSpeaker(
  name1: string,
  yomi1: string | null,
  name2: string,
  yomi2: string | null
): boolean {
  // 正規化された名前で比較
  const normalized1 = normalizeSpeakerName(name1);
  const normalized2 = normalizeSpeakerName(name2);

  // 名前が完全一致
  if (normalized1 === normalized2) {
    return true;
  }

  // よみがなが両方あり、一致する場合
  if (yomi1 && yomi2) {
    const normalizedYomi1 = yomi1.replace(/\s/g, '');
    const normalizedYomi2 = yomi2.replace(/\s/g, '');

    if (normalizedYomi1 === normalizedYomi2) {
      // よみがなが一致し、名前の一部が共通
      if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 発言者の表示名を生成
 * @param rawName 元の発言者名
 * @param normalizedName 正規化された名前
 * @returns 表示用の名前
 */
export function generateDisplayName(rawName: string, normalizedName: string): string {
  // 正規化された名前が空の場合、元の名前を返す
  if (!normalizedName) {
    return rawName;
  }

  return normalizedName;
}

/**
 * 発言者情報から一意キーを生成
 * @param speaker 発言者名
 * @param yomi よみがな
 * @returns 一意キー
 */
export function generateSpeakerKey(speaker: string, yomi: string | null): string {
  const normalized = normalizeSpeakerName(speaker);
  if (!yomi) {
    return normalized;
  }
  const normalizedYomi = yomi.replace(/\s/g, '').toLowerCase();
  return `${normalized}_${normalizedYomi}`;
}

/**
 * システム発言者かどうかを判定
 * @param speaker 発言者名
 * @returns システム発言者の場合true
 */
export function isSystemSpeaker(speaker: string): boolean {
  if (!speaker) return false;

  const systemPatterns = [
    '会議録情報',
    '本文',
    '議事日程',
    '開会',
    '閉会',
    '休憩',
    '散会',
    '延会',
    '再開',
  ];

  // より柔軟なマッチング
  // 「本日の会議に関する情報」「会議録署名議員の指名」なども含む
  const extendedPatterns = ['会議', '情報', '議事', '日程', '署名議員'];

  // システムパターンの完全一致
  if (systemPatterns.some((pattern) => speaker === pattern)) {
    return true;
  }

  // 拡張パターンで複数マッチする場合
  const matchCount = extendedPatterns.filter((pattern) => speaker.includes(pattern)).length;
  if (matchCount >= 2) {
    return true;
  }

  // 特定のキーワードを含む
  return systemPatterns.some((pattern) => speaker.includes(pattern));
}
