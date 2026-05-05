export function HomeAboutSection() {
  const criteria = [
    "라이선스 보유 여부(MGA, UKGC, Curacao 등)",
    "입출금 처리 속도와 거부 이력",
    "고객지원 채널의 다양성과 응답 속도",
    "운영 이력과 도메인 변경 빈도",
    "이용자 후기와 피해 제보 누적 수",
  ];

  return (
    <section className="rounded-lg border border-line bg-surface p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">
        이용 전 확인할 정보
      </p>
      <h2 className="mt-1 text-2xl font-bold text-foreground">토토사이트란?</h2>
      <div className="mt-4 grid gap-4 text-sm leading-7 text-muted">
        <p>
          토토사이트는 스포츠 경기 결과를 예측해 베팅하는 온라인 플랫폼을
          말합니다. 국내에는 합법적인 스포츠토토(체육진흥투표권)가 운영되고
          있으며, 그 외 해외 라이선스 기반의 온라인 베팅 사이트들도 운영되고
          있습니다. 다만 사이트마다 운영 주체, 라이선스 표기, 도메인 이력,
          이용자 응대 방식이 다르므로 단일 문구나 광고성 설명만으로 판단하기는
          어렵습니다.
        </p>
        <p>
          정보 확인 단계에서는 공개된 라이선스 표기, 입출금 관련 후기, 고객지원
          응답 이력, 도메인 변경 빈도, 먹튀 피해 제보 누적 수를 함께 봐야
          합니다. 특정 사이트의 운영 이력이 길다고 해서 안전성이 보장되는 것은
          아니며, 반대로 공개 제보가 0건이라는 사실도 문제가 없다는 의미는
          아닙니다.
        </p>
        <div>
          <p className="font-semibold text-foreground">
            사이트 정보를 비교할 때 주로 확인하는 기준은 다음과 같습니다.
          </p>
          <ul className="mt-2 grid gap-2">
            {criteria.map((item) => (
              <li key={item} className="rounded-md bg-background px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p>
          본 플랫폼은 국내 이용자가 자주 접하는 토토사이트의 공개 정보, 도메인
          이력, 이용자 후기, 먹튀 피해 제보를 모아 정리합니다. 가입을 권유하지
          않으며, 정보 확인과 피해 예방을 목적으로 운영됩니다. 각 상세 페이지는
          사이트별 대표 주소, 추가 도메인, 승인된 후기, 승인된 피해 제보를
          분리해 보여주므로 같은 사이트라도 여러 데이터 신호를 함께 확인할 수
          있습니다.
        </p>
      </div>
    </section>
  );
}
