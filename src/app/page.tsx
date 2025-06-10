import ChatInterface from '@/components/ChatInterface'
import AuthWrapper from '@/components/AuthWrapper'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function Home() {
  return (
    <ErrorBoundary>
      <AuthWrapper>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <ChatInterface />
        </div>
      </AuthWrapper>
    </ErrorBoundary>
  );
}
