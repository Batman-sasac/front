import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Modal, ActivityIndicator } from 'react-native';
import { scale, fontScale } from '../../lib/layout';
import Sidebar from '../../components/Sidebar';
import Constants from 'expo-constants';
import { getToken } from '../../lib/storage';
import type { Screen } from '../../components/Sidebar';

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:8000';

type Subject = {
    id: string;
    icon: string;
    name: string;
    emoji: string;
};

export type Card = {
    id: string;
    title: string;
    subject: string;
    description: string;
    progress: number;
    daysAgo: number;
    quiz_id?: number; // 백엔드의 실제 quiz ID
};

type Props = {
    onBack: () => void;
    onCardPress?: (card: Card) => void;
    onNavigate: (screen: Screen) => void;
};


const SUBJECTS: Subject[] = [
    { id: 'all', icon: '📚', name: '전체', emoji: '📚' },
    { id: 'korean', icon: '📖', name: '국어', emoji: '📖' },
    { id: 'english', icon: 'abc', name: '영어', emoji: 'abc' },
    { id: 'math', icon: '📐', name: '수학', emoji: '📐' },
    { id: 'science', icon: '🔬', name: '과학', emoji: '🔬' },
    { id: 'society', icon: '🌍', name: '사회', emoji: '🌍' },
    { id: 'history', icon: '📜', name: '역사', emoji: '📜' },
    { id: 'law', icon: '⚖️', name: '법', emoji: '⚖️' },
];

const MOCK_CARDS: Card[] = [
    {
        id: '1',
        title: '이차방정식',
        subject: '수학',
        description: 'ax²+bx+c=0 형태의 식에서 해를 구하는 방법을 배워요.',
        progress: 100,
        daysAgo: 7,
    },
    {
        id: '2',
        title: '세포 호흡',
        subject: '과학',
        description: '포도당을 분해해 에너지를 얻는 과정을 이해해요.',
        progress: 100,
        daysAgo: 7,
    },
    {
        id: '3',
        title: '비유법',
        subject: '국어',
        description: '어떤 대상을 다른 것에 빗대어 표현하는 방법을 익혀요.',
        progress: 100,
        daysAgo: 7,
    },
    {
        id: '4',
        title: '조동사',
        subject: '영어',
        description: 'can·must 같은 조동사가 문장 의미를 어떻게 바꾸는지 이해해요.',
        progress: 100,
        daysAgo: 7,
    },
    {
        id: '5',
        title: '기후 분류',
        subject: '사회',
        description: '지역별 기후 특징을 기준에 따라 구분해요.',
        progress: 100,
        daysAgo: 7,
    },
    {
        id: '6',
        title: '산화·환원 반응',
        subject: '과학',
        description: '전자의 이동으로 물질의 성질이 변하는 과정을 살펴봐요.',
        progress: 100,
        daysAgo: 7,
    },
];

