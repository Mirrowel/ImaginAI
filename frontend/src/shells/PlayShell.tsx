import { Outlet, useNavigate, useParams } from "react-router-dom";
import { FullScreenMessage } from "../components/primitives/FullScreenMessage";

/**
 * PlayShell: immersive gameplay shell with thin header and full-viewport grid.
 * No nav rail. Header provides back affordance only; Gameplay renders its own title.
 * Content renders via <Outlet /> (Gameplay component).
 *
 * CSS grid layout per consensus:
 *   grid-template-rows: auto 1fr auto
 *   grid-template-columns: 1fr
 *   height: 100dvh
 *
 * Row 1: header (48px)
 * Row 2: content outlet (scroll managed by child)
 * Row 3: reserved for future composer placement
 */
export function PlayShell() {
  const { adventureId } = useParams();
  const navigate = useNavigate();

  if (!adventureId) return <FullScreenMessage title="No adventure selected" />;

  function goBack() {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  }

  return (
    <div className="play-shell">
      <header className="play-shell-header">
        <button type="button" onClick={goBack} className="play-shell-back" aria-label="Back to previous page">
          &larr; Back
        </button>
      </header>
      <div className="play-shell-content">
        <Outlet />
      </div>
    </div>
  );
}
