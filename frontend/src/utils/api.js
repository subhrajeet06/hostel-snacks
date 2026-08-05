import React from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Prevent requests when completely offline
  if (!navigator.onLine) {
    const offlineError = new Error('OFFLINE');
    offlineError.isOffline = true;
    return Promise.reject(offlineError);
  }

  // Setup AbortController for timeouts/manual retries
  const controller = new AbortController();
  config.signal = controller.signal;
  config.abortController = controller;

  // Setup slow connection warning (5 seconds)
  const timeoutId = setTimeout(() => {
    const toastId = toast((t) => 
      React.createElement('div', { className: "flex flex-col gap-2 md:flex-row md:items-center justify-between min-w-[250px]" },
        React.createElement('span', { className: "text-sm font-medium text-gray-800 dark:text-gray-100" }, 'Still trying to connect...'),
        React.createElement('div', { className: "flex gap-2" },
          React.createElement('button', {
            onClick: () => {
              toast.dismiss(toastId);
              config._retryAction = () => {
                delete config._retryAction;
                return api(config);
              };
              controller.abort();
            },
            className: "bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-all"
          }, 'Retry')
        )
      ),
      { duration: Infinity, position: 'top-center' }
    );
    config.slowToastId = toastId;
  }, 5000);

  config.slowTimeoutId = timeoutId;

  return config;
});

// Helper to clean up timeout and slow toasts
const cleanUpRequest = (config) => {
  if (config) {
    if (config.slowTimeoutId) clearTimeout(config.slowTimeoutId);
    if (config.slowToastId) toast.dismiss(config.slowToastId);
  }
};

// Handle responses and errors globally
api.interceptors.response.use(
  (res) => {
    cleanUpRequest(res.config);
    return res;
  },
  async (error) => {
    if (error.config) {
      cleanUpRequest(error.config);
    }

    // If request was aborted due to manual retry (slow warning), run the retry action
    if (error.code === 'ERR_CANCELED' && error.config?._retryAction) {
      return error.config._retryAction();
    }

    // Offline error
    if (error.isOffline || !navigator.onLine) {
      const msg = 'Please check your internet connection.';
      toast.error(msg, { id: 'network-error' });
      
      error.response = {
        data: { message: msg }
      };
      error.message = msg;
      return Promise.reject(error);
    }

    const status = error.response?.status;

    // Handle 401 globally
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.setItem('authError', 'Session expired. Please log in again.');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Define standard friendly messages
    let friendlyMessage = 'Something went wrong. Please try again later.';
    if (status === 403) {
      friendlyMessage = 'You do not have permission to perform this action.';
    } else if (status === 404) {
      friendlyMessage = 'Requested resource not found.';
    } else if (status === 500) {
      friendlyMessage = 'Something went wrong. Please try again later.';
    } else if (error.code === 'ECONNABORTED' || !error.response) {
      friendlyMessage = 'Unable to connect to the server.';
    } else if (status === 400) {
      friendlyMessage = error.response.data?.message || 'Something went wrong. Please try again later.';
    } else {
      friendlyMessage = error.response.data?.message || friendlyMessage;
    }

    // Format response error message to maintain compatibility with existing try-catch blocks
    if (error.response) {
      if (!error.response.data) error.response.data = {};
      error.response.data.message = friendlyMessage;
    } else {
      error.response = {
        data: { message: friendlyMessage }
      };
    }
    error.message = friendlyMessage;

    // Show Retry banner for network errors or server failures (>= 500)
    const isNetworkOrServerError = !error.response?.status || status >= 500 || error.code === 'ECONNABORTED';
    if (isNetworkOrServerError) {
      return new Promise((resolve, reject) => {
        const retryFn = () => {
          resolve(api(error.config));
        };
        const cancelFn = () => {
          reject(error);
        };
        
        const toastId = toast((t) => 
          React.createElement('div', { className: "flex flex-col gap-2 md:flex-row md:items-center justify-between min-w-[250px]" },
            React.createElement('span', { className: "text-sm font-medium text-gray-800 dark:text-gray-100" }, friendlyMessage),
            React.createElement('div', { className: "flex gap-2" },
              React.createElement('button', {
                onClick: () => {
                  toast.dismiss(toastId);
                  retryFn();
                },
                className: "bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-all"
              }, 'Retry'),
              React.createElement('button', {
                onClick: () => {
                  toast.dismiss(toastId);
                  cancelFn();
                },
                className: "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs px-3 py-1.5 rounded-lg transition-all"
              }, 'Cancel')
            )
          ),
          { duration: Infinity, position: 'top-center' }
        );
      });
    }

    return Promise.reject(error);
  }
);

export default api;
