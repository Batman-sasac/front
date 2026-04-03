import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React from 'react';
import { View } from 'react-native';

import RewardSpeechBubble from './RewardSpeechBubble';

const meta = {
  title: 'Reward/Reward Speech Bubble',
  component: RewardSpeechBubble,
  decorators: [
    (Story) => (
      <View
        style={{
          flex: 1,
          minHeight: 700,
          backgroundColor: '#DDE4F1',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
          overflow: 'visible',
        }}
      >
        <View
          style={{
            position: 'relative',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'visible',
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: '58%',
              width: 176,
              height: 92,
              borderRadius: 999,
              backgroundColor: '#C9D4E7',
            }}
          />
          <Story />
        </View>
      </View>
    ),
  ],
  args: {
    width: '42%',
    title: '축하합니다!',
    messageTop: '출석 보상으로',
    highlightText: '10XP',
    messageBottom: '를 획득했어요!',
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof RewardSpeechBubble>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const StudyComplete: Story = {
  args: {
    messageTop: '학습을 완료하여',
    highlightText: '24XP',
  },
};

export const StreakReward: Story = {
  args: {
    messageTop: '연속 학습 보상으로',
    highlightText: '15XP',
    highlightStyle: { color: '#FF6B2C' },
  },
};
