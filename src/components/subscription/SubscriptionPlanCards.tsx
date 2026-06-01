import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { figmaFontScale, figmaScale, subscriptionColors, subscriptionShadow } from '../../styles/subscriptionStyles';
import SubscriptionBadge from './SubscriptionBadge';
import SubscriptionButton from './SubscriptionButton';

type PlanLayout = {
    rowWidth: number;
    rowGap: number;
    cardWidth: number;
    freeCardHeight: number;
    premiumCardHeight: number;
};

type Props = {
    isCompact: boolean;
    layout: PlanLayout;
    resolvedSubscribed: boolean;
    limitReached: boolean;
    planBorderColor: string;
    onFreePress: () => void;
    onSubscribe: () => void;
};

export default function SubscriptionPlanCards({
    isCompact,
    layout,
    resolvedSubscribed,
    limitReached,
    planBorderColor,
    onFreePress,
    onSubscribe,
}: Props) {
    const rowDynamicStyle: StyleProp<ViewStyle> = !isCompact
        ? { maxWidth: layout.rowWidth, gap: layout.rowGap }
        : null;
    const freeCardDynamicStyle: StyleProp<ViewStyle> = !isCompact
        ? { width: layout.cardWidth, minHeight: layout.freeCardHeight }
        : null;
    const premiumCardDynamicStyle: StyleProp<ViewStyle> = !isCompact
        ? { width: layout.cardWidth, minHeight: layout.premiumCardHeight }
        : null;

    return (
        <View
            style={[
                styles.planRow,
                rowDynamicStyle,
                isCompact && styles.planRowCompact,
            ]}
        >
            <View
                style={[
                    styles.planCard,
                    freeCardDynamicStyle,
                    isCompact && styles.planCardCompact,
                ]}
            >
                <Text style={styles.planTitle}>무료 플랜</Text>
                <Text style={styles.planBullet}>• 총 50회 무료 사용</Text>
                <Text style={styles.planBullet}>• 기간 제한 없음</Text>
                <Text style={styles.planBullet}>• 카드 등록 없이 사용 가능</Text>

                <View style={[styles.planBottom, styles.planBottomFree]}>
                    <View style={styles.planBtnWrap}>
                        <SubscriptionButton
                            variant="muted"
                            onPress={onFreePress}
                            disabled={!resolvedSubscribed}
                        >
                            {resolvedSubscribed ? '구독 취소' : '현재 플랜'}
                        </SubscriptionButton>
                    </View>
                </View>
            </View>

            <View
                style={[
                    styles.planCard,
                    premiumCardDynamicStyle,
                    isCompact && styles.planCardCompact,
                    styles.premiumCard,
                    { borderColor: planBorderColor },
                ]}
            >
                <View style={styles.badgeWrap}>
                    {resolvedSubscribed ? (
                        <SubscriptionBadge label="현재 플랜" />
                    ) : limitReached ? (
                        <SubscriptionBadge
                            label="학습을 위해 프리미엄 구독이 필요해요!"
                            style={[styles.limitBadge, { backgroundColor: planBorderColor }]}
                        />
                    ) : (
                        <SubscriptionBadge label="추천 플랜" />
                    )}
                </View>

                <Text style={styles.planTitle}>프리미엄 플랜</Text>
                <Text style={styles.planBullet}>• 월 1,000회 호출 제공</Text>
                <Text style={styles.planBullet}>• 매월 자동 갱신</Text>
                <Text style={styles.planBullet}>• 월 단위 사용량 초기화 (이월 없음)</Text>

                <View style={styles.coffeeWrap}>
                    <Text style={styles.coffeeMain}>
                        <Text style={styles.coffeeStrong}>커피 한 잔</Text>
                        <Text> 값으로 </Text>
                        <Text style={styles.coffeeStrong}>한 달</Text>
                        <Text> 동안</Text>
                    </Text>
                    <Text style={styles.coffeeSub}>마음껏 학습할 수 있어요!</Text>
                    <Text style={styles.coffeeEmoji}>☕</Text>
                </View>

                <View style={[styles.planBottom, styles.planBottomPremium]}>
                    <View style={styles.planBtnWrap}>
                        {resolvedSubscribed ? (
                            <SubscriptionButton onPress={onSubscribe}>
                                결제수단 관리하기
                            </SubscriptionButton>
                        ) : (
                            <SubscriptionButton
                                variant={limitReached ? 'danger' : 'primary'}
                                onPress={onSubscribe}
                            >
                                월 4,800원 구독하기
                            </SubscriptionButton>
                        )}
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    planRow: {
        width: '100%',
        alignSelf: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: figmaScale(32),
    },
    planRowCompact: {
        flexDirection: 'column',
        alignItems: 'stretch',
    },
    planCard: {
        width: '100%',
        minHeight: figmaScale(480),
        backgroundColor: subscriptionColors.cardBg,
        borderRadius: figmaScale(24),
        paddingHorizontal: figmaScale(24),
        paddingVertical: figmaScale(24),
        borderWidth: 1,
        borderColor: 'transparent',
        justifyContent: 'space-between',
        ...subscriptionShadow,
    },
    planCardCompact: {
        minHeight: figmaScale(480),
    },
    premiumCard: {
        borderWidth: 4,
        alignItems: 'center',
        paddingVertical: figmaScale(32),
    },
    planTitle: {
        width: '100%',
        fontSize: figmaFontScale(36),
        lineHeight: figmaFontScale(54),
        fontWeight: '700',
        color: subscriptionColors.black,
        marginBottom: figmaScale(16),
    },
    planBullet: {
        width: '100%',
        fontSize: figmaFontScale(24),
        lineHeight: figmaFontScale(36),
        color: subscriptionColors.grey700,
        fontWeight: '500',
        marginBottom: figmaScale(8),
    },
    planBottom: {
        paddingTop: figmaScale(12),
    },
    planBottomFree: {
        marginTop: 'auto',
    },
    planBottomPremium: {
        marginTop: 'auto',
        paddingTop: figmaScale(14),
        alignItems: 'center',
    },
    planBtnWrap: {
        width: figmaScale(400),
        alignSelf: 'center',
    },
    badgeWrap: {
        position: 'absolute',
        top: figmaScale(-24),
        right: figmaScale(24),
        zIndex: 2,
    },
    limitBadge: {
        minWidth: figmaScale(420),
    },
    coffeeWrap: {
        minHeight: figmaScale(133),
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: figmaScale(22),
        marginBottom: figmaScale(8),
        paddingHorizontal: figmaScale(4),
    },
    coffeeMain: {
        fontSize: figmaFontScale(20),
        lineHeight: figmaFontScale(30),
        fontWeight: '500',
        color: subscriptionColors.grey600,
        textAlign: 'center',
    },
    coffeeStrong: {
        fontSize: figmaFontScale(24),
        lineHeight: figmaFontScale(36),
        fontWeight: '700',
    },
    coffeeSub: {
        fontSize: figmaFontScale(20),
        lineHeight: figmaFontScale(30),
        fontWeight: '500',
        color: subscriptionColors.grey600,
        textAlign: 'center',
    },
    coffeeEmoji: {
        fontSize: figmaFontScale(42),
        lineHeight: figmaFontScale(60),
        marginTop: figmaScale(8),
    },
});
