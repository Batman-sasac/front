import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React from 'react';
import { View } from 'react-native';

import StudyFlowScreen from './StudyFlowScreen';

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

export const AutoAnimating: Story = {};

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
