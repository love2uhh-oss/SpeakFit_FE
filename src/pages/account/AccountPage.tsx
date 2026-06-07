import { type FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearAuthSession, deleteAccount, getStoredUser } from "../../api/auth";
import { ROUTES } from "../../app/routes.const";
import "./AccountPage.css";

export default function AccountPage() {
  const navigate = useNavigate();
  const user = useMemo(() => getStoredUser(), []);
  const displayName = user?.nickname?.trim() || "사용자";
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleLogout = () => {
    clearAuthSession();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  const handleDeleteAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (confirmText.trim() !== "회원탈퇴") {
      setMessage("탈퇴를 진행하려면 입력칸에 ‘회원탈퇴’를 정확히 입력해 주세요.");
      return;
    }

    const confirmed = window.confirm(
      "정말 회원탈퇴를 진행할까요? 탈퇴 후 현재 로그인 정보가 삭제되며, 서버 정책에 따라 계정 데이터가 삭제됩니다.",
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setMessage(null);

    try {
      await deleteAccount();
      navigate(ROUTES.LANDING, { replace: true });
    } catch (error) {
      const fallbackMessage =
        "회원탈퇴 요청을 처리하지 못했습니다. 백엔드에 DELETE /users/me 또는 VITE_ACCOUNT_WITHDRAWAL_PATH에 지정한 탈퇴 API가 배포되어 있는지 확인해 주세요.";
      setMessage(error instanceof Error ? `${fallbackMessage} (${error.message})` : fallbackMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) {
    return (
      <section className="account-page">
        <div className="account-card">
          <p className="account-page__eyebrow">계정 관리</p>
          <h1>로그인이 필요합니다</h1>
          <p>로그아웃과 회원탈퇴는 로그인 후 이용할 수 있습니다.</p>
          <div className="account-page__actions">
            <Link className="account-page__button account-page__button--primary" to={ROUTES.LOGIN}>
              로그인하기
            </Link>
            <Link className="account-page__button" to={ROUTES.LANDING}>
              홈으로 가기
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="account-page">
      <div className="account-card">
        <p className="account-page__eyebrow">계정 관리</p>
        <h1>{displayName}님의 계정</h1>
        <p className="account-page__description">
          현재 로그인된 계정의 세션을 종료하거나, 서비스 이용을 중단하기 위한 회원탈퇴를 요청할 수 있습니다.
        </p>

        <dl className="account-page__summary">
          <div>
            <dt>닉네임</dt>
            <dd>{displayName}</dd>
          </div>
          {user.email && (
            <div>
              <dt>이메일</dt>
              <dd>{user.email}</dd>
            </div>
          )}
        </dl>

        <div className="account-section">
          <h2>로그아웃</h2>
          <p>현재 브라우저에 저장된 로그인 토큰과 사용자 정보를 삭제합니다.</p>
          <button type="button" className="account-page__button" onClick={handleLogout}>
            로그아웃
          </button>
        </div>

        <form className="account-section account-section--danger" onSubmit={handleDeleteAccount}>
          <h2>회원탈퇴</h2>
          <p>
            탈퇴 전 필요한 데이터 보관·삭제 정책을 확인해 주세요. 계속하려면 아래 입력칸에
            <strong> 회원탈퇴</strong>를 입력한 뒤 탈퇴 요청을 누르세요.
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder="회원탈퇴"
            className="account-page__input"
            autoComplete="off"
          />
          {message && <p className="account-page__message">{message}</p>}
          <button
            type="submit"
            className="account-page__button account-page__button--danger"
            disabled={isDeleting || confirmText.trim() !== "회원탈퇴"}
          >
            {isDeleting ? "탈퇴 요청 중..." : "회원탈퇴 요청"}
          </button>
        </form>
      </div>
    </section>
  );
}
