import { useToastStore } from '../stores/toast';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

const styles = {
  success: 'bg-success-50 dark:bg-success-950/80 border-success-200 dark:border-success-800 text-success-800 dark:text-success-200',
  error: 'bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
  info: 'bg-primary-50 dark:bg-primary-950/80 border-primary-200 dark:border-primary-800 text-primary-800 dark:text-primary-200',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg animate-fade-in ${styles[toast.type]}`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 rounded-lg p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
