import {
  normalizeSpeakerName,
  generateDisplayName,
  generateSpeakerKey,
  isSystemSpeaker,
} from '../speaker-normalizer';

describe('speaker-normalizer utilities', () => {
  describe('normalizeSpeakerName', () => {
    it('should remove honorifics', () => {
      expect(normalizeSpeakerName('安倍晋三君')).toBe('安倍晋三');
      expect(normalizeSpeakerName('山田太郎さん')).toBe('山田太郎');
      expect(normalizeSpeakerName('鈴木一郎殿')).toBe('鈴木一郎');
      expect(normalizeSpeakerName('佐藤花子様')).toBe('佐藤花子');
    });

    it('should remove titles and positions', () => {
      expect(normalizeSpeakerName('安倍内閣総理大臣')).toBe('安倍');
      expect(normalizeSpeakerName('山田外務大臣')).toBe('山田');
      expect(normalizeSpeakerName('鈴木防衛大臣')).toBe('鈴木');
      expect(normalizeSpeakerName('田中国務大臣')).toBe('田中');
    });

    it('should remove role indicators', () => {
      expect(normalizeSpeakerName('○安倍晋三君')).toBe('安倍晋三');
      expect(normalizeSpeakerName('●山田太郎君')).toBe('山田太郎');
      expect(normalizeSpeakerName('△鈴木一郎君')).toBe('鈴木一郎');
    });

    it('should handle committee-related positions', () => {
      expect(normalizeSpeakerName('山田委員長')).toBe('山田');
      expect(normalizeSpeakerName('鈴木委員')).toBe('鈴木');
      expect(normalizeSpeakerName('田中理事')).toBe('田中');
    });

    it('should handle special cases', () => {
      expect(normalizeSpeakerName('議長（山田太郎君）')).toBe('山田太郎');
      expect(normalizeSpeakerName('政府特別補佐人（田中一郎君）')).toBe('田中一郎');
      expect(normalizeSpeakerName('参考人（鈴木花子君）')).toBe('鈴木花子');
    });

    it('should handle mixed cases', () => {
      expect(normalizeSpeakerName('○安倍内閣総理大臣君')).toBe('安倍');
      expect(normalizeSpeakerName('山田外務大臣殿')).toBe('山田');
    });

    it('should trim whitespace', () => {
      expect(normalizeSpeakerName('  安倍晋三君  ')).toBe('安倍晋三');
      expect(normalizeSpeakerName('\t山田太郎\n')).toBe('山田太郎');
    });

    it('should return empty string for empty input', () => {
      expect(normalizeSpeakerName('')).toBe('');
      expect(normalizeSpeakerName('   ')).toBe('');
    });
  });

  describe('generateDisplayName', () => {
    it('should use original name if different from normalized', () => {
      expect(generateDisplayName('安倍晋三君', '安倍晋三')).toBe('安倍晋三');
      expect(generateDisplayName('安倍内閣総理大臣', '安倍')).toBe('安倍');
    });

    it('should use normalized name if same as original', () => {
      expect(generateDisplayName('安倍晋三', '安倍晋三')).toBe('安倍晋三');
      expect(generateDisplayName('山田太郎', '山田太郎')).toBe('山田太郎');
    });

    it('should handle empty inputs', () => {
      expect(generateDisplayName('', '')).toBe('');
      expect(generateDisplayName('安倍晋三', '')).toBe('安倍晋三'); // 正規化名が空の場合は元の名前を返す
      expect(generateDisplayName('', '安倍晋三')).toBe('安倍晋三');
    });
  });

  describe('generateSpeakerKey', () => {
    it('should generate key with normalized name and yomi', () => {
      expect(generateSpeakerKey('安倍晋三', 'アベシンゾウ')).toBe('安倍晋三_アベシンゾウ');
      expect(generateSpeakerKey('山田太郎', 'ヤマダタロウ')).toBe('山田太郎_ヤマダタロウ');
    });

    it('should generate key with only normalized name when yomi is empty', () => {
      expect(generateSpeakerKey('安倍晋三', null)).toBe('安倍晋三');
      expect(generateSpeakerKey('山田太郎', null)).toBe('山田太郎');
      expect(generateSpeakerKey('鈴木一郎', '')).toBe('鈴木一郎');
    });

    it('should handle empty normalized name', () => {
      expect(generateSpeakerKey('', 'アベシンゾウ')).toBe('_アベシンゾウ');
      expect(generateSpeakerKey('', null)).toBe('');
    });
  });

  describe('isSystemSpeaker', () => {
    it('should identify system speakers', () => {
      expect(isSystemSpeaker('会議録情報')).toBe(true);
      expect(isSystemSpeaker('議事日程')).toBe(true);
      expect(isSystemSpeaker('開会宣告')).toBe(true);
      expect(isSystemSpeaker('閉会宣告')).toBe(true);
      expect(isSystemSpeaker('休憩')).toBe(true);
      expect(isSystemSpeaker('再開')).toBe(true);
      expect(isSystemSpeaker('延会')).toBe(true);
      expect(isSystemSpeaker('散会')).toBe(true);
    });

    it('should identify non-system speakers', () => {
      expect(isSystemSpeaker('安倍晋三')).toBe(false);
      expect(isSystemSpeaker('山田太郎')).toBe(false);
      expect(isSystemSpeaker('会議の田中')).toBe(false);
      expect(isSystemSpeaker('情報太郎')).toBe(false);
    });

    it('should handle speakers containing system keywords', () => {
      expect(isSystemSpeaker('本日の会議に関する情報')).toBe(true); // 「会議」と「情報」を含む
      expect(isSystemSpeaker('会議録署名議員の指名')).toBe(true); // 「会議」と「署名議員」を含む
      expect(isSystemSpeaker('議長不信任決議案')).toBe(false); // システムキーワードを含まない
    });

    it('should handle empty or invalid input', () => {
      expect(isSystemSpeaker('')).toBe(false);
      expect(isSystemSpeaker('   ')).toBe(false);
      expect(isSystemSpeaker(null as unknown as string)).toBe(false);
      expect(isSystemSpeaker(undefined as unknown as string)).toBe(false);
    });
  });
});
