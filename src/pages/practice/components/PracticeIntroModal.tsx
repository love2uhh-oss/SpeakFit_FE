import type { IntroFormState } from "../types";

type PracticeIntroModalProps = {
  form: IntroFormState;
  onChange: (next: IntroFormState) => void;
  onConfirm: () => void;
  onGoHome: () => void;
  isConfirmEnabled: boolean;
};

const ageOptions = ["어린이", "청소년", "성인", "노년"] as const;
const knowledgeOptions = ["잘 모름", "보통", "잘 앎"] as const;
const speechOptions = ["발표", "면접", "토론", "강의", "피드백 연습"] as const;

export default function PracticeIntroModal({
  form,
  onChange,
  onConfirm,
  onGoHome,
  isConfirmEnabled,
}: PracticeIntroModalProps) {
  const updateField = <K extends keyof IntroFormState>(
    key: K,
    value: IntroFormState[K],
  ) => {
    onChange({
      ...form,
      [key]: value,
    });
  };

  const updateDuration = (value: string) => {
    if (value === "") {
      updateField("duration", "");
      return;
    }

    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) return;

    if (numericValue < 1) {
      updateField("duration", "1");
      return;
    }

    if (numericValue > 60) {
      updateField("duration", "60");
      return;
    }

    updateField("duration", value);
  };

  return (
    <div className="practice-modal-overlay">
      <div
        className="practice-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="practice-intro-title"
      >
        <div className="practice-modal__header">
          <h2 id="practice-intro-title">청중 및 스피치 정보를 입력해 주세요</h2>
          <p>원활한 피드백 제공을 위해 청중과 스피치 정보를 입력해주세요.</p>
        </div>

        <div className="practice-modal__body">
          <section className="practice-modal__section">
            <h3>청중 정보</h3>

            <div className="practice-modal__field">
              <p>청중의 연령대는 어떻게 되나요?</p>
              <div className="practice-modal__option-grid practice-modal__option-grid--4">
                {ageOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`practice-chip ${
                      form.audienceAge === option ? "is-selected" : ""
                    }`}
                    onClick={() => updateField("audienceAge", option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="practice-modal__field">
              <p>청중이 발표 주제를 얼마나 이해하고 있나요?</p>
              <div className="practice-modal__option-grid practice-modal__option-grid--3">
                {knowledgeOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`practice-chip ${
                      form.audienceKnowledge === option ? "is-selected" : ""
                    }`}
                    onClick={() => updateField("audienceKnowledge", option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="practice-modal__section">
            <h3>스피치 정보</h3>

            <div className="practice-modal__field">
              <p>어떤 내용의 스피치를 하나요?</p>
              <div className="practice-modal__option-grid practice-modal__option-grid--5">
                {speechOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`practice-chip ${
                      form.speechType === option ? "is-selected" : ""
                    }`}
                    onClick={() => updateField("speechType", option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="practice-modal__field">
              <p>총 몇 분의 발표인가요?</p>
              <div className="practice-modal__duration">
                <input
                  type="number"
                  min="1"
                  max="60"
                  inputMode="numeric"
                  value={form.duration}
                  onChange={(e) => updateDuration(e.target.value)}
                  className="practice-modal__duration-input"
                />
                <span>분</span>
              </div>
            </div>
          </section>
        </div>

        <div className="practice-modal__footer practice-modal__footer--split">
          <button
            type="button"
            className="practice-modal__secondary"
            onClick={onGoHome}
          >
            홈으로 가기
          </button>
          <button
            type="button"
            className={`practice-modal__confirm ${
              isConfirmEnabled ? "is-enabled" : ""
            }`}
            onClick={onConfirm}
            disabled={!isConfirmEnabled}
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
}
