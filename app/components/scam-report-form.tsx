"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/app/components/auth-provider";
import { supabase } from "@/lib/supabase/client";

type ScamReportFormProps = {
  selectedSiteId?: string;
};

type ScamReportSiteOption = {
  id: string;
  siteName: string;
  domains: string[];
};

type FormValues = {
  siteId: string;
  incidentDate: string;
  usagePeriod: string;
  mainCategories: string[];
  sportsItems: string[];
  casinoItems: string[];
  slotItems: string[];
  miniGameItems: string[];
  otherBettingItems: string[];
  categoryItems: string[];
  categoryEtcText: string;
  damageTypes: string[];
  damageTypeEtcText: string;
  damageAmount: string;
  damageAmountUnknown: boolean;
  situationDescription: string;
  depositMethod: "bank" | "coin" | "";
  depositBankName: string;
  depositAccountNumber: string;
  depositAccountHolder: string;
  depositCoinName: string;
  depositWalletAddress: string;
  depositTxHash: string;
  depositAmount: string;
  evidenceImageUrls: string[];
  privacyMaskingAgreement: boolean;
  falseReportAgreement: boolean;
};

type FormErrors = Partial<Record<keyof FormValues | "siteId", string>>;

const initialValues: FormValues = {
  siteId: "",
  incidentDate: "",
  usagePeriod: "",
  mainCategories: [],
  sportsItems: [],
  casinoItems: [],
  slotItems: [],
  miniGameItems: [],
  otherBettingItems: [],
  categoryItems: [],
  categoryEtcText: "",
  damageTypes: [],
  damageTypeEtcText: "",
  damageAmount: "",
  damageAmountUnknown: false,
  situationDescription: "",
  depositMethod: "",
  depositBankName: "",
  depositAccountNumber: "",
  depositAccountHolder: "",
  depositCoinName: "",
  depositWalletAddress: "",
  depositTxHash: "",
  depositAmount: "",
  evidenceImageUrls: [],
  privacyMaskingAgreement: false,
  falseReportAgreement: false,
};

const usagePeriods = ["1일 이내", "1주일 이내", "1개월 이내", "1~3개월", "3개월 이상"];
const mainCategories = ["스포츠베팅", "카지노베팅", "슬롯베팅", "미니게임베팅", "기타 베팅"];
const categoryDetailQuestions = [
  {
    id: "sportsItems",
    parent: "스포츠베팅",
    label: "스포츠베팅 세부 종목",
    options: ["축구", "농구", "야구", "배구", "테니스", "e스포츠", "기타 스포츠"],
  },
  {
    id: "casinoItems",
    parent: "카지노베팅",
    label: "카지노베팅 세부 종목",
    options: ["바카라", "블랙잭", "룰렛", "홀덤", "식보", "기타 카지노"],
  },
  {
    id: "slotItems",
    parent: "슬롯베팅",
    label: "슬롯베팅 세부 종목",
    options: ["일반 슬롯", "잭팟 슬롯", "프리스핀 슬롯", "인기 슬롯", "신규 슬롯"],
  },
  {
    id: "miniGameItems",
    parent: "미니게임베팅",
    label: "미니게임베팅 세부 종목",
    options: ["파워볼", "사다리", "달팽이", "키노", "로하이", "기타 미니게임"],
  },
  {
    id: "otherBettingItems",
    parent: "기타 베팅",
    label: "기타 베팅 세부 항목",
    options: ["이벤트 베팅", "가상 스포츠", "라이브 베팅", "특수 베팅"],
  },
] as const;
const damageTypes = [
  "출금 거부",
  "출금 지연",
  "계정 차단",
  "고객센터 차단",
  "보너스 규정 악용",
  "입금 후 미반영",
  "기타",
];

function initialFormValues(selectedSiteId = ""): FormValues {
  return {
    ...initialValues,
    siteId: selectedSiteId.trim(),
  };
}

