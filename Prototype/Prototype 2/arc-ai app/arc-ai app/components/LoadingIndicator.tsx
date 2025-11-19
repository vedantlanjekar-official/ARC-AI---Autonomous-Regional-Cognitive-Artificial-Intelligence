'use client';

interface LoadingIndicatorProps {
  message?: string;
}

export default function LoadingIndicator({
  message = 'AI is thinking...',
}: LoadingIndicatorProps) {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-none px-4 py-3 max-w-[85%] md:max-w-[70%]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">{message}</span>
        </div>
      </div>
    </div>
  );
}

