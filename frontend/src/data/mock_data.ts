// モックデータ定義
// 実装と分離して管理するためのファイル

export interface Member {
  id: string;
  name: string;
  party: string;
  constituency: string;
  house: "衆議院" | "参議院";
}

export interface Statement {
  id: string;
  memberId: string;
  content: string;
  timestamp: string;
  stance: "support" | "oppose" | "unclassified";
  stanceDetail:
    | "clear_support"
    | "conditional_support"
    | "clear_oppose"
    | "concern_expression"
    | "question_only"
    | "reserved";
}

export interface DecisionResult {
  type: "委員会決定" | "本会議決定" | "継続審議";
  date: string;
  details: string[];
  voteResult?: {
    support: number;
    oppose: number;
    abstain?: number;
  };
}

export interface FutureSchedule {
  date: string;
  event: string;
}

export interface RelatedIssue {
  title: string;
  description: string;
}

export interface Topic {
  id: string;
  title: string;
  category: string;
  categoryIcon: string;
  date: string;
  summary: string;
  viewCount: number;
  speakerCount: number;
  commentCount: number;
  bookmarkCount: number;
  stanceDistribution: {
    support: number;
    oppose: number;
    unclassified: number;
  };
  keyPoints: string[];
  decisionResults?: DecisionResult[];
  futureSchedule?: FutureSchedule[];
  relatedIssues?: RelatedIssue[];
  statements: Statement[];
}

export interface Filter {
  id: string;
  label: string;
  type: "timeline" | "category";
}

// メンバーのモックデータ
export const mockMembers: Member[] = [
  {
    id: "member-001",
    name: "田中太郎",
    party: "自由党",
    constituency: "東京都第1区",
    house: "衆議院",
  },
  {
    id: "member-002",
    name: "佐藤花子",
    party: "自由党",
    constituency: "大阪府第3区",
    house: "衆議院",
  },
  {
    id: "member-003",
    name: "山田一郎",
    party: "民主党",
    constituency: "愛知県第2区",
    house: "衆議院",
  },
  {
    id: "member-004",
    name: "高橋美咲",
    party: "民主党",
    constituency: "福岡県第1区",
    house: "衆議院",
  },
  {
    id: "member-005",
    name: "西田健治",
    party: "自由党",
    constituency: "北海道第4区",
    house: "衆議院",
  },
  {
    id: "member-006",
    name: "鈴木慎太郎",
    party: "無所属",
    constituency: "神奈川県第5区",
    house: "衆議院",
  },
  {
    id: "member-007",
    name: "松本由美",
    party: "民主党",
    constituency: "京都府第1区",
    house: "衆議院",
  },
  {
    id: "member-008",
    name: "井上雄大",
    party: "民主党",
    constituency: "広島県第2区",
    house: "衆議院",
  },
  {
    id: "member-009",
    name: "田村忠志",
    party: "改革党",
    constituency: "宮城県第3区",
    house: "衆議院",
  },
];

// 発言のモックデータ
export const mockStatements: Statement[] = [
  {
    id: "statement-001",
    memberId: "member-001",
    content:
      "社会保障制度の持続可能性を考えると、現在の税収では不十分である。消費税の段階的引き上げにより、安定的な財源を確保し、将来世代にも責任を持った政策を実行する必要がある。国際比較でも日本の消費税率は依然として低い水準にあり、適正な水準への調整は避けて通れない課題だと考える。",
    timestamp: "2025-08-14T15:30:00",
    stance: "support",
    stanceDetail: "clear_support",
  },
  {
    id: "statement-002",
    memberId: "member-002",
    content:
      "高齢化社会における医療費増大を考慮すれば、安定的な財源確保は急務である。段階的実施により経済への影響を最小限に抑えながら、社会保障制度の基盤を強化していくことが重要だ。",
    timestamp: "2025-08-14T14:20:00",
    stance: "support",
    stanceDetail: "clear_support",
  },
  {
    id: "statement-003",
    memberId: "member-003",
    content:
      "現在の経済状況下での消費税増税は、家計への打撃が深刻である。特に低所得世帯への影響は無視できない。代替的な財源確保策を十分に検討すべきであり、性急な増税には反対する。",
    timestamp: "2025-08-14T13:45:00",
    stance: "oppose",
    stanceDetail: "clear_oppose",
  },
  {
    id: "statement-004",
    memberId: "member-004",
    content:
      "中小企業への影響調査が不十分である。消費税増税により事業継続が困難になる企業が続出する可能性がある。十分な支援策なしに増税を実施するのは時期尚早だ。",
    timestamp: "2025-08-14T12:15:00",
    stance: "oppose",
    stanceDetail: "clear_oppose",
  },
  {
    id: "statement-005",
    memberId: "member-005",
    content:
      "軽減税率の対象を食料品全般に拡充するなら賛成である。低所得世帯への影響を最小限に抑える措置が前提条件となる。この条件が満たされれば、段階的な引き上げは妥当だと考える。",
    timestamp: "2025-08-14T11:40:00",
    stance: "support",
    stanceDetail: "conditional_support",
  },
  {
    id: "statement-006",
    memberId: "member-006",
    content:
      "段階的実施であれば経済への衝撃を緩和できる。2026年に12%、2028年に15%という案に賛成する。一括での増税は避けるべきであり、経済状況を見ながら調整可能な制度設計が重要だ。",
    timestamp: "2025-08-14T10:15:00",
    stance: "support",
    stanceDetail: "conditional_support",
  },
  {
    id: "statement-007",
    memberId: "member-007",
    content:
      "経済への影響について詳細な分析が必要である。特にGDPへの影響、雇用への影響を慎重に検討すべきだ。現在の提案では検討が不十分であり、時期尚早だと考える。",
    timestamp: "2025-08-14T09:30:00",
    stance: "oppose",
    stanceDetail: "concern_expression",
  },
  {
    id: "statement-008",
    memberId: "member-008",
    content:
      "国民の理解を得るためには、より丁寧な説明が必要だ。税収の使途についても透明性を高め、国民が納得できる形での制度設計を求める。現状では説明が不十分である。",
    timestamp: "2025-08-14T08:45:00",
    stance: "oppose",
    stanceDetail: "concern_expression",
  },
  {
    id: "statement-009",
    memberId: "member-009",
    content:
      "実施スケジュールについて確認したい。段階的実施の具体的なタイムラインと、各段階での評価方法について詳細を教えていただきたい。",
    timestamp: "2025-08-14T08:00:00",
    stance: "unclassified",
    stanceDetail: "question_only",
  },
];

