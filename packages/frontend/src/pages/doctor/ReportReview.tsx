import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  DatePicker,
  Input,
  Modal,
  Table,
  Tabs,
  useToast,
  type DateRange,
  type TableColumn,
} from '../../components/common';
import { getErrorMessage } from '../../lib/api';
import * as doctorApi from '../../lib/endpoints/doctor';
import type { DoctorPendingReport, DoctorReviewedReport } from '../../types/doctor';

interface ReviewFormState {
  doctorDiagnosis: string;
  notes: string;
  prescription: string;
}

const EMPTY_FORM: ReviewFormState = { doctorDiagnosis: '', notes: '', prescription: '' };

function inRange(dateStr: string, range: DateRange): boolean {
  if (!range.start && !range.end) return true;
  const d = new Date(dateStr);
  if (range.start && d < range.start) return false;
  if (range.end && d > range.end) return false;
  return true;
}

export default function ReportReview() {
  const toast = useToast();

  const [pending, setPending] = useState<DoctorPendingReport[] | null>(null);
  const [reviewed, setReviewed] = useState<DoctorReviewedReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<DoctorPendingReport | null>(null);
  const [form, setForm] = useState<ReviewFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = () => {
    Promise.all([doctorApi.getPendingReports(), doctorApi.getReviewedReports()])
      .then(([p, r]) => {
        setPending(p);
        setReviewed(r);
      })
      .catch((err) => setError(getErrorMessage(err, 'Could not load reports.')));
  };

  useEffect(load, []);

  const openReview = (report: DoctorPendingReport) => {
    setSelected(report);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const handleSubmitReview = async () => {
    if (!selected) return;
    if (!form.doctorDiagnosis.trim() && !form.notes.trim()) {
      setFormError('Add a diagnosis or clinical notes before submitting.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await doctorApi.reviewReport({
        reportId: selected.reportid,
        doctorDiagnosis: form.doctorDiagnosis.trim() || undefined,
        notes: form.notes.trim() || undefined,
        prescription: form.prescription.trim() || undefined,
      });
      toast.success(`Report for ${selected.patient_name} reviewed.`);
      setSelected(null);
      load();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not submit this review.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Report Review</h1>
        <Alert type="error" description={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Report Review</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Review AI-flagged reports and add your clinical assessment.
        </p>
      </header>

      <Tabs
        items={[
          {
            id: 'pending',
            label: 'Pending',
            badge:
              pending && pending.length > 0 ? (
                <Badge size="sm" variant="warning">
                  {pending.length}
                </Badge>
              ) : undefined,
            content: <PendingTab reports={pending} onReview={openReview} />,
          },
          { id: 'reviewed', label: 'Reviewed', content: <ReviewedTab reports={reviewed} /> },
        ]}
      />

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Review report" size="lg">
        {selected && (
          <div className="space-y-4">
            {formError && (
              <Alert
                type="error"
                description={formError}
                dismissible
                onDismiss={() => setFormError(null)}
              />
            )}

            <div className="rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-800/60">
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {selected.patient_name}
              </p>
              <p className="mt-1 text-gray-600 dark:text-gray-300">{selected.symptoms}</p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                AI diagnosis: <span className="font-medium">{selected.ai_diagnosis}</span> (
                {selected.ai_confidence}% confidence)
              </p>
            </div>

            <Input
              label="Doctor diagnosis"
              placeholder="Your clinical diagnosis"
              value={form.doctorDiagnosis}
              onChange={(e) => setForm((f) => ({ ...f, doctorDiagnosis: e.target.value }))}
            />
            <Input
              type="textarea"
              label="Clinical notes"
              rows={3}
              placeholder="Observations, follow-up instructions…"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
            <Input
              type="textarea"
              label="Prescription"
              rows={3}
              placeholder="Medication, dosage, duration…"
              value={form.prescription}
              onChange={(e) => setForm((f) => ({ ...f, prescription: e.target.value }))}
            />

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
              <Button variant="outline" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button loading={submitting} onClick={handleSubmitReview}>
                Submit review
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function PendingTab({
  reports,
  onReview,
}: {
  reports: DoctorPendingReport[] | null;
  onReview: (r: DoctorPendingReport) => void;
}) {
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
  const filtered = useMemo(
    () => (reports ?? []).filter((r) => inRange(r.created_at, dateRange)),
    [reports, dateRange]
  );

  const columns: TableColumn<DoctorPendingReport>[] = [
    { key: 'patient', header: 'Patient', accessor: (r) => r.patient_name, sortable: true },
    { key: 'date', header: 'Date', accessor: (r) => r.created_at, sortable: true, width: '160px' },
    { key: 'diagnosis', header: 'AI diagnosis', accessor: (r) => r.ai_diagnosis },
    {
      key: 'confidence',
      header: 'Confidence',
      accessor: (r) => `${r.ai_confidence}%`,
      sortAccessor: (r) => r.ai_confidence,
      sortable: true,
      align: 'right',
      width: '110px',
    },
    {
      key: 'actions',
      header: '',
      accessor: (r) => (
        <Button size="sm" onClick={() => onReview(r)}>
          Review
        </Button>
      ),
      align: 'right',
      width: '110px',
    },
  ];

  return (
    <div className="space-y-3">
      <DatePicker
        range
        value={dateRange}
        onChange={setDateRange}
        placeholder="Filter by date range"
        className="max-w-xs"
      />
      <Table
        columns={columns}
        data={filtered}
        rowKey={(r) => String(r.reportid)}
        loading={reports === null}
        searchable
        searchPlaceholder="Search by patient name…"
        emptyMessage="No pending reports. You're all caught up."
      />
    </div>
  );
}

function ReviewedTab({ reports }: { reports: DoctorReviewedReport[] | null }) {
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
  const filtered = useMemo(
    () => (reports ?? []).filter((r) => inRange(r.created_date, dateRange)),
    [reports, dateRange]
  );

  const columns: TableColumn<DoctorReviewedReport>[] = [
    { key: 'patient', header: 'Patient', accessor: (r) => r.patient_name, sortable: true },
    {
      key: 'date',
      header: 'Reviewed',
      accessor: (r) => r.reviewed_at,
      sortable: true,
      width: '160px',
    },
    {
      key: 'diagnosis',
      header: 'Diagnosis',
      accessor: (r) => r.doctor_diagnosis || r.ai_diagnosis,
    },
    {
      key: 'notes',
      header: 'Notes',
      accessor: (r) => (
        <span className="line-clamp-1 max-w-xs text-gray-500 dark:text-gray-400">
          {r.doctor_notes || '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <DatePicker
        range
        value={dateRange}
        onChange={setDateRange}
        placeholder="Filter by date range"
        className="max-w-xs"
      />
      <Table
        columns={columns}
        data={filtered}
        rowKey={(r) => String(r.reportid)}
        loading={reports === null}
        searchable
        searchPlaceholder="Search by patient name…"
        emptyMessage="No reviewed reports yet."
      />
    </div>
  );
}
