import React from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { appColors, fontScale, scale } from '../../styles/theme';
import AppModalShell from '../common/AppModalShell';
import AppPrimaryButton from '../common/AppPrimaryButton';

type Props = {
    showSingleDisconnect: boolean;
    showNickname: boolean;
    showMonthlyGoal: boolean;
    showWithdraw: boolean;
    tempNickname: string;
    tempGoal: number;
    onTempNicknameChange: (nickname: string) => void;
    onTempGoalChange: (goal: number) => void;
    onCloseSingleDisconnect: () => void;
    onCloseNickname: () => void;
    onCloseMonthlyGoal: () => void;
    onCloseWithdraw: () => void;
    onConfirmNickname: () => Promise<void>;
    onConfirmMonthlyGoal: () => void;
    onConfirmWithdraw: () => Promise<void>;
};

export default function MyPageModals({
    showSingleDisconnect,
    showNickname,
    showMonthlyGoal,
    showWithdraw,
    tempNickname,
    tempGoal,
    onTempNicknameChange,
    onTempGoalChange,
    onCloseSingleDisconnect,
    onCloseNickname,
    onCloseMonthlyGoal,
    onCloseWithdraw,
    onConfirmNickname,
    onConfirmMonthlyGoal,
    onConfirmWithdraw,
}: Props) {
    return (
        <>
            <AppModalShell
                visible={showSingleDisconnect}
                onClose={onCloseSingleDisconnect}
                showCloseButton={false}
                backdropStyle={styles.overlay}
                cardStyle={styles.card}
            >
                <Text style={styles.message}>연결된 계정이 1개일 때는 해제할 수 없습니다.</Text>
                <Text style={styles.message}>다른 계정을 먼저 연동한 뒤 해제해주세요.</Text>
                <AppPrimaryButton style={styles.primaryButton} onPress={onCloseSingleDisconnect}>
                    확인
                </AppPrimaryButton>
            </AppModalShell>

            <AppModalShell
                visible={showNickname}
                onClose={onCloseNickname}
                showCloseButton={false}
                backdropStyle={styles.overlay}
                cardStyle={styles.keyboardCard}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={scale(12)}
                >
                    <Text style={styles.title}>닉네임 변경</Text>
                    <TextInput
                        style={styles.nicknameInput}
                        value={tempNickname}
                        onChangeText={onTempNicknameChange}
                        placeholder="닉네임을 입력하세요"
                        maxLength={10}
                        autoFocus
                    />
                    <View style={styles.buttonRow}>
                        <Pressable style={[styles.button, styles.cancelButton]} onPress={onCloseNickname}>
                            <Text style={styles.cancelText}>취소</Text>
                        </Pressable>
                        <AppPrimaryButton style={styles.button} onPress={() => void onConfirmNickname()}>
                            확인
                        </AppPrimaryButton>
                    </View>
                </KeyboardAvoidingView>
            </AppModalShell>

            <AppModalShell
                visible={showMonthlyGoal}
                onClose={onCloseMonthlyGoal}
                showCloseButton={false}
                backdropStyle={styles.overlay}
                cardStyle={styles.card}
            >
                <Text style={styles.title}>월간 목표 설정</Text>
                <View style={styles.goalPicker}>
                    <Pressable onPress={() => onTempGoalChange(tempGoal + 1)}>
                        <Image source={require('../../../assets/shift.png')} style={styles.goalArrowUp} resizeMode="contain" />
                    </Pressable>
                    <Text style={styles.goalValue}>{tempGoal} 회</Text>
                    <Pressable onPress={() => onTempGoalChange(Math.max(1, tempGoal - 1))}>
                        <Image source={require('../../../assets/shift.png')} style={styles.goalArrowDown} resizeMode="contain" />
                    </Pressable>
                </View>
                <AppPrimaryButton style={styles.primaryButton} onPress={onConfirmMonthlyGoal}>
                    확인
                </AppPrimaryButton>
            </AppModalShell>

            <AppModalShell
                visible={showWithdraw}
                onClose={onCloseWithdraw}
                showCloseButton={false}
                backdropStyle={styles.overlay}
                cardStyle={styles.withdrawCard}
            >
                <Text style={styles.withdrawMessage}>
                    지금까지의 학습 기록과 활동 데이터가 모두 삭제됩니다.
                </Text>
                <Text style={styles.withdrawStrong}>정말 탈퇴하시겠어요?</Text>
                <View style={styles.buttonRow}>
                    <Pressable style={[styles.button, styles.cancelButton]} onPress={onCloseWithdraw}>
                        <Text style={styles.cancelText}>취소</Text>
                    </Pressable>
                    <Pressable style={[styles.button, styles.dangerButton]} onPress={() => void onConfirmWithdraw()}>
                        <Text style={styles.dangerText}>탈퇴</Text>
                    </Pressable>
                </View>
            </AppModalShell>
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        backgroundColor: appColors.overlaySoft,
    },
    card: {
        width: '40%',
        maxWidth: 400,
        paddingVertical: scale(32),
        paddingHorizontal: scale(32),
        alignItems: 'center',
        gap: scale(16),
    },
    keyboardCard: {
        width: '40%',
        maxWidth: 400,
        paddingVertical: scale(32),
        paddingHorizontal: scale(32),
    },
    title: {
        fontSize: fontScale(18),
        fontWeight: '800',
        marginBottom: scale(16),
        textAlign: 'center',
    },
    message: {
        fontSize: fontScale(14),
        textAlign: 'center',
        color: appColors.text,
        lineHeight: fontScale(20),
    },
    primaryButton: {
        width: '100%',
        borderRadius: scale(8),
        paddingVertical: scale(12),
    },
    nicknameInput: {
        width: '100%',
        borderWidth: 1,
        borderColor: appColors.borderStrong,
        borderRadius: scale(8),
        paddingVertical: scale(12),
        paddingHorizontal: scale(16),
        fontSize: fontScale(16),
        color: appColors.text,
        backgroundColor: appColors.inputBg,
        marginBottom: scale(24),
    },
    goalPicker: {
        alignItems: 'center',
        gap: scale(16),
        marginVertical: scale(16),
    },
    goalArrowUp: {
        width: scale(20),
        height: scale(20),
        transform: [{ rotate: '-90deg' }],
    },
    goalArrowDown: {
        width: scale(20),
        height: scale(20),
        transform: [{ rotate: '90deg' }],
    },
    goalValue: {
        fontSize: fontScale(28),
        fontWeight: '800',
        color: appColors.text,
    },
    withdrawCard: {
        width: '40%',
        maxWidth: 400,
        paddingVertical: scale(40),
        paddingHorizontal: scale(32),
        alignItems: 'center',
    },
    withdrawMessage: {
        fontSize: fontScale(14),
        textAlign: 'center',
        color: appColors.text,
        lineHeight: fontScale(20),
        marginBottom: scale(24),
    },
    withdrawStrong: {
        fontSize: fontScale(20),
        fontWeight: '800',
        color: appColors.danger,
        marginBottom: scale(32),
    },
    buttonRow: {
        flexDirection: 'row',
        width: '100%',
        gap: scale(12),
    },
    button: {
        flex: 1,
        borderRadius: scale(8),
        paddingVertical: scale(12),
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: appColors.border,
    },
    dangerButton: {
        backgroundColor: appColors.dangerText,
    },
    cancelText: {
        fontWeight: '700',
        fontSize: fontScale(15),
        color: appColors.text,
    },
    dangerText: {
        fontWeight: '700',
        fontSize: fontScale(15),
        color: appColors.white,
    },
});
