import React from 'react';

import AppProviders from './src/app/core/AppProviders';
import AppRoutes from './src/app/core/AppRoutes';
import useAppController from './src/app/core/useAppController';
import AppErrorBoundary from './src/components/common/AppErrorBoundary';

export default function App() {
  const { step, routeProps } = useAppController();

  return (
    <AppErrorBoundary resetKey={step} onRecover={() => routeProps.setStep('login')}>
      <AppProviders step={step}>
        <AppRoutes {...routeProps} />
      </AppProviders>
    </AppErrorBoundary>
  );
}
