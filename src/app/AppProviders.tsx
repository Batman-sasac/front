import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { isFullscreenStep, type AppStep } from '../navigation/routes';

type AppProvidersProps = {
  step: AppStep;
  children: React.ReactNode;
};

export default function AppProviders({ step, children }: AppProvidersProps) {
  const safeAreaEdges: Edge[] = isFullscreenStep(step) ? [] : ['top'];

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }} edges={safeAreaEdges}>
        <View style={{ flex: 1 }}>{children}</View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
