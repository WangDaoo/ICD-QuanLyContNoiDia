import { Link, useLocation } from 'react-router-dom';
import './SystemPages.css';

export function NotFoundPage() {
  const location = useLocation();

  return (
    <div className="system-state-page">
      <div className="system-state-card">
        <span className="system-state-code">404</span>
        <h1>Không tìm thấy trang</h1>
        <p>
          Route <code>{location.pathname}</code> không tồn tại hoặc đã được thay đổi.
        </p>

        <div className="system-state-actions">
          <Link to="/">Về Dashboard</Link>
          <button type="button" onClick={() => window.history.back()}>
            Quay lại
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
