import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { scale, fontScale } from '../../lib/layout';
import AppPrimaryButton from '../../components/common/AppPrimaryButton';
import { appColors, appFontWeight, appRadius } from '../../styles/theme';

type Props = {
    nickname: string;
    onStartTest: () => void;
};

export default function TypeIntroScreen({ nickname, onStartTest }: Props) {
    const displayName = nickname && nickname.trim().length > 0 ? nickname.trim() : '학습자';

    return (
        <View style={styles.root}>
            <View style={styles.contentRow}>
                {/* 왼쪽 캐릭터 */}
                <Image
                    source={require('../../../assets/character/bat-character.png')}
                    style={styles.character}
                    resizeMode="contain"
                />

                {/* 오른쪽 설명/버튼 영역 */}
                <View style={styles.rightBox}>
                    <Text style={styles.title}>{displayName}님 환영해요!</Text>

                    <Text style={styles.body}>
                        BAT는 Blank Adaptive Training,{'\n'}
                        단계별 빈칸 학습을 통해 자기주도적으로{'\n'}
                        공부할 수 있는 프로그램이에요.
                    </Text>

                    <Text style={[styles.body, styles.bodySpacing]}>
                        본격적으로 학습을 시작하기 전에,{'\n'}
                        3분 만에 나의 학습 유형을 알아볼까요?
                    </Text>

                    <AppPrimaryButton style={styles.button} textStyle={styles.buttonText} onPress={onStartTest}>
                        학습유형검사 시작하기
                    </AppPrimaryButton>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: appColors.screenBgMuted,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '80%',
        maxWidth: scale(900),
    },
    character: {
        width: scale(260),
        height: scale(260),
        marginRight: scale(80),
    },
    rightBox: {
        width: scale(520),
    },
    title: {
        fontSize: fontScale(28),
        fontWeight: appFontWeight.extraBold,
        marginBottom: scale(16),
    },
    body: {
        fontSize: fontScale(16),
        color: appColors.textMuted,
        lineHeight: fontScale(24),
    },
    bodySpacing: {
        marginTop: scale(8),
        marginBottom: scale(24),
    },
    button: {
        marginTop: scale(8),
        width: scale(280),
        height: scale(64),
        borderRadius: scale(appRadius.pill),
        elevation: 3,
    },
    buttonText: {
        color: appColors.white,
        fontSize: fontScale(17),
        fontWeight: appFontWeight.bold,
    },
});
