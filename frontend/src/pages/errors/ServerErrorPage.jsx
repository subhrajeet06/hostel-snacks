import { Link } from 'react-router-dom';

export default function ServerErrorPage() {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="text-7xl mb-4">💥</div>
        <h1 className="font-display text-4xl font-black text-gray-900 dark:text-white mb-2">500</h1>
        <h2 className="font-display text-xl font-bold text-gray-800 dark:text-gray-250 mb-3">Internal Server Error</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
          Something went wrong on our end. Please try again later or refresh the page.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={handleReload} className="btn-primary py-2.5 px-6 text-sm font-semibold rounded-xl transition-all">
            Refresh Page
          </button>
          <Link to="/" className="bg-gray-100 dark:bg-gray-850 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 py-2.5 px-6 text-sm font-semibold rounded-xl border border-gray-200 dark:border-gray-700 transition-all">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
