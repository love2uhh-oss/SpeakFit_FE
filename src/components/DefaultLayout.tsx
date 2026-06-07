import { Outlet, useLocation } from "react-router-dom";
import Header from "./common/Header/Header";
import PracticeHeader from "./common/Header/PracticeHeader";
import Footer from "./common/Footer/Footer";
import { ROUTES } from "../app/routes.const";
import "../styles/layout.css";

const Layout = () => {
  const location = useLocation();
  const usesPracticeHeader = [ROUTES.SCRIPT, ROUTES.ACCOUNT].includes(
    location.pathname as typeof ROUTES.SCRIPT | typeof ROUTES.ACCOUNT,
  );

  return (
    <div className="layout">
      {usesPracticeHeader ? <PracticeHeader /> : <Header />}
      <main className="layout__main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
