import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUser } from './admin.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

type Role = 'AGENT' | 'SUPERVISOR' | 'ADMIN';
interface CreateUserFormProps {
  onSuccess?: () => void;
  allowedRoles?: Role[];
}

// Phase 4 (May 2026):
//   - 5 useState fields collapsed into one react-hook-form instance with a
//     zod schema. Uncontrolled inputs mean keystrokes no longer re-render
//     the whole form.
//   - Validations are intentionally minimal — every field required, role
//     constrained to allowedRoles. No new server-side contract; passwords
//     are not length-restricted client-side so existing valid credentials
//     are not silently rejected.
//   - Phase 3 invariants preserved: useMutation, sonner toast on success +
//     error (Retry action), ['supervisor','agents'] invalidation, the
//     onSuccess prop callback for drawer integration.
//   - Accessibility: aria-invalid + aria-describedby on every validated input.

const ALL_ROLES: Role[] = ['AGENT', 'SUPERVISOR', 'ADMIN'];

function extractErrorMessage(err: any, fallback: string): string {
  if (err?.response?.data?.message) {
    return Array.isArray(err.response.data.message)
      ? err.response.data.message.join(', ')
      : String(err.response.data.message);
  }
  if (err?.message) return String(err.message);
  return fallback;
}

export default function CreateUserForm({ onSuccess, allowedRoles = ALL_ROLES }: CreateUserFormProps) {
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);

  // Schema is memoized so the role enum reflects allowedRoles without
  // rebuilding on every render. allowedRoles only changes when the parent
  // re-mounts with a different prop, which is fine.
  const schema = useMemo(() => {
    const roleEnum = z.enum(allowedRoles as [Role, ...Role[]], {
      message: 'Please select a role',
    });
    return z.object({
      firstName: z.string().trim().min(1, 'First name is required').max(50),
      lastName: z.string().trim().min(1, 'Last name is required').max(50),
      username: z.string().trim().min(1, 'Username is required').max(50),
      password: z.string().min(1, 'Password is required'),
      role: roleEnum,
    });
  }, [allowedRoles]);

  type FormValues = z.infer<typeof schema>;

  const defaultRole: Role | '' = allowedRoles.length === 1 ? allowedRoles[0] : '';

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      username: '',
      password: '',
      role: (defaultRole || undefined) as Role,
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (payload: FormValues) => createUser(payload),
    onSuccess: (_data, payload) => {
      toast.success(`User ${payload.username} created`);
      queryClient.invalidateQueries({ queryKey: ['supervisor', 'agents'] });
      reset({
        firstName: '',
        lastName: '',
        username: '',
        password: '',
        role: (defaultRole || undefined) as Role,
      });
      if (onSuccess) {
        setTimeout(() => onSuccess(), 400);
      }
    },
    onError: (err: any, payload) => {
      const message = extractErrorMessage(err, 'Failed to create user');
      toast.error(message, {
        action: {
          label: 'Retry',
          onClick: () => createUserMutation.mutate(payload),
        },
      });
    },
  });

  const loading = createUserMutation.isPending;

  const onSubmit = (values: FormValues) => {
    createUserMutation.mutate(values);
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] w-full">
      <div className="max-w-lg w-full">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <h2 className="text-lg font-semibold">Create User</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                placeholder="First name"
                aria-invalid={!!errors.firstName}
                aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                disabled={loading}
                {...register('firstName')}
              />
              {errors.firstName && (
                <p id="firstName-error" className="mt-1 text-xs text-danger">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                placeholder="Last name"
                aria-invalid={!!errors.lastName}
                aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                disabled={loading}
                {...register('lastName')}
              />
              {errors.lastName && (
                <p id="lastName-error" className="mt-1 text-xs text-danger">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="Username"
              aria-invalid={!!errors.username}
              aria-describedby={errors.username ? 'username-error' : undefined}
              disabled={loading}
              autoComplete="off"
              {...register('username')}
            />
            {errors.username && (
              <p id="username-error" className="mt-1 text-xs text-danger">
                {errors.username.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                className="pr-10"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                disabled={loading}
                autoComplete="new-password"
                {...register('password')}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                disabled={loading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p id="password-error" className="mt-1 text-xs text-danger">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  disabled={loading}
                >
                  <SelectTrigger
                    id="role"
                    aria-invalid={!!errors.role}
                    aria-describedby={errors.role ? 'role-error' : undefined}
                  >
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
              )}
            />
            {errors.role && (
              <p id="role-error" className="mt-1 text-xs text-danger">
                {errors.role.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create User'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
