import React, { useState } from 'react';
import {
    Text,
    View,
    StyleSheet,
    TextInput,
    Pressable,
    Alert,
} from 'react-native';
import { scale, fontScale } from '../../lib/layout';
import { setNickname } from '../../api/auth';
import { saveAuthData } from '../../lib/storage';
import CharacterFormLayout from '../../components/common/CharacterFormLayout';
import FormHelperText from '../../components/common/FormHelperText';
import FormSubmitButton from '../../components/common/FormSubmitButton';

type Props = {
    email: string;
    socialId: string;
    onNicknameSet: (email: string, nickname: string) => void;
};

export default function NicknameScreen({ email, socialId, onNicknameSet }: Props) {
    const [nickname, setNicknameValue] = useState('');
    const [errorText, setErrorText] = useState('');
    const [loading, setLoading] = useState(false);

    const trimmed = nickname.trim();
    const isValid = trimmed.length >= 2 && trimmed.length <= 10 && !errorText;

    const handleClear = () => {
        setNicknameValue('');
        setErrorText('');
    };

    const handleSubmit = async () => {
        if (!isValid || loading) return;

        try {
            setLoading(true);

            // 백엔드에 닉네임 설정 요청
            const response = await setNickname(trimmed, email, socialId);

            // 토큰 저장
            await saveAuthData(response.token, response.email, response.nickname);

            // 완료 콜백 호출
            onNicknameSet(response.email, response.nickname);

        } catch (error) {
            console.error('닉네임 설정 오류:', error);
            Alert.alert(
                '오류',
                error instanceof Error ? error.message : '닉네임 설정에 실패했습니다.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleChangeNickname = (text: string) => {
        setNicknameValue(text);

        if (text.length === 0) {
            setErrorText('');
            return;
        }

        if (text.length < 2) {
            setErrorText('닉네임이 너무 짧습니다. 최소 2자 이상 입력해 주세요');
            return;
        }

        if (text.length > 10) {
            setErrorText('닉네임이 너무 깁니다. 최대 10자 이내로 입력해 주세요');
            return;
        }

        setErrorText('');
    };

    return (
        <CharacterFormLayout>
                {/* 왼쪽 캐릭터 */}

                {/* 오른쪽 입력 영역 */}
                    <Text style={styles.title}>닉네임을 입력해주세요!</Text>

                    <View style={styles.inputWrapper}>
                        <TextInput
                            value={nickname}
                            onChangeText={handleChangeNickname}
                            placeholder="닉네임 입력"
                            placeholderTextColor="#9CA3AF"
                            style={styles.input}
                        />

                        {nickname.length > 0 && (
                            <Pressable style={styles.clearBtn} onPress={handleClear}>
                                <Text style={styles.clearText}>✕</Text>
                            </Pressable>
                        )}
                    </View>

                    <FormHelperText visible={Boolean(errorText)}>
                        {errorText}
                    </FormHelperText>

                    <FormSubmitButton
                        label="확인"
                        onPress={handleSubmit}
                        disabled={!isValid || loading}
                        loading={loading}
                    />
        </CharacterFormLayout>
    );
}

const styles = StyleSheet.create({
    title: {
        fontSize: fontScale(28),
        fontWeight: '800',
        marginBottom: scale(24),
    },
    inputWrapper: {
        marginBottom: scale(4),
        position: 'relative',
    },
    input: {
        borderBottomWidth: 1,
        borderBottomColor: '#D1D5DB',
        paddingVertical: scale(10),
        paddingRight: scale(32),
        fontSize: fontScale(18),
        paddingHorizontal: scale(8),
    },
    clearBtn: {
        position: 'absolute',
        right: scale(4),
        top: '50%',
        marginTop: -scale(16),
        paddingHorizontal: scale(4),
        paddingVertical: scale(4),
    },
    clearText: {
        fontSize: fontScale(16),
        color: '#9CA3AF',
    },
});
