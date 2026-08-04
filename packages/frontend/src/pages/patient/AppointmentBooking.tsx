import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  DatePicker,
  Input,
  Select,
  Skeleton,
  useToast,
  type SelectOption,
} from '../../components/common';
import { CalendarIcon, ClockIcon, SearchIcon } from '../../components/common/icons';
import { cn } from '../../lib/cn';
import { getErrorMessage } from '../../lib/api';
import { getAvailableSlots, bookAppointment } from '../../lib/endpoints/appointments';
import { listDoctors } from '../../lib/endpoints/doctors';
import type { Doctor } from '../../types/patient';

const SPECIALIZATIONS = [
  'General Physician',
  'Cardiologist',
  'Neurologist',
  'Pulmonologist',
  'Gastroenterologist',
  'Dermatologist',
  'Rheumatologist',
  'Urologist',
  'Pediatrician',
  'Infectious Disease Specialist',
];
const SPECIALIZATION_OPTIONS: SelectOption<string>[] = SPECIALIZATIONS.map((s) => ({
  value: s,
  label: s,
}));

const STEPS = ['Select doctor', 'Date & time', 'Confirm'] as const;

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-sm">
      {STEPS.map((label, i) => {
        const stepNum = i + 1;
        const active = stepNum === current;
        const done = stepNum < current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                done && 'bg-primary-600 text-white',
                active && 'border-2 border-primary-600 text-primary-600 dark:text-primary-400',
                !active && !done && 'border border-gray-300 text-gray-400 dark:border-gray-700'
              )}
            >
              {stepNum}
            </span>
            <span
              className={cn(
                active ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-gray-400'
              )}
            >
              {label}
            </span>
            {stepNum < STEPS.length && (
              <span className="mx-1 h-px w-8 bg-gray-200 dark:bg-gray-700" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function AppointmentBooking() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const suggestion = location.state as { specialization?: string; doctorId?: number } | null;

  const [step, setStep] = useState(1);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // --- Step 1: doctors ---
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState<string | null>(
    suggestion?.specialization ?? null
  );
  const [doctors, setDoctors] = useState<Doctor[] | null>(null);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);

  useEffect(() => {
    setDoctors(null);
    setDoctorsError(null);
    listDoctors({ search: search || undefined, specialization: specialization || undefined })
      .then(setDoctors)
      .catch((err) => setDoctorsError(getErrorMessage(err, 'Could not load doctors.')));
  }, [search, specialization]);

  // --- Step 2: slots ---
  const [slots, setSlots] = useState<{ available: string[]; booked: string[] } | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return;
    setLoadingSlots(true);
    setSlotsError(null);
    setSelectedTime(null);
    const dateStr = selectedDate.toISOString().slice(0, 10);
    getAvailableSlots(selectedDoctor.doctorid, dateStr)
      .then(({ availableSlots, bookedSlots }) =>
        setSlots({ available: availableSlots, booked: bookedSlots })
      )
      .catch((err) => setSlotsError(getErrorMessage(err, 'Could not load available time slots.')))
      .finally(() => setLoadingSlots(false));
  }, [selectedDoctor, selectedDate]);

  const handleConfirm = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) return;
    setBooking(true);
    setBookingError(null);
    try {
      await bookAppointment({
        doctorId: selectedDoctor.doctorid,
        date: selectedDate.toISOString().slice(0, 10),
        time: selectedTime,
        reason: reason.trim() || undefined,
      });
      toast.success(`Appointment booked with Dr. ${selectedDoctor.name}.`);
      navigate('/appointments');
    } catch (err) {
      setBookingError(getErrorMessage(err, 'Could not book this appointment.'));
    } finally {
      setBooking(false);
    }
  };

  const canGoToStep3 = !!selectedDoctor && !!selectedDate && !!selectedTime;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Book an Appointment</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Find a specialist and schedule a visit.
        </p>
      </header>

      <StepIndicator current={step} />

      {suggestion?.specialization && step === 1 && (
        <Alert
          type="info"
          title="Based on your symptom check"
          description={`We recommend seeing a ${suggestion.specialization}. Doctors with this specialization are shown first.`}
        />
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search doctors by name…"
              leftIcon={<SearchIcon className="h-4 w-4" />}
              containerClassName="max-w-xs"
            />
            <Select<string>
              options={SPECIALIZATION_OPTIONS}
              value={specialization}
              onChange={setSpecialization}
              placeholder="All specializations"
              searchable
              fullWidth={false}
              className="w-56"
            />
          </div>

          {doctorsError ? (
            <Alert type="warning" description={doctorsError} />
          ) : doctors === null ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-full rounded-xl" />
              ))}
            </div>
          ) : doctors.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No doctors match your search.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {doctors.map((doctor) => (
                <Card
                  key={doctor.doctorid}
                  hoverEffect
                  className={cn(
                    'cursor-pointer',
                    selectedDoctor?.doctorid === doctor.doctorid && 'ring-2 ring-primary-500'
                  )}
                  onClick={() => setSelectedDoctor(doctor)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        Dr. {doctor.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {doctor.specialization}
                      </p>
                    </div>
                    <Badge variant={doctor.is_available ? 'success' : 'danger'} size="sm" dot>
                      {doctor.is_available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                    Consultation fee:{' '}
                    <span className="font-medium">${doctor.consultation_fee}</span>
                  </p>
                  <Button
                    size="sm"
                    fullWidth
                    className="mt-3"
                    disabled={!doctor.is_available}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDoctor(doctor);
                      setStep(2);
                    }}
                  >
                    Select
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && selectedDoctor && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Booking with</p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
              Dr. {selectedDoctor.name}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {selectedDoctor.specialization}
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              ${selectedDoctor.consultation_fee} consultation
            </p>
          </Card>

          <div className="space-y-4 lg:col-span-2">
            <DatePicker
              label="Select a date"
              value={selectedDate}
              onChange={setSelectedDate}
              minDate={new Date()}
              placeholder="Choose an appointment date"
            />

            {selectedDate && (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Available time slots
                </p>
                {slotsError ? (
                  <Alert type="warning" description={slotsError} />
                ) : loadingSlots ? (
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-9 w-full" />
                    ))}
                  </div>
                ) : slots && slots.available.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    No slots available on this date. Try another day.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots?.available.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={cn(
                          'flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                          selectedTime === time
                            ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400'
                            : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
                        )}
                      >
                        <ClockIcon className="h-3.5 w-3.5" />
                        {time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button disabled={!canGoToStep3} onClick={() => setStep(3)}>
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && selectedDoctor && selectedDate && selectedTime && (
        <div className="mx-auto max-w-lg space-y-4">
          {bookingError && (
            <Alert
              type="error"
              description={bookingError}
              dismissible
              onDismiss={() => setBookingError(null)}
            />
          )}

          <Card>
            <h2 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Booking summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Doctor</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">
                  Dr. {selectedDoctor.name}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Specialization</dt>
                <dd className="text-gray-900 dark:text-gray-100">
                  {selectedDoctor.specialization}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Date</dt>
                <dd className="flex items-center gap-1.5 text-gray-900 dark:text-gray-100">
                  <CalendarIcon className="h-4 w-4" />
                  {selectedDate.toDateString()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Time</dt>
                <dd className="flex items-center gap-1.5 text-gray-900 dark:text-gray-100">
                  <ClockIcon className="h-4 w-4" />
                  {selectedTime}
                </dd>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2 dark:border-gray-800">
                <dt className="text-gray-500 dark:text-gray-400">Fee</dt>
                <dd className="font-semibold text-gray-900 dark:text-gray-100">
                  ${selectedDoctor.consultation_fee}
                </dd>
              </div>
            </dl>
          </Card>

          <Input
            type="textarea"
            label="Reason for visit"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Briefly describe the reason for your visit (optional)"
          />

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button loading={booking} onClick={handleConfirm}>
              Confirm booking
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
