import "./PracticeHeader.css";
import { useMemo } from "react";
import { clearAuthSession, getStoredUser } from "../../../api/auth";
import { useLocation, useNavigate, Link } from "react-router-dom";
import sayupaiLogo from "../../../assets/sayupai-logo-color.png";
import userIcon from "../../../assets/user-icon.svg";
import { ROUTES } from "../../../app/routes.const";

export default function PracticeHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useMemo(() => getStoredUser(), []);
  const displayName = user?.nickname?.trim() || "사용자";
  const canGoBack = location.pathname !== ROUTES.LANDING;

  const handleLogout = () => {
    clearAuthSession();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(ROUTES.LANDING);
  };

  return (
    <header className="practice-header">
      <div className="practice-header__inner">
        <div className="practice-header__left-group">
          {canGoBack && (
            <button
              type="button"
              className="practice-header__nav-button"
              onClick={handleGoBack}
              aria-label="이전 화면으로 이동"
            >
              이전
            </button>
          )}

          <Link to={ROUTES.LANDING} className="practice-header__left" style={{ textDecoration: "none" }}>
            <img
              src={sayupaiLogo}
              alt="SayUpAI"
              className="practice-header__logo"
            />
            <span className="practice-header__brand">SayUpAI</span>
          </Link>
        </div>

        <div className="practice-header__right">
          <Link className="practice-header__nav-button" to={ROUTES.LANDING}>
            홈
          </Link>

          {user ? (
            <>
              <Link className="practice-header__account" to={ROUTES.ACCOUNT}>
                <img src={userIcon} alt="" />
                <span>{displayName}</span>
              </Link>

              <button
                type="button"
                className="practice-header__logout"
                onClick={handleLogout}
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link className="practice-header__logout" to={ROUTES.LOGIN}>
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
