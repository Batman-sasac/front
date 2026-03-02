import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Alert, ActivityIndicator, Platform } from 'react-native';
import { getOAuthUrl, loginWithOAuth, loginWithApple } from '../../api/auth';
import { saveAuthData } from '../../lib/storage';
import OAuthWebView from '../../components/OAuthWebView';
import * as AppleAuthentication from 'expo-apple-authentication';

type Props = {
  onLoginSuccess: (email: string, nickname: string) => void;
  onNicknameRequired: (email: string, socialId: string) => void;
};

export default function LoginScreen({ onLoginSuccess, onNicknameRequired }: Props) {
  const [loading, setLoading] = useState(false);
  const [showOAuthWebView, setShowOAuthWebView] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<'kakao' | 'naver'>('kakao');
  const [oauthUrl, setOauthUrl] = useState<string | null>(null);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAuthAvailable);
    }
  }, []);

  const handleSocialLogin = async (provider: 'kakao' | 'naver') => {
    setOauthProvider(provider);
    setLoading(true);
    try {
      const url = await getOAuthUrl(provider);
      setOauthUrl(url);
      setShowOAuthWebView(true);
    } catch (err) {
      console.error('OAuth URL 로드 실패:', err);
      Alert.alert('오류', err instanceof Error ? err.message : '로그인 설정을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const { identityToken } = credential;
      if (!identityToken) {
        Alert.alert('로그인 실패', 'Apple에서 인증 정보를 받지 못했습니다.');
        return;
      }
      const response = await loginWithApple(identityToken);
      if (response.status === 'NICKNAME_REQUIRED' || response.status === 'nickname_required') {
        if (response.token) {
          await saveAuthData(response.token, response.email, 'pending');
        }
        onNicknameRequired(response.email, response.social_id!);
      } else if (response.status === 'success') {
        await saveAuthData(response.token!, response.email, response.nickname!);
        onLoginSuccess(response.email, response.nickname!);
      } else {
        Alert.alert('로그인 실패', '알 수 없는 응답입니다.');
      }
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      console.error('Apple 로그인 오류:', e);
      Alert.alert(
        '로그인 실패',
        e instanceof Error ? e.message : 'Apple 로그인 중 오류가 발생했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthCode = async (code: string) => {
    try {
      setLoading(true);

      // 백엔드에 인가 코드 전송
      const response = await loginWithOAuth(oauthProvider, code);

      console.log('OAuth 응답:', response);

      if (response.status === 'NICKNAME_REQUIRED' || response.status === 'nickname_required') {
        // 닉네임 설정 필요
        console.log('닉네임 설정 필요:', response.email, response.social_id);

        // 토큰이 반환되면 임시로 저장 (닉네임 설정 API에서 사용할 수 있도록)
        if (response.token) {
          console.log('✅ 임시 토큰 저장:', response.token.substring(0, 20) + '...');
          await saveAuthData(response.token, response.email, 'pending');
        }

        onNicknameRequired(response.email, response.social_id!);
      } else if (response.status === 'success') {
        // 로그인 성공 - 토큰 저장
        console.log('로그인 성공:', response.email, response.nickname);
        await saveAuthData(response.token!, response.email, response.nickname!);
        onLoginSuccess(response.email, response.nickname!);
      } else {
        console.log('알 수 없는 응답 상태:', response);
        Alert.alert('로그인 실패', '알 수 없는 응답입니다.');
      }
    } catch (error) {
      console.error(`${oauthProvider} 로그인 오류:`, error);
      Alert.alert(
        '로그인 실패',
        error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#5E82FF" />
        <Text style={styles.loadingText}>로그인 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('../../../assets/bat-logo.png')}
        style={styles.logoImage}
        resizeMode="contain"
      />

      <View style={styles.buttonGroup}>
        {/* 카카오 로그인 */}
        <Pressable
          style={[styles.button, styles.kakao]}
          onPress={() => handleSocialLogin('kakao')}
        >
          <Image
            source={require('../../../assets/kakao.png')}
            style={styles.kakaoIcon}
            resizeMode="contain"
          />
          <Text style={styles.buttonText}>카카오로 간편 로그인</Text>
        </Pressable>

        {/* Apple 로그인 (iOS만) */}
        {appleAuthAvailable && (
          <Pressable
            style={[styles.button, styles.apple]}
            onPress={handleAppleLogin}
          >
            <Text style={styles.appleIcon}></Text>
            <Text style={[styles.buttonText, styles.appleText]}>
              Apple로 계속하기
            </Text>
          </Pressable>
        )}

        {/* 네이버 로그인 */}
        <Pressable
          style={[styles.button, styles.naver, { display: 'none' }]}
          onPress={() => handleSocialLogin('naver')}
        >
          <Text style={styles.naverIcon}>N</Text>
          <Text style={[styles.buttonText, styles.naverText]}>
            네이버로 간편 로그인
          </Text>
        </Pressable>
      </View>

      {/* OAuth WebView */}
      {oauthUrl && (
        <OAuthWebView
          visible={showOAuthWebView}
          provider={oauthProvider}
          oauthUrl={oauthUrl}
          onCode={handleOAuthCode}
          onClose={() => {
            setShowOAuthWebView(false);
            setOauthUrl(null);
          }}
        />
      )}
    </View>
  );
}

const BG = '#F3F4F6';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  logo: {
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: 4,
    color: '#5E82FF',
  },
  buttonGroup: {
    alignItems: 'center', // 가운데 정렬
    gap: 16,
  },
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
  apple: {
    backgroundColor: '#000',
  },
  appleIcon: {
    marginRight: 8,
    fontSize: 20,
    color: '#fff',
  },
  appleText: {
    color: '#fff',
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
    fontSize: 15,
    fontWeight: '600',
  },
  naverText: {
    color: '#fff',
  },
  logoImage: {
    width: 160,     // 필요하면 조정 가능
    height: 70,
    marginBottom: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#5E82FF',
  },

});
