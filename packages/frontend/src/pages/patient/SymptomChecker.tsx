import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Input, useToast } from '../../components/common';
import { MicIcon, PhoneIcon, SendIcon, UserIcon } from '../../components/common/icons';
import { Skeleton } from '../../components/common/Skeleton';
import { EMERGENCY_NUMBER } from '../../config/env';
import { getErrorMessage } from '../../lib/api';
import { analyzeSymptoms, getPredictionHistory } from '../../lib/endpoints/ai';
import type { AnalyzeSymptomsResult, PredictionHistoryEntry, Severity } from '../../types/patient';

// The Web Speech API isn't in lib.dom.d.ts (still non-standard); this is
// the minimal surface this page actually uses.
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

const SEVERITY_BADGE: Record<Severity, 'success' | 'warning' | 'danger'> = {
  MILD: 'success',
  MODERATE: 'warning',
  SEVERE: 'danger',
  CRITICAL: 'danger',
};

export default function SymptomChecker() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const [symptoms, setSymptoms] = useState(
    () => (location.state as { symptoms?: string } | null)?.symptoms ?? ''
  );
  const [inputType, setInputType] = useState<'TEXT' | 'VOICE'>('TEXT');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalyzeSymptomsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechSupported =
    typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const [history, setHistory] = useState<PredictionHistoryEntry[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadHistory = () => {
    getPredictionHistory()
      .then(setHistory)
      .catch((err) =>
        setHistoryError(getErrorMessage(err, 'Could not load your prediction history.'))
      );
  };

  useEffect(() => {
    loadHistory();
    return () => recognitionRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleVoiceInput = () => {
    if (!speechSupported) return;
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      setSymptoms((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
      setInputType('VOICE');
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const handleAnalyze = async () => {
    if (symptoms.trim().length < 3) {
      setError('Please describe your symptoms in a bit more detail.');
      return;
    }
    setError(null);
    setAnalyzing(true);
    try {
      const analysis = await analyzeSymptoms(symptoms.trim(), inputType);
      setResult(analysis);
      loadHistory();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not analyze your symptoms. Please try again.'));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleClear = () => {
    setSymptoms('');
    setResult(null);
    setError(null);
    setInputType('TEXT');
  };

  const handleSaveToHistory = () => {
    // Authenticated analyses are already persisted server-side (see
    // ai.controller.ts) — this just confirms that and refreshes the list
    // rather than pretending to do client-only storage.
    loadHistory();
    toast.success('Saved to your history.');
  };

  const handleBookAppointment = () => {
    navigate('/appointments/book', {
      state: { specialization: result?.assignedDoctor, doctorId: result?.assignedDoctorId },
    });
  };

  const isCritical = result && (result.emergencyDetected || result.severity === 'CRITICAL');

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Symptom Checker</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Describe how you&apos;re feeling and get an AI-assisted preliminary assessment.
        </p>
      </header>

      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <Input
          type="textarea"
          label="Symptoms"
          rows={5}
          value={symptoms}
          onChange={(e) => {
            setSymptoms(e.target.value);
            setInputType('TEXT');
          }}
          placeholder="E.g. I've had a throbbing headache for two days, sensitive to light, mild nausea…"
          error={error ?? undefined}
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            onClick={handleAnalyze}
            loading={analyzing}
            leftIcon={<SendIcon className="h-4 w-4" />}
          >
            Analyze
          </Button>
          <Button
            variant={isListening ? 'danger' : 'outline'}
            onClick={toggleVoiceInput}
            disabled={!speechSupported}
            leftIcon={<MicIcon className="h-4 w-4" />}
            title={speechSupported ? undefined : 'Voice input is not supported in this browser'}
          >
            {isListening ? 'Listening…' : 'Voice input'}
          </Button>
          <Button variant="secondary" onClick={handleClear}>
            Clear
          </Button>
          {!speechSupported && (
            <span className="text-xs text-gray-400">
              Voice input isn&apos;t supported in this browser.
            </span>
          )}
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          {isCritical && (
            <Alert
              type="error"
              title="🚨 Potential emergency"
              description={
                <>
                  This result suggests an urgent condition. Please call{' '}
                  <a href={`tel:${EMERGENCY_NUMBER}`} className="font-semibold underline">
                    {EMERGENCY_NUMBER}
                  </a>{' '}
                  or seek immediate medical attention.
                </>
              }
            />
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Preliminary diagnosis</p>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {result.diagnosis}
                </h2>
              </div>
              <Badge variant={SEVERITY_BADGE[result.severity]}>{result.severity}</Badge>
            </div>

            {result.description && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {result.description}
              </p>
            )}

            {result.symptomsDetected?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Matched symptoms</p>
                <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  {result.symptomsDetected.map((symptom) => (
                    <li
                      key={symptom}
                      className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <span className="text-green-600 dark:text-green-400" aria-hidden="true">
                        ✓
                      </span>
                      {symptom}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Confidence</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {result.confidence}%
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Recommended specialist
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {result.assignedDoctor}
                </p>
                <p className="text-xs text-gray-400">{result.doctorReason}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Response time</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {result.responseTime}ms
                </p>
              </div>
            </div>

            {result.differentials?.length > 1 && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Other possibilities considered
                </p>
                <ul className="mt-1 space-y-1">
                  {result.differentials.map((d) => (
                    <li
                      key={d.disease}
                      className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300"
                    >
                      <span>{d.disease}</span>
                      <span className="text-gray-400">{d.confidence}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">Recommendations</p>
              <p className="mt-1 whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">
                {result.recommendations}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
              <Button size="sm" onClick={handleSaveToHistory}>
                Save to history
              </Button>
              <Button size="sm" variant="outline" onClick={handleBookAppointment}>
                Book appointment
              </Button>
              {isCritical && (
                <a href={`tel:${EMERGENCY_NUMBER}`}>
                  <Button size="sm" variant="danger" leftIcon={<PhoneIcon className="h-4 w-4" />}>
                    Call {EMERGENCY_NUMBER}
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Prediction history
        </h2>
        {historyError ? (
          <Alert type="warning" description={historyError} />
        ) : history === null ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-400">No previous checks yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {history.map((entry) => (
                <li
                  key={entry.logid}
                  className="flex items-center gap-3 bg-white px-4 py-3 dark:bg-gray-900"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-700 dark:text-gray-300">
                      {entry.symptoms_input}
                    </p>
                    <p className="text-xs text-gray-400">
                      {entry.ai_response} · {entry.log_timestamp} ·{' '}
                      {entry.input_type === 'VOICE' ? 'Voice' : 'Text'}
                    </p>
                  </div>
                  <Badge variant={SEVERITY_BADGE[entry.severity]} size="sm">
                    {entry.severity}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
