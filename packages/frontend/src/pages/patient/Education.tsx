import { useState } from 'react';
import { Alert, Card, Input, Skeleton } from '../../components/common';
import { HomeIcon, PhoneIcon, SearchIcon } from '../../components/common/icons';
import { cn } from '../../lib/cn';
import { getErrorMessage } from '../../lib/api';
import { getEducationArticle } from '../../lib/endpoints/ai';
import type { EducationArticle } from '../../types/patient';

// The backend only serves a fixed set of topics (see
// packages/backend/src/services/education.service.ts) — there's no article
// listing/search endpoint, so this list mirrors those exact keys and
// "search" filters it client-side rather than querying the server.
const CATEGORIES: Array<{ topic: string; label: string; blurb: string }> = [
  { topic: 'general', label: 'General Wellness', blurb: 'Everyday habits for staying healthy' },
  {
    topic: 'heart',
    label: 'Cardiovascular Health',
    blurb: 'Heart health, blood pressure, and more',
  },
  {
    topic: 'cold',
    label: 'Colds & Viral Infections',
    blurb: 'Managing colds, flu, and viral illness',
  },
  { topic: 'migraine', label: 'Migraines', blurb: 'Understanding and preventing migraines' },
];

export default function Education() {
  const [search, setSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [article, setArticle] = useState<EducationArticle | null>(null);
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = CATEGORIES.filter(
    (c) =>
      c.label.toLowerCase().includes(search.toLowerCase()) || c.topic.includes(search.toLowerCase())
  );

  const handleSelect = (topic: string) => {
    setSelectedTopic(topic);
    setArticle(null);
    setError(null);
    setLoadingArticle(true);
    getEducationArticle(topic)
      .then(setArticle)
      .catch((err) => setError(getErrorMessage(err, 'Could not load this article.')))
      .finally(() => setLoadingArticle(false));
  };

  const precautions =
    article?.precautions
      .split('\n')
      .map((line) => line.replace(/^[•\-*]\s*/, ''))
      .filter(Boolean) ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Health Education</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Learn more about common conditions and how to manage them.
        </p>
      </header>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search topics…"
        leftIcon={<SearchIcon className="h-4 w-4" />}
        containerClassName="max-w-sm"
      />

      <section
        aria-label="Topic categories"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {filtered.length === 0 ? (
          <p className="col-span-full py-6 text-center text-sm text-gray-400">
            No topics match your search.
          </p>
        ) : (
          filtered.map((category) => (
            <button
              key={category.topic}
              type="button"
              onClick={() => handleSelect(category.topic)}
              className="text-left"
            >
              <Card
                hoverEffect
                className={cn(selectedTopic === category.topic && 'ring-2 ring-primary-500')}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                  <HomeIcon className="h-5 w-5" />
                </span>
                <p className="mt-3 font-semibold text-gray-900 dark:text-gray-100">
                  {category.label}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{category.blurb}</p>
              </Card>
            </button>
          ))
        )}
      </section>

      {selectedTopic && (
        <section>
          {error ? (
            <Alert type="warning" description={error} />
          ) : loadingArticle || !article ? (
            <Card>
              <Skeleton className="mb-4 h-48 w-full rounded-lg" />
              <Skeleton className="mb-2 h-6 w-1/2" />
              <Skeleton className="h-4 w-full" />
            </Card>
          ) : (
            <Card padding="none" className="overflow-hidden">
              <img src={article.image} alt="" className="h-56 w-full object-cover" />
              <div className="p-5">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {article.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  {article.text}
                </p>

                {precautions.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Precautions
                    </h3>
                    <ul className="mt-2 space-y-1.5">
                      {precautions.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                        >
                          <span
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500"
                            aria-hidden="true"
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
                  <PhoneIcon className="h-4 w-4" />
                  In an emergency, don&apos;t wait — seek immediate medical attention.
                </div>
              </div>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}
