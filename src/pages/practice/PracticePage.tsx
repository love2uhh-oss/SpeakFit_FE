import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./styles/PracticePage.css";
import PracticeTabs from "./components/PracticeTabs";
import ScriptPanel from "./components/ScriptPanel";
import PresentationDeckPanel from "./components/PresentationDeckPanel";
import MetricCard from "../../components/common/MetricCard/MetricCard";
import RecordButton from "./components/RecordButton";
import FeedbackMetricsPanel from "./components/FeedbackMetricsPanel";
import FeedbackScriptPanel from "./components/FeedbackScriptPanel";
import PracticeIntroModal from "./components/PracticeIntroModal";
import PracticeStyleModal from "./components/PracticeStyleModal";
import useAudioMeter from "./hooks/useAudioMeter";
import usePracticeRealtime from "./hooks/usePracticeRealtime";
import {
  getPracticeReport,
  inputPracticeInfo,
  selectPracticeStyle,
  startPractice as requestStartPractice,
  stopPractice,
  type PracticeContentItem,
  type PracticeIssueResponse,
  type StartPracticeSentence,
  type PracticeReportResponse,
  type PracticeSentenceResponse,
  type SpeechStyle,
} from "../../api/practice";
import { getScript, uploadPpt, getPptStatus, type PptSlideResponse } from "../../api/scripts";
import { ROUTES } from "../../app/routes.const";

import type {
  FeedbackIssue,
  FeedbackMetric,
  FeedbackMetricId,
  IntroFormState,
  PracticeFeedbackReport,
  PracticeRouteState,
  PracticeStage,
  SpeechStyleId,
} from "./types";

const initialForm: IntroFormState = {
  audienceAge: "",
  audienceKnowledge: "",
  speechType: "",
  duration: "",
};

const PRACTICE_TABS = ["스피치 모드", "프레젠테이션 모드"] as const;
const PRACTICE_ROUTE_STATE_KEY = "sayupai_practice_route_state";
const REPORT_POLL_INTERVAL_MS = 2000;
const REPORT_POLL_TIMEOUT_MS = 90000;

const SCRIPT_TEXT = `안녕하세요. 저는 발표 연습을 돕는 서비스 SayUpAI을 개발하고 있는 팀입니다.
오늘은 프로젝트의 기획 배경과 핵심 기능을 중심으로 발표드리겠습니다.

발표를 준비할 때 많은 사람들은 내용 위주로만 연습하고,
자신의 말하기 속도나 전달력을 객관적으로 확인하기 어렵습니다.

예를 들어, 말을 너무 빠르게 하거나 불필요한 추임새를 반복하거나,
중요한 부분에서 강조가 부족한 문제가 있어도 스스로 인식하기 쉽지 않습니다.
`;

const getStoredPracticeRouteState = () => {
  const stateJson = sessionStorage.getItem(PRACTICE_ROUTE_STATE_KEY);

  if (!stateJson) return null;

  try {
    return JSON.parse(stateJson) as PracticeRouteState;
  } catch {
    sessionStorage.removeItem(PRACTICE_ROUTE_STATE_KEY);
    return null;
  }
};

const DEFAULT_FEEDBACK_METRICS: [FeedbackMetric, ...FeedbackMetric[]] = [
  {
    id: "speech-rate",
    label: "발화 속도",
    value: "조금 느림",
    badge: "90wpm",
    feedback: "핵심 문장 앞에서는 속도를 낮추고 문장 끝에서 짧게 쉬면 흐름이 자연스러워집니다.",
    initial: "S",
    tone: "slate",
  },
  {
    id: "voice-energy",
    label: "음성 에너지",
    value: "낮음",
    badge: "에너지 부족",
    feedback: "문장 끝까지 음성 에너지를 유지하면 청중이 발표 흐름을 더 쉽게 따라올 수 있습니다.",
    initial: "E",
    tone: "amber",
  },
  {
    id: "pause",
    label: "멈춤 구간",
    value: "주의",
    badge: "2초+ 멈춤",
    feedback: "문장 중간보다 문장 끝에서 짧게 쉬면 더 자연스럽게 들립니다.",
    initial: "P",
    tone: "amber",
  },
  {
    id: "emphasis",
    label: "기호 준수",
    value: "낮음",
    badge: "강조 부족",
    feedback: "중요한 단어는 음량이나 억양을 살짝 올려 말하면 메시지가 더 분명해집니다.",
    initial: "M",
    tone: "violet",
  },
  {
    id: "clarity",
    label: "발음 명료도",
    value: "불명확",
    badge: "ZCR 0.08",
    feedback: "긴 문장은 단어 사이를 조금 더 분명하게 띄어 말하면 전달력이 좋아집니다.",
    initial: "M",
    tone: "green",
  },
];

const DEFAULT_FEEDBACK_ISSUES: FeedbackIssue[] = [
  {
    metricId: "speech-rate",
    excerpt: "발표를 준비할 때 많은 사람들은 내용 위주로만 연습하고,",
    title: "발화 속도가 목표보다 조금 빨랐습니다.",
    description:
      "핵심 문장 앞에서는 속도를 낮추고 문장 끝에서 짧게 쉬면 흐름이 자연스러워집니다.",
  },
  {
    metricId: "voice-energy",
    excerpt: "오늘은 프로젝트의 기획 배경과 핵심 기능을 중심으로 발표드리겠습니다.",
    title: "문장 끝의 에너지가 낮게 측정되었습니다.",
    description:
      "중요한 안내 문장은 끝까지 힘을 유지하면 청중이 발표 흐름을 더 쉽게 따라올 수 있습니다.",
  },
  {
    metricId: "pause",
    excerpt: "자신의 말하기 속도나 전달력을 객관적으로 확인하기 어렵습니다.",
    title: "문장 중간에서 긴 멈춤이 발생했습니다.",
    description:
      "문장 중간보다 문장 끝에서 0.5초 정도 쉬면 더 자연스럽게 들립니다.",
  },
  {
    metricId: "emphasis",
    excerpt: "중요한 부분에서 강조가 부족한 문제가 있어도",
    title: "핵심 문장의 강조가 부족했습니다.",
    description:
      "중요한 단어는 음량이나 억양을 살짝 올려 말하면 메시지가 더 분명해집니다.",
  },
  {
    metricId: "clarity",
    excerpt: "스스로 인식하기 쉽지 않습니다.",
    title: "일부 구간의 발음 명료도가 낮았습니다.",
    description:
      "긴 문장은 단어 사이를 조금 더 분명하게 띄어 말하면 전달력이 좋아집니다.",
  },
];

