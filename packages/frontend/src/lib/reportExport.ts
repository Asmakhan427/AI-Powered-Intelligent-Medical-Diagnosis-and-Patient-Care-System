import type { PatientReport } from '../types/patient';

export function reportToText(report: PatientReport, patientName?: string): string {
  const lines: Array<string | undefined> = [
    'MedAssist AI — Medical Report',
    '================================',
    patientName ? `Patient: ${patientName}` : undefined,
    `Report ID: #${report.reportid}`,
    `Date: ${report.created_date}`,
    '',
    'Symptoms:',
    report.symptoms,
    '',
    `AI Diagnosis: ${report.ai_diagnosis} (${report.ai_confidence}% confidence)`,
    `Status: ${report.status}`,
    report.doctor_name
      ? `Reviewing doctor: Dr. ${report.doctor_name}${report.specialization ? ` (${report.specialization})` : ''}`
      : undefined,
    report.doctor_notes ? `\nDoctor notes:\n${report.doctor_notes}` : undefined,
    report.prescription ? `\nPrescription:\n${report.prescription}` : undefined,
  ];
  return lines.filter((line): line is string => line !== undefined).join('\n');
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