export default function BrushUPScreen({ onBack, onCardPress, onNavigate }: Props) {
    const [selectedSubject, setSelectedSubject] = React.useState('all');
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [cardToDelete, setCardToDelete] = useState<Card | null>(null);
    const [searchModalVisible, setSearchModalVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);

    // 복습 카드 로드
    useEffect(() => {
        loadReviewCards();
    }, []);

    const loadReviewCards = async () => {
        try {
            setLoading(true);
            const token = await getToken();

            // 기존 /ocr/list 엔드포인트 사용 (모든 학습 데이터 가져오기)
            const response = await fetch(`${API_BASE_URL}/ocr/list?page=1&size=100`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (data.data && Array.isArray(data.data)) {
                // OCR 데이터를 카드 형식으로 변환
                const cardList: Card[] = data.data.map((item: any) => {
                    // 날짜 계산
                    const created = new Date(item.created_at);
                    const now = new Date();
                    const daysAgo = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

                    return {
                        id: String(item.id),
                        title: item.study_name,
                        subject: item.subject_name,
                        description: item.ocr_preview || '학습 데이터',
                        progress: 100, // 일단 100%로 표시
                        daysAgo: daysAgo,
                        quiz_id: item.id
                    };
                });

                setCards(cardList);
            } else {
                console.error('카드 로드 실패:', data);
                setCards([]);
            }
        } catch (error) {
            console.error('카드 로드 에러:', error);
            setCards([]);
        } finally {
            setLoading(false);
        }
    };

    const getSubjectIcon = (subjectName: string) => {
        const subject = SUBJECTS.find((s) => s.name === subjectName);
        return subject?.emoji ?? '📚';
    };

    const getCardCountBySubject = (subjectName: string) => {
        if (subjectName === '전체') return cards.length;
        return cards.filter(card => card.subject === subjectName).length;
    };

    const filteredCards = selectedSubject === 'all'
        ? cards
        : cards.filter(card => card.subject === SUBJECTS.find(s => s.id === selectedSubject)?.name);

    const handleDeletePress = (card: Card) => {
        setCardToDelete(card);
        setDeleteModalVisible(true);
    };

    const handleConfirmDelete = async () => {
        if (!cardToDelete) return;

        try {
            const token = await getToken();
            const response = await fetch(`${API_BASE_URL}/ocr/ocr-data/delete/${cardToDelete.quiz_id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                // 카드 목록에서 제거
                setCards(prevCards => prevCards.filter(c => c.id !== cardToDelete.id));
                setDeleteModalVisible(false);
                setCardToDelete(null);
            } else {
                console.error('삭제 실패:', await response.text());
                alert('삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('삭제 에러:', error);
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    const handleCancelDelete = () => {
        setDeleteModalVisible(false);
        setCardToDelete(null);
    };

    return (
        <View style={styles.root}>
            {/* Sidebar */}
            <Sidebar
                activeScreen="brushup"
                onNavigate={(screen) => {
                    if (screen === 'home') {
                        onBack();
                        return;
                    }
                    onNavigate(screen);
                }}
            />

            {/* 메인 콘텐츠 */}
            <View style={styles.mainContent}>
                {/* 상단 카드 컨테이너 */}
                <View style={styles.headerCard}>
                    {/* 타이틀 */}
                    <Text style={styles.pageTitle}>복습</Text>

                    {/* 과목 필터 (수평 탭) */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.subjectScroll}
                    >
                        {SUBJECTS.map((subject) => (
                            <Pressable
                                key={subject.id}
                                style={[
                                    styles.subjectChip,
                                    selectedSubject === subject.id && styles.subjectChipActive,
                                ]}
                                onPress={() => setSelectedSubject(subject.id)}
                            >
                                <Text style={styles.subjectEmoji}>{subject.emoji}</Text>
                                <Text
                                    style={[
                                        styles.subjectText,
                                        selectedSubject === subject.id && styles.subjectTextActive,
                                    ]}
                                >
                                    {subject.name}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>

                    {/* 검색 바 */}
                    <View style={styles.searchBar}>
                        <Text style={styles.searchBarPlaceholder}>검색어를 입력하세요...</Text>
                        <Pressable
                            style={styles.searchButton}
                            onPress={() => setSearchModalVisible(true)}
                        >
                            <Image
                                source={require('../../../assets/serch.png')}
                                style={styles.searchButtonIcon}
                                resizeMode="contain"
                            />
                        </Pressable>
                    </View>
                </View>

                {/* 카드 목록 */}
                <ScrollView contentContainerStyle={styles.cardList}>
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#5E82FF" />
                            <Text style={styles.loadingText}>복습 카드를 불러오는 중...</Text>
                        </View>
                    ) : filteredCards.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>📚</Text>
                            <Text style={styles.emptyTitle}>복습할 카드가 없어요</Text>
                            <Text style={styles.emptyDesc}>학습을 완료하면 여기에 나타나요!</Text>
                        </View>
                    ) : (
                        filteredCards.map((card) => (
                            <View
                                key={card.id}
                                style={styles.card}
                            >
                                {/* X 버튼 */}
                                <Pressable
                                    style={styles.closeBtn}
                                    hitSlop={10}
                                    onPress={() => handleDeletePress(card)}
                                >
                                    <Text style={styles.closeText}>×</Text>
                                </Pressable>

                                {/* 카드 클릭 영역 */}
                                <Pressable
                                    style={styles.cardPressable}
                                    onPress={() => onCardPress?.(card)}
                                >

                                    {/* 제목 + 과목 아이콘 */}
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.cardSubjectIcon}>{getSubjectIcon(card.subject)}</Text>
                                        <Text style={styles.cardTitle}>{card.title}</Text>
                                    </View>

                                    {/* 설명 */}
                                    <Text style={styles.cardDesc} numberOfLines={2}>{card.description}</Text>

                                    {/* 정답률 + 기간 */}
                                    <View style={styles.cardFooter}>
                                        <Text style={styles.cardProgress}>정답률: {card.progress}%</Text>
                                        <Text style={styles.cardDays}>{card.daysAgo}일 전</Text>
                                    </View>
                                </Pressable>
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>

            {/* 삭제 확인 모달 */}
            <Modal
                visible={deleteModalVisible}
                transparent
                animationType="fade"
                onRequestClose={handleCancelDelete}
            >
                <Pressable style={styles.modalOverlay} onPress={handleCancelDelete}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>정말 삭제하시겠어요?</Text>
                        <Text style={styles.modalMessage}>
                            확실히 기억이 잘 나요.{'\n'}삭제하면 복구할 수 없어요.
                        </Text>

                        <View style={styles.modalButtons}>
                            <Pressable
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={handleCancelDelete}
                            >
                                <Text style={styles.modalButtonTextCancel}>취소</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalButton, styles.modalButtonConfirm]}
                                onPress={handleConfirmDelete}
                            >
                                <Text style={styles.modalButtonTextConfirm}>삭제</Text>
                            </Pressable>
                        </View>
                    </View>
                </Pressable>
            </Modal>

            {/* 검색 모달 */}
            <Modal
                visible={searchModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setSearchModalVisible(false)}
            >
                <View style={styles.searchModalContainer}>
                    <View style={styles.searchModalContent}>
                        <View style={styles.searchModalHeader}>
                            <Text style={styles.searchModalTitle}>카드 검색</Text>
                            <Pressable onPress={() => setSearchModalVisible(false)}>
                                <Text style={styles.searchModalClose}>×</Text>
                            </Pressable>
                        </View>

                        <View style={styles.searchInputContainer}>
                            <Text style={styles.searchIcon}>🔍</Text>
                            <Text style={styles.searchPlaceholder}>검색어를 입력하세요...</Text>
                        </View>

                        <Text style={styles.searchHint}>제목, 과목명, 설명에서 검색할 수 있어요</Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#F6F7FB',
    },
    mainContent: {
        flex: 1,
        paddingTop: scale(20),
    },
    // 상단 헤더 카드
    headerCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: scale(20),
        marginBottom: scale(20),
        borderRadius: scale(20),
        padding: scale(24),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    pageTitle: {
        fontSize: fontScale(28),
        fontWeight: '900',
        color: '#111827',
        marginBottom: scale(20),
    },
    // 검색 바
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: scale(12),
        paddingLeft: scale(16),
        paddingRight: scale(6),
        paddingVertical: scale(6),
        gap: scale(10),
        marginTop: scale(16),
    },
    searchBarPlaceholder: {
        fontSize: fontScale(15),
        color: '#9CA3AF',
        flex: 1,
    },
    searchButton: {
        width: scale(40),
        height: scale(40),
        borderRadius: scale(10),
        backgroundColor: '#5E82FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchButtonIcon: {
        width: scale(24),
        height: scale(24),
        tintColor: '#FFFFFF',
    },
    // 로딩 및 빈 상태
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: scale(60),
        gap: scale(16),
    },
    loadingText: {
        fontSize: fontScale(15),
        color: '#6B7280',
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: scale(60),
        gap: scale(12),
    },
    emptyIcon: {
        fontSize: fontScale(48),
        marginBottom: scale(8),
    },
    emptyTitle: {
        fontSize: fontScale(18),
        fontWeight: '800',
        color: '#111827',
    },
    emptyDesc: {
        fontSize: fontScale(14),
        color: '#9CA3AF',
        textAlign: 'center',
    },
    // 상단 카드 스타일 (사용 안 함, 제거 가능)
    topCardsScroll: {
        paddingHorizontal: scale(24),
        paddingBottom: scale(20),
        gap: scale(12),
    },
    topCard: {
        width: scale(110),
        backgroundColor: '#FFFFFF',
        borderRadius: scale(16),
        padding: scale(16),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        gap: scale(8),
    },
    topCardActive: {
        borderColor: '#5E82FF',
        backgroundColor: '#F0F4FF',
    },
    topCardIconContainer: {
        width: scale(48),
        height: scale(48),
        borderRadius: scale(24),
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    topCardIconContainerActive: {
        backgroundColor: '#5E82FF',
    },
    topCardIcon: {
        fontSize: fontScale(24),
    },
    topCardLabel: {
        fontSize: fontScale(14),
        fontWeight: '700',
        color: '#374151',
    },
    topCardLabelActive: {
        color: '#5E82FF',
    },
    topCardCount: {
        fontSize: fontScale(12),
        fontWeight: '600',
        color: '#9CA3AF',
    },
    topCardCountActive: {
        color: '#5E82FF',
    },
    // 기존 과목 필터
    subjectScroll: {
        paddingBottom: scale(4),
        gap: scale(10),
    },
    subjectChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(18),
        paddingVertical: scale(10),
        borderRadius: scale(20),
        backgroundColor: '#F3F4F6',
        borderWidth: 2,
        borderColor: '#F3F4F6',
        gap: scale(6),
    },
    subjectChipActive: {
        backgroundColor: '#EEF3FF',
        borderColor: '#5E82FF',
    },
    subjectEmoji: {
        fontSize: fontScale(16),
    },
    subjectText: {
        fontSize: fontScale(14),
        fontWeight: '600',
        color: '#6B7280',
    },
    subjectTextActive: {
        color: '#5E82FF',
        fontWeight: '700',
    },
    // 카드 목록 (한 줄에 2개씩)
    cardList: {
        paddingHorizontal: scale(20),
        paddingTop: scale(4),
        paddingBottom: scale(24),
        gap: scale(14),
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: scale(16),
        borderWidth: 1,
        borderColor: '#E5E7EB',
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        width: '48%',
    },
    cardPressable: {
        padding: scale(16),
    },
    closeBtn: {
        position: 'absolute',
        right: scale(14),
        top: scale(14),
        width: scale(30),
        height: scale(30),
        borderRadius: scale(15),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F4F6',
    },
    closeText: {
        fontSize: fontScale(22),
        fontWeight: '700',
        color: '#6B7280',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scale(6),
        gap: scale(6),
    },
    cardTitle: {
        fontSize: fontScale(15),
        fontWeight: '800',
        color: '#111827',
        flex: 1,
    },
    cardSubjectIcon: {
        fontSize: fontScale(18),
    },
    cardSubject: {
        fontSize: fontScale(11),
        fontWeight: '600',
        color: '#9CA3AF',
        marginBottom: scale(6),
    },
    cardDesc: {
        fontSize: fontScale(12),
        fontWeight: '500',
        color: '#374151',
        lineHeight: fontScale(18),
        marginBottom: scale(10),
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: scale(8),
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    cardProgress: {
        fontSize: fontScale(11),
        fontWeight: '700',
        color: '#5E82FF',
    },
    cardDays: {
        fontSize: fontScale(10),
        fontWeight: '600',
        color: '#9CA3AF',
    },
    // 삭제 모달 스타일
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: scale(20),
        padding: scale(28),
        width: scale(300),
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: fontScale(20),
        fontWeight: '800',
        color: '#111827',
        marginBottom: scale(12),
    },
    modalMessage: {
        fontSize: fontScale(15),
        fontWeight: '500',
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: fontScale(22),
        marginBottom: scale(24),
    },
    modalButtons: {
        flexDirection: 'row',
        gap: scale(12),
        width: '100%',
    },
    modalButton: {
        flex: 1,
        paddingVertical: scale(14),
        borderRadius: scale(12),
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalButtonCancel: {
        backgroundColor: '#F3F4F6',
    },
    modalButtonConfirm: {
        backgroundColor: '#EF4444',
    },
    modalButtonTextCancel: {
        fontSize: fontScale(15),
        fontWeight: '700',
        color: '#6B7280',
    },
    modalButtonTextConfirm: {
        fontSize: fontScale(15),
        fontWeight: '700',
        color: '#FFFFFF',
    },
    // 검색 모달 스타일
    searchModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    searchModalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: scale(24),
        borderTopRightRadius: scale(24),
        padding: scale(24),
        minHeight: scale(300),
    },
    searchModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: scale(20),
    },
    searchModalTitle: {
        fontSize: fontScale(22),
        fontWeight: '800',
        color: '#111827',
    },
    searchModalClose: {
        fontSize: fontScale(36),
        fontWeight: '300',
        color: '#9CA3AF',
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: scale(12),
        padding: scale(16),
        gap: scale(12),
        marginBottom: scale(12),
    },
    searchIcon: {
        fontSize: fontScale(20),
    },
    searchPlaceholder: {
        fontSize: fontScale(16),
        color: '#9CA3AF',
        flex: 1,
    },
    searchHint: {
        fontSize: fontScale(13),
        color: '#9CA3AF',
        textAlign: 'center',
    },
});
