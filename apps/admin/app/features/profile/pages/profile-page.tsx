import { useEffect, useState, type FormEvent } from 'react';

import { Badge, Button, Input, Label } from '@kafi/ui';

import { api, type AuthResponse } from '../../../lib/api';

export default function ProfilePage() {
  const [profile, setProfile] = useState<AuthResponse['user'] | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    api
      .me()
      .then((data) => {
        setProfile(data);
        setFullName(data.full_name);
        setPhone(data.phone_number);
      })
      .catch(() => setError('Failed to load profile.'));
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      const updated = await api.updateMe({
        full_name: fullName,
        phone_number: phone,
      });
      setProfile(updated);
      setFullName(updated.full_name);
      setPhone(updated.phone_number);
      setSuccess('Profile updated.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update profile.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!profile && !error) {
    return <div className="p-6">Loading…</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">My Profile</h1>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-success/10 p-3 text-sm text-success">
          {success}
        </div>
      )}

      {profile && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-muted-foreground">Email</div>
              <div>{profile.email}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <Badge variant="success">{profile.status_code}</Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Roles</div>
              <div>{profile.roles.join(', ')}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Created</div>
              <div>{new Date(profile.created_at).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Last login</div>
              <div>
                {profile.last_login_at
                  ? new Date(profile.last_login_at).toLocaleString()
                  : '—'}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone number</Label>
              <Input
                id="phone_number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9"
              />
            </div>
            <Button type="submit" disabled={isSubmitting} className="h-9">
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
