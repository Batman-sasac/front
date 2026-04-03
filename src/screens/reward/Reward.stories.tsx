import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React from 'react';
import { View } from 'react-native';

import RewardScreen from './Reward';

const meta = {
  title: 'Reward/Reward Screen',
  component: RewardScreen,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, minHeight: 900 }}>
        <Story />
      </View>
    ),
  ],
  args: {
    type: 'attendance',
    xp: 10,
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof RewardScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Attendance: Story = {};

export const StudyComplete: Story = {
  args: {
    type: 'studyComplete',
    xp: 24,
  },
};

export const ReviewComplete: Story = {
  args: {
    type: 'reviewComplete',
    xp: 18,
  },
};

export const RandomBonus: Story = {
  args: {
    type: 'randomBonus',
    xp: 12,
  },
};
