import { useNavigate } from 'react-router-dom';
/* import { clearAuth } from './auth.store'; */
import { Button } from '@/components/ui/button';

export default function LogoutButton() {
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {}
    /* clearAuth(); */
    navigate('/', { replace: true });
  }

  return (
    <Button variant="destructive" onClick={handleLogout}>
      Logout
    </Button>
  );
}
