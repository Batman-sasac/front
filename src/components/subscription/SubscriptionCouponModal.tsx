import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import AppModalShell from '../common/AppModalShell';
import { figmaFontScale, figmaScale, subscriptionColors } from '../../styles/subscriptionStyles';
import SubscriptionButton from './SubscriptionButton';

type Props = {
    visible: boolean;
    onClose: () => void;
    onConfirm: (couponCode: string) => Promise<void>;
};

export default function SubscriptionCouponModal({
    visible,
    onClose,
    onConfirm,
}: Props) {
    const [couponCode, setCouponCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const normalizedCouponCode = couponCode.trim();

    useEffect(() => {
        if (!visible) {
            setCouponCode('');
            setErrorMessage(null);
            setIsSubmitting(false);
        }
    }, [visible]);

    const handleClose = () => {
        if (!isSubmitting) onClose();
    };

    const handleConfirm = async () => {
        if (!normalizedCouponCode || isSubmitting) return;

        setIsSubmitting(true);
        setErrorMessage(null);
        try {
            await onConfirm(normalizedCouponCode);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : '쿠폰을 적용하지 못했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AppModalShell
            visible={visible}
            title="쿠폰 입력"
            onClose={handleClose}
            backdropStyle={styles.backdrop}
            cardStyle={styles.card}
            headerStyle={styles.header}
            titleStyle={styles.title}
            closeIconStyle={styles.closeIcon}
            footer={(
                <View style={styles.buttons}>
                    <SubscriptionButton
                        variant="secondary"
                        onPress={handleClose}
                        disabled={isSubmitting}
                        style={styles.button}
                    >
                        취소
                    </SubscriptionButton>
                    <SubscriptionButton
                        onPress={() => void handleConfirm()}
                        disabled={!normalizedCouponCode || isSubmitting}
                        style={[
                            styles.button,
                            (!normalizedCouponCode || isSubmitting) && styles.disabledButton,
                        ]}
                    >
                        {isSubmitting ? '적용 중...' : '확인'}
                    </SubscriptionButton>
                </View>
            )}
        >
            <View style={styles.body}>
                <Text style={styles.description}>보유하고 계신 쿠폰 코드를 입력해 주세요.</Text>
                <TextInput
                    value={couponCode}
                    onChangeText={(value) => {
                        setCouponCode(value);
                        if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="쿠폰 코드 입력"
                    placeholderTextColor={subscriptionColors.grey300}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={32}
                    returnKeyType="done"
                    editable={!isSubmitting}
                    onSubmitEditing={() => void handleConfirm()}
                    accessibilityLabel="쿠폰 코드"
                    style={styles.input}
                />
                {errorMessage ? (
                    <Text accessibilityRole="alert" style={styles.errorText}>
                        {errorMessage}
                    </Text>
                ) : null}
            </View>
        </AppModalShell>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingHorizontal: figmaScale(16),
    },
    card: {
        maxWidth: figmaScale(520),
        backgroundColor: subscriptionColors.modalBg,
        borderRadius: figmaScale(20),
    },
    header: {
        height: figmaScale(72),
        borderBottomColor: subscriptionColors.modalBorder,
        paddingHorizontal: figmaScale(20),
    },
    title: {
        fontSize: figmaFontScale(22),
        fontWeight: '800',
        color: subscriptionColors.textStrong,
    },
    closeIcon: {
        color: subscriptionColors.grey300,
        fontSize: figmaFontScale(30),
    },
    body: {
        paddingHorizontal: figmaScale(20),
        paddingTop: figmaScale(24),
        paddingBottom: figmaScale(20),
    },
    description: {
        marginBottom: figmaScale(14),
        fontSize: figmaFontScale(16),
        lineHeight: figmaFontScale(24),
        fontWeight: '600',
        color: subscriptionColors.grey600,
    },
    input: {
        width: '100%',
        height: figmaScale(60),
        borderWidth: 1,
        borderColor: subscriptionColors.modalBorder,
        borderRadius: figmaScale(14),
        backgroundColor: subscriptionColors.surface,
        paddingHorizontal: figmaScale(16),
        fontSize: figmaFontScale(18),
        color: subscriptionColors.textStrong,
    },
    errorText: {
        marginTop: figmaScale(10),
        fontSize: figmaFontScale(14),
        lineHeight: figmaFontScale(20),
        fontWeight: '600',
        color: subscriptionColors.red,
    },
    buttons: {
        flexDirection: 'row',
        gap: figmaScale(10),
        paddingHorizontal: figmaScale(20),
        paddingBottom: figmaScale(20),
    },
    button: {
        flex: 1,
        height: figmaScale(56),
    },
    disabledButton: {
        opacity: 0.45,
    },
});
