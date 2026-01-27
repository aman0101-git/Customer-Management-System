
import { useState } from 'react';
import { createUser } from './admin.api';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

type Role = 'AGENT' | 'SUPERVISOR' | 'ADMIN';
interface CreateUserFormProps {
  onSuccess?: () => void;
  allowedRoles?: Role[];
}

const ALL_ROLES: Role[] = ['AGENT', 'SUPERVISOR', 'ADMIN'];

export default function CreateUserForm({ onSuccess, allowedRoles = ALL_ROLES }: CreateUserFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!firstName || !lastName || !username || !password || !role) {
      setError('All fields are required');
      return;
    }

    try {
      setLoading(true);

      await createUser({
        firstName,
        lastName,
        username,
        password,
        role,
      });

      setSuccess(true);
      setFirstName('');
      setLastName('');
      setUsername('');
      setPassword('');
      setRole(allowedRoles.length === 1 ? allowedRoles[0] : '');
      if (onSuccess) {
        setTimeout(() => onSuccess(), 500); // slight delay for feedback
      }
    } catch (err: any) {
      // Try to extract a specific error message from backend
      let message = 'Failed to create user';
      if (err?.response?.data?.message) {
        if (Array.isArray(err.response.data.message)) {
          message = err.response.data.message.join(', ');
        } else {
          message = err.response.data.message;
        }
      } else if (err?.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] w-full">
      <div className="max-w-lg w-full">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-lg font-semibold">Create User</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                placeholder="First name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                placeholder="Last name"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={v => setRole(v as Role)}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {allowedRoles.map(r => (
                  <SelectItem key={r} value={r}>
                    {r.charAt(0) + r.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              User created successfully!
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating…' : 'Create User'}
          </Button>
        </form>
      </div>
    </div>
  );
}