function parseNumber(value: string) {
  const normalized = value.replaceAll(",", "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

export function ScamReportForm({ selectedSiteId = "" }: ScamReportFormProps) {
  const normalizedSelectedSiteId = selectedSiteId.trim();
  const { user } = useAuth();
  const sectionRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [siteOptions, setSiteOptions] = useState<ScamReportSiteOption[]>([]);
  const [values, setValues] = useState<FormValues>(() =>
    initialFormValues(normalizedSelectedSiteId),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSites, setIsLoadingSites] = useState(true);
  const [siteLoadError, setSiteLoadError] = useState("");
  const [siteSearch, setSiteSearch] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const isSiteFixed = Boolean(normalizedSelectedSiteId);

  const selectedSite = useMemo(
    () => siteOptions.find((site) => site.id === values.siteId) ?? null,
    [siteOptions, values.siteId],
  );

  const filteredSiteOptions = useMemo(() => {
    const keyword = siteSearch.trim().toLowerCase();
    const filtered =
      keyword.length === 0
        ? siteOptions
        : siteOptions.filter((site) =>
            site.siteName.toLowerCase().includes(keyword),
          );

    return filtered.slice(0, 12);
  }, [siteOptions, siteSearch]);

  function scrollToFirstError(nextErrors: FormErrors) {
    const firstErrorKey = Object.keys(nextErrors)[0];

    if (!firstErrorKey) return;

    requestAnimationFrame(() => {
      const target =
        formRef.current?.querySelector<HTMLElement>(
          `[data-error-key="${CSS.escape(firstErrorKey)}"]`,
        ) ??
        sectionRef.current?.querySelector<HTMLElement>(
          `[data-error-key="${CSS.escape(firstErrorKey)}"]`,
        ) ??
        null;

      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target
        ?.querySelector<HTMLElement>("input, textarea, select, button")
        ?.focus({ preventScroll: true });
    });
  }

  useEffect(() => {
    let isMounted = true;

    async function loadApprovedSites() {
      setIsLoadingSites(true);
      const { data, error } = await supabase
        .from("sites")
        .select("id, name, domains, url")
        .eq("status", "approved")
        .order("name", { ascending: true });

      if (!isMounted) return;

      if (error) {
        setSiteLoadError(
          "제보 가능한 사이트 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
        );
        setSiteOptions([]);
        setValues(initialFormValues());
        setIsLoadingSites(false);
        return;
      }

      const approvedSites = (data ?? []).map((site) => ({
        id: site.id,
        siteName: site.name,
        domains:
          Array.isArray(site.domains) && site.domains.length > 0
            ? site.domains
            : [site.url],
      }));
      const selectedSite = approvedSites.find((site) => site.id === normalizedSelectedSiteId);

      setSiteLoadError(
        normalizedSelectedSiteId && !selectedSite
          ? "요청한 사이트가 승인 목록에 없거나 공개 상태가 아닙니다."
          : "",
      );
      setSiteOptions(approvedSites);
      setValues(
        initialFormValues(
          normalizedSelectedSiteId ? selectedSite?.id ?? "" : approvedSites[0]?.id ?? "",
        ),
      );
      setSiteSearch(selectedSite?.siteName ?? "");
      setIsLoadingSites(false);
    }

    loadApprovedSites();

    return () => {
      isMounted = false;
    };
  }, [normalizedSelectedSiteId]);

  function updateField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setSuccessMessage("");
    setErrorMessage("");
  }

  function selectSite(site: ScamReportSiteOption) {
    updateField("siteId", site.id);
    setSiteSearch(site.siteName);
  }

  function toggleArray(
    key:
      | "mainCategories"
      | "sportsItems"
      | "casinoItems"
      | "slotItems"
      | "miniGameItems"
      | "otherBettingItems"
      | "damageTypes",
    value: string,
  ) {
    setValues((current) => {
      const currentValues = current[key];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      return { ...current, [key]: nextValues };
    });
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validate() {
    const nextErrors: FormErrors = {};
    const damageAmount = parseNumber(values.damageAmount);

    if (!values.siteId) {
      nextErrors.siteId = "제보할 사이트를 선택해주세요.";
    } else if (!isUuid(values.siteId)) {
      nextErrors.siteId =
        "승인된 사이트 정보가 아직 Supabase와 연결되지 않았습니다.";
    }
    if (!user) nextErrors.siteId = "로그인 후 먹튀 피해 제보를 작성할 수 있습니다.";
    if (!values.incidentDate) nextErrors.incidentDate = "발생 일자를 입력해주세요.";
    if (!values.usagePeriod) nextErrors.usagePeriod = "이용 기간을 선택해주세요.";
    if (values.mainCategories.length === 0) {
      nextErrors.mainCategories = "이용 카테고리를 1개 이상 선택해주세요.";
    }
    if (values.damageTypes.length === 0) {
      nextErrors.damageTypes = "피해 유형을 1개 이상 선택해주세요.";
    }
    if (!values.damageAmountUnknown && damageAmount === null) {
      nextErrors.damageAmount = "피해 금액을 입력하거나 금액 미확인을 선택해주세요.";
    }
    if (values.situationDescription.trim().length < 50) {
      nextErrors.situationDescription = "상황 설명은 최소 50자 이상 작성해주세요.";
    }
    if (values.depositMethod === "bank") {
      if (!values.depositBankName.trim()) nextErrors.depositBankName = "은행명을 입력해주세요.";
      if (!values.depositAccountNumber.trim()) nextErrors.depositAccountNumber = "계좌번호를 입력해주세요.";
      if (!values.depositAccountHolder.trim()) nextErrors.depositAccountHolder = "예금주를 입력해주세요.";
    }
    if (values.depositMethod === "coin") {
      if (!values.depositCoinName.trim()) nextErrors.depositCoinName = "코인명을 입력해주세요.";
      if (!values.depositWalletAddress.trim()) nextErrors.depositWalletAddress = "지갑 주소를 입력해주세요.";
    }
    if (!values.privacyMaskingAgreement) {
      nextErrors.privacyMaskingAgreement = "개인정보 마스킹 동의가 필요합니다.";
    }
    if (!values.falseReportAgreement) {
      nextErrors.falseReportAgreement = "허위 제보 책임 확인이 필요합니다.";
    }

    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      scrollToFirstError(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    const detailItems = [
      ...values.sportsItems,
      ...values.casinoItems,
      ...values.slotItems,
      ...values.miniGameItems,
      ...values.otherBettingItems,
    ];
    const depositNote =
      values.depositMethod === "coin"
        ? [
            values.depositCoinName ? `코인: ${values.depositCoinName}` : "",
            values.depositWalletAddress ? `지갑: ${values.depositWalletAddress}` : "",
            values.depositTxHash ? `TX: ${values.depositTxHash}` : "",
          ]
            .filter(Boolean)
            .join(" / ")
        : null;

    const { data: insertedReport, error } = await supabase
      .from("scam_reports")
      .insert({
        site_id: values.siteId,
        user_id: user?.id ?? null,
        incident_date: values.incidentDate,
        usage_period: values.usagePeriod,
        main_category: values.mainCategories.join(", "),
        category_items: detailItems,
        category_etc_text: values.categoryEtcText.trim() || null,
        damage_types: values.damageTypes,
        damage_type_etc_text: values.damageTypeEtcText.trim() || null,
        damage_amount: values.damageAmountUnknown ? null : parseNumber(values.damageAmount),
        damage_amount_unknown: values.damageAmountUnknown,
        situation_description: values.situationDescription.trim(),
        deposit_bank_name:
          values.depositMethod === "bank"
            ? values.depositBankName.trim() || null
            : depositNote,
        deposit_account_number:
          values.depositMethod === "bank"
            ? values.depositAccountNumber.trim() || null
            : values.depositWalletAddress.trim() || null,
        deposit_account_holder:
          values.depositMethod === "bank"
            ? values.depositAccountHolder.trim() || null
            : values.depositCoinName.trim() || null,
        deposit_amount: parseNumber(values.depositAmount),
        deposit_date: null,
        evidence_image_urls: values.evidenceImageUrls,
        evidence_note: null,
        contact_telegram: null,
        is_contact_public: false,
        privacy_masking_agreement: values.privacyMaskingAgreement,
        false_report_agreement: values.falseReportAgreement,
        review_status: "pending",
        is_published: false,
      })
      .select("id")
      .single();

    setIsSubmitting(false);

    if (error) {
      setErrorMessage("먹튀 피해 제보 저장 중 문제가 발생했습니다. 입력값과 권한을 확인해주세요.");
      return;
    }

    const notificationError = insertedReport?.id
      ? await sendContentSubmittedNotification(insertedReport.id)
      : "";

    setValues(initialFormValues(normalizedSelectedSiteId || values.siteId));
    setSuccessMessage(
      notificationError
        ? `먹튀 피해 제보가 접수되었습니다. 관리자 승인 전까지 공개되지 않습니다. ${notificationError}`
        : "먹튀 피해 제보가 접수되었습니다. 관리자 승인 전까지 공개되지 않습니다.",
    );
  }

  async function sendContentSubmittedNotification(reportId: string) {
    const { data: sessionResult } = await supabase.auth.getSession();
    const accessToken = sessionResult.session?.access_token;

    if (!accessToken) {
      return "다만 텔레그램 알림은 로그인 세션을 확인하지 못해 전송되지 않았습니다.";
    }

    const response = await fetch("/api/telegram/content-submitted", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ type: "scam_report", contentId: reportId }),
    });

    if (response.ok) {
      return "";
    }

    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    return `다만 텔레그램 알림 전송에 실패했습니다. ${
      body?.error ?? "봇 연결 상태와 환경변수를 확인해주세요."
    }`;
  }

  if (isLoadingSites) {
    return (
      <section className="rounded-lg border border-line bg-surface p-5 text-sm text-muted shadow-sm">
        제보 가능한 사이트 목록을 불러오는 중입니다.
      </section>
    );
  }

  if (siteOptions.length === 0) {
    return (
      <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold">제보 가능한 사이트가 없습니다</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          관리자가 등록하고 공개한 사이트가 아직 없습니다.
        </p>
        {siteLoadError ? (
          <p className="mt-3 text-sm font-semibold text-red-700">
            {siteLoadError}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="rounded-lg border border-line bg-surface p-5 shadow-sm"
    >
      <div className="grid gap-2 text-sm font-medium" data-error-key="siteId">
        {isSiteFixed ? (
          <div className="rounded-md border border-line bg-background p-4">
            <p className="text-xs font-semibold uppercase text-muted">
              현재 제보 대상
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {selectedSite?.siteName ?? "사이트"}
            </p>
            <p className="mt-1 break-all text-xs text-muted">
              {(selectedSite?.domains ?? []).join(", ")}
            </p>
          </div>
        ) : (
          <>
            <label htmlFor="scam-site-search">제보할 사이트 검색</label>
            <input
              id="scam-site-search"
              value={siteSearch}
              onChange={(event) => setSiteSearch(event.target.value)}
              className="h-11 rounded-md border border-line px-3 text-sm"
              placeholder="사이트명을 입력해서 검색하세요"
              autoComplete="off"
            />
            <p className="text-xs text-muted">
              선택된 사이트:{" "}
              <span className="font-semibold text-foreground">
                {selectedSite?.siteName ?? "사이트"}
              </span>
            </p>
            <div className="grid max-h-56 gap-2 overflow-y-auto rounded-md border border-line bg-background p-2">
              {filteredSiteOptions.length > 0 ? (
                filteredSiteOptions.map((site) => {
                  const selected = site.id === values.siteId;

                  return (
                    <button
                      key={site.id}
                      type="button"
                      onClick={() => selectSite(site)}
                      className={[
                        "rounded-md px-3 py-2 text-left text-sm transition",
                        selected
                          ? "bg-accent text-white"
                          : "bg-white text-foreground hover:bg-accent-soft hover:text-accent",
                      ].join(" ")}
                    >
                      {site.siteName}
                      {selected ? (
                        <span className="ml-2 text-xs">선택됨</span>
                      ) : null}
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-2 text-sm text-muted">
                  검색 결과가 없습니다.
                </p>
              )}
            </div>
          </>
        )}
        {errors.siteId ? (
          <span className="text-xs text-red-700">{errors.siteId}</span>
        ) : null}
        {siteLoadError ? (
          <span className="text-xs text-red-700">{siteLoadError}</span>
        ) : null}
      </div>

      {successMessage ? (
        <div className="mt-4 rounded-md border border-accent bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="mt-5 grid gap-5"
        noValidate
      >
          {!user ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              먹튀 피해 제보는 로그인 사용자만 작성할 수 있습니다.
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <label
              className="grid gap-1 text-sm font-medium"
              data-error-key="incidentDate"
            >
              발생 일자
              <input
                type="date"
                value={values.incidentDate}
                onChange={(event) => updateField("incidentDate", event.target.value)}
                className="h-11 rounded-md border border-line px-3 text-sm"
              />
              {errors.incidentDate ? <span className="text-xs text-red-700">{errors.incidentDate}</span> : null}
            </label>
            <label
              className="grid gap-1 text-sm font-medium"
              data-error-key="usagePeriod"
            >
              이용 기간
              <select
                value={values.usagePeriod}
                onChange={(event) => updateField("usagePeriod", event.target.value)}
                className="h-11 rounded-md border border-line bg-white px-3 text-sm"
              >
                <option value="">선택</option>
                {usagePeriods.map((period) => (
                  <option key={period} value={period}>{period}</option>
                ))}
              </select>
              {errors.usagePeriod ? <span className="text-xs text-red-700">{errors.usagePeriod}</span> : null}
            </label>
          </div>

          <fieldset className="grid gap-2" data-error-key="mainCategories">
            <legend className="text-sm font-semibold">이용 카테고리</legend>
            <div className="flex flex-wrap gap-2">
              {mainCategories.map((item) => (
                <ChoicePill
                  key={item}
                  label={item}
                  checked={values.mainCategories.includes(item)}
                  onClick={() => toggleArray("mainCategories", item)}
                />
              ))}
            </div>
            {errors.mainCategories ? <span className="text-xs text-red-700">{errors.mainCategories}</span> : null}
          </fieldset>

          {categoryDetailQuestions.map((question) =>
            values.mainCategories.includes(question.parent) ? (
              <fieldset key={question.id} className="grid gap-2">
                <legend className="text-sm font-semibold">{question.label}</legend>
                <div className="flex flex-wrap gap-2">
                  {question.options.map((item) => (
                    <ChoicePill
                      key={item}
                      label={item}
                      checked={values[question.id].includes(item)}
                      onClick={() => toggleArray(question.id, item)}
                    />
                  ))}
                </div>
              </fieldset>
            ) : null,
          )}

          {values.mainCategories.includes("기타 베팅") ? (
            <input
              value={values.categoryEtcText}
              onChange={(event) => updateField("categoryEtcText", event.target.value)}
              className="h-11 rounded-md border border-line px-3 text-sm"
              placeholder="기타 베팅 내용을 입력해주세요"
            />
          ) : null}

          <fieldset className="grid gap-2" data-error-key="damageTypes">
            <legend className="text-sm font-semibold">피해 유형</legend>
            <div className="flex flex-wrap gap-2">
              {damageTypes.map((item) => (
                <ChoicePill
                  key={item}
                  label={item}
                  checked={values.damageTypes.includes(item)}
                  onClick={() => toggleArray("damageTypes", item)}
                />
              ))}
            </div>
            <input
              value={values.damageTypeEtcText}
              onChange={(event) => updateField("damageTypeEtcText", event.target.value)}
              className="h-11 rounded-md border border-line px-3 text-sm"
              placeholder="기타 피해 유형"
            />
            {errors.damageTypes ? <span className="text-xs text-red-700">{errors.damageTypes}</span> : null}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <label
              className="grid gap-1 text-sm font-medium"
              data-error-key="damageAmount"
            >
              피해 금액
              <input
                value={values.damageAmount}
                onChange={(event) => updateField("damageAmount", event.target.value)}
                disabled={values.damageAmountUnknown}
                className="h-11 rounded-md border border-line px-3 text-sm disabled:opacity-50"
                placeholder="예: 1000000"
              />
              {errors.damageAmount ? <span className="text-xs text-red-700">{errors.damageAmount}</span> : null}
            </label>
            <label className="mt-7 flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={values.damageAmountUnknown}
                onChange={(event) => updateField("damageAmountUnknown", event.target.checked)}
              />
              피해 금액을 정확히 모름
            </label>
          </div>

          <label
            className="grid gap-1 text-sm font-medium"
            data-error-key="situationDescription"
          >
            상황 설명
            <textarea
              value={values.situationDescription}
              onChange={(event) => updateField("situationDescription", event.target.value)}
              className="min-h-32 rounded-md border border-line px-3 py-3 text-sm"
              placeholder="피해 발생 과정, 고객센터 대응, 출금 요청 내역 등을 50자 이상 작성해주세요."
            />
            {errors.situationDescription ? <span className="text-xs text-red-700">{errors.situationDescription}</span> : null}
          </label>

          <fieldset className="grid gap-3 rounded-md border border-line bg-background p-4">
            <legend className="px-1 text-sm font-semibold">입금 방식</legend>
            <div className="flex flex-wrap gap-2">
              <ChoicePill
                label="계좌"
                checked={values.depositMethod === "bank"}
                onClick={() => updateField("depositMethod", "bank")}
              />
              <ChoicePill
                label="코인"
                checked={values.depositMethod === "coin"}
                onClick={() => updateField("depositMethod", "coin")}
              />
            </div>
            {values.depositMethod === "bank" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput value={values.depositBankName} onChange={(value) => updateField("depositBankName", value)} placeholder="입금 은행명" error={errors.depositBankName} errorKey="depositBankName" />
                <FormInput value={values.depositAccountNumber} onChange={(value) => updateField("depositAccountNumber", value)} placeholder="입금 계좌번호" error={errors.depositAccountNumber} errorKey="depositAccountNumber" />
                <FormInput value={values.depositAccountHolder} onChange={(value) => updateField("depositAccountHolder", value)} placeholder="예금주" error={errors.depositAccountHolder} errorKey="depositAccountHolder" />
                <FormInput value={values.depositAmount} onChange={(value) => updateField("depositAmount", value)} placeholder="입금 금액" />
              </div>
            ) : null}
            {values.depositMethod === "coin" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput value={values.depositCoinName} onChange={(value) => updateField("depositCoinName", value)} placeholder="코인명 예: USDT, BTC" error={errors.depositCoinName} errorKey="depositCoinName" />
                <FormInput value={values.depositWalletAddress} onChange={(value) => updateField("depositWalletAddress", value)} placeholder="입금 지갑 주소" error={errors.depositWalletAddress} errorKey="depositWalletAddress" />
                <FormInput value={values.depositTxHash} onChange={(value) => updateField("depositTxHash", value)} placeholder="트랜잭션 해시 선택" />
                <FormInput value={values.depositAmount} onChange={(value) => updateField("depositAmount", value)} placeholder="입금 금액" />
              </div>
            ) : null}
          </fieldset>

          <label className="grid gap-1 text-sm font-medium">
            증거 이미지
            <button
              type="button"
              className="h-11 w-fit rounded-md border border-line px-4 text-sm font-semibold text-muted"
              disabled
            >
              파일 첨부 준비 중
            </button>
            <span className="text-xs text-muted">
              파일 첨부 기능은 추후 제공 예정입니다.
            </span>
          </label>

          <div className="grid gap-3 text-sm">
            <CheckboxLine checked={values.privacyMaskingAgreement} onChange={(checked) => updateField("privacyMaskingAgreement", checked)} label="공개 전 개인정보가 마스킹될 수 있음에 동의합니다" error={errors.privacyMaskingAgreement} errorKey="privacyMaskingAgreement" />
            <CheckboxLine checked={values.falseReportAgreement} onChange={(checked) => updateField("falseReportAgreement", checked)} label="허위 제보에 대한 책임을 확인했습니다" error={errors.falseReportAgreement} errorKey="falseReportAgreement" />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !user}
            className="h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSubmitting ? "제출 중..." : "먹튀 피해 제보 제출"}
          </button>
      </form>
    </section>
  );
}

function ChoicePill({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
        checked
          ? "border-accent bg-accent-soft text-accent"
          : "border-line bg-white text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function FormInput({
  value,
  onChange,
  placeholder,
  error,
  errorKey,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
  errorKey?: string;
}) {
  return (
    <label className="grid gap-1" data-error-key={errorKey}>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-md border border-line px-3 text-sm"
        placeholder={placeholder}
      />
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </label>
  );
}

function CheckboxLine({
  checked,
  onChange,
  label,
  error,
  errorKey,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  error?: string;
  errorKey?: string;
}) {
  return (
    <label className="grid gap-1" data-error-key={errorKey}>
      <span className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        {label}
      </span>
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </label>
  );
}
