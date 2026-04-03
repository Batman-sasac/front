import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import StudyFlowScreen from './StudyFlowScreen';

function SimulatedBackendLoadingScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 1;
      });
    }, 70);

    return () => clearInterval(timer);
  }, []);

  return (
    <StudyFlowScreen
      mode="loading"
      totalPages={3}
      currentPage={1}
      progress={progress}
    />
  );
}

const meta = {
  title: 'Study/OCR Loading Screen',
  component: StudyFlowScreen,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, minHeight: 900 }}>
        <Story />
      </View>
    ),
  ],
  args: {
    mode: 'loading',
    totalPages: 3,
    currentPage: 1,
    progress: 0,
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof StudyFlowScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AutoAnimating: Story = {
  render: () => <SimulatedBackendLoadingScreen />,
};

export const MidProgress: Story = {
  args: {
    progress: 56,
  },
};

export const NearComplete: Story = {
  args: {
    progress: 88,
  },
};
