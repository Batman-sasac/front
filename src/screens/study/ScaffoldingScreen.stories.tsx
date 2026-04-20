import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React from 'react';
import { View } from 'react-native';

import ScaffoldingScreen from './ScaffoldingScreen';
import {
    centeredTitleFixture,
    tableLayoutFixture,
} from './ocr-layout-fixtures';

const meta = {
    title: 'Study/Scaffolding Screen',
    component: ScaffoldingScreen,
    decorators: [
        (Story) => (
            <View style={{ flex: 1, minHeight: 1200, backgroundColor: '#F6F7FB' }}>
                <Story />
            </View>
        ),
    ],
    args: {
        onBack: () => undefined,
        onRetry: () => undefined,
        onSave: async () => ({ earnedXp: 0, totalEarnedXp: 0 }),
        sources: [],
        selectedIndex: 0,
        loading: false,
        error: null,
        initialRound: '1-1',
        currentStudyIndex: 0,
        totalStudyCount: 1,
        accumulatedEarnedXp: 0,
    },
    parameters: {
        layout: 'fullscreen',
    },
} satisfies Meta<typeof ScaffoldingScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TableDocumentRound1: Story = {
    args: {
        payload: tableLayoutFixture,
        initialRound: '1-1',
    },
};

export const TableDocumentRound2: Story = {
    args: {
        payload: tableLayoutFixture,
        initialRound: '2-1',
    },
};

export const CenteredTitleRound1: Story = {
    args: {
        payload: centeredTitleFixture,
        initialRound: '1-1',
    },
};
