import { useMemo, useState } from "react";
import type { SpeechStyleId } from "../types";
import type { SpeechStyle, StyleType } from "../../../api/practice";

const STYLE_TITLE_BY_TYPE: Record<StyleType, string> = {
  CALM_LOW_TONE: "차분한 스타일",
  STANDARD_LECTURE: "지적인 스타일",
  ENERGETIC_FAST: "열정적인 스타일",
  DELIVERY: "전달력 있는 스타일",
};

const STYLE_DISPLAY_ORDER: StyleType[] = [
  "ENERGETIC_FAST",
  "STANDARD_LECTURE",
  "CALM_LOW_TONE",
  "DELIVERY",
];

type SpeechStyleOption = {
  id: SpeechStyleId;
  styleType?: StyleType;
  title: string;
  description: string;
  sampleAudioUrl?: string;
  isRecommended: boolean;
};

type PracticeStyleModalProps = {
  styles: SpeechStyle[];
  isLoading: boolean;
  errorMessage: string | null;
  onPreviewTts?: (styleId: SpeechStyleId) => void;
  playingStyleId?: SpeechStyleId | null;
  onRetry: () => void;
  onBack: () => void;
  onGoHome: () => void;
  onConfirm: (styleId: SpeechStyleId) => void;
};

export default function PracticeStyleModal({
  styles,
  isLoading,
  errorMessage,
  onPreviewTts,
  playingStyleId,
  onRetry,
  onBack,
  onGoHome,
  onConfirm,
}: PracticeStyleModalProps) {
  const speechStyleOptions: SpeechStyleOption[] = useMemo(
    () =>
      styles
        .map((style, index) => ({
          id: style.styleId,
          styleType: style.styleType,
          title: style.styleType
            ? STYLE_TITLE_BY_TYPE[style.styleType]
            : index === 0
              ? "추천 스타일"
              : `스타일 ${index + 1}`,
          description: style.description,
          sampleAudioUrl: style.guideAudioUrl ?? style.sampleAudioUrl,
          isRecommended: style.isRecommended ?? index === 0,
        }))
        .sort((a, b) => {
          if (a.isRecommended !== b.isRecommended) {
            return Number(b.isRecommended) - Number(a.isRecommended);
          }

          const aOrder = a.styleType
            ? STYLE_DISPLAY_ORDER.indexOf(a.styleType)
            : -1;
          const bOrder = b.styleType
            ? STYLE_DISPLAY_ORDER.indexOf(b.styleType)
            : -1;

          return (aOrder === -1 ? 99 : aOrder) - (bOrder === -1 ? 99 : bOrder);
        }),
    [styles],
  );
  const [selectedStyle, setSelectedStyle] = useState<SpeechStyleId | null>(
    null,
  );
  const recommendedOption =
    speechStyleOptions.find((option) => option.isRecommended) ??
    speechStyleOptions[0];
  const selectedStyleId =
    selectedStyle !== null &&
    speechStyleOptions.some((option) => option.id === selectedStyle)
      ? selectedStyle
      : recommendedOption?.id ?? null;

  const handlePreviewTts = (styleId: SpeechStyleId) => {
    onPreviewTts?.(styleId);
  };

  return (
    <div className="practice-modal-overlay">
      <div
        className="practice-modal practice-modal--style"
        role="dialog"
        aria-modal="true"
        aria-labelledby="practice-style-title"
      >
        <div className="practice-modal__header practice-modal__header--style">
          <p>입력하신 스피치 데이터를 바탕으로 추천하는 스타일이에요.</p>
          <h2 id="practice-style-title">
            {recommendedOption?.title ?? "스타일을 불러오는 중"}
          </h2>
        </div>

        <div className="practice-style-modal__body">
          <div className="practice-style-modal__intro">
            <h3>어떤 스타일로 연습하시겠어요?</h3>
            <p>스피커 아이콘을 누르면 가이드 TTS를 먼저 들어볼 수 있어요.</p>
          </div>

          {isLoading && (
            <p className="practice-style-modal__message">
              스타일을 불러오고 있습니다.
            </p>
          )}

          {errorMessage && !isLoading && (
            <div className="practice-style-modal__error">
              <p className="practice-style-modal__message is-error">
                {errorMessage}
              </p>
              <button
                type="button"
                className="practice-style-modal__retry"
                onClick={onRetry}
              >
                다시 불러오기
              </button>
            </div>
          )}

          {!isLoading && !errorMessage && (
            <div className="practice-style-grid">
              {speechStyleOptions.map((option) => {
                const isSelected = selectedStyleId === option.id;

                return (
                  <div
                    key={option.id}
                    className={`practice-style-card ${
                      isSelected ? "is-selected" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className={`practice-style-card__speaker${playingStyleId === option.id ? " is-playing" : ""}`}
                      aria-label={playingStyleId === option.id ? `${option.title} TTS 정지` : `${option.title} TTS 듣기`}
                      aria-pressed={playingStyleId === option.id}
                      onClick={() => handlePreviewTts(option.id)}
                      disabled={!option.sampleAudioUrl}
                    >
                      {playingStyleId === option.id ? (
                        <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
                          <rect x="8" y="8" width="5" height="16" />
                          <rect x="19" y="8" width="5" height="16" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
                          <path d="M5 12.5h5l7-6v19l-7-6H5z" />
                          <path d="M21 11.5c2 2.4 2 6.6 0 9" />
                          <path d="M25 8c3.8 4.4 3.8 11.6 0 16" />
                        </svg>
                      )}
                    </button>

                    {option.isRecommended && (
                      <span className="practice-style-card__badge">추천</span>
                    )}

                    <button
                      type="button"
                      className="practice-style-card__select"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedStyle(option.id)}
                    >
                      <strong>{option.title}</strong>
                      <span>{option.description}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="practice-style-modal__footer practice-modal__footer--split">
          <div className="practice-modal__footer-left">
            <button
              type="button"
              className="practice-modal__secondary"
              onClick={onGoHome}
            >
              홈으로 가기
            </button>
            <button
              type="button"
              className="practice-modal__secondary"
              onClick={onBack}
            >
              이전 단계
            </button>
          </div>
          <button
            type="button"
            className={`practice-modal__confirm ${
              selectedStyleId ? "is-enabled" : ""
            }`}
            onClick={() => selectedStyleId && onConfirm(selectedStyleId)}
            disabled={!selectedStyleId}
          >
            연습하러 가기
          </button>
        </div>
      </div>
    </div>
  );
}
