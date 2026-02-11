import React, { useState } from 'react';
import {
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { fontScale, scale } from '../../lib/layout';

type Props = {
    onGoHome: () => void;
    onRetry: () => void;
    onSubmitReport?: (message: string) => Promise<void> | void;
};

export default function ErrorScreen({ onGoHome, onRetry, onSubmitReport }: Props) {
    const [showReportModal, setShowReportModal] = useState(false);
    const [showDoneModal, setShowDoneModal] = useState(false);
    const [reportText, setReportText] = useState('');

    const handleSubmitReport = async () => {
        try {
            const text = reportText.trim();
            if (onSubmitReport) {
                await onSubmitReport(text);
            }
            setShowReportModal(false);
            setShowDoneModal(true);
        } catch (error) {
            console.error('오류 제보 제출 실패:', error);
            setShowReportModal(false);
            setShowDoneModal(true);
        }
    };

    const closeAllModals = () => {
        setShowReportModal(false);
        setShowDoneModal(false);
    };

    return (
        <View style={styles.root}>
            <View style={styles.content}>
                <Image
                    source={require('../../../assets/error/bat-error.png')}
                    style={styles.batImage}
                    resizeMode="contain"
                />

                <Text style={styles.title}>이런, 문제가 생겼어요!</Text>
                <Text style={styles.desc}>
                    BAT는 갓 태어난 앱이라 아직 다듬어야 할 부분이 많아요. 불편을 드려 죄송해요.
                </Text>

                <Pressable onPress={() => setShowReportModal(true)} style={styles.fullButtonWrap}>
                    <Image
                        source={require('../../../assets/error/report.png')}
                        style={styles.fullButton}
                        resizeMode="stretch"
                    />
                </Pressable>

                <View style={styles.rowButtons}>
                    <Pressable onPress={onGoHome} style={styles.halfButtonWrap}>
                        <Image
                            source={require('../../../assets/error/go-home.png')}
                            style={styles.halfButton}
                            resizeMode="stretch"
                        />
                    </Pressable>
                    <Pressable onPress={onRetry} style={styles.halfButtonWrap}>
                        <Image
                            source={require('../../../assets/error/re-start.png')}
                            style={styles.halfButton}
                            resizeMode="stretch"
                        />
                    </Pressable>
                </View>
            </View>

            <Modal visible={showReportModal} transparent animationType="fade" onRequestClose={closeAllModals}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>오류 제보하기</Text>
                            <Pressable onPress={() => setShowReportModal(false)}>
                                <Text style={styles.closeText}>×</Text>
                            </Pressable>
                        </View>

                        <TextInput
                            style={styles.input}
                            multiline
                            value={reportText}
                            onChangeText={setReportText}
                            placeholder={'무슨 일이 있었는지 편하게 말해주세요 :)\n예) "친구 추가하려는데 안 돼요"'}
                            placeholderTextColor="#8A8E99"
                            textAlignVertical="top"
                        />

                        <View style={styles.modalButtons}>
                            <Pressable onPress={() => setShowReportModal(false)} style={styles.modalButtonWrap}>
                                <Image
                                    source={require('../../../assets/error/popup-delete.png')}
                                    style={styles.modalButtonImage}
                                    resizeMode="stretch"
                                />
                            </Pressable>
                            <Pressable onPress={handleSubmitReport} style={styles.modalButtonWrap}>
                                <Image
                                    source={require('../../../assets/error/popup-submit.png')}
                                    style={styles.modalButtonImage}
                                    resizeMode="stretch"
                                />
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={showDoneModal} transparent animationType="fade" onRequestClose={closeAllModals}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>오류 제보하기</Text>
                            <Pressable onPress={() => setShowDoneModal(false)}>
                                <Text style={styles.closeText}>×</Text>
                            </Pressable>
                        </View>

                        <View style={styles.doneBody}>
                            <Image
                                source={require('../../../assets/bat-character.png')}
                                style={styles.doneBatImage}
                                resizeMode="contain"
                            />
                            <Text style={styles.doneTitle}>제보 완료!✨</Text>
                            <Text style={styles.doneDesc}>덕분에 BAT가 더 나아지고 있어요.</Text>
                            <Text style={styles.doneDesc}>확인하는 대로 바로 고쳐드릴게요!</Text>
                        </View>

                        <View style={styles.modalButtons}>
                            <Pressable
                                onPress={() => {
                                    setShowDoneModal(false);
                                    onGoHome();
                                }}
                                style={styles.modalButtonWrap}
                            >
                                <Image
                                    source={require('../../../assets/error/go-home.png')}
                                    style={styles.modalButtonImage}
                                    resizeMode="stretch"
                                />
                            </Pressable>
                            <Pressable
                                onPress={() => {
                                    setShowDoneModal(false);
                                    onRetry();
                                }}
                                style={styles.modalButtonWrap}
                            >
                                <Image
                                    source={require('../../../assets/error/re-start.png')}
                                    style={styles.modalButtonImage}
                                    resizeMode="stretch"
                                />
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
        backgroundColor: '#ECECF1',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: scale(24),
    },
    content: {
        width: '100%',
        maxWidth: 640,
        alignItems: 'center',
    },
    batImage: {
        width: scale(220),
        height: scale(220),
        marginBottom: scale(16),
    },
    title: {
        fontSize: fontScale(48),
        fontWeight: '900',
        color: '#1E1F26',
        marginBottom: scale(20),
        textAlign: 'center',
    },
    desc: {
        fontSize: fontScale(18),
        color: '#5F626D',
        marginBottom: scale(32),
        textAlign: 'center',
    },
    fullButtonWrap: {
        width: '100%',
        marginBottom: scale(12),
    },
    fullButton: {
        width: '100%',
        height: scale(62),
    },
    rowButtons: {
        width: '100%',
        flexDirection: 'row',
        gap: scale(10),
    },
    halfButtonWrap: {
        flex: 1,
    },
    halfButton: {
        width: '100%',
        height: scale(52),
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.44)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: scale(16),
    },
    modalCard: {
        width: '100%',
        maxWidth: 560,
        borderRadius: scale(18),
        backgroundColor: '#F8F8FA',
        overflow: 'hidden',
    },
    modalHeader: {
        height: scale(74),
        borderBottomWidth: 1,
        borderBottomColor: '#D7DAE3',
        paddingHorizontal: scale(20),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    modalTitle: {
        fontSize: fontScale(22),
        fontWeight: '800',
        color: '#111218',
        marginLeft: scale(8),
    },
    closeText: {
        fontSize: fontScale(44),
        lineHeight: fontScale(44),
        color: '#A9ABB4',
        marginTop: scale(-4),
    },
    input: {
        margin: scale(22),
        minHeight: scale(130),
        borderWidth: 1,
        borderColor: '#A4B6FF',
        borderRadius: scale(10),
        backgroundColor: '#F1F2F5',
        paddingHorizontal: scale(16),
        paddingVertical: scale(14),
        fontSize: fontScale(17),
        color: '#1E1F26',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: scale(8),
        paddingHorizontal: scale(22),
        paddingBottom: scale(22),
    },
    modalButtonWrap: {
        flex: 1,
    },
    modalButtonImage: {
        width: '100%',
        height: scale(58),
    },
    doneBody: {
        alignItems: 'center',
        paddingHorizontal: scale(22),
        paddingTop: scale(20),
        paddingBottom: scale(14),
    },
    doneBatImage: {
        width: scale(220),
        height: scale(170),
        marginBottom: scale(8),
    },
    doneTitle: {
        fontSize: fontScale(44),
        fontWeight: '900',
        color: '#101217',
        marginBottom: scale(8),
        textAlign: 'center',
    },
    doneDesc: {
        fontSize: fontScale(16),
        color: '#1B1C22',
        textAlign: 'center',
        lineHeight: fontScale(24),
    },
});
