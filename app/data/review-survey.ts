export type SurveyQuestionType = "single" | "multiple";

export type SurveyQuestion = {
  id: string;
  label: string;
  type: SurveyQuestionType;
  options: string[];
  dependsOn?: {
    questionId: string;
    value: string;
  };
};

export type SurveySection = {
  id: string;
  title: string;
  questions: SurveyQuestion[];
};

export const reviewSurveySections: SurveySection[] = [
  {
    id: "usage_purpose",
    title: "이용 목적 분류",
    questions: [
      { id: "purpose", label: "이용 목적", type: "single", options: ["재미", "수익", "이벤트 참여", "지인 추천", "습관적 이용", "테스트 이용"] },
      { id: "frequency", label: "이용 빈도", type: "single", options: ["매일", "주 3~5회", "주 1~2회", "월 1~2회", "거의 이용 안 함"] },
      { id: "main_time", label: "주 이용 시간대", type: "single", options: ["오전", "오후", "저녁", "새벽", "불규칙"] },
      { id: "usage_period", label: "이용 기간", type: "single", options: ["신규", "1개월 미만", "1~3개월", "3~6개월", "6개월 이상"] },
    ],
  },
  {
    id: "betting_category",
    title: "이용 카테고리",
    questions: [
      {
        id: "betting_category",
        label: "주 이용 카테고리",
        type: "multiple",
        options: ["스포츠베팅", "카지노베팅", "슬롯베팅", "미니게임베팅", "기타 베팅"],
      },
      {
        id: "sports_betting",
        label: "스포츠베팅 세부 종목",
        type: "multiple",
        options: ["축구", "농구", "야구", "배구", "테니스", "e스포츠", "기타 스포츠"],
        dependsOn: { questionId: "betting_category", value: "스포츠베팅" },
      },
      {
        id: "casino_betting",
        label: "카지노베팅 세부 종목",
        type: "multiple",
        options: ["바카라", "블랙잭", "룰렛", "홀덤", "식보", "기타 카지노"],
        dependsOn: { questionId: "betting_category", value: "카지노베팅" },
      },
      {
        id: "slot_betting",
        label: "슬롯베팅 세부 종목",
        type: "multiple",
        options: ["일반 슬롯", "잭팟 슬롯", "프리스핀 슬롯", "인기 슬롯", "신규 슬롯"],
        dependsOn: { questionId: "betting_category", value: "슬롯베팅" },
      },
      {
        id: "mini_game_betting",
        label: "미니게임베팅 세부 종목",
        type: "multiple",
        options: ["파워볼", "사다리", "달팽이", "키노", "로하이", "기타 미니게임"],
        dependsOn: { questionId: "betting_category", value: "미니게임베팅" },
      },
      {
        id: "other_betting",
        label: "기타 베팅 세부 항목",
        type: "multiple",
        options: ["이벤트 베팅", "가상 스포츠", "라이브 베팅", "특수 베팅"],
        dependsOn: { questionId: "betting_category", value: "기타 베팅" },
      },
    ],
  },
  {
    id: "odds",
    title: "배당 관련 분류",
    questions: [
      {
        id: "sports_odds_satisfaction",
        label: "스포츠 배당 만족도",
        type: "single",
        options: ["매우 높음", "높은 편", "보통", "낮은 편", "매우 낮음"],
        dependsOn: { questionId: "betting_category", value: "스포츠베팅" },
      },
      {
        id: "sports_odds_compare",
        label: "스포츠 타사 대비 배당",
        type: "single",
        options: ["타사 대비 좋음", "비슷함", "낮음"],
        dependsOn: { questionId: "betting_category", value: "스포츠베팅" },
      },
      {
        id: "sports_live_odds",
        label: "스포츠 라이브 배당 만족도",
        type: "single",
        options: ["만족", "보통", "불만족", "이용 안 함"],
        dependsOn: { questionId: "betting_category", value: "스포츠베팅" },
      },
      {
        id: "casino_payout_satisfaction",
        label: "카지노 배당/페이아웃 만족도",
        type: "single",
        options: ["매우 만족", "만족", "보통", "불만족", "매우 불만족"],
        dependsOn: { questionId: "betting_category", value: "카지노베팅" },
      },
      {
        id: "casino_table_odds",
        label: "카지노 테이블 배당 조건",
        type: "single",
        options: ["좋은 편", "보통", "아쉬운 편", "잘 모르겠음"],
        dependsOn: { questionId: "betting_category", value: "카지노베팅" },
      },
      {
        id: "slot_return_satisfaction",
        label: "슬롯 환수율 체감 만족도",
        type: "single",
        options: ["높은 편", "보통", "낮은 편", "잘 모르겠음"],
        dependsOn: { questionId: "betting_category", value: "슬롯베팅" },
      },
      {
        id: "slot_jackpot_odds",
        label: "슬롯 잭팟/프리스핀 기대감",
        type: "single",
        options: ["좋음", "보통", "낮음", "이용 안 함"],
        dependsOn: { questionId: "betting_category", value: "슬롯베팅" },
      },
      {
        id: "mini_game_odds_satisfaction",
        label: "미니게임 배당 만족도",
        type: "single",
        options: ["매우 높음", "높은 편", "보통", "낮은 편", "매우 낮음"],
        dependsOn: { questionId: "betting_category", value: "미니게임베팅" },
      },
      {
        id: "mini_game_odds_stability",
        label: "미니게임 배당 안정성",
        type: "single",
        options: ["안정적", "자주 변동됨", "불리하게 느껴짐", "잘 모르겠음"],
        dependsOn: { questionId: "betting_category", value: "미니게임베팅" },
      },
      {
        id: "other_betting_odds_satisfaction",
        label: "기타 베팅 배당 만족도",
        type: "single",
        options: ["만족", "보통", "불만족", "이용 안 함"],
        dependsOn: { questionId: "betting_category", value: "기타 베팅" },
      },
      {
        id: "other_betting_odds_clarity",
        label: "기타 베팅 배당 안내 명확성",
        type: "single",
        options: ["명확함", "보통", "불명확함", "잘 모르겠음"],
        dependsOn: { questionId: "betting_category", value: "기타 베팅" },
      },
    ],
  },
  {
    id: "event",
    title: "이벤트 만족도 세분화",
    questions: [
      { id: "event_satisfaction", label: "이벤트 만족도", type: "single", options: ["매우 만족", "만족", "보통", "불만족", "매우 불만족"] },
      { id: "event_type", label: "이벤트 종류 만족도", type: "multiple", options: ["충전 이벤트", "출석 이벤트", "페이백", "콤프", "쿠폰", "가입 이벤트"] },
      { id: "event_difficulty", label: "이벤트 참여 난이도", type: "single", options: ["쉬움", "보통", "어려움"] },
      { id: "event_reward", label: "이벤트 보상 만족도", type: "single", options: ["좋음", "보통", "낮음"] },
    ],
  },
  {
    id: "customer_service",
    title: "고객센터 대응 분류",
    questions: [
      { id: "cs_response_speed", label: "응답 속도", type: "single", options: ["매우 빠름", "빠름", "보통", "느림", "매우 느림"] },
      { id: "cs_accuracy", label: "답변 정확도", type: "single", options: ["정확함", "보통", "부정확함"] },
      { id: "cs_kindness", label: "친절도", type: "single", options: ["친절함", "보통", "불친절함"] },
      { id: "cs_channel", label: "상담 채널 만족도", type: "multiple", options: ["실시간 채팅", "카카오톡", "텔레그램", "게시판", "전화"] },
    ],
  },
  {
    id: "payment_exchange",
    title: "충전/환전 관련 분류",
    questions: [
      { id: "deposit_speed", label: "충전 속도", type: "single", options: ["1분 이내", "1~3분", "3~5분", "5분 이상"] },
      { id: "deposit_stability", label: "충전 안정성", type: "single", options: ["오류 없음", "가끔 오류", "자주 오류"] },
      { id: "withdraw_speed", label: "환전 속도", type: "single", options: ["5분 이내", "5~10분", "10~30분", "30분 이상"] },
      { id: "withdraw_stability", label: "환전 안정성", type: "single", options: ["문제 없음", "지연 경험 있음", "오류 경험 있음"] },
    ],
  },
  {
    id: "usability",
    title: "사이트/앱 사용성 분류",
    questions: [
      { id: "access_speed", label: "접속 속도", type: "single", options: ["빠름", "보통", "느림"] },
      { id: "screen_layout", label: "화면 구성", type: "single", options: ["보기 쉬움", "보통", "복잡함"] },
      { id: "mobile_usability", label: "모바일 사용성", type: "single", options: ["좋음", "보통", "나쁨"] },
      { id: "error_lag", label: "오류/렉 경험", type: "single", options: ["없음", "가끔 있음", "자주 있음"] },
    ],
  },
  {
    id: "trust_safety",
    title: "신뢰도/안정성 분류",
    questions: [
      { id: "site_trust", label: "사이트 신뢰도", type: "single", options: ["매우 신뢰", "신뢰", "보통", "불신", "매우 불신"] },
      { id: "privacy_satisfaction", label: "개인정보 보호 만족도", type: "single", options: ["만족", "보통", "불만족"] },
      { id: "transaction_stability", label: "거래 안정성", type: "single", options: ["안정적", "보통", "불안정"] },
      { id: "overall_safety", label: "전반적 안전성", type: "single", options: ["안전하다고 느낌", "보통", "불안함"] },
    ],
  },
  {
    id: "complaints",
    title: "불만/개선 요청 분류",
    questions: [
      { id: "odds_complaint", label: "배당 불만", type: "multiple", options: ["배당 낮음", "배당 변동 심함", "인기 경기 배당 불리함", "없음"] },
      { id: "event_complaint", label: "이벤트 불만", type: "multiple", options: ["조건 복잡함", "보상 낮음", "지급 지연", "이벤트 부족", "없음"] },
      { id: "cs_complaint", label: "고객센터 불만", type: "multiple", options: ["응답 느림", "답변 불친절", "해결 안 됨", "매크로 답변", "없음"] },
      { id: "withdraw_complaint", label: "환전 불만", type: "multiple", options: ["환전 지연", "한도 불만", "조건 불만", "수수료 불만", "없음"] },
    ],
  },
  {
    id: "overall",
    title: "종합 평가 항목",
    questions: [
      { id: "overall_satisfaction", label: "전체 만족도", type: "single", options: ["매우 만족", "만족", "보통", "불만족", "매우 불만족"] },
      { id: "reuse_intention", label: "재이용 의향", type: "single", options: ["반드시 이용", "이용할 것 같음", "고민 중", "이용 안 함"] },
      { id: "recommendation", label: "추천 의향", type: "single", options: ["적극 추천", "추천", "보통", "비추천"] },
      { id: "best_part", label: "가장 만족한 부분", type: "single", options: ["배당", "이벤트", "충환전", "고객센터", "게임 종류", "사용 편의성"] },
      { id: "worst_part", label: "가장 불만족한 부분", type: "single", options: ["배당", "이벤트", "충환전", "고객센터", "규정", "사이트 오류", "없음"] },
      { id: "improvement_priority", label: "개선 우선순위", type: "single", options: ["배당 개선", "이벤트 확대", "환전 속도", "고객센터", "규정 완화", "앱 개선", "없음"] },
    ],
  },
];
