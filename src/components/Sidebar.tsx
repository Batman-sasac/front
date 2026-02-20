import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { scale, fontScale } from '../lib/layout';

export type Screen = 'home' | 'takePicture' | 'brushup' | 'league' | 'mypage';


type Props = {
    activeScreen: Screen;
    onNavigate: (screen: Screen) => void;
    onLogout?: () => void;
};

export default function Sidebar({ activeScreen, onNavigate, onLogout }: Props) {
    return (
        <View style={styles.sidebar}>
            {/* 상단 메뉴 그룹 */}
            <View style={styles.topMenuGroup}>
                {/* 홈 */}
                <Pressable
                    style={styles.menuButton}
                    onPress={() => onNavigate('home')}
                >
                    <Image
                        source={require('../../assets/homebutton/home.png')}
                        style={[
                            styles.menuIcon,
                            activeScreen === 'home' && styles.menuIconActive
                        ]}
                        resizeMode="contain"
                    />
                    <Text style={[
                        styles.menuText,
                        activeScreen === 'home' && styles.menuTextActive
                    ]}>홈</Text>
                </Pressable>

                {/* 자료 입력 */}
                <Pressable
                    style={styles.menuButton}
                    onPress={() => onNavigate('takePicture')}
                >
                    <Image
                        source={require('../../assets/homebutton/data.png')}
                        style={[
                            styles.menuIcon,
                            activeScreen === 'takePicture' && styles.menuIconActive
                        ]}
                        resizeMode="contain"
                    />
                    <Text style={[
                        styles.menuText,
                        activeScreen === 'takePicture' && styles.menuTextActive
                    ]}>자료 입력</Text>
                </Pressable>

                {/* 복습 */}
                <Pressable
                    style={styles.menuButton}
                    onPress={() => onNavigate('brushup')}
                >
                    <Image
                        source={require('../../assets/homebutton/review.png')}
                        style={[
                            styles.menuIcon,
                            activeScreen === 'brushup' && styles.menuIconActive
                        ]}
                        resizeMode="contain"
                    />
                    <Text style={[
                        styles.menuText,
                        activeScreen === 'brushup' && styles.menuTextActive
                    ]}>복습</Text>
                </Pressable>

                {/* 리그 */}
                <Pressable
                    style={styles.menuButton}
                    onPress={() => onNavigate('league')}
                >
                    <Image
                        source={require('../../assets/homebutton/league.png')}
                        style={[
                            styles.menuIcon,
                            activeScreen === 'league' && styles.menuIconActive
                        ]}
                        resizeMode="contain"
                    />
                    <Text style={[
                        styles.menuText,
                        activeScreen === 'league' && styles.menuTextActive
                    ]}>리그</Text>
                </Pressable>

                {/* 마이 */}
                <Pressable
                    style={styles.menuButton}
                    onPress={() => onNavigate('mypage')}
                >
                    <Image
                        source={require('../../assets/homebutton/my.png')}
                        style={[
                            styles.menuIcon,
                            activeScreen === 'mypage' && styles.menuIconActive
                        ]}
                        resizeMode="contain"
                    />
                    <Text style={[
                        styles.menuText,
                        activeScreen === 'mypage' && styles.menuTextActive
                    ]}>마이</Text>
                </Pressable>
            </View>

            {/* 하단 로그아웃 */}
            <View style={styles.bottomMenuGroup}>
                <Pressable
                    style={styles.menuButton}
                    onPress={() => {
                        console.log('🚪 로그아웃 버튼 클릭됨');
                        if (onLogout) {
                            console.log('✅ onLogout 함수 호출');
                            onLogout();
                        } else {
                            console.error('❌ onLogout이 undefined입니다');
                        }
                    }}
                >
                    <Image
                        source={require('../../assets/homebutton/logout.png')}
                        style={styles.menuIcon}
                        resizeMode="contain"
                    />
                    <Text style={styles.menuText}>로그아웃</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    sidebar: {
        width: scale(80),
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: scale(20),
    },
    topMenuGroup: {
        gap: scale(16),
        alignItems: 'center',
        paddingTop: scale(16),
    },
    bottomMenuGroup: {
        gap: scale(16),
        alignItems: 'center',
        paddingBottom: scale(16),
    },
    menuButton: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(6),
    },
    menuIcon: {
        width: scale(32),
        height: scale(32),
        tintColor: '#9CA3AF',
    },
    menuText: {
        fontSize: fontScale(14),
        color: '#9CA3AF',
    },
    menuTextActive: {
        color: '#5E82FF',
        fontWeight: '700',
    },
    menuIconActive: {
        tintColor: '#5E82FF',
    },
});