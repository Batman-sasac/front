import React from 'react';
import { Image, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

type Provider = 'kakao' | 'naver';

type Props = {
  provider: Provider;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function SocialLoginButton({ provider, onPress, style }: Props) {
  const isKakao = provider === 'kakao';

  return (
    <Pressable
      style={[styles.button, isKakao ? styles.kakao : styles.naver, style]}
      onPress={onPress}
    >
      {isKakao ? (
        <Image
          source={require('../../../assets/kakao.png')}
          style={styles.kakaoIcon}
          resizeMode="contain"
        />
      ) : (
        <Text style={styles.naverIcon}>N</Text>
      )}
      <Text style={[styles.buttonText, !isKakao && styles.naverText]}>
        {isKakao ? '카카오로 간편 로그인' : '네이버로 간편 로그인'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 309,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    elevation: 2,
  },
  kakao: {
    backgroundColor: '#FEE500',
  },
  naver: {
    backgroundColor: '#03C75A',
  },
  kakaoIcon: {
    width: 18,
    height: 18,
    marginRight: 8,
  },
  naverIcon: {
    marginRight: 8,
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  buttonText: {
    fontSize: 22,
    fontWeight: '600',
  },
  naverText: {
    color: '#fff',
  },
});
