import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { appColors, fontScale, scale } from '../../styles/theme';
import AppPrimaryButton from '../common/AppPrimaryButton';
import TimeStepperColumn from './TimeStepperColumn';

type TimeField = 'ampm' | 'hour' | 'minute';

type Props = {
    visible: boolean;
    title: string;
    ampm: string;
    hour: number;
    minute: number;
    onChange: (field: TimeField, diff: number) => void;
    onClose: () => void;
    onConfirm: () => void;
};

export default function AlarmTimePickerOverlay({
    visible,
    title,
    ampm,
    hour,
    minute,
    onChange,
    onClose,
    onConfirm,
}: Props) {
    if (!visible) return null;

    return (
        <View style={styles.overlay}>
            <View style={styles.box}>
                <View style={styles.header}>
                    <Text style={styles.title}>{title}</Text>
                    <Pressable onPress={onClose}>
                        <Text style={styles.close}>✕</Text>
                    </Pressable>
                </View>

                <View style={styles.timePickerRow}>
                    <TimeStepperColumn
                        value={ampm}
                        onIncrement={() => onChange('ampm', 1)}
                        onDecrement={() => onChange('ampm', -1)}
                    />
                    <TimeStepperColumn
                        value={hour}
                        onIncrement={() => onChange('hour', 1)}
                        onDecrement={() => onChange('hour', -1)}
                    />
                    <TimeStepperColumn
                        value={minute.toString().padStart(2, '0')}
                        onIncrement={() => onChange('minute', 5)}
                        onDecrement={() => onChange('minute', -5)}
                    />
                </View>

                <AppPrimaryButton
                    style={styles.confirm}
                    textStyle={styles.confirmText}
                    onPress={onConfirm}
                >
                    확인
                </AppPrimaryButton>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        inset: 0,
        backgroundColor: appColors.overlayStrong,
        justifyContent: 'center',
        alignItems: 'center',
    },
    box: {
        width: '70%',
        backgroundColor: appColors.white,
        borderRadius: scale(24),
        paddingVertical: scale(24),
        paddingHorizontal: scale(24),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: scale(16),
    },
    title: {
        fontSize: fontScale(16),
        fontWeight: '700',
    },
    close: {
        fontSize: fontScale(18),
    },
    timePickerRow: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        marginBottom: scale(24),
    },
    confirm: {
        backgroundColor: appColors.primary,
        borderRadius: 999,
        paddingVertical: scale(14),
        alignItems: 'center',
    },
    confirmText: {
        fontSize: fontScale(15),
        fontWeight: '700',
        color: appColors.white,
    },
});
