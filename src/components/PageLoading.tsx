"use client";

type PageLoadingProps = {
  message?: string;
};

export default function PageLoading({ message = "" }: PageLoadingProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center space-x-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-transparent dark:border-gray-600" />
        <div className="text-lg text-gray-900 dark:text-gray-100">
          {message}
        </div>
      </div>
    </div>
  );
}
