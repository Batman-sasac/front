import React, { useEffect, useMemo, useState } from 'react';
import {
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { fontScale, scale } from '../../lib/layout';
import { getOcrUsage, OcrUsageResponse } from '../../api/ocr';

type Props = {
    isSubscribed: boolean;
    ocrUsage: OcrUsageResponse | null;
    onBack: () => void;
    onSubscribe: () => void;
    onCancelSubscribe: () => void;
};

const BG = '#EEF0F5';
const CARD_BG = '#F7F7FA';
const BAR_BG = '#D2D2D4';
const BLUE = '#92A6FF';
const RED = '#D90054';

export default function SubscribeScreen({ isSubscribed, ocrUsage, onBack, onSubscribe, onCancelSubscribe }: Props) {
    const { width: windowWidth } = useWindowDimensions();
    const isCompact = windowWidth < 900;
    const [usage, setUsage] = useState<OcrUsageResponse | null>(ocrUsage);
    const [showCancelModal, setShowCancelModal] = useState(false);

    useEffect(() => {
        setUsage(ocrUsage);
    }, [ocrUsage]);

    useEffect(() => {
        if (ocrUsage) return;
        let cancelled = false;

        const loadUsage = async () => {
            try {
                const next = await getOcrUsage();
                if (!cancelled) setUsage(next);
            } catch {
                // ignore
            }
        };

        loadUsage();
        return () => {
            cancelled = true;
        };
    }, [ocrUsage]);

    const inferredSubscribed = usage?.pages_limit != null ? usage.pages_limit > 50 : null;
    const resolvedSubscribed = inferredSubscribed == null ? isSubscribed : inferredSubscribed;

    const pagesLimit = Math.max(usage?.pages_limit ?? (resolvedSubscribed ? 1000 : 50), 1);
    const pagesUsed = Math.max(usage?.pages_used ?? 0, 0);
    const remaining = usage?.remaining ?? Math.max(0, pagesLimit - pagesUsed);
    const limitReached = remaining <= 0 || usage?.status === 'limit_reached';

    const progress = useMemo(() => {
        const ratio = pagesUsed / pagesLimit;
        if (limitReached) return 1;
        return Math.max(0, Math.min(1, ratio));
    }, [pagesUsed, pagesLimit, limitReached]);

    const planBorderColor = !resolvedSubscribed && limitReached ? RED : BLUE;
    const progressColor = limitReached ? RED : BLUE;
    const layout = useMemo(() => {
        const rowMaxWidth = 928;
        const rowGap = Math.min(28, Math.max(16, windowWidth * 0.02));
        const contentWidth = Math.max(320, windowWidth - scale(28));
        const rowWidth = Math.min(contentWidth, rowMaxWidth);
        const cardWidth = Math.min(448, Math.max(300, (rowWidth - rowGap) / 2));
        const freeCardHeight = Math.round(cardWidth * (480 / 448));
        const premiumCardHeight = Math.round(cardWidth * (544 / 448));
        return { rowWidth, rowGap, cardWidth, freeCardHeight, premiumCardHeight };
    }, [windowWidth]);

    return (
        <View style={styles.root}>
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
                    <Image source={require('../../../assets/shift.png')} style={styles.backIcon} resizeMode="contain" />
                </Pressable>
                <Text style={styles.headerTitle}>구독 관리</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.usageCard}>
                    <Text style={styles.usageTitle}>AI 호출 사용량</Text>
                    <Text style={[styles.usageValue, limitReached && { color: RED }]}>{pagesUsed}/{pagesLimit}</Text>

                    <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${progress * 100}%`, backgroundColor: progressColor }]} />
                    </View>
                </View>

                <View
                    style={[
                        styles.planRow,
                        !isCompact && { maxWidth: layout.rowWidth, gap: layout.rowGap },
                        isCompact && styles.planRowCompact,
                    ]}
                >
                    <View
                        style={[
                            styles.planCard,
                            !isCompact && { width: layout.cardWidth, minHeight: layout.freeCardHeight },
                            isCompact && styles.planCardCompact,
                        ]}
                    >
                        <Text style={styles.planTitle}>무료 플랜</Text>
                        <Text style={styles.planBullet}>• 총 50회 무료 사용</Text>
                        <Text style={styles.planBullet}>• 기간 제한 없음</Text>
                        <Text style={styles.planBullet}>• 카드 등록 없이 사용 가능</Text>

                        <View style={[styles.planBottom, styles.planBottomFree]}>
                            <Pressable
                                style={styles.planBtnWrap}
                                onPress={() => {
                                    if (resolvedSubscribed) setShowCancelModal(true);
                                }}
                            >
                                <Image
                                    source={
                                        resolvedSubscribed
                                            ? require('../../../assets/subscribe/subscribe-cancel.png')
                                            : require('../../../assets/subscribe/freeplan.png')
                                    }
                                    style={styles.planBtnImg}
                                    resizeMode="stretch"
                                />
                            </Pressable>
                        </View>
                    </View>

                    <View
                        style={[
                            styles.planCard,
                            !isCompact && { width: layout.cardWidth, minHeight: layout.premiumCardHeight },
                            isCompact && styles.planCardCompact,
                            styles.premiumCard,
                            { borderColor: planBorderColor },
                        ]}
                    >
                        <View style={styles.badgeWrap}>
                            {resolvedSubscribed ? (
                                <View style={[styles.currentBadge, { backgroundColor: BLUE }]}> 
                                    <Text style={styles.currentBadgeText}>현재 플랜</Text>
                                </View>
                            ) : limitReached ? (
                                <Image source={require('../../../assets/subscribe/need-subscribe.png')} style={styles.badgeImageWide} resizeMode="contain" />
                            ) : (
                                <Image source={require('../../../assets/subscribe/recommend-plan.png')} style={styles.badgeImage} resizeMode="contain" />
                            )}
                        </View>

                        <Text style={styles.planTitle}>프리미엄 플랜</Text>
                        <Text style={styles.planBullet}>• 월 1,000회 호출 제공</Text>
                        <Text style={styles.planBullet}>• 매월 자동 갱신</Text>
                        <Text style={styles.planBullet}>• 월 단위 사용량 초기화 (이월 없음)</Text>

                        <View style={styles.coffeeWrap}>
                            <Text style={styles.coffeeMain}>커피 두 잔 값으로 한 달 동안</Text>
                            <Text style={styles.coffeeSub}>마음껏 학습할 수 있어요!</Text>
                            <Text style={styles.coffeeEmoji}>☕ ☕</Text>
                        </View>

                        <View style={[styles.planBottom, styles.planBottomPremium]}>
                            <Pressable style={styles.planBtnWrap} onPress={onSubscribe}>
                                {resolvedSubscribed ? (
                                    <View style={styles.manageBtn}>
                                        <Text style={styles.manageBtnText}>결제수단 관리하기</Text>
                                    </View>
                                ) : (
                                    <Image
                                        source={require('../../../assets/subscribe/subscribe.png')}
                                        style={styles.planBtnImg}
                                        resizeMode="stretch"
                                    />
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <Modal visible={showCancelModal} transparent animationType="fade" onRequestClose={() => setShowCancelModal(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>구독 취소</Text>
                            <Pressable onPress={() => setShowCancelModal(false)}>
                                <Image source={require('../../../assets/subscribe/close.png')} style={styles.modalCloseIcon} resizeMode="contain" />
                            </Pressable>
                        </View>

                        <View style={styles.modalBody}>
                            <Image source={require('../../../assets/error/bat-error.png')} style={styles.modalBat} resizeMode="contain" />
                            <Text style={styles.modalDesc}>구독을 취소하면 AI와 함께하는 학습은 여기까지예요.</Text>
                            <Text style={styles.modalDesc}>이번 달 남은 사용량은 취소 후에도</Text>
                            <Text style={styles.modalDesc}>사용하실 수 있어요.</Text>
                            <Text style={styles.modalStrong}>정말 구독을 취소하시겠어요?</Text>
                        </View>

                        <View style={styles.modalButtons}>
                            <Pressable style={styles.modalBtnWrap} onPress={() => setShowCancelModal(false)}>
                                <Image source={require('../../../assets/subscribe/real-cancel.png')} style={styles.modalBtnImg} resizeMode="stretch" />
                            </Pressable>
                            <Pressable
                                style={styles.modalBtnWrap}
                                onPress={() => {
                                    setShowCancelModal(false);
                                    onCancelSubscribe();
                                }}
                            >
                                <Image source={require('../../../assets/subscribe/subscribe-cancel.png')} style={styles.modalBtnImg} resizeMode="stretch" />
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BG,
    },
    header: {
        height: scale(72),
        paddingHorizontal: scale(16),
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backBtn: {
        width: scale(36),
        height: scale(36),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(10),
    },
    backIcon: {
        width: scale(18),
        height: scale(18),
        transform: [{ rotate: '180deg' }],
    },
    headerTitle: {
        fontSize: fontScale(22),
        fontWeight: '900',
        color: '#12131A',
    },
    scrollContent: {
        paddingHorizontal: scale(14),
        paddingVertical: scale(10),
        paddingBottom: scale(28),
    },

    usageCard: {
        backgroundColor: CARD_BG,
        borderRadius: scale(14),
        paddingHorizontal: scale(16),
        paddingVertical: scale(14),
        marginBottom: scale(20),
    },
    usageTitle: {
        fontSize: fontScale(16),
        color: '#666872',
        fontWeight: '700',
    },
    usageValue: {
        fontSize: fontScale(46),
        color: '#1C1E27',
        fontWeight: '900',
        lineHeight: fontScale(54),
        marginTop: scale(2),
        marginBottom: scale(8),
    },
    barTrack: {
        height: scale(24),
        borderRadius: scale(999),
        backgroundColor: BAR_BG,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: scale(999),
    },

    planRow: {
        width: '100%',
        alignSelf: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: scale(14),
    },
    planRowCompact: {
        flexDirection: 'column',
        alignItems: 'stretch',
    },
    planCard: {
        width: '100%',
        minHeight: scale(420),
        backgroundColor: CARD_BG,
        borderRadius: scale(14),
        paddingHorizontal: scale(20),
        paddingVertical: scale(24),
        borderWidth: 1,
        borderColor: 'transparent',
    },
    planCardCompact: {
        minHeight: scale(340),
    },
    premiumCard: {
        borderWidth: 4,
    },
    planTitle: {
        fontSize: fontScale(26),
        fontWeight: '900',
        color: '#11131A',
        marginBottom: scale(12),
    },
    planBullet: {
        fontSize: fontScale(18),
        color: '#2B2D37',
        fontWeight: '700',
        marginBottom: scale(12),
    },
    planBottom: {
        paddingTop: scale(12),
    },
    planBottomFree: {
        marginTop: 'auto',
    },
    planBottomPremium: {
        marginTop: 'auto',
        paddingTop: scale(14),
        alignItems: 'center',
    },
    planBtnWrap: {
        width: '100%',
        maxWidth: scale(400),
        alignSelf: 'center',
    },
    planBtnImg: {
        width: '100%',
        height: scale(64),
    },

    badgeWrap: {
        position: 'absolute',
        top: scale(-14),
        right: scale(16),
        zIndex: 2,
    },
    badgeImage: {
        width: scale(106),
        height: scale(44),
    },
    badgeImageWide: {
        width: scale(206),
        height: scale(44),
    },
    currentBadge: {
        height: scale(44),
        paddingHorizontal: scale(20),
        borderRadius: scale(22),
        alignItems: 'center',
        justifyContent: 'center',
    },
    currentBadgeText: {
        color: '#FFFFFF',
        fontSize: fontScale(14),
        fontWeight: '900',
    },

    coffeeWrap: {
        width: scale(243),
        minHeight: scale(133),
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: scale(22),
        marginBottom: scale(8),
        paddingHorizontal: scale(4),
    },
    coffeeMain: {
        fontSize: fontScale(16),
        fontWeight: '900',
        color: '#373A46',
        textAlign: 'center',
    },
    coffeeSub: {
        fontSize: fontScale(15),
        fontWeight: '700',
        color: '#373A46',
        marginTop: scale(2),
        textAlign: 'center',
    },
    coffeeEmoji: {
        fontSize: fontScale(40),
        marginTop: scale(6),
    },

    manageBtn: {
        width: '100%',
        height: scale(64),
        borderRadius: scale(12),
        backgroundColor: '#5C86F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    manageBtnText: {
        color: '#FFFFFF',
        fontSize: fontScale(18),
        fontWeight: '900',
    },

    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(14),
    },
    modalCard: {
        width: '100%',
        maxWidth: scale(520),
        backgroundColor: '#F8F8FA',
        borderRadius: scale(20),
        overflow: 'hidden',
    },
    modalHeader: {
        height: scale(72),
        borderBottomWidth: 1,
        borderBottomColor: '#D7DAE3',
        paddingHorizontal: scale(16),
        alignItems: 'center',
        justifyContent: 'space-between',
        flexDirection: 'row',
    },
    modalTitle: {
        fontSize: fontScale(22),
        fontWeight: '800',
        color: '#111218',
    },
    modalCloseIcon: {
        width: scale(34),
        height: scale(34),
    },
    modalBody: {
        alignItems: 'center',
        paddingHorizontal: scale(16),
        paddingTop: scale(16),
        paddingBottom: scale(8),
    },
    modalBat: {
        width: scale(180),
        height: scale(150),
        marginBottom: scale(8),
    },
    modalDesc: {
        fontSize: fontScale(12),
        fontWeight: '700',
        color: '#11131A',
        textAlign: 'center',
        lineHeight: fontScale(20),
    },
    modalStrong: {
        marginTop: scale(10),
        fontSize: fontScale(18),
        fontWeight: '900',
        color: '#11131A',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: scale(8),
        paddingHorizontal: scale(16),
        paddingBottom: scale(16),
    },
    modalBtnWrap: {
        flex: 1,
    },
    modalBtnImg: {
        width: '100%',
        height: scale(54),
    },
});
