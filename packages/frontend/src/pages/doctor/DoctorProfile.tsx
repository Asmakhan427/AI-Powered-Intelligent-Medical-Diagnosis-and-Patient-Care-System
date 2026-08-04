import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, Badge, Button, Card, Input, useToast } from '../../components/common';
import { useDoctorData } from '../../context/DoctorContext';
import { getErrorMessage } from '../../lib/api';
import * as doctorApi from '../../lib/endpoints/doctor';
import type { WeekDay } from '../../types/doctor';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  specialization: z.string().trim().min(2, 'Specialization must be at least 2 characters').max(100),
  experienceYears: z.coerce
    .number()
    .int()
    .min(0, 'Cannot be negative')
    .max(70, "That doesn't look right"),
  consultationFee: z.coerce.number().min(0, 'Cannot be negative'),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

const WEEKDAYS: WeekDay[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function ProfileForm() {
  const { profile, setProfile } = useDoctorData();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name,
        specialization: profile.specialization,
        experienceYears: profile.experience_years,
        consultationFee: profile.consultation_fee,
      });
    }
  }, [profile, reset]);

  if (!profile) return null;

  const onSubmit = async (values: ProfileFormValues) => {
    setError(null);
    try {
      const updated = await doctorApi.updateProfile(values);
      setProfile(updated);
      toast.success('Profile updated.');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update your profile.'));
    }
  };

  return (
    <Card>
      <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">Profile information</h2>
      {error && (
        <Alert
          type="error"
          description={error}
          dismissible
          onDismiss={() => setError(null)}
          className="mb-4"
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Full name" error={errors.name?.message} {...register('name')} />
          <Input
            label="Email"
            value={profile.email}
            disabled
            helperText="Contact support to change your email"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label="Specialization"
            error={errors.specialization?.message}
            {...register('specialization')}
          />
          <Input
            label="Years of experience"
            type="number"
            error={errors.experienceYears?.message}
            {...register('experienceYears')}
          />
          <Input
            label="Consultation fee ($)"
            type="number"
            error={errors.consultationFee?.message}
            {...register('consultationFee')}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}

function AvailabilitySection() {
  const { profile, setProfile } = useDoctorData();
  const toast = useToast();
  const [isAvailable, setIsAvailable] = useState(true);
  const [days, setDays] = useState<Set<WeekDay>>(new Set(['MON', 'TUE', 'WED', 'THU', 'FRI']));
  const [hours, setHours] = useState({ start: '09:00', end: '17:00' });
  const [breakTime, setBreakTime] = useState({ start: '13:00', end: '14:00' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setIsAvailable(profile.is_available);
  }, [profile]);

  const toggleDay = (day: WeekDay) => {
    setDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const updated = await doctorApi.updateAvailability({
        isAvailable,
        availableDays: Array.from(days),
        workingHours: hours,
      });
      setProfile({ ...profile, is_available: updated.is_available });
      toast.success('Availability updated.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update your availability.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <h2 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">Availability settings</h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Controls whether patients can book you. Working days/hours are saved but not yet enforced
        when patients pick a time slot — that scheduling logic isn&apos;t wired up on the backend
        yet.
      </p>

      <div className="space-y-5">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isAvailable}
            onChange={(e) => setIsAvailable(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-400 dark:border-gray-600 dark:bg-gray-800"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Accepting new appointments
          </span>
          <Badge variant={isAvailable ? 'success' : 'danger'} size="sm" dot>
            {isAvailable ? 'Available' : 'Unavailable'}
          </Badge>
        </label>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Available days
          </p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  days.has(day)
                    ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400'
                    : 'border-gray-300 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Working hours
            </p>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={hours.start}
                onChange={(e) => setHours((h) => ({ ...h, start: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
              <span className="text-gray-400">to</span>
              <input
                type="time"
                value={hours.end}
                onChange={(e) => setHours((h) => ({ ...h, end: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Break time <span className="font-normal text-gray-400">(not saved yet)</span>
            </p>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={breakTime.start}
                onChange={(e) => setBreakTime((b) => ({ ...b, start: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
              <span className="text-gray-400">to</span>
              <input
                type="time"
                value={breakTime.end}
                onChange={(e) => setBreakTime((b) => ({ ...b, end: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} loading={saving}>
            Save availability
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function DoctorProfile() {
  const { profile, isLoadingProfile, refetchProfile } = useDoctorData();

  useEffect(() => {
    if (!profile) void refetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Profile</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your professional details and availability.
        </p>
      </header>

      {isLoadingProfile || !profile ? (
        <Card>
          <p className="text-sm text-gray-400">Loading your profile…</p>
        </Card>
      ) : (
        <>
          <ProfileForm />
          <AvailabilitySection />
        </>
      )}
    </div>
  );
}
