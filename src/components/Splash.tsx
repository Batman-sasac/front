import React from 'react';
import { View, StyleSheet, Image, Text, useWindowDimensions } from 'react-native';

export default function Splash() {
  const { width } = useWindowDimensions();

  // 패드 기준 비율 유지용 – 화면 크기에 따라 살짝 조정
  const characterSize = Math.min(260, width * 0.35);
  const logoWidth = Math.min(200, width * 0.28);

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Image
          source={require('../../assets/character/bat-character.png')}
          style={{ width: characterSize, height: characterSize }}
          resizeMode="contain"
        />
        <Image
          source={require('../../assets/bat-logo.png')}
          style={{ width: logoWidth, height: 60, marginTop: 24 }}
          resizeMode="contain"
        />
        <Text style={styles.deviceNotice}>
          이 앱은 iPad 전용입니다.{'\n'}iPad로 접속해 주세요.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6', // 시안과 같은 연한 회색 배경
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    // 위/아래 여백은 디자인처럼 위쪽이 조금 더 많이 비어 보이도록
    marginTop: -40,
  },
  deviceNotice: {
    marginTop: 20,
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
  },
});
