// モックデータ定義
// 実装と分離して管理するためのファイル

export interface Member {
  id: string;
  name: string;
  party: string;
  constituency: string;
  house: "衆議院" | "参議院";
  profileImage?: string;
  committees: string[];
  specialties: string[];
  experience: string;
  biography: string;
  activityStats: {
    speechesPerYear: number;
    attendanceRate: number;
    noteworthySpeeches: number;
  };
  politicalStances: Array<{
    area: string;
    stance: string;
    evidenceStatements: Array<{
      statementId: string;
      excerpt: string;
      date: string;
    }>;
  }>;
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
    committees: ["財務金融委員会", "予算委員会"],
    specialties: ["財政政策", "税制改革", "社会保障"],
    experience: "当選3回 (2016年初当選)",
    biography:
      "東京大学法学部卒業後、財務省で20年間勤務。税制専門官として多くの税制改革に携わった経験を持つ。2016年に政界転身し、財政再建と社会保障制度の持続可能性を重視した政策を推進している。",
    activityStats: {
      speechesPerYear: 234,
      attendanceRate: 95.2,
      noteworthySpeeches: 12,
    },
    politicalStances: [
      {
        area: "財政政策",
        stance:
          "財政規律を重視し、将来世代への責任を持った健全な財政運営を主張。短期的な負担よりも長期的な安定性を優先する立場。",
        evidenceStatements: [
          {
            statementId: "statement-001",
            excerpt: "将来世代にも責任を持った政策を実行する必要がある",
            date: "2025-08-14",
          },
        ],
      },
      {
        area: "税制改革",
        stance:
          "国際基準に合わせた適正な税率設定を支持。税制の簡素化と公平性の確保を重視し、経済成長と社会保障の両立を目指す。",
        evidenceStatements: [
          {
            statementId: "statement-001",
            excerpt:
              "国際比較でも日本の消費税率は依然として低い水準にあり、適正な水準への調整は避けて通れない",
            date: "2025-08-14",
          },
        ],
      },
      {
        area: "社会保障",
        stance:
          "持続可能な社会保障制度の構築を最優先課題と位置づけ。制度の安定性確保のための改革を積極的に推進する立場。",
        evidenceStatements: [
          {
            statementId: "statement-001",
            excerpt:
              "社会保障制度の持続可能性を考えると、現在の税収では不十分である",
            date: "2025-08-14",
          },
        ],
      },
    ],
  },
  {
    id: "member-002",
    name: "佐藤花子",
    party: "自由党",
    constituency: "大阪府第3区",
    house: "衆議院",
    committees: ["厚生労働委員会", "少子化対策特別委員会"],
    specialties: ["社会保障", "子育て支援", "女性活躍"],
    experience: "当選2回 (2020年初当選)",
    biography:
      "医師として15年間地域医療に従事。特に高齢者医療と子育て支援に力を入れてきた。医療現場の経験を活かし、実践的な社会保障政策の立案に取り組んでいる。",
    activityStats: {
      speechesPerYear: 189,
      attendanceRate: 97.8,
      noteworthySpeeches: 8,
    },
    politicalStances: [
      {
        area: "社会保障",
        stance:
          "現場経験に基づく実践的な社会保障制度の充実を主張。安定財源の確保と段階的な制度強化により、誰もが安心できる社会づくりを目指す。",
        evidenceStatements: [
          {
            statementId: "statement-002",
            excerpt:
              "段階的実施により経済への影響を最小限に抑えながら、社会保障制度の基盤を強化していくことが重要だ",
            date: "2025-08-14",
          },
        ],
      },
      {
        area: "子育て支援",
        stance:
          "包括的な子育て支援体制の構築を重視。医療・保育・教育の連携強化により、子育て世代が安心して働ける環境整備を推進。",
        evidenceStatements: [
          {
            statementId: "statement-002",
            excerpt:
              "高齢化社会における医療費増大を考慮すれば、安定的な財源確保は急務である",
            date: "2025-08-14",
          },
        ],
      },
      {
        area: "医療政策",
        stance:
          "地域医療の充実と医療格差の解消を最優先課題と位置づけ。現場の声を反映した実効性のある医療政策の推進を主張。",
        evidenceStatements: [
          {
            statementId: "statement-002",
            excerpt:
              "高齢化社会における医療費増大を考慮すれば、安定的な財源確保は急務である",
            date: "2025-08-14",
          },
        ],
      },
    ],
  },
  {
    id: "member-003",
    name: "山田一郎",
    party: "民主党",
    constituency: "愛知県第2区",
    house: "衆議院",
    committees: ["経済産業委員会", "中小企業・小規模事業者特別委員会"],
    specialties: ["中小企業支援", "地域経済", "雇用政策"],
    experience: "当選4回 (2012年初当選)",
    biography:
      "中小企業経営者として20年間活動。地域経済の活性化と中小企業の支援策拡充を主要政策として掲げる。労働組合との連携を重視し、働く人々の立場に立った政策を推進している。",
    activityStats: {
      speechesPerYear: 312,
      attendanceRate: 93.5,
      noteworthySpeeches: 18,
    },
    politicalStances: [
      {
        area: "中小企業支援",
        stance:
          "中小企業の経営安定と成長支援を最重要課題と位置づけ。現場の声を反映した実効性のある支援策の推進を主張。",
        evidenceStatements: [
          {
            statementId: "statement-003",
            excerpt:
              "現在の経済状況下での消費税増税は、家計への打撃が深刻である。特に低所得世帯への影響は無視できない",
            date: "2025-08-14",
          },
        ],
      },
      {
        area: "雇用政策",
        stance:
          "働く人々の立場に立った雇用環境の改善を重視。労働組合との協力により、安定した雇用と適正な賃金の確保を推進。",
        evidenceStatements: [
          {
            statementId: "statement-003",
            excerpt:
              "代替的な財源確保策を十分に検討すべきであり、性急な増税には反対する",
            date: "2025-08-14",
          },
        ],
      },
    ],
  },
  {
    id: "member-004",
    name: "高橋美咲",
    party: "民主党",
    constituency: "福岡県第1区",
    house: "衆議院",
    committees: ["環境委員会", "災害対策特別委員会"],
    specialties: ["環境政策", "災害対策", "地方創生"],
    experience: "当選2回 (2020年初当選)",
    biography:
      "環境保護団体で活動後、地方自治体で環境政策担当として勤務。環境と経済の両立を目指す政策立案に長けており、持続可能な社会の実現を目指している。",
    activityStats: {
      speechesPerYear: 156,
      attendanceRate: 91.3,
      noteworthySpeeches: 7,
    },
    politicalStances: [
      {
        area: "環境政策",
        stance:
          "環境保護と経済発展の両立を重視。持続可能な社会の実現に向けた長期的視点での政策立案を主張。",
        evidenceStatements: [
          {
            statementId: "statement-004",
            excerpt:
              "中小企業への影響調査が不十分である。消費税増税により事業継続が困難になる企業が続出する可能性がある",
            date: "2025-08-14",
          },
        ],
      },
      {
        area: "災害対策",
        stance:
          "事前防災と災害復興の両面からの総合的な対策を推進。地域の特性を活かした実効性のある防災体制の構築を重視。",
        evidenceStatements: [
          {
            statementId: "statement-004",
            excerpt: "十分な支援策なしに増税を実施するのは時期尚早だ",
            date: "2025-08-14",
          },
        ],
      },
    ],
  },
  {
    id: "member-005",
    name: "西田健治",
    party: "自由党",
    constituency: "北海道第4区",
    house: "衆議院",
    committees: ["農林水産委員会", "地方創生特別委員会"],
    specialties: ["農業政策", "地方振興", "食料安全保障"],
    experience: "当選3回 (2016年初当選)",
    biography:
      "農業従事者として30年間活動。TPPなどの国際貿易協定における農業保護策の重要性を訴え、地方の声を国政に届ける活動を継続している。",
    activityStats: {
      speechesPerYear: 198,
      attendanceRate: 88.7,
      noteworthySpeeches: 15,
    },
    politicalStances: [
      {
        area: "農業政策",
        stance:
          "農業の持続可能性と競争力強化を重視。産地直送やブランド化による付加価値向上と、若手農業者の育成を推進。",
        evidenceStatements: [
          {
            statementId: "statement-005",
            excerpt:
              "軽減税率の対象を食料品全般に拡充するなら賛成である。低所得世帯への影響を最小限に抑える措置が前提条件となる",
            date: "2025-08-14",
          },
        ],
      },
      {
        area: "地方振興",
        stance:
          "地方の特性を活かした産業振興と人口減少対策を重視。都市部との連携強化と交流人口の拡大を通じた地域活性化を推進。",
        evidenceStatements: [
          {
            statementId: "statement-005",
            excerpt: "この条件が満たされれば、段階的な引き上げは妥当だと考える",
            date: "2025-08-14",
          },
        ],
      },
    ],
  },
  {
    id: "member-006",
    name: "鈴木慎太郎",
    party: "無所属",
    constituency: "神奈川県第5区",
    house: "衆議院",
    committees: ["総務委員会", "行政改革・無駄撲滅特別委員会"],
    specialties: ["行政改革", "規制緩和", "デジタル化"],
    experience: "当選1回 (2024年初当選)",
    biography:
      "IT企業経営者として15年間活動。行政のデジタル化と規制緩和による経済活性化を主張。党派にとらわれない政策提言を行っている。",
    activityStats: {
      speechesPerYear: 127,
      attendanceRate: 96.1,
      noteworthySpeeches: 5,
    },
    politicalStances: [
      {
        area: "デジタル化",
        stance:
          "行政のデジタル化を経済成長のエンジンと位置づけ。民間のイノベーションを最大限活用し、国際競争力の向上を推進。",
        evidenceStatements: [
          {
            statementId: "statement-006",
            excerpt:
              "段階的実施であれば経済への衝撃を緩和できる。一括での増税は避けるべきであり、経済状況を見ながら調整可能な制度設計が重要だ",
            date: "2025-08-14",
          },
        ],
      },
      {
        area: "規制緩和",
        stance:
          "既存の規制の拡大ではなく、時代に合ったスマートな規制へのアップデートを重視。民間の初動性を最大限尊重した政策運営を推進。",
        evidenceStatements: [
          {
            statementId: "statement-006",
            excerpt: "2026年に12%、2028年に15%という案に賛成する",
            date: "2025-08-14",
          },
        ],
      },
    ],
  },
  {
    id: "member-007",
    name: "松本由美",
    party: "民主党",
    constituency: "京都府第1区",
    house: "衆議院",
    committees: ["文部科学委員会", "教育再生特別委員会"],
    specialties: ["教育政策", "文化振興", "科学技術"],
    experience: "当選3回 (2016年初当選)",
    biography:
      "高校教師として20年間勤務後、教育政策の改善を目指して政界入り。教育の機会均等と質の向上を重視した政策を推進している。",
    activityStats: {
      speechesPerYear: 176,
      attendanceRate: 94.3,
      noteworthySpeeches: 9,
    },
    politicalStances: [
      {
        area: "教育政策",
        stance:
          "教育の機会均等と質の向上を両立させる包括的教育支援を推進。現場経験を活かした実践的な教育政策の立案を重視。",
        evidenceStatements: [
          {
            statementId: "statement-007",
            excerpt:
              "経済への影響について詳細な分析が必要である。特にGDPへの影響、雇用への影響を慎重に検討すべきだ",
            date: "2025-08-14",
          },
        ],
      },
      {
        area: "科学技術",
        stance:
          "基礎研究から応用研究までの一貫した研究環境の整備を推進。若手研究者の育成と国際競争力の強化を重視。",
        evidenceStatements: [
          {
            statementId: "statement-007",
            excerpt: "現状では説明が不十分である",
            date: "2025-08-14",
          },
        ],
      },
    ],
  },
  {
    id: "member-008",
    name: "井上雄大",
    party: "民主党",
    constituency: "広島県第2区",
    house: "衆議院",
    committees: ["外務委員会", "安全保障委員会"],
    specialties: ["外交政策", "平和構築", "国際協力"],
    experience: "当選2回 (2020年初当選)",
    biography:
      "外務省で外交官として15年間勤務。アジア太平洋地域の平和と安定に向けた外交政策の重要性を訴え、対話による問題解決を重視している。",
    activityStats: {
      speechesPerYear: 142,
      attendanceRate: 92.7,
      noteworthySpeeches: 6,
    },
    politicalStances: [
      {
        area: "外交政策",
        stance:
          "対話と多国間協力を基調とした平和外交を重視。アジア太平洋地域の安定と繁栄に向けた建設的な役割を果たす。",
        evidenceStatements: [
          {
            statementId: "statement-008",
            excerpt:
              "国民の理解を得るためには、より丁寧な説明が必要だ。税収の使途についても透明性を高め、国民が納得できる形での制度設計を求める",
            date: "2025-08-14",
          },
        ],
      },
      {
        area: "平和構築",
        stance:
          "武力によらない平和の構築を目指し、人道支援や経済協力を通じた紛争予防を重視。平和憲法の理念を実現する外交政策を推進。",
        evidenceStatements: [
          {
            statementId: "statement-008",
            excerpt: "現状では説明が不十分である",
            date: "2025-08-14",
          },
        ],
      },
    ],
  },
  {
    id: "member-009",
    name: "田村忠志",
    party: "改革党",
    constituency: "宮城県第3区",
    house: "衆議院",
    committees: ["法務委員会", "憲法審査会"],
    specialties: ["司法制度", "憲法問題", "人権保護"],
    experience: "当選2回 (2020年初当選)",
    biography:
      "弁護士として25年間活動。司法制度改革と人権保護の強化を主要政策として掲げる。憲法問題についても積極的に発言している。",
    activityStats: {
      speechesPerYear: 89,
      attendanceRate: 89.4,
      noteworthySpeeches: 4,
    },
    politicalStances: [
      {
        area: "司法制度",
        stance:
          "司法の独立性と中立性を保持した制度改革を推進。法的安定性と予測可能性を高め、国民の法的権利保護を強化。",
        evidenceStatements: [
          {
            statementId: "statement-009",
            excerpt:
              "実施スケジュールについて確認したい。段階的実施の具体的なタイムラインと、各段階での評価方法について詳細を教えていただきたい",
            date: "2025-08-14",
          },
        ],
      },
      {
        area: "人権保護",
        stance:
          "人権保護の実効性を高めるための制度整備を推進。社会的弱者の権利擁護と、差別や偏見の解消に向けた法的整備を重視。",
        evidenceStatements: [
          {
            statementId: "statement-009",
            excerpt:
              "段階的実施の具体的なタイムラインと、各段階での評価方法について詳細を教えていただきたい",
            date: "2025-08-14",
          },
        ],
      },
    ],
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

// 議員関連のユーティリティ関数
export const getStatementsByMemberId = (memberId: string): Statement[] => {
  return mockStatements.filter((statement) => statement.memberId === memberId);
};

export const getMemberStatementsByTopicId = (
  memberId: string,
  topicId: string
): Statement[] => {
  const topicStatements = getStatementsByTopicId(topicId);
  return topicStatements.filter((statement) => statement.memberId === memberId);
};

export const getMemberStanceDistribution = (memberId: string) => {
  const statements = getStatementsByMemberId(memberId);
  const support = statements.filter((s) => s.stance === "support").length;
  const oppose = statements.filter((s) => s.stance === "oppose").length;
  const unclassified = statements.filter(
    (s) => s.stance === "unclassified"
  ).length;

  return { support, oppose, unclassified, total: statements.length };
};

export const getMemberRecentTopics = (memberId: string): Topic[] => {
  const memberStatements = getStatementsByMemberId(memberId);
  const topicIds = [
    ...new Set(
      memberStatements.map(
        (s) =>
          mockTopics.find((t) => t.statements.some((ts) => ts.id === s.id))?.id
      )
    ),
  ].filter(Boolean) as string[];

  return mockTopics
    .filter((topic) => topicIds.includes(topic.id))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
