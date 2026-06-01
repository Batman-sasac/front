import React, { useState } from 'react';
import {
    Text,
    TextInput,
    Pressable,
    StyleSheet,
} from 'react-native';
import { scale, fontScale } from '../../lib/layout';
import CharacterFormLayout from '../../components/common/CharacterFormLayout';

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
                    <Text
                        style={[
                            styles.helperText,
                            !errorText && { opacity: 0 }, // ➕ 에러 없을 때는 안 보이게(공간은 유지)
                        ]}
                    >
                        {errorText || ' '}
                    </Text>


                    <Pressable
                        style={[
                            styles.button,
                            goal.trim() === '' && { backgroundColor: '#D1D5DB' },
                        ]}
                        disabled={goal.trim() === ''}
                        onPress={() => onSubmit(Number(goal))}
                    >
                        <Text style={styles.buttonText}>확인</Text>
                    </Pressable>
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
        marginTop: scale(8),
        height: scale(64),
        borderRadius: scale(999),
        backgroundColor: '#5E82FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: fontScale(35),
        fontWeight: '700',
        color: '#ffffff',
    },
    helperText: {
        marginTop: scale(2),
        height: fontScale(14),
        fontSize: fontScale(14),
        color: '#EF4444',
        marginBottom: scale(4),
        paddingHorizontal: scale(8),
    },
});
