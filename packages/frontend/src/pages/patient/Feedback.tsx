import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, useToast } from '../../components/common';
import { StarIcon } from '../../components/common/icons';
import { cn } from '../../lib/cn';
import { getErrorMessage } from '../../lib/api';
import * as feedbackApi from '../../lib/endpoints/feedback';
import type { FeedbackEntry } from '../../types/patient';

function StarRating({ value, onChange }: { value: number; onChange: (rating: number) => void }) {
  const [hover, setHover] = useState(0);

  return (
    <div role="radiogroup" aria-label="Rating" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hover || value);
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(star)}
            className="p-0.5 text-amber-400 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1"
          >
            <StarIcon
              className={cn(
                'h-8 w-8',
                filled ? 'fill-current' : 'fill-transparent text-gray-300 dark:text-gray-700'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export default function Feedback() {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lastFeedback, setLastFeedback] = useState<FeedbackEntry | null>(null);
  const [platformStats, setPlatformStats] = useState<{
    totalFeedback: number;
    averageRating: string | null;
  } | null>(null);

  useEffect(() => {
    feedbackApi
      .getFeedbackStats()
      .then(setPlatformStats)
      .catch(() => setPlatformStats(null));
  }, []);

  const handleSubmit = async () => {
    if (rating < 1) {
      setError('Please select a star rating.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await feedbackApi.submitFeedback({
        rating,
        comments: comments.trim() || undefined,
      });
      if (result.duplicate) {
        toast.info(result.message);
      } else {
        toast.success(result.message);
        // No "list my feedback" endpoint exists on the backend — this
        // fetches the entry we just created by id so the page can show
        // *a* previous entry, not full history.
        if (result.feedbackId) {
          feedbackApi
            .getFeedback(result.feedbackId)
            .then(setLastFeedback)
            .catch(() => {});
        }
      }
      setRating(0);
      setComments('');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not submit your feedback.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Feedback</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Tell us how MedAssist AI is working for you.
        </p>
      </header>

      {platformStats && platformStats.totalFeedback > 0 && (
        <Card padding="sm" className="flex items-center gap-3">
          <StarIcon className="h-5 w-5 fill-current text-amber-400" />
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {platformStats.averageRating}
            </span>{' '}
            average from {platformStats.totalFeedback} review
            {platformStats.totalFeedback === 1 ? '' : 's'} platform-wide
          </p>
        </Card>
      )}

      <Card>
        {error && (
          <Alert
            type="error"
            description={error}
            dismissible
            onDismiss={() => setError(null)}
            className="mb-4"
          />
        )}

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Your rating</p>
            <StarRating value={rating} onChange={setRating} />
          </div>

          <Input
            type="textarea"
            label="Comments"
            rows={4}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="What went well? What could be better?"
            helperText="Optional"
          />

          <Button onClick={handleSubmit} loading={submitting} fullWidth>
            Submit feedback
          </Button>
        </div>
      </Card>

      {lastFeedback && (
        <Card>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Your last feedback
          </h2>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIcon
                key={star}
                className={cn(
                  'h-4 w-4',
                  star <= lastFeedback.rating
                    ? 'fill-current text-amber-400'
                    : 'fill-transparent text-gray-300 dark:text-gray-700'
                )}
              />
            ))}
          </div>
          {lastFeedback.comments && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{lastFeedback.comments}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">{lastFeedback.created_at}</p>
        </Card>
      )}
    </div>
  );
}
