import { useNavigate } from 'react-router-dom';
import { clearAuth } from './auth.store';
import { Button } from '@/components/ui/button';

export default function LogoutButton() {
  const navigate = useNavigate();

  function handleLogout() {
    clearAuth();
    navigate('/', { replace: true });
  }

  return (
    <Button variant="destructive" onClick={handleLogout}>
      Logout
    </Button>
  );
}
