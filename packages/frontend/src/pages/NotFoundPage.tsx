import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 px-4 text-center dark:bg-gray-950">
      <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">404</p>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Page not found</h1>
      <p className="text-gray-500 dark:text-gray-400">The page you’re looking for doesn’t exist.</p>
      <Link
        to="/"
        className="mt-2 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
