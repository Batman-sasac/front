import React from 'react';

import AppProviders from './src/app/core/AppProviders';
import AppRoutes from './src/app/core/AppRoutes';
import useAppController from './src/app/core/useAppController';

export default function App() {
  const { step, routeProps } = useAppController();

  return (
    <AppProviders step={step}>
      <AppRoutes {...routeProps} />
    </AppProviders>
  );
}
