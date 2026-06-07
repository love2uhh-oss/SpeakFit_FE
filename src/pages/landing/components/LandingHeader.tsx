import Container from "../../../components/Container";
import "../styles/header.css";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "../../../app/routes.const";
import { clearAuthSession, getStoredUser } from "../../../api/auth";
import sayupaiLogo from "../../../assets/sayupai-logo.png";

export default function LandingHeader() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const displayName = user?.nickname?.trim() || "사용자";

  const handleLogout = () => {
    clearAuthSession();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <header className="landing-header">
      <Container className="landing-header__inner">
        <div className="landing-header__brand">
          <div className="landing-header__logo">
            <img src={sayupaiLogo} alt="SayUpAI Logo" />
          </div>
          <span className="landing-header__name">SayUpAI</span>
        </div>

        <nav className="landing-header__nav">
          <a href="#feature">발표 연습</a>
          <Link to={ROUTES.FEEDBACK}>피드백</Link>
        </nav>

        <div className="landing-header__actions">
          {user ? (
            <>
              <Link className="landing-header__user" to={ROUTES.ACCOUNT}>
                {displayName}님
              </Link>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleLogout}
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link className="btn btn-ghost" to={ROUTES.LOGIN}>
                로그인
              </Link>
              <Link className="btn btn-primary" to={ROUTES.SIGNUP}>
                회원가입
              </Link>
            </>
          )}
        </div>
      </Container>
    </header>
  );
}