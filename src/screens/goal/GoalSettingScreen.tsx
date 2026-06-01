import React, { useState } from 'react';
import {
    Text,
    TextInput,
    StyleSheet,
} from 'react-native';
import { scale, fontScale } from '../../lib/layout';
import CharacterFormLayout from '../../components/common/CharacterFormLayout';
import FormHelperText from '../../components/common/FormHelperText';
import FormSubmitButton from '../../components/common/FormSubmitButton';

type Props = {
    onSubmit: (goal: number) => void;
};

export default function GoalSettingScreen({ onSubmit }: Props) {
    const [goal, setGoal] = useState('');
    const [errorText, setErrorText] = useState('');

    const handleChangeGoal = (text: string) => {
        // 숫자만 허용
        const onlyNumber = text.replace(/[^0-9]/g, '');

        if (text !== onlyNumber) {
            setErrorText('숫자만 입력해 주세요');
        } else {
            setErrorText('');
        }

        setGoal(onlyNumber);
    };

    return (
        <CharacterFormLayout>
                {/* 왼쪽 캐릭터 */}

                {/* 오른쪽 콘텐츠 */}
                    <Text style={styles.title}>이번 달 학습 목표를 세워봐요!</Text>

                    <TextInput
                        value={goal}
                        onChangeText={handleChangeGoal}
                        placeholder="학습 목표 횟수 입력"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        style={styles.input}
                    />
                    <FormHelperText visible={Boolean(errorText)}>
                        {errorText}
                    </FormHelperText>

                    <FormSubmitButton
                        label="확인"
                        onPress={() => onSubmit(Number(goal))}
                        disabled={goal.trim() === ''}
                        style={styles.button}
                    />
        </CharacterFormLayout>
    );
}

const styles = StyleSheet.create({
    title: {
        fontSize: fontScale(28),
        fontWeight: '800',
        color: '#111827',
        marginBottom: scale(24),
    },
    input: {
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: '#D1D5DB',
        paddingVertical: scale(10),
        paddingHorizontal: scale(8),
        fontSize: fontScale(18),
        marginBottom: scale(4),
    },
    button: {
        width: '100%',
    },
});
