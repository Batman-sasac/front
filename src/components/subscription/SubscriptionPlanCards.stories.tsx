import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React from 'react';
import { View } from 'react-native';

import SubscriptionPlanCards from './SubscriptionPlanCards';
import SubscriptionUsageCard from './SubscriptionUsageCard';
import { figmaScale, subscriptionColors } from '../../styles/subscriptionStyles';

const desktopLayout = {
  rowWidth: figmaScale(928),
  rowGap: figmaScale(32),
  cardWidth: figmaScale(448),
  freeCardHeight: figmaScale(480),
  premiumCardHeight: figmaScale(544),
};

const meta = {
  title: 'Subscription/Plan Cards',
  component: SubscriptionPlanCards,
  decorators: [
    (Story, context) => {
      const limitReached = Boolean(context.args.limitReached);
      const pagesUsed = limitReached ? 50 : 30;
      const progressColor = limitReached ? subscriptionColors.red : subscriptionColors.blue;

      return (
        <View
          style={{
            minHeight: 834,
            backgroundColor: subscriptionColors.screenBg,
            alignItems: 'center',
            paddingHorizontal: figmaScale(58),
            paddingTop: figmaScale(31),
          }}
        >
          <View style={{ width: '100%', maxWidth: figmaScale(1078) }}>
            <SubscriptionUsageCard
              pagesUsed={pagesUsed}
              pagesLimit={50}
              limitReached={limitReached}
              progress={limitReached ? 1 : 0.6}
              progressColor={progressColor}
            />
          </View>
          <Story />
        </View>
      );
    },
  ],
  args: {
    isCompact: false,
    layout: desktopLayout,
    resolvedSubscribed: false,
    limitReached: false,
    planBorderColor: subscriptionColors.primaryBlue,
    onFreePress: () => {},
    onSubscribe: () => {},
    isProcessing: false,
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SubscriptionPlanCards>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FreeUser: Story = {};

export const LimitReached: Story = {
  args: {
    limitReached: true,
    planBorderColor: subscriptionColors.red,
  },
};

export const Subscribed: Story = {
  args: {
    resolvedSubscribed: true,
  },
};

export const Compact: Story = {
  args: {
    isCompact: true,
    layout: {
      rowWidth: figmaScale(402),
      rowGap: figmaScale(32),
      cardWidth: figmaScale(402),
      freeCardHeight: Math.round(figmaScale(402) * (480 / 448)),
      premiumCardHeight: Math.round(figmaScale(402) * (544 / 448)),
    },
  },
};
