// src/components/OAuthWebView.tsx
import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, Pressable, Text, ActivityIndicator, Platform } from 'react-native';
import { scale, fontScale } from '../lib/layout';

type Props = {
    visible: boolean;
    provider: 'kakao' | 'naver';
    oauthUrl: string;
    onCode: (code: string) => void;
    onClose: () => void;
};

export default function OAuthWebView({ visible, provider, oauthUrl, onCode, onClose }: Props) {
    const [loading, setLoading] = useState(true);

    // 웹 환경에서는 팝업 윈도우 사용
    useEffect(() => {
        if (!visible || Platform.OS !== 'web') return;

        console.log('[OAuthWebView] 팝업 열기 시작:', oauthUrl);

        // 웹 환경: 새 창으로 OAuth 페이지 열기
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
            oauthUrl,
            'oauth',
            `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!popup) {
            console.error('[OAuthWebView] 팝업 차단됨');
            alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
            onClose();
            return;
        }

        console.log('[OAuthWebView] 팝업 열림 성공');

        // postMessage 이벤트 리스너
        const handleMessage = (event: MessageEvent) => {
            console.log('[OAuthWebView] postMessage 수신:', event.data);
            if (event.data && event.data.type === 'OAUTH_CODE' && event.data.code) {
                console.log('[OAuthWebView] code 추출 성공:', event.data.code);
                onCode(event.data.code);
                if (popup && !popup.closed) {
                    popup.close();
                }
                onClose();
            }
        };

        window.addEventListener('message', handleMessage);

        // 팝업이 닫혔는지 확인하는 interval (fallback)
        const interval = setInterval(() => {
            if (popup && popup.closed) {
                console.log('[OAuthWebView] 팝업이 닫혔습니다');
                clearInterval(interval);
                onClose();
            }
        }, 500);

        return () => {
            console.log('[OAuthWebView] cleanup');
            window.removeEventListener('message', handleMessage);
            clearInterval(interval);
            if (popup && !popup.closed) {
                popup.close();
            }
        };
    }, [visible, oauthUrl, onCode, onClose]);

    // 웹 환경에서는 빈 모달만 표시 (실제 OAuth는 팝업에서)
    if (Platform.OS === 'web') {
        return (
            <Modal visible={visible} transparent animationType="fade">
                <View style={styles.webOverlay}>
                    <View style={styles.webModal}>
                        <ActivityIndicator size="large" color="#5E82FF" />
                        <Text style={styles.webText}>
                            {provider === 'kakao' ? '카카오' : '네이버'} 로그인 진행 중...
                        </Text>
                        <Text style={styles.webSubText}>팝업 창에서 로그인을 완료해주세요</Text>
                        <Pressable style={styles.webCancelButton} onPress={onClose}>
                            <Text style={styles.webCancelText}>취소</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        );
    }

    // 모바일 환경: WebView 사용
    const WebView = require('react-native-webview').WebView;

    const handleNavigationStateChange = (navState: any) => {
        const { url } = navState;

        // custom scheme으로 돌아왔을 때 code 추출
        if (url.startsWith('bat://oauth-callback')) {
            const urlParams = new URLSearchParams(url.split('?')[1]);
            const code = urlParams.get('code');

            if (code) {
                onCode(code);
                onClose();
            }
            return false; // 네비게이션 중단
        }

        // 백엔드 redirect_uri로 돌아왔을 때도 code 추출 (fallback)
        if (url.includes('/auth/') && url.includes('/mobile') && url.includes('code=')) {
            const urlParams = new URLSearchParams(url.split('?')[1]);
            const code = urlParams.get('code');

            if (code) {
                onCode(code);
                onClose();
            }
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>
                        {provider === 'kakao' ? '카카오' : '네이버'} 로그인
                    </Text>
                    <Pressable style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeText}>✕</Text>
                    </Pressable>
                </View>

                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#5E82FF" />
                        <Text style={styles.loadingText}>로딩 중...</Text>
                    </View>
                )}

                <WebView
                    source={{ uri: oauthUrl }}
                    onNavigationStateChange={handleNavigationStateChange}
                    onLoadStart={() => setLoading(true)}
                    onLoadEnd={() => setLoading(false)}
                    style={styles.webview}
                    javaScriptEnabled
                    domStorageEnabled
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: scale(16),
        paddingVertical: scale(12),
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
    },
    headerTitle: {
        fontSize: fontScale(18),
        fontWeight: '700',
        color: '#111827',
    },
    closeButton: {
        padding: scale(8),
    },
    closeText: {
        fontSize: fontScale(24),
        color: '#6B7280',
    },
    webview: {
        flex: 1,
    },
    loadingContainer: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -50 }, { translateY: -50 }],
        zIndex: 1,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: scale(12),
        fontSize: fontScale(14),
        color: '#6B7280',
    },
    // 웹 환경용 스타일
    webOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    webModal: {
        backgroundColor: '#FFFFFF',
        borderRadius: scale(16),
        padding: scale(32),
        alignItems: 'center',
        minWidth: 300,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    webText: {
        marginTop: scale(16),
        fontSize: fontScale(18),
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
    },
    webSubText: {
        marginTop: scale(8),
        fontSize: fontScale(14),
        color: '#6B7280',
        textAlign: 'center',
    },
    webCancelButton: {
        marginTop: scale(24),
        paddingVertical: scale(12),
        paddingHorizontal: scale(24),
        backgroundColor: '#E5E7EB',
        borderRadius: scale(8),
    },
    webCancelText: {
        fontSize: fontScale(14),
        fontWeight: '600',
        color: '#374151',
    },
});
