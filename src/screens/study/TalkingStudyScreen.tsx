import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { scale, fontScale } from '../../lib/layout';
import FloatingBackButton from '../../components/common/FloatingBackButton';

type Props = {
    onBack: () => void;
    onDone: () => void;
    onSkip: () => void;
};

export default function TalkingStudyScreen({ onBack, onDone, onSkip }: Props) {
    const [isRecording, setIsRecording] = useState(false);

    return (
        <View style={styles.root}>
            <FloatingBackButton onPress={onBack} hitSlop={12} />

            <View style={styles.center}>
                <Text style={styles.title}>대화로 설명하기</Text>
                <Text style={styles.desc}>마이크 버튼은 UI만 먼저 구현하고, 기능은 이후에 연결하시면 됩니다.</Text>

                <Pressable
                    style={[styles.mic, isRecording && styles.micActive]}
                    onPress={() => setIsRecording((p) => !p)}
                >
                    <Text style={styles.micText}>{isRecording ? 'REC' : 'MIC'}</Text>
                </Pressable>

                <Pressable style={styles.primaryBtn} onPress={onDone}>
                    <Text style={styles.primaryText}>설명 완료</Text>
                </Pressable>

                <Pressable style={styles.ghostBtn} onPress={onSkip}>
                    <Text style={styles.ghostText}>스킵</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F6F7FB' },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(16) },

    title: { fontSize: fontScale(22), fontWeight: '900', color: '#111827', marginBottom: scale(8) },
    desc: { fontSize: fontScale(12), color: '#6B7280', marginBottom: scale(18), textAlign: 'center' },

    mic: {
        width: scale(76),
        height: scale(76),
        borderRadius: scale(38),
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scale(24),
        borderWidth: 2,
        borderColor: '#D1D5DB',
    },
    micActive: {
        backgroundColor: '#5E82FF',
        borderColor: '#5E82FF',
    },
    micText: { fontSize: fontScale(14), fontWeight: '900', color: '#111827' },

    primaryBtn: {
        width: '100%',
        maxWidth: scale(360),
        height: scale(48),
        borderRadius: scale(12),
        backgroundColor: '#5E82FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scale(10),
    },
    primaryText: { color: '#FFFFFF', fontSize: fontScale(14), fontWeight: '900' },

    ghostBtn: {
        width: '100%',
        maxWidth: scale(360),
        height: scale(48),
        borderRadius: scale(12),
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    ghostText: { color: '#111827', fontSize: fontScale(14), fontWeight: '900' },
});
