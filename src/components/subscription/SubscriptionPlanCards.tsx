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
    onProPress: () => void;
    onCouponPress: () => void;
    isProcessing: boolean;
};

export default function SubscriptionPlanCards({
    isCompact,
    layout,
    resolvedSubscribed,
    limitReached,
    planBorderColor,
    onFreePress,
    onSubscribe,
    onProPress,
    onCouponPress,
    isProcessing,
}: Props) {
    const rowDynamicStyle: StyleProp<ViewStyle> = !isCompact
        ? { maxWidth: layout.rowWidth, gap: layout.rowGap }
        : null;
    const freeCardDynamicStyle: StyleProp<ViewStyle> = !isCompact
        ? { width: layout.cardWidth, minHeight: layout.freeCardHeight }
        : null;
    const paidCardDynamicStyle: StyleProp<ViewStyle> = !isCompact
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
                <Text style={styles.planBullet}>• 총 20회 무료 사용</Text>
                <Text style={styles.planBullet}>• 기간 제한 없음</Text>
                <Text style={styles.planBullet}>• 카드 등록 없이 사용 가능</Text>

                <View style={[styles.planBottom, styles.planBottomFree]}>
                    <View style={styles.planBtnWrap}>
                        <SubscriptionButton
                            variant="muted"
                            onPress={onFreePress}
                            disabled={!resolvedSubscribed || isProcessing}
                        >
                            {resolvedSubscribed ? '구독 취소' : '현재 플랜'}
                        </SubscriptionButton>
                        {!resolvedSubscribed && limitReached ? (
                            <SubscriptionButton
                                variant="secondary"
                                onPress={onCouponPress}
                                disabled={isProcessing}
                                style={styles.couponButton}
                            >
                                쿠폰 입력
                            </SubscriptionButton>
                        ) : null}
                    </View>
                </View>
            </View>

            <View
                style={[
                    styles.planCard,
                    paidCardDynamicStyle,
                    isCompact && styles.planCardCompact,
                    styles.paidCard,
                    styles.featuredCard,
                    { borderColor: planBorderColor },
                ]}
            >
                <View style={styles.badgeWrap}>
                    {resolvedSubscribed ? (
                        <SubscriptionBadge label="현재 플랜" />
                    ) : limitReached ? (
                        <SubscriptionBadge
                            label="사용량을 모두 소진했어요"
                            style={[styles.limitBadge, { backgroundColor: planBorderColor }]}
                        />
                    ) : (
                        <SubscriptionBadge label="추천 플랜" />
                    )}
                </View>

                <Text style={styles.planTitle}>Basic 플랜</Text>
                <Text style={styles.planPrice}>월 4,900원</Text>
                <Text style={styles.planBullet}>• 월 100회 사용</Text>
                <Text style={styles.planBullet}>• 매월 자동 갱신</Text>
                <Text style={styles.planBullet}>• 월 단위 사용량 초기화 (이월 없음)</Text>

                <View style={[styles.planBottom, styles.planBottomPremium]}>
                    <View style={styles.planBtnWrap}>
                        {resolvedSubscribed ? (
                            <SubscriptionButton onPress={onSubscribe} disabled={isProcessing}>
                                결제수단 관리하기
                            </SubscriptionButton>
                        ) : (
                            <SubscriptionButton
                                variant={limitReached ? 'danger' : 'primary'}
                                onPress={onSubscribe}
                                disabled={isProcessing}
                            >
                                {isProcessing ? '결제 진행 중...' : 'Basic 구독하기'}
                            </SubscriptionButton>
                        )}
                        {limitReached ? (
                            <SubscriptionButton
                                variant="secondary"
                                onPress={onCouponPress}
                                disabled={isProcessing}
                                style={styles.couponButton}
                            >
                                쿠폰 입력
                            </SubscriptionButton>
                        ) : null}
                    </View>
                </View>
            </View>

            <View
                style={[
                    styles.planCard,
                    paidCardDynamicStyle,
                    isCompact && styles.planCardCompact,
                    styles.paidCard,
                ]}
            >
                <View style={styles.badgeWrap}>
                    <SubscriptionBadge label="가장 넉넉한 플랜" />
                </View>

                <Text style={styles.planTitle}>Pro 플랜</Text>
                <Text style={styles.planPrice}>월 9,900원</Text>
                <Text style={styles.planBullet}>• 월 250회 사용</Text>
                <Text style={styles.planBullet}>• 매월 자동 갱신</Text>
                <Text style={styles.planBullet}>• 월 단위 사용량 초기화 (이월 없음)</Text>

                <View style={[styles.planBottom, styles.planBottomPremium]}>
                    <View style={styles.planBtnWrap}>
                        <SubscriptionButton onPress={onProPress} disabled={isProcessing}>
                            Pro 구독하기
                        </SubscriptionButton>
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
    paidCard: {
        alignItems: 'center',
        paddingVertical: figmaScale(32),
    },
    featuredCard: {
        borderWidth: 4,
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
    planPrice: {
        width: '100%',
        marginBottom: figmaScale(18),
        color: subscriptionColors.primaryBlue,
        fontSize: figmaFontScale(28),
        lineHeight: figmaFontScale(40),
        fontWeight: '800',
    },
    planBottom: {
        width: '100%',
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
        width: '100%',
        alignSelf: 'center',
    },
    couponButton: {
        marginTop: figmaScale(12),
    },
    badgeWrap: {
        position: 'absolute',
        top: figmaScale(-24),
        right: figmaScale(24),
        zIndex: 2,
    },
    limitBadge: {
        minWidth: figmaScale(250),
    },
});