// トピックのモックデータ
export const mockTopics: Topic[] = [
  {
    id: "topic-001",
    title: "消費税増税についての議論",
    category: "経済・財政",
    categoryIcon: "💰",
    date: "2025-08-14",
    summary:
      "税率10%→15%への引き上げ案。社会保障財源vs経済影響が争点。軽減税率拡充案で与野党が歩み寄りの動き。",
    viewCount: 2345,
    speakerCount: 12,
    commentCount: 89,
    bookmarkCount: 156,
    stanceDistribution: {
      support: 45,
      oppose: 35,
      unclassified: 20,
    },
    keyPoints: [
      "税率を10%→15%に引き上げるべきか",
      "実施時期（段階的 vs 一括）",
      "軽減税率の適用範囲",
    ],
    decisionResults: [
      {
        type: "委員会決定",
        date: "2025-08-14",
        details: [
          "税率15%への段階的引き上げ可決 (賛成7反対6)",
          "軽減税率対象の食料品拡大で修正",
        ],
        voteResult: {
          support: 7,
          oppose: 6,
        },
      },
    ],
    futureSchedule: [
      {
        date: "2025-08-20",
        event: "本会議での採決予定",
      },
      {
        date: "2025-09-01",
        event: "施行準備期間の詳細協議",
      },
    ],
    relatedIssues: [
      {
        title: "インボイス制度の見直し",
        description: "消費税増税に伴う制度調整",
      },
      {
        title: "中小企業支援策の拡充",
        description: "税負担増への対応策",
      },
    ],
    statements: mockStatements.slice(0, 9),
  },
  {
    id: "topic-002",
    title: "年金制度改革の方向性",
    category: "社会保障",
    categoryIcon: "🏥",
    date: "2025-08-13",
    summary:
      "支給開始年齢の段階的引き上げと保険料率見直しを検討。持続可能性と世代間公平のバランスが課題。",
    viewCount: 1876,
    speakerCount: 8,
    commentCount: 67,
    bookmarkCount: 203,
    stanceDistribution: {
      support: 60,
      oppose: 25,
      unclassified: 15,
    },
    keyPoints: ["支給開始年齢の引き上げ", "保険料率の調整", "世代間公平の確保"],
    statements: [],
  },
  {
    id: "topic-003",
    title: "デジタル庁の権限拡大案",
    category: "デジタル・IT",
    categoryIcon: "💻",
    date: "2025-08-12",
    summary:
      "省庁横断的なDX推進体制の強化。民間連携と個人情報保護の両立が焦点。",
    viewCount: 1456,
    speakerCount: 15,
    commentCount: 134,
    bookmarkCount: 298,
    stanceDistribution: {
      support: 55,
      oppose: 30,
      unclassified: 15,
    },
    keyPoints: [
      "デジタル庁の権限範囲",
      "個人情報保護との両立",
      "民間企業との連携体制",
    ],
    statements: [],
  },
  {
    id: "topic-004",
    title: "脱炭素社会実現に向けた法整備",
    category: "環境・エネルギー",
    categoryIcon: "🌱",
    date: "2025-08-11",
    summary:
      "2030年目標達成に向けた規制強化と支援策。産業界への影響と国際競争力の維持が議論の中心。",
    viewCount: 2103,
    speakerCount: 18,
    commentCount: 156,
    bookmarkCount: 412,
    stanceDistribution: {
      support: 65,
      oppose: 20,
      unclassified: 15,
    },
    keyPoints: ["炭素税の導入範囲", "企業への支援策", "国際競争力の維持"],
    statements: [],
  },
];

