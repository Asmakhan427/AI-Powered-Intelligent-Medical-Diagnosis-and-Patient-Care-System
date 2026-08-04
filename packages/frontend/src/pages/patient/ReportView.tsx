import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, SkeletonText } from '../../components/common';
import { DownloadIcon, PrinterIcon } from '../../components/common/icons';
import { usePatientData } from '../../context/PatientContext';
import { getErrorMessage } from '../../lib/api';
import { getReports } from '../../lib/endpoints/patient';
import { downloadTextFile, reportToText } from '../../lib/reportExport';
import type { PatientReport } from '../../types/patient';

export default function ReportView() {
  const { id } = useParams<{ id: string }>();
  const { profile } = usePatientData();
  const [report, setReport] = useState<PatientReport | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // No single-report endpoint exists on the backend; the list endpoint
    // already returns full report objects, so we fetch and find by id.
    getReports()
      .then((reports) => {
        const match = reports.find((r) => String(r.reportid) === id);
        if (!match) {
          setNotFound(true);
          return;
        }
        setReport(match);
      })
      .catch((err) => setError(getErrorMessage(err, 'Could not load this report.')));
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Alert type="error" description={error} />
        <Link
          to="/history"
          className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          Back to medical history
        </Link>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Alert
          type="warning"
          description="This report doesn't exist or you don't have access to it."
        />
        <Link
          to="/history"
          className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          Back to medical history
        </Link>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <SkeletonText lines={6} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          to="/history"
          className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          ← Back to medical history
        </Link>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<DownloadIcon className="h-4 w-4" />}
            onClick={() =>
              downloadTextFile(`report-${report.reportid}.txt`, reportToText(report, profile?.name))
            }
          >
            Download as text
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<PrinterIcon className="h-4 w-4" />}
            onClick={() => window.print()}
          >
            Print / Save as PDF
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">
              Report #{report.reportid}
            </p>
            <h1 className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">
              {report.ai_diagnosis}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{report.created_date}</p>
          </div>
          <Badge variant={report.status === 'REVIEWED' ? 'success' : 'warning'}>
            {report.status}
          </Badge>
        </div>

        <div className="space-y-5 py-5">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Patient</h2>
            <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">{profile?.name ?? '—'}</p>
            {profile?.email && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
            )}
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Symptoms
            </h2>
            <p className="mt-1 whitespace-pre-line text-sm text-gray-800 dark:text-gray-200">
              {report.symptoms}
            </p>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              AI diagnosis
            </h2>
            <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">
              {report.ai_diagnosis} —{' '}
              <span className="font-medium">{report.ai_confidence}% confidence</span>
            </p>
          </section>

          {report.status === 'REVIEWED' ? (
            <>
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Doctor notes
                </h2>
                <p className="mt-1 whitespace-pre-line text-sm text-gray-800 dark:text-gray-200">
                  {report.doctor_notes || 'No additional notes provided.'}
                </p>
                {report.doctor_name && (
                  <p className="mt-1 text-xs text-gray-400">
                    Reviewed by Dr. {report.doctor_name}
                    {report.specialization ? ` (${report.specialization})` : ''}
                  </p>
                )}
              </section>

              {report.prescription && (
                <section>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Prescription
                  </h2>
                  <p className="mt-1 whitespace-pre-line text-sm text-gray-800 dark:text-gray-200">
                    {report.prescription}
                  </p>
                </section>
              )}
            </>
          ) : (
            <Alert type="info" description="This report is still pending review by a doctor." />
          )}
        </div>
      </Card>
    </div>
  );
}
