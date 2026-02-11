// src/screens/alarm/AlarmScreen.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Image,
    ScrollView,
} from 'react-native';
import { scale, fontScale } from '../../lib/layout';

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
    // ?섏쨷?먮뒗 諛깆뿏?쒖뿉??諛쏆븘?ㅻ㈃ ?? 吏湲덉? ?붾?濡??곹깭留??곌껐.
    const [sections] = useState<AlarmSection[]>(initialAlarms);

    return (
        <View style={styles.root}>
            {/* ?곷떒諛?*/}
            <View style={styles.header}>
                {/* ?쇱そ: < 踰꾪듉 (?덉쑝濡? */}
                <Pressable
                    style={styles.backButton}
                    onPress={() => onNavigate('home')}
                >
                    <Text style={styles.backIcon}>{'<'}</Text>
                </Pressable>

                {/* 媛?대뜲: ??댄? */}
                <Text style={styles.headerTitle}>알림함</Text>

                {/* ?ㅻⅨ履? ?뚮┝ ?ㅼ젙 踰꾪듉 */}
                <Pressable
                    style={styles.settingButton}
                    onPress={() => onNavigate('alarmSetting')}  // ???ш린留??섏젙
                >
                    <Image
                        source={require('../../../assets/alarm/alarm-setting.png')}
                        style={styles.settingIcon}
                        resizeMode="contain"
                    />
                </Pressable>

            </View>

            {/* ?뚮┝ 由ъ뒪??*/}
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
            >
                {sections.map((section) => (
                    <View key={section.dateLabel} style={styles.section}>
                        {/* ?좎쭨 ?쇰꺼 */}
                        <Text style={styles.sectionDate}>{section.dateLabel}</Text>

                        {/* 移대뱶??*/}
                        {section.items.map((alarm) => (
                            <Pressable
                                key={alarm.id}
                                style={[
                                    styles.card,
                                    alarm.read && styles.cardRead, // ?쎌? ?뚮┝? ?먮━寃?
                                ]}
                                onPress={() => {
                                    // TODO: ?뚮┝ ?뚮??????대룞/?곸꽭 泥섎━
                                    console.log('?뚮┝ ?대┃:', alarm.id);
                                }}
                            >
                                <View style={styles.cardLeft}>
                                    <Text
                                        style={[
                                            styles.cardTitle,
                                            alarm.read && styles.cardTitleRead,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {alarm.title}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.cardDesc,
                                            alarm.read && styles.cardDescRead,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {alarm.description}
                                    </Text>
                                </View>

                                <View style={styles.cardRight}>
                                    <Text style={styles.cardTime}>{alarm.timeLabel}</Text>
                                    <Image
                                        source={require('../../../assets/shift.png')}
                                        style={styles.cardArrowImage}
                                        resizeMode="contain"
                                    />
                                </View>
                            </Pressable>
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

    /* ?곷떒諛?*/
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(32),
        paddingTop: scale(20),
        paddingBottom: scale(16),
        backgroundColor: '#FFFFFF',
    },
    backButton: {
        paddingVertical: scale(4),
        paddingRight: scale(16),
        paddingLeft: 0,
    },
    backIcon: {
        fontSize: fontScale(22),
        fontWeight: '700',
    },
    headerTitle: {
        flex: 1,
        fontSize: fontScale(20),
        fontWeight: '800',
    },
    settingButton: {
        paddingHorizontal: scale(4),
        paddingVertical: scale(4),
    },
    settingIcon: {
        width: scale(24),
        height: scale(24),
    },

    /* 由ъ뒪??*/
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

    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: scale(20),
        paddingVertical: scale(18),
        paddingHorizontal: scale(20),
        marginBottom: scale(8),
        elevation: 2,
    },
    cardRead: {
        backgroundColor: '#EEF0F4',
    },
    cardLeft: {
        flex: 1,
    },
    cardTitle: {
        fontSize: fontScale(16),
        fontWeight: '800',
        marginBottom: scale(4),
    },
    cardTitleRead: {
        color: '#9CA3AF',
    },
    cardDesc: {
        fontSize: fontScale(13),
        color: '#6B7280',
    },
    cardDescRead: {
        color: '#9CA3AF',
    },

    cardRight: {
        marginLeft: scale(12),
        alignItems: 'flex-end',
    },
    cardTime: {
        fontSize: fontScale(12),
        color: '#6B7280',
        marginBottom: scale(8),
    },
    cardArrowImage: {
        width: scale(18),
        height: scale(18),
        tintColor: '#9CA3AF',
    },
});