const DEFAULT_FEEDBACK_REPORT: PracticeFeedbackReport = {
  script: SCRIPT_TEXT,
  goalPercent: 67,
  summary:
    "전반적으로 안정적인 발화였지만, 강조 표현과 발음 명료도가 부족해 전달력이 다소 약하게 느껴졌습니다.",
  tip: "핵심 키워드를 더 강조하고 문장 끝에서 짧게 멈추면 전달력이 좋아집니다.",
  metrics: DEFAULT_FEEDBACK_METRICS,
  issues: DEFAULT_FEEDBACK_ISSUES,
};

function mapAudienceAge(value: IntroFormState["audienceAge"]) {
  switch (value) {
    case "어린이":
      return "CHILD";
    case "청소년":
      return "YOUTH";
    case "성인":
      return "ADULT";
    case "노년":
      return "SENIOR";
    default:
      throw new Error("청중 연령대를 선택해 주세요.");
  }
}

function mapAudienceKnowledge(value: IntroFormState["audienceKnowledge"]) {
  switch (value) {
    case "잘 모름":
      return "LOW";
    case "보통":
      return "MIDDLE";
    case "잘 앎":
      return "HIGH";
    default:
      throw new Error("청중 이해도를 선택해 주세요.");
  }
}

function mapSpeechType(value: IntroFormState["speechType"]) {
  switch (value) {
    case "발표":
      return "PRESENTATION";
    case "면접":
      return "INTERVIEW";
    case "강의":
      return "LECTURE";
    case "토론":
      return "DISCUSSION";
    case "피드백 연습":
      return "FEEDBACKPRACTICE";
    default:
      throw new Error("스피치 유형을 선택해 주세요.");
  }
}

function getFallbackMetric(index: number) {
  return DEFAULT_FEEDBACK_METRICS[index] ?? DEFAULT_FEEDBACK_METRICS[0];
}

function formatNumber(value: number | undefined, suffix: string, fractionDigits = 1) {
  if (value === undefined || !Number.isFinite(value)) return undefined;

  return `${Number(value.toFixed(fractionDigits))}${suffix}`;
}

