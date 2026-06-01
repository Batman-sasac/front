import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Alert, ActivityIndicator, Platform } from 'react-native';
import { getOAuthUrl, loginWithOAuth, loginWithApple } from '../../api/auth';
import { saveAuthData } from '../../lib/storage';
import OAuthWebView from '../../components/OAuthWebView';
import * as AppleAuthentication from 'expo-apple-authentication';
import SocialLoginButton from '../../components/auth/SocialLoginButton';

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
          await saveAuthData(response.token, response.email, 'pending', 'apple');
        }
        onNicknameRequired(response.email, response.social_id!);
      } else if (response.status === 'success') {
        await saveAuthData(response.token!, response.email, response.nickname!, 'apple');
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
          await saveAuthData(response.token, response.email, 'pending', oauthProvider);
        }

        onNicknameRequired(response.email, response.social_id!);
      } else if (response.status === 'success') {
        // 로그인 성공 - 토큰 저장
        console.log('로그인 성공:', response.email, response.nickname);
        await saveAuthData(response.token!, response.email, response.nickname!, oauthProvider);
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
        <SocialLoginButton provider="kakao" onPress={() => handleSocialLogin('kakao')} />

        {/* Apple 로그인 (iOS만) */}
        {appleAuthAvailable && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={16}
            style={styles.appleAuthButton}
            onPress={handleAppleLogin}
          />
        )}

        <SocialLoginButton
          provider="naver"
          onPress={() => handleSocialLogin('naver')}
          style={{ display: 'none' }}
        />
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
  appleAuthButton: {
    width: 309,
    height: 64,
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
