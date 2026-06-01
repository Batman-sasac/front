// src/screens/alarm/AlarmScreen.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { scale, fontScale } from '../../lib/layout';
import AlarmHeader from '../../components/alarm/AlarmHeader';
import AlarmNotificationCard from '../../components/alarm/AlarmNotificationCard';

type Screen = 'home' | 'league' | 'alarm' | 'alarmSetting';

type Props = {
    onNavigate: (screen: Screen) => void;
};

/** 알림 타입 */
type AlarmType = 'review' | 'league';

/** 알림 한 건 */
type AlarmItem = {
    id: string;
    type: AlarmType;
    title: string;
    description: string;
    timeLabel: string; // "7:30 PM" 같은 표시용
    read: boolean;
};

/** 날짜별로 묶은 알림 리스트 */
type AlarmSection = {
    dateLabel: string; // "2025. 11. 17"
    items: AlarmItem[];
};

// 
const initialAlarms: AlarmSection[] = [];

const BG = '#F6F7FB';

export default function AlarmScreen({ onNavigate }: Props) {
    const [sections] = useState<AlarmSection[]>(initialAlarms);

    return (
        <View style={styles.root}>
            <AlarmHeader
                title="알림함"
                onBack={() => onNavigate('home')}
                onSettingPress={() => onNavigate('alarmSetting')}
            />

            {/* 알림 리스트 */}
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
            >
                {sections.map((section) => (
                    <View key={section.dateLabel} style={styles.section}>
                        {/* 날짜 표시 */}
                        <Text style={styles.sectionDate}>{section.dateLabel}</Text>

                        {/* 알림 카드 */}
                        {section.items.map((alarm) => (
                            <AlarmNotificationCard
                                key={alarm.id}
                                alarm={alarm}
                                onPress={() => {
                                    // TODO: 알림 클릭 시 동작/화면 전환
                                    console.log('알림 클릭:', alarm.id);
                                }}
                            />
                        ))}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BG,
    },

    /* 스크롤 영역 */
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: scale(32),
        paddingBottom: scale(24),
    },

    section: {
        marginTop: scale(16),
    },
    sectionDate: {
        fontSize: fontScale(12),
        color: '#9CA3AF',
        marginBottom: scale(8),
    },

});
