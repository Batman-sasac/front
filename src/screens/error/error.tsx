import React, { useState } from 'react';
import {
    Image,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { fontScale, scale } from '../../lib/layout';
import ErrorImageButton from '../../components/error/ErrorImageButton';
import ErrorModalShell from '../../components/error/ErrorModalShell';

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

                <ErrorImageButton
                    source={require('../../../assets/error/report.png')}
                    onPress={() => setShowReportModal(true)}
                    wrapperStyle={styles.fullButtonWrap}
                    imageStyle={styles.fullButton}
                />

                <View style={styles.rowButtons}>
                    <ErrorImageButton
                        source={require('../../../assets/error/go-home.png')}
                        onPress={onGoHome}
                        wrapperStyle={styles.halfButtonWrap}
                        imageStyle={styles.halfButton}
                    />
                    <ErrorImageButton
                        source={require('../../../assets/error/re-start.png')}
                        onPress={onRetry}
                        wrapperStyle={styles.halfButtonWrap}
                        imageStyle={styles.halfButton}
                    />
                </View>
            </View>

            <ErrorModalShell
                visible={showReportModal}
                title="오류 제보하기"
                onClose={() => setShowReportModal(false)}
                footer={
                    <View style={styles.modalButtons}>
                        <ErrorImageButton
                            source={require('../../../assets/error/popup-delete.png')}
                            onPress={() => setShowReportModal(false)}
                            wrapperStyle={styles.modalButtonWrap}
                            imageStyle={styles.modalButtonImage}
                        />
                        <ErrorImageButton
                            source={require('../../../assets/error/popup-submit.png')}
                            onPress={handleSubmitReport}
                            wrapperStyle={styles.modalButtonWrap}
                            imageStyle={styles.modalButtonImage}
                        />
                    </View>
                }
            >
                <TextInput
                    style={styles.input}
                    multiline
                    value={reportText}
                    onChangeText={setReportText}
                    placeholder={'무슨 일이 있었는지 편하게 말해주세요 :)\n예) "친구 추가하려는데 안 돼요"'}
                    placeholderTextColor="#8A8E99"
                    textAlignVertical="top"
                />
            </ErrorModalShell>

            <ErrorModalShell
                visible={showDoneModal}
                title="오류 제보하기"
                onClose={() => setShowDoneModal(false)}
                footer={
                    <View style={styles.modalButtons}>
                        <ErrorImageButton
                            source={require('../../../assets/error/go-home.png')}
                            onPress={() => {
                                setShowDoneModal(false);
                                onGoHome();
                            }}
                            wrapperStyle={styles.modalButtonWrap}
                            imageStyle={styles.modalButtonImage}
                        />
                        <ErrorImageButton
                            source={require('../../../assets/error/re-start.png')}
                            onPress={() => {
                                setShowDoneModal(false);
                                onRetry();
                            }}
                            wrapperStyle={styles.modalButtonWrap}
                            imageStyle={styles.modalButtonImage}
                        />
                    </View>
                }
            >
                <View style={styles.doneBody}>
                    <Image
                        source={require('../../../assets/character/bat-character.png')}
                        style={styles.doneBatImage}
                        resizeMode="contain"
                    />
                    <Text style={styles.doneTitle}>제보 완료!✨</Text>
                    <Text style={styles.doneDesc}>덕분에 BAT가 더 나아지고 있어요.</Text>
                    <Text style={styles.doneDesc}>확인하는 대로 바로 고쳐드릴게요!</Text>
                </View>
            </ErrorModalShell>
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