function compactText(value: string | undefined, maxLength: number) {
  if (!value) return undefined;

  const text = value.replace(/\s+/g, " ").trim();

  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength).trim()}...`;
}

function normalizeScriptLine(value: string | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function formatGoalPercent(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_FEEDBACK_REPORT.goalPercent;
  }

  const percent = value <= 1 ? value * 100 : value;
  return Math.min(100, Math.max(0, Math.round(percent)));
}

function normalizePracticeStatus(status: string | undefined) {
  return status?.trim().toUpperCase() ?? "";
}

function getReportPollingMessage(report: PracticeReportResponse) {
  return report.message ?? "발표 음성을 분석하고 있습니다.";
}

function getDiffLevel(
  diff: number | undefined,
  negativeLabel: string,
  positiveLabel: string,
) {
  if (diff === undefined || !Number.isFinite(diff)) return "분석 완료";

  const absDiff = Math.abs(diff);

  if (absDiff < 5) return "적정";
  if (absDiff < 15) return diff > 0 ? `조금 ${positiveLabel}` : `조금 ${negativeLabel}`;

  return diff > 0 ? positiveLabel : negativeLabel;
}

function getPauseLevel(count: number | undefined, ratio: number | undefined) {
  if (count === undefined && ratio === undefined) return "분석 완료";
  if ((count ?? 0) === 0 && (ratio ?? 0) < 0.08) return "적정";
  if ((count ?? 0) <= 2 && (ratio ?? 0) < 0.16) return "조금 많음";

  return "많음";
}

function mapMetricId(value: string | undefined, fallbackIndex: number): FeedbackMetricId {
  const normalized = value?.toLowerCase() ?? "";

  if (normalized.includes("voice") || normalized.includes("energy")) {
    return "voice-energy";
  }
  if (normalized.includes("pause") || normalized.includes("silence")) {
    return "pause";
  }
  if (normalized.includes("emphasis")) return "emphasis";
  if (normalized.includes("clarity") || normalized.includes("pronunciation")) {
    return "clarity";
  }
  if (normalized.includes("wpm") || normalized.includes("rate")) {
    return "speech-rate";
  }
  if (
    normalized.includes("속도") ||
    normalized.includes("빠르") ||
    normalized.includes("느리")
  ) {
    return "speech-rate";
  }
  if (
    normalized.includes("에너지") ||
    normalized.includes("음량") ||
    normalized.includes("강도")
  ) {
    return "voice-energy";
  }
  if (normalized.includes("멈춤") || normalized.includes("쉼")) return "pause";
  if (normalized.includes("강조") || normalized.includes("기호")) {
    return "emphasis";
  }
  if (normalized.includes("명료") || normalized.includes("발음")) return "clarity";

  return getFallbackMetric(fallbackIndex).id;
}

function mapIssueMetricId(
  issue: PracticeIssueResponse,
  fallbackIndex: number,
): FeedbackMetricId {
  const issueType = issue.issueType?.toUpperCase() ?? "";

  if (issueType.includes("FAST") || issueType.includes("SLOW")) {
    return "speech-rate";
  }
  if (
    issueType.includes("PAUSE") ||
    issueType.includes("SKIPPED") ||
    issueType.includes("CONFIDENCE")
  ) {
    return "pause";
  }
  if (
    issueType.includes("VOLUME") ||
    issueType.includes("PITCH") ||
    issueType.includes("INTENSITY")
  ) {
    return "voice-energy";
  }
  if (issueType.includes("SCORE")) {
    return "clarity";
  }

  const issueText = `${issue.issueSummary ?? ""} ${issue.feedbackContent ?? ""} ${
    issue.reason ?? ""
  }`;

  return mapMetricId(issueText, fallbackIndex);
}

function getSortedSentences(sentences: PracticeSentenceResponse[] = []) {
  return [...sentences].sort((a, b) => a.index - b.index);
}

function getSortedStartSentences(sentences: StartPracticeSentence[] = []) {
  return [...sentences].sort((a, b) => a.sentenceIndex - b.sentenceIndex);
}

function getSentenceExcerpt(
  sentences: PracticeSentenceResponse[],
  issue: PracticeIssueResponse,
  fallbackSentences: StartPracticeSentence[] = [],
) {
  if (issue.sentenceText) return issue.sentenceText;

  if (issue.scriptSentenceId !== undefined) {
    const sentence = sentences.find(
      (item) => item.scriptSentenceId === issue.scriptSentenceId,
    );

    if (sentence) return sentence.text ?? sentence.originalText ?? "";

    const fallbackSentence = fallbackSentences.find(
      (item) => item.scriptSentenceId === issue.scriptSentenceId,
    );

    if (fallbackSentence) {
      return fallbackSentence.originalText ?? fallbackSentence.normalizedText ?? "";
    }
  }

  const sentenceIndex = issue.sentenceIndex ?? issue.startIndex;

  if (sentenceIndex === undefined) return "";

  const sentence =
    sentences.find((item) => item.index === sentenceIndex) ??
    sentences.find((item) => item.index === sentenceIndex + 1) ??
    sentences.find((item) => item.index === sentenceIndex - 1);

  if (sentence) return sentence.text ?? sentence.originalText ?? "";

  const fallbackSentence =
    fallbackSentences.find((item) => item.sentenceIndex === sentenceIndex) ??
    fallbackSentences.find((item) => item.sentenceIndex === sentenceIndex + 1) ??
    fallbackSentences.find((item) => item.sentenceIndex === sentenceIndex - 1);

  return fallbackSentence?.originalText ?? fallbackSentence?.normalizedText ?? "";
}

function mapPracticeReport(
  report: PracticeReportResponse,
  fallbackScript: string,
  fallbackSentences: StartPracticeSentence[] = [],
): PracticeFeedbackReport {
  const analysis = report.analysis;
  const aiAnalysis = report.aiAnalysis;
  const sentences = getSortedSentences(report.sentences);
  const startSentences = getSortedStartSentences(fallbackSentences);
  const scriptFromSentences = sentences
    .map((sentence) => normalizeScriptLine(sentence.text ?? sentence.originalText))
    .filter(Boolean)
    .join("\n");
  const metrics: FeedbackMetric[] = [
    {
      ...getFallbackMetric(0),
      value:
        compactText(aiAnalysis?.wpmSummary, 12) ??
        getDiffLevel(analysis?.wpm?.diff, "느림", "빠름"),
      badge: formatNumber(analysis?.wpm?.avg, "wpm", 0) ?? getFallbackMetric(0).badge,
      feedback: compactText(aiAnalysis?.wpmFeedback, 55),
    },
    {
      ...getFallbackMetric(1),
      value:
        compactText(aiAnalysis?.energySummary, 12) ??
        getDiffLevel(analysis?.intensity?.diff, "낮음", "높음"),
      badge:
        formatNumber(analysis?.intensity?.avg, "dB") ?? getFallbackMetric(1).badge,
      feedback: compactText(aiAnalysis?.energyFeedback, 55),
    },
    {
      ...getFallbackMetric(2),
      value: getPauseLevel(analysis?.pause?.count, analysis?.pause?.ratio),
      badge:
        formatNumber(
          analysis?.pause?.ratio === undefined ? undefined : analysis.pause.ratio * 100,
          "%",
        ) ?? getFallbackMetric(2).badge,
      feedback: compactText(aiAnalysis?.pauseFeedback, 55),
    },
    {
      ...getFallbackMetric(3),
      value: compactText(aiAnalysis?.symbolFeedback, 12) ?? "확인 필요",
      badge: "낭독 기호",
      feedback: undefined,
    },
    {
      ...getFallbackMetric(4),
      value: compactText(aiAnalysis?.goalSummary, 12) ?? "목표 확인",
      badge: `${formatGoalPercent(aiAnalysis?.goalSimilarityScore)}%`,
      feedback: compactText(aiAnalysis?.goalFeedback, 55),
    },
  ];

  const issues =
    report.practiceIssues && report.practiceIssues.length > 0
      ? report.practiceIssues.map((issue, index): FeedbackIssue => ({
          metricId: mapIssueMetricId(issue, index),
          excerpt: getSentenceExcerpt(sentences, issue, startSentences),
          title: issue.issueSummary ?? "상세 피드백",
          description:
            issue.feedbackContent ??
            issue.reason ??
            "분석 결과를 확인해보세요.",
        }))
      : DEFAULT_FEEDBACK_ISSUES;

  return {
    script: scriptFromSentences || fallbackScript,
    goalPercent: formatGoalPercent(aiAnalysis?.goalSimilarityScore),
    summary:
      compactText(aiAnalysis?.aiSummary, 70) ?? DEFAULT_FEEDBACK_REPORT.summary,
    tip:
      aiAnalysis?.goalFeedback ??
      aiAnalysis?.wpmFeedback ??
      aiAnalysis?.energyFeedback ??
      aiAnalysis?.pauseFeedback ??
      aiAnalysis?.symbolFeedback ??
      DEFAULT_FEEDBACK_REPORT.tip,
    metrics,
    issues,
  };
}

export default function PracticePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState =
    (location.state as PracticeRouteState | null) ?? getStoredPracticeRouteState();
  const scriptId = routeState?.scriptId ?? null;
  const [practiceTitle, setPracticeTitle] = useState(routeState?.scriptTitle || "Title");
  const [practiceScript, setPracticeScript] = useState(
    routeState?.scriptContent || SCRIPT_TEXT,
  );
  const [markedScript, setMarkedScript] = useState(
    routeState?.scriptContent || SCRIPT_TEXT,
  );
  const [stage, setStage] = useState<PracticeStage>("intro-modal");
  const [activeTab, setActiveTab] = useState<string>(PRACTICE_TABS[0]);
  const [introForm, setIntroForm] = useState<IntroFormState>(
    routeState?.introForm ?? initialForm
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isReadingMarksEnabled, setIsReadingMarksEnabled] = useState(true);
  const [activeFeedbackMetric, setActiveFeedbackMetric] =
    useState<FeedbackMetricId | null>(null);
  const [timeExceededType, setTimeExceededType] = useState<
    "initial" | "periodic" | "max" | null
  >(null);
  const [nextTriggerTime, setNextTriggerTime] = useState<number | null>(null);
  const [practiceId, setPracticeId] = useState<number | null>(null);
  const [practiceSentences, setPracticeSentences] = useState<StartPracticeSentence[]>([]);
  const [practiceContent, setPracticeContent] = useState<PracticeContentItem[]>([]);
  const [speechStyles, setSpeechStyles] = useState<SpeechStyle[]>([]);
  const [selectedSpeechStyleId, setSelectedSpeechStyleId] =
    useState<SpeechStyleId | null>(null);
  const [stylesError, setStylesError] = useState<string | null>(null);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [analysisStatusMessage, setAnalysisStatusMessage] = useState<string | null>(
    null,
  );
  const [isSubmittingPractice, setIsSubmittingPractice] = useState(false);
  const [isFetchingReport, setIsFetchingReport] = useState(false);
  const [feedbackReport, setFeedbackReport] =
    useState<PracticeFeedbackReport | null>(null);
  const [presentationFileName, setPresentationFileName] = useState<string | null>(null);
  const [presentationSourceUrl, setPresentationSourceUrl] = useState<string | undefined>();
  const [presentationSlides, setPresentationSlides] = useState<PptSlideResponse[]>([]);
  const [presentationUploadMessage, setPresentationUploadMessage] =
    useState<string | null>(null);
  const [isUploadingPresentation, setIsUploadingPresentation] = useState(false);
  const [presentationCurrentPage, setPresentationCurrentPage] = useState(1);
  const [presentationTotalPages, setPresentationTotalPages] = useState(1);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [playingStyleId, setPlayingStyleId] = useState<SpeechStyleId | null>(null);
  const reportRequestedRef = useRef(false);
  const reportPollTokenRef = useRef(0);
  const presentationUploadTokenRef = useRef(0)
  const realtime = usePracticeRealtime();
  const isPresentationMode = activeTab === "프레젠테이션 모드";

  const isIntroComplete = useMemo(() => {
    const durationNumber = Number(introForm.duration);

    return (
      !!introForm.audienceAge &&
      !!introForm.audienceKnowledge &&
      !!introForm.speechType &&
      !!introForm.duration.trim() &&
      durationNumber >= 1 &&
      durationNumber <= 60
    );
  }, [introForm]);

  const {
    status,
    isRecording,
    volumeLevel,
    recordingError,
    startRecording: hookStartRecording,
    pauseRecording: hookPauseRecording,
    resumeRecording: hookResumeRecording,
    stopRecording,
  } = useAudioMeter({
    onAudioChunk: realtime.sendAudioChunk,
  });

  useEffect(() => {
    return () => {
      reportPollTokenRef.current += 1;
      presentationUploadTokenRef.current += 1;
      previewAudioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (!scriptId) return;

    let isMounted = true;

    const loadScriptDetail = async () => {
      try {
        const script = await getScript(scriptId);

        if (!isMounted) return;

        const content = script.content || routeState?.scriptContent || SCRIPT_TEXT;
        const nextMarkedScript = script.markedContent || content;

        setPracticeTitle(script.title || routeState?.scriptTitle || "Title");
        setPracticeScript(content);
        setMarkedScript(nextMarkedScript);

        // 기존 업로드된 PPT 정보가 있다면 상태 업데이트
        if (script.pptInfo) {
          const { pptUrl, sourcePptUrl, totalSlides, slides } = script.pptInfo;
          const finalPptUrl = pptUrl || sourcePptUrl;

          setPresentationSlides(slides || []);
          setPresentationSourceUrl(finalPptUrl);
          setPresentationTotalPages(totalSlides || slides?.length || 1);
          setPresentationCurrentPage(1);

          // S3 URL 등에서 파일명 추출 (확장자 포함 마지막 부분)
          if (finalPptUrl) {
            const fileName = finalPptUrl.split("/").pop() || "기존 업로드 자료";
            setPresentationFileName(decodeURIComponent(fileName));
          }
        }
      } catch (error) {
        if (!isMounted) return;

        const message =
          error instanceof Error
            ? error.message
            : "대본 상세 정보를 불러오지 못했습니다.";
        setPracticeError(message);
      }
    };

    void loadScriptDetail();

    return () => {
      isMounted = false;
    };
  }, [scriptId, routeState?.scriptContent, routeState?.scriptTitle]);

  useEffect(() => {
    if (status !== "recording") return;

    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => {
        const newElapsed = prev + 1;
        const durationNumber = Number(introForm.duration);
        const maxSeconds = durationNumber * 60;
        const totalMax = 3600;

        if (newElapsed >= totalMax) {
          hookPauseRecording();
          setStage("paused");
          setTimeExceededType("max");
          return newElapsed;
        }

        if (nextTriggerTime && newElapsed === nextTriggerTime) {
          hookPauseRecording();
          setStage("paused");

          if (nextTriggerTime === maxSeconds) {
            setTimeExceededType("initial");
          } else {
            setTimeExceededType("periodic");
          }

          return newElapsed;
        }

        return newElapsed;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    status,
    introForm.duration,
    timeExceededType,
    nextTriggerTime,
    hookPauseRecording,
  ]);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0",
    )}`;
  }, [elapsedSeconds]);

  const recordingStatusText = useMemo(() => {
    if (stage === "intro-modal" || stage === "style-modal" || stage === "ready")
      return "녹음 전";
    if (stage === "recording") return "녹음 중";
    if (stage === "paused") return "일시정지";
    if (stage === "analyzing") return "분석 중";
    if (stage === "record-finished") return "녹음 완료";
    return "녹음 전";
  }, [stage]);

  const speechRateWpm = useMemo(() => {
    if (elapsedSeconds <= 0 || realtime.lastReadIndex < 0) return 0;

    return Math.round(((realtime.lastReadIndex + 1) / elapsedSeconds) * 60);
  }, [elapsedSeconds, realtime.lastReadIndex]);

  const speechRateDisplay = useMemo(() => {
    if (stage === "recording" || stage === "paused") {
      return String(speechRateWpm);
    }
    if (stage === "record-finished") return "0";
    return "0";
  }, [speechRateWpm, stage]);

  const speechRateLevel = useMemo(() => {
    return Math.min(100, Math.round((speechRateWpm / 180) * 100));
  }, [speechRateWpm]);

  const handleConfirmIntro = async () => {
    if (!isIntroComplete) return;
    if (!scriptId) {
      setPracticeError("연습을 시작할 대본 정보가 없습니다. 대본 화면에서 다시 시작해 주세요.");
      return;
    }

    setPracticeError(null);
    setIsSubmittingPractice(true);

    try {
      const practice = await inputPracticeInfo(scriptId, {
        audienceType: mapAudienceAge(introForm.audienceAge),
        audienceUnderstanding: mapAudienceKnowledge(
          introForm.audienceKnowledge,
        ),
        speechInformation: mapSpeechType(introForm.speechType),
        targetTime: Number(introForm.duration),
      });

      setPracticeId(practice.practiceId);
      setSpeechStyles(practice.styleList);
      setStylesError(
        practice.styleList.length === 0
          ? "선택 가능한 스피치 스타일이 없습니다."
          : null,
      );
      setStage("style-modal");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "연습 정보 저장에 실패했습니다.";
      setPracticeError(message);
    } finally {
      setIsSubmittingPractice(false);
    }
  };

  const handleGoHomeFromSetup = () => {
    previewAudioRef.current?.pause();
    previewAudioRef.current = null;
    setPlayingStyleId(null);
    navigate(ROUTES.LANDING);
  };

  const handleBackToIntro = () => {
    previewAudioRef.current?.pause();
    previewAudioRef.current = null;
    setPlayingStyleId(null);
    setStage("intro-modal");
  };

  const handlePreviewStyleTts = (styleId: SpeechStyleId) => {
    // 같은 스타일 버튼을 다시 누르면 정지
    if (playingStyleId === styleId) {
      previewAudioRef.current?.pause();
      previewAudioRef.current = null;
      setPlayingStyleId(null);
      return;
    }

    const style = speechStyles.find((item) => item.styleId === styleId);
    const audioUrl = style?.guideAudioUrl ?? style?.sampleAudioUrl;
    if (!audioUrl) return;

    previewAudioRef.current?.pause();
    const audio = new Audio(audioUrl);
    previewAudioRef.current = audio;
    setPlayingStyleId(styleId);

    audio.addEventListener("ended", () => {
      setPlayingStyleId(null);
    });

    void audio.play();
  };

  const handleConfirmStyle = async (styleId: SpeechStyleId) => {
    if (!practiceId) {
      setPracticeError("연습 정보가 저장되지 않았습니다. 다시 시도해 주세요.");
      return;
    }

    setPracticeError(null);
    setIsSubmittingPractice(true);

    try {
      await selectPracticeStyle(practiceId, styleId);
      setSelectedSpeechStyleId(styleId);
      setStage("ready");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "스피치 스타일 선택에 실패했습니다.";
      setPracticeError(message);
    } finally {
      setIsSubmittingPractice(false);
    }
  };

  const handlePresentationFileChange = async (file: File | null) => {
    if (!file) return;
    if (!scriptId) {
      setPracticeError("프레젠테이션을 연결할 대본 정보가 없습니다.");
      return;
    }

    // 이번 업로드 작업의 토큰. 언마운트되거나 새 업로드가 시작되면
    // presentationUploadTokenRef가 바뀌어 이 작업의 후속 state 갱신을 막는다.
    const token = ++presentationUploadTokenRef.current;

    setPresentationFileName(file.name);
    setPresentationSlides([]);
    setPresentationSourceUrl(undefined);
    setPresentationCurrentPage(1);
    setPresentationTotalPages(1);
    setPresentationUploadMessage("프레젠테이션 파일을 업로드하고 있습니다.");
    setPracticeError(null);
    setIsUploadingPresentation(true);

    try {
      // 1) 업로드 요청 → 즉시 PROCESSING 응답
      await uploadPpt(scriptId, file);
      if (presentationUploadTokenRef.current !== token) return;

      // 2) 변환 완료될 때까지 폴링 (최대 3분, 3초 간격)
      const POLL_INTERVAL_MS = 3000;
      const POLL_TIMEOUT_MS = 180_000;
      const deadline = Date.now() + POLL_TIMEOUT_MS;

      const POLLING_MESSAGES = [
        "슬라이드를 분석하고 있습니다...",
        "이미지로 변환하고 있습니다...",
        "슬라이드를 생성하고 있습니다...",
        "마무리하고 있습니다...",
      ];
      let pollCount = 0;

      while (Date.now() <= deadline) {
        await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));
        if (presentationUploadTokenRef.current !== token) return;

        setPresentationUploadMessage(
          POLLING_MESSAGES[pollCount % POLLING_MESSAGES.length],
        );
        pollCount++;

        const statusRes = await getPptStatus(scriptId);
        if (presentationUploadTokenRef.current !== token) return;

        const pptStatus = statusRes.pptStatus?.toUpperCase?.() ?? statusRes.pptStatus;

        if (pptStatus === "COMPLETED") {
          const slides = statusRes.pptInfo?.slides ?? [];
          const totalSlides = statusRes.pptInfo?.totalSlides ?? slides.length;
          setPresentationSlides(slides);
          setPresentationSourceUrl(statusRes.pptInfo?.sourcePptUrl);
          setPresentationTotalPages(Math.max(1, totalSlides || 1));
          setPresentationCurrentPage(1);
          setPresentationUploadMessage("프레젠테이션 파일 변환이 완료되었습니다.");
          return;
        }

        if (pptStatus === "FAILED") {
          throw new Error(statusRes.message ?? "PPT 변환에 실패했습니다.");
        }

        // PROCESSING 이면 계속 폴링
      }

      throw new Error("변환이 예상보다 오래 걸리고 있습니다. 잠시 후 다시 시도해주세요.");
    } catch (error) {
      if (presentationUploadTokenRef.current !== token) return;

      const message =
        error instanceof Error
          ? error.message
          : "프레젠테이션 파일 업로드에 실패했습니다.";
      setPracticeError(message);
      setPresentationUploadMessage(null);
      setPresentationFileName(null);
    } finally {
      if (presentationUploadTokenRef.current === token) {
        setIsUploadingPresentation(false);
      }
    }
  };

  const startRecording = async () => {
    if (!practiceId) {
      setPracticeError("연습 정보가 저장되지 않았습니다. 다시 시도해 주세요.");
      return;
    }

    if (isPresentationMode && presentationSlides.length === 0) {
      setPracticeError("프레젠테이션 파일을 업로드하고 변환된 슬라이드를 확인해 주세요.");
      return;
    }

    if (isPresentationMode && !selectedSpeechStyleId) {
      setPracticeError("스피치 스타일을 선택한 뒤 녹음을 시작해 주세요.");
      setStage("style-modal");
      return;
    }

    setPracticeError(null);
    setAnalysisStatusMessage(null);
    setFeedbackReport(null);
    reportRequestedRef.current = false;
    reportPollTokenRef.current += 1;
    setIsSubmittingPractice(true);

    try {
      const startRes = await requestStartPractice(practiceId);

      setPracticeSentences(startRes.sentences);
      setPracticeContent(startRes.contentList);

      // 스크립트에 연결된 PPT 슬라이드가 있고, 아직 수동 업로드를 하지 않은 경우 자동으로 채운다
      if (
        startRes.scriptType === "PPT" &&
        startRes.slides &&
        startRes.slides.length > 0 &&
        presentationSlides.length === 0
      ) {
        const mappedSlides = startRes.slides.map((s) => ({
          page: s.slideIndex,
          imageUrl: s.imageUrl,
        }));
        setPresentationSlides(mappedSlides);
        setPresentationTotalPages(mappedSlides.length);
        setPresentationCurrentPage(1);
        if (!presentationFileName) {
          setPresentationFileName(practiceTitle);
        }
      }

      const durationNumber = Number(introForm.duration);
      const maxSeconds = durationNumber * 60;
      setElapsedSeconds(0);
      setNextTriggerTime(maxSeconds);

      const didStart = await hookStartRecording();
      if (!didStart) {
        setNextTriggerTime(null);
        return;
      }

      setStage("recording");
      await realtime.connect(practiceId, startRes.scriptWords, startRes.webSocketUrl);
    } catch (error) {
      realtime.disconnect();
      setStage("ready");
      setNextTriggerTime(null);
      const message =
        error instanceof Error ? error.message : "연습 시작에 실패했습니다.";
      setPracticeError(message);
    } finally {
      setIsSubmittingPractice(false);
    }
  };

  const pauseRecording = () => {
    hookPauseRecording();
    realtime.sendControl("pause");
    setStage("paused");
  };

  const resumeRecording = () => {
    hookResumeRecording();
    realtime.sendControl("resume");
    setStage("recording");
  };

  const pollPracticeReport = async (targetPracticeId: number) => {
    const pollToken = reportPollTokenRef.current + 1;
    const deadline = Date.now() + REPORT_POLL_TIMEOUT_MS;

    reportPollTokenRef.current = pollToken;
    reportRequestedRef.current = true;
    setIsFetchingReport(true);
    setPracticeError(null);
    setAnalysisStatusMessage("발표 음성을 분석하고 있습니다.");
    realtime.disconnect();

    try {
      while (Date.now() <= deadline) {
        const report = await getPracticeReport(targetPracticeId);

        if (reportPollTokenRef.current !== pollToken) return;

        const reportStatus = normalizePracticeStatus(report.status);

        if (reportStatus === "ANALYZED") {
          setFeedbackReport(mapPracticeReport(report, practiceScript, practiceSentences));
          setActiveFeedbackMetric(null);
          setAnalysisStatusMessage(null);
          setStage("record-finished");
          return;
        }

        if (reportStatus === "FAILED") {
          throw new Error(report.message ?? "발표 음성 분석에 실패했습니다.");
        }

        setAnalysisStatusMessage(getReportPollingMessage(report));

        await new Promise((resolve) => {
          window.setTimeout(resolve, REPORT_POLL_INTERVAL_MS);
        });
      }

      throw new Error("분석이 예상보다 오래 걸리고 있습니다. 잠시 후 다시 시도해주세요.");
    } catch (error) {
      if (reportPollTokenRef.current !== pollToken) return;

      const message =
        error instanceof Error
          ? error.message
          : "분석 리포트를 불러오지 못했습니다.";
      setPracticeError(message);
      setAnalysisStatusMessage(null);
      setStage("ready");
    } finally {
      if (reportPollTokenRef.current === pollToken) {
        setIsFetchingReport(false);
      }
    }
  };

  const handleFinishRecord = async () => {
    try {
      const finalBlob = await stopRecording();
      setActiveFeedbackMetric(null);
      setPracticeError(null);
      setAnalysisStatusMessage("발표 음성을 업로드하고 있습니다.");
      setStage("analyzing");

      if (!practiceId || !finalBlob) {
        throw new Error("분석할 녹음 데이터를 찾지 못했습니다.");
      }

      const result = await stopPractice(practiceId, finalBlob, elapsedSeconds);
      const stopStatus = normalizePracticeStatus(result.status);

      if (stopStatus === "FAILED") {
        throw new Error("발표 음성 분석에 실패했습니다.");
      }

      await pollPracticeReport(practiceId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "녹음 종료 처리에 실패했습니다.";
      setPracticeError(message);
      setAnalysisStatusMessage(null);
      setIsFetchingReport(false);
    }
  };

  const handleRetryRecording = async () => {
    reportPollTokenRef.current += 1;
    reportRequestedRef.current = false;
    realtime.disconnect();
    setFeedbackReport(null);
    setActiveFeedbackMetric(null);
    setAnalysisStatusMessage(null);
    setPracticeError(null);
    setIsFetchingReport(false);
    setElapsedSeconds(0);
    setNextTriggerTime(Number(introForm.duration) * 60);

    await startRecording();
  };

  const displayedFeedbackReport = feedbackReport ?? {
    ...DEFAULT_FEEDBACK_REPORT,
    script: practiceScript,
  };

  return (
    <div className="practice-page">
      <main className="practice-page__content">
        <h1 className="practice-page__title">발표 연습모드</h1>

        <PracticeTabs
          tabs={PRACTICE_TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <section
          className={`practice-page__main-grid ${
            stage === "record-finished" || stage === "analyzing"
              ? "practice-page__main-grid--feedback"
              : ""
          } ${isPresentationMode ? "practice-page__main-grid--presentation" : ""}`}
        >
          {(stage === "record-finished" || stage === "analyzing") && isPresentationMode ? (
            <>
              <PresentationDeckPanel
                fileName={presentationFileName}
                sourcePptUrl={presentationSourceUrl}
                slides={presentationSlides}
                currentPage={presentationCurrentPage}
                totalPages={presentationTotalPages}
                isUploading={isUploadingPresentation}
                uploadMessage={presentationUploadMessage}
                onFileChange={handlePresentationFileChange}
                onCurrentPageChange={setPresentationCurrentPage}
              />

              <div className="practice-page__script-column">
                <FeedbackScriptPanel
                  title={practiceTitle}
                  script={displayedFeedbackReport.script}
                  issues={stage === "analyzing" ? [] : displayedFeedbackReport.issues}
                  isAwaitingAnalysis={stage === "analyzing"}
                />
              </div>
            </>
          ) : stage === "record-finished" || stage === "analyzing" ? (
            <>
              <FeedbackScriptPanel
                title={practiceTitle}
                script={displayedFeedbackReport.script}
                issues={stage === "analyzing" ? [] : displayedFeedbackReport.issues}
                isAwaitingAnalysis={stage === "analyzing"}
              />

              <FeedbackMetricsPanel
                activeMetricId={activeFeedbackMetric}
                goalPercent={displayedFeedbackReport.goalPercent}
                metrics={displayedFeedbackReport.metrics}
                summary={displayedFeedbackReport.summary}
                tip={displayedFeedbackReport.tip}
                onSelectMetric={setActiveFeedbackMetric}
                isLoading={stage === "analyzing"}
              />
            </>
          ) : (
            <>
              {isPresentationMode ? (
                <>
                  <PresentationDeckPanel
                    fileName={presentationFileName}
                    sourcePptUrl={presentationSourceUrl}
                    slides={presentationSlides}
                    currentPage={presentationCurrentPage}
                    totalPages={presentationTotalPages}
                    isUploading={isUploadingPresentation}
                    uploadMessage={presentationUploadMessage}
                    onFileChange={handlePresentationFileChange}
                    onCurrentPageChange={setPresentationCurrentPage}
                  />

                  <div className="practice-page__script-column">
                    <ScriptPanel
                      title={practiceTitle}
                      script={practiceScript}
                      markedScript={markedScript}
                      sentences={practiceSentences}
                      contentList={practiceContent}
                      lastReadIndex={realtime.lastReadIndex}
                      wordFeedbackByIndex={realtime.wordFeedbackByIndex}
                      time={formattedTime}
                      isRecording={isRecording}
                      statusText={recordingStatusText}
                      isReadingMarksEnabled={isReadingMarksEnabled}
                      realtimeHighlight={realtime.highlight}
                      realtimeTranscript={realtime.transcript}
                      onToggleReadingMarks={setIsReadingMarksEnabled}
                    />
                  </div>
                </>
              ) : (
                <>
                  <ScriptPanel
                    title={practiceTitle}
                    script={practiceScript}
                    markedScript={markedScript}
                    sentences={practiceSentences}
                    contentList={practiceContent}
                    lastReadIndex={realtime.lastReadIndex}
                    wordFeedbackByIndex={realtime.wordFeedbackByIndex}
                    time={formattedTime}
                    isRecording={isRecording}
                    statusText={recordingStatusText}
                    isReadingMarksEnabled={isReadingMarksEnabled}
                    realtimeHighlight={realtime.highlight}
                    realtimeTranscript={realtime.transcript}
                    onToggleReadingMarks={setIsReadingMarksEnabled}
                  />

                  <div className="practice-page__right-column">
                    <MetricCard
                      title="발화 속도"
                      value={speechRateDisplay}
                      unit="WPM"
                      description="녹음 중 실시간 발화 속도가 표시됩니다."
                      tone="mint"
                      level={speechRateLevel}
                    />

                    <MetricCard
                      title="목소리 크기"
                      value={String(volumeLevel)}
                      unit="dB"
                      description="녹음 중 실시간으로 표시됩니다."
                      tone="red"
                      level={volumeLevel}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </section>

        <div className="practice-page__record-controls">
          {stage === "ready" && !isSubmittingPractice && (
            <RecordButton onClick={startRecording} />
          )}

          {isSubmittingPractice && (
            <button
              className="practice-page__btn practice-page__btn--primary"
              type="button"
              disabled
            >
              녹음 준비 중...
            </button>
          )}

          {stage === "recording" && !isSubmittingPractice && (
            <>
              <button
                className="practice-page__btn practice-page__btn--sub"
                type="button"
                onClick={pauseRecording}
              >
                일시정지
              </button>

              <button
                className="practice-page__btn practice-page__btn--primary"
                type="button"
                onClick={handleFinishRecord}
              >
                녹음 완료
              </button>
            </>
          )}

          {stage === "paused" && (
            <>
              <button
                className="practice-page__btn practice-page__btn--sub"
                type="button"
                onClick={resumeRecording}
              >
                녹음 재개
              </button>

              <button
                className="practice-page__btn practice-page__btn--primary"
                type="button"
                onClick={handleFinishRecord}
              >
                녹음 완료
              </button>
            </>
          )}

          {stage === "analyzing" && (
            <button
              className="practice-page__btn practice-page__btn--primary"
              type="button"
              aria-busy={isFetchingReport}
              onClick={handleRetryRecording}
            >
              재녹음하기
            </button>
          )}
        </div>

        {analysisStatusMessage && !practiceError && (
          <p className="practice-page__recording-error">{analysisStatusMessage}</p>
        )}
        {recordingError && (
          <p className="practice-page__recording-error">{recordingError}</p>
        )}
        {practiceError && (
          <p className="practice-page__recording-error">{practiceError}</p>
        )}
        {realtime.errorMessage && (
          <p className="practice-page__recording-error">
            {realtime.errorMessage}
          </p>
        )}

        {stage === "intro-modal" && (
          <PracticeIntroModal
            form={introForm}
            onChange={setIntroForm}
            onConfirm={handleConfirmIntro}
            onGoHome={handleGoHomeFromSetup}
            isConfirmEnabled={isIntroComplete && !isSubmittingPractice}
          />
        )}

        {stage === "style-modal" && (
          <PracticeStyleModal
            styles={speechStyles}
            isLoading={isSubmittingPractice}
            errorMessage={stylesError}
            onPreviewTts={handlePreviewStyleTts}
            playingStyleId={playingStyleId}
            onRetry={handleConfirmIntro}
            onBack={handleBackToIntro}
            onGoHome={handleGoHomeFromSetup}
            onConfirm={handleConfirmStyle}
          />
        )}

        {timeExceededType && (
          <div className="practice-modal-overlay">
            <div className="practice-modal">
              <div className="practice-modal__header">
                <h2>시간 초과 안내</h2>
                <p>
                  {timeExceededType === "initial" &&
                    "예상 시간을 초과했습니다. 계속해서 연습을 진행하시겠습니까?"}
                  {timeExceededType === "periodic" &&
                    "10분이 지났습니다. 발표를 계속하시겠습니까?"}
                  {timeExceededType === "max" &&
                    "발표 녹음의 최대 사용 시간을 초과했습니다. 피드백 화면으로 이동합니다."}
                </p>
              </div>
              <div className="practice-modal__footer">
                {timeExceededType !== "max" && (
                  <button
                    className="practice-modal__confirm is-enabled"
                    onClick={() => {
                      hookResumeRecording();
                      realtime.sendControl("resume");
                      setStage("recording");
                      setTimeExceededType(null);
                      setNextTriggerTime(elapsedSeconds + 600);
                    }}
                  >
                    계속하기
                  </button>
                )}
                <button
                  className="practice-modal__confirm is-enabled"
                  onClick={() => {
                    setTimeExceededType(null);
                    handleFinishRecord();
                  }}
                >
                  발표 완료
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}