// フィルターのモックデータ
export const mockTimelineFilters: Filter[] = [
  { id: "latest", label: "最新", type: "timeline" },
  { id: "popular", label: "人気", type: "timeline" },
  { id: "ongoing", label: "議論中", type: "timeline" },
  { id: "resolved", label: "解決済み", type: "timeline" },
];

export const mockCategoryFilters: Filter[] = [
  { id: "constitution", label: "憲法", type: "category" },
  { id: "economy", label: "経済", type: "category" },
  { id: "social-security", label: "社会保障", type: "category" },
  { id: "environment", label: "環境", type: "category" },
  { id: "digital", label: "デジタル", type: "category" },
  { id: "education", label: "教育", type: "category" },
  { id: "defense", label: "防衛", type: "category" },
  { id: "foreign", label: "外交", type: "category" },
];

// ユーティリティ関数
export const getMemberById = (id: string): Member | undefined => {
  return mockMembers.find((member) => member.id === id);
};

export const getTopicById = (id: string): Topic | undefined => {
  return mockTopics.find((topic) => topic.id === id);
};

export const getStatementsByTopicId = (topicId: string): Statement[] => {
  const topic = getTopicById(topicId);
  return topic?.statements || [];
};

export const getStanceDistributionCounts = (topicId: string) => {
  const statements = getStatementsByTopicId(topicId);
  const support = statements.filter((s) => s.stance === "support").length;
  const oppose = statements.filter((s) => s.stance === "oppose").length;
  const unclassified = statements.filter(
    (s) => s.stance === "unclassified"
  ).length;

  return { support, oppose, unclassified };
};

export const getStatementsByStance = (
  topicId: string,
  stance: "support" | "oppose" | "unclassified"
): Statement[] => {
  const statements = getStatementsByTopicId(topicId);
  return statements.filter((s) => s.stance === stance);
};

export const getStatementsByStanceDetail = (
  topicId: string,
  stance: "support" | "oppose" | "unclassified",
  stanceDetail?: string
): Statement[] => {
  const statements = getStatementsByStance(topicId, stance);
  if (!stanceDetail) return statements;
  return statements.filter((s) => s.stanceDetail === stanceDetail);
};

// スタンス別詳細画面用のデータ取得
export const getStanceDetailData = (
  topicId: string,
  stance: "support" | "oppose" | "unclassified"
) => {
  const topic = getTopicById(topicId);
  if (!topic) return null;

  const statements = getStatementsByStance(topicId, stance);
  const stanceCounts = getStanceDistributionCounts(topicId);

  // スタンス別の詳細分類
  let categories: { label: string; statements: Statement[] }[] = [];

  if (stance === "support") {
    categories = [
      {
        label: "明確な賛成",
        statements: statements.filter(
          (s) => s.stanceDetail === "clear_support"
        ),
      },
      {
        label: "条件付き賛成",
        statements: statements.filter(
          (s) => s.stanceDetail === "conditional_support"
        ),
      },
    ];
  } else if (stance === "oppose") {
    categories = [
      {
        label: "明確な反対",
        statements: statements.filter((s) => s.stanceDetail === "clear_oppose"),
      },
      {
        label: "懸念表明",
        statements: statements.filter(
          (s) => s.stanceDetail === "concern_expression"
        ),
      },
    ];
  } else {
    categories = [
      {
        label: "質問のみ",
        statements: statements.filter(
          (s) => s.stanceDetail === "question_only"
        ),
      },
      {
        label: "態度保留",
        statements: statements.filter((s) => s.stanceDetail === "reserved"),
      },
    ];
  }

  // 発言の要約
  let summary = "";
  if (stance === "support") {
    summary =
      "社会保障制度の持続可能性確保を最重要視し、段階的な実施により経済への影響を緩和しながら進める方針で合意。軽減税率の拡充を条件とする意見も多く、低所得世帯への配慮が重視されている。";
  } else if (stance === "oppose") {
    summary =
      "現在の経済状況下での増税は家計や中小企業への負担が重すぎるとして反対。代替的な財源確保策の検討不足や、十分な影響調査なしでの性急な実施への懸念が表明されている。";
  } else {
    summary =
      "実施スケジュールや具体的な制度設計について質問が集中。段階的実施の詳細な工程表や評価方法について、より明確な説明を求める声が多い。";
  }

  return {
    topic,
    stance,
    stanceCounts,
    categories: categories.filter((cat) => cat.statements.length > 0),
    summary,
    totalCount: statements.length,
  };
};
