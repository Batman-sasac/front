import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Platform, ImageSourcePropType } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { scale, fontScale } from '../../lib/layout';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
    onBack: () => void;
    onDone: (sources: ImageSourcePropType[]) => void;
};

type TimerSec = 0 | 3 | 5 | 10;
type Facing = 'back' | 'front';
type Flash = 'off' | 'on' | 'auto';

const BG = '#0B0F1A';

export default function TakePicture({ onBack, onDone }: Props) {
    const cameraRef = useRef<CameraView | null>(null);
    const insets = useSafeAreaInsets();

    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [hasMediaPermission, setHasMediaPermission] = useState<boolean | null>(null);

    const [facing, setFacing] = useState<Facing>('back');
    const [flash, setFlash] = useState<Flash>('off');
    const [timer, setTimer] = useState<TimerSec>(0);

    const [countdown, setCountdown] = useState<number>(0);
    const [isCounting, setIsCounting] = useState(false);

    const [shots, setShots] = useState<ImageSourcePropType[]>([]);

    useEffect(() => {
        (async () => {
            const media = await ImagePicker.requestMediaLibraryPermissionsAsync();
            setHasMediaPermission(media.status === 'granted');

            if (!cameraPermission?.granted) {
                await requestCameraPermission();
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const canShoot = useMemo(() => {
        return cameraPermission?.granted === true && !isCounting;
    }, [cameraPermission?.granted, isCounting]);

    const toggleTimer = () => {
        setTimer((prev) => {
            if (prev === 0) return 3;
            if (prev === 3) return 5;
            if (prev === 5) return 10;
            return 0;
        });
    };

    const toggleFlash = () => {
        setFlash((prev) => (prev === 'off' ? 'on' : prev === 'on' ? 'auto' : 'off'));
    };

    const toggleFacing = () => {
        setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
    };

    const [isCameraActive, setIsCameraActive] = useState<boolean>(true);

    const handlePickFromGallery = async () => {
        if (hasMediaPermission !== true) return;
        // 카메라 꺼서 메모리 확보
        setIsCameraActive(false);

        // 카메라가 언마운트될 시간을 잠시 줍니다
        setTimeout(async () => {
            try {
                const res = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsEditing: false, // 커스텀 편집 화면을 쓸 것이므로 false
                    allowsMultipleSelection: true,
                    selectionLimit: 20,
                    quality: 1,           // 일단 고화질로 가져오되 아래서 줄임
                });

                if (!res.canceled && res.assets?.length) {
                    const resizedSources: ImageSourcePropType[] = [];

                    for (const asset of res.assets) {
                        if (!asset.uri) continue;

                        // [강조] 이 부분이 핵심입니다! 사진 크기를 강제로 줄여서 메모리를 확보합니다.
                        const manipulated = await ImageManipulator.manipulateAsync(
                            asset.uri,
                            [{ resize: { width: 1200 } }], // 가로를 1200px로 축소 (비율 자동 유지)
                            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                        );

                        resizedSources.push({ uri: manipulated.uri } as ImageSourcePropType);
                        console.log('✅ 리사이징 완료:', manipulated.uri);
                    }

                    if (resizedSources.length > 0) {
                        setShots((prev) => [...prev, ...resizedSources]);
                    }
                }
            } catch (e) {
                console.error('갤러리 처리 에러:', e);
            } finally {
                // 작업이 끝나면 상황에 따라 카메라를 켭니다. 
                // 바로 편집화면으로 넘어간다면 여기서는 true를 안 해도 됩니다.
                setIsCameraActive(true);
            }
        }, 200);
    };


    const handlePickDocument = async () => {
        try {
            const isWeb = typeof window !== 'undefined' && !Platform.OS || Platform.OS === 'web';
            console.log('📁 문서선택 시작, Platform.OS:', Platform.OS, 'isWeb:', isWeb);

            if (isWeb) {
                // 웹: HTML file input 사용 (이미지만)
                console.log('📁 웹 환경에서 file input 사용');
                const input = document.createElement('input') as HTMLInputElement;
                input.type = 'file';
                input.accept = 'image/*';  // 이미지만 허용
                input.multiple = true;

                input.onchange = async (e: any) => {
                    const files = e.target.files;
                    console.log('📁 선택된 파일 개수:', files.length);

                    for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        console.log('📁 파일:', file.name, '타입:', file.type, '크기:', file.size);

                        // PDF 파일 거부
                        if (file.type === 'application/pdf') {
                            console.error('❌ PDF 파일은 지원하지 않습니다:', file.name);
                            alert('PDF 파일은 지원하지 않습니다.\n이미지 파일(JPG, PNG 등)만 선택해주세요.');
                            continue;
                        }

                        // 이미지 파일만 허용
                        if (!file.type.startsWith('image/')) {
                            console.error('❌ 이미지가 아닌 파일:', file.name, file.type);
                            alert('이미지 파일만 선택해주세요.');
                            continue;
                        }

                        const reader = new FileReader();

                        reader.onload = () => {
                            const dataUrl = reader.result as string;
                            console.log('📁 파일 읽기 완료:', file.name);
                            setShots((prev) => {
                                const updated = [...prev, { uri: dataUrl }];
                                console.log('📁 업데이트 후 shots 길이:', updated.length);
                                return updated;
                            });
                        };

                        reader.onerror = () => {
                            console.error('📁 파일 읽기 실패:', file.name);
                        };

                        reader.readAsDataURL(file);
                    }
                };

                input.click();
            } else {
                // 네이티브: 문서 선택기 사용
                console.log('📁 네이티브 환경에서 문서 선택');
                const res = await DocumentPicker.getDocumentAsync({
                    type: 'image/*',
                    multiple: true,
                    copyToCacheDirectory: false,
                });

                if (res.canceled || !res.assets || res.assets.length === 0) return;

                const sources = res.assets.map((a) => {
                    console.log('📁 선택된 문서:', a.uri);
                    return { uri: a.uri } as ImageSourcePropType;
                });

                setShots((prev) => {
                    const updated = [...prev, ...sources];
                    console.log('📁 업데이트 후 shots 길이:', updated.length);
                    return updated;
                });
            }
        } catch (e) {
            console.error('📁 파일 선택 실패:', e);
        }
    };

    const shootNow = async () => {
        try {
            if (!cameraRef.current) return;

            const cam: any = cameraRef.current;
            const photo = await cam.takePictureAsync({
                quality: 0.8,
                skipProcessing: Platform.OS === 'android' ? false : false,
            });

            if (photo?.uri) {
                const manipulated = await ImageManipulator.manipulateAsync(
                    photo.uri,
                    [{ resize: { width: 1440 } }],
                    { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
                );
                setShots((prev) => [{ uri: manipulated.uri } as ImageSourcePropType, ...prev]);
            }
        } catch (e) {
            console.log('촬영 실패:', e);
        }
    };

    const handleShutter = async () => {
        if (!canShoot) return;

        if (timer === 0) {
            await shootNow();
            return;
        }

        setIsCounting(true);
        setCountdown(timer);

        let t = timer;
        const id = setInterval(async () => {
            t -= 1;
            setCountdown(t);

            if (t <= 0) {
                clearInterval(id);
                setIsCounting(false);
                setCountdown(0);
                await shootNow();
            }
        }, 1000);
    };

    const handleDone = () => {
        console.log('✅ 촬영 완료 클릭, shots 길이:', shots.length);
        if (shots.length === 0) {
            console.log('❌ shots이 비어있음');
            return;
        }
        console.log('✅ onDone 호출, 소스 개수:', shots.length);
        setIsCameraActive(false);
        onDone(shots);
    };

    if (cameraPermission?.granted === false) {
        return (
            <View style={[styles.root, styles.center]}>
                <Text style={{ color: '#fff', marginBottom: scale(12) }}>
                    카메라 권한이 필요합니다.
                </Text>

                <Pressable style={styles.primaryBtn} onPress={requestCameraPermission}>
                    <Text style={styles.primaryBtnText}>권한 요청</Text>
                </Pressable>

                <Pressable
                    style={[
                        styles.primaryBtn,
                        { marginTop: scale(10), backgroundColor: '#22C55E' },
                    ]}
                    onPress={() => {
                        onDone([
                            require('../../../assets/ocr-test.png'),
                        ]);
                    }}
                >
                    <Text style={styles.primaryBtnText}>🧪 OCR 테스트 (스크린샷)</Text>
                </Pressable>

                <Pressable
                    style={[
                        styles.primaryBtn,
                        { marginTop: scale(10), backgroundColor: '#3B82F6' },
                    ]}
                    onPress={() => {
                        onDone([
                            require('../../../assets/dummy/text1.jpg'),
                            require('../../../assets/dummy/text2.jpg'),
                            require('../../../assets/dummy/text3.jpg'),
                            require('../../../assets/dummy/text4.jpg'),
                        ]);
                    }}
                >
                    <Text style={styles.primaryBtnText}>(임시) 더미 이미지 테스트</Text>
                </Pressable>

                <Pressable
                    style={[
                        styles.primaryBtn,
                        { marginTop: scale(10), backgroundColor: 'rgba(255,255,255,0.15)' },
                    ]}
                    onPress={onBack}
                >
                    <Text style={styles.primaryBtnText}>뒤로가기</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <View style={styles.cameraWrap}>
                {isCameraActive && (
                    <CameraView
                        ref={cameraRef}
                        style={StyleSheet.absoluteFillObject}
                        facing={facing}
                        flash={flash}
                        ratio="16:9"
                    />
                )}

                <View style={[styles.topBar, { top: insets.top + scale(8) }]}>
                    <Pressable style={styles.backChip} onPress={onBack}>
                        <Image
                            source={require('../../../assets/shift.png')}
                            style={styles.backIcon}
                            resizeMode="contain"
                        />
                    </Pressable>
                    <Text style={styles.topTitle}>자료 입력</Text>
                    <View style={{ width: scale(28) }} />
                </View>

                {isCounting && countdown > 0 && (
                    <View style={styles.countOverlay}>
                        <Text style={styles.countText}>{countdown}</Text>
                    </View>
                )}

                <View style={styles.rightButtons}>
                    {/* 타이머 버튼 */}
                    <View style={styles.timerBtnGroup}>
                        <Pressable style={styles.iconBtn} onPress={toggleTimer}>
                            <Image
                                source={require('../../../assets/take-picture/timer.png')}
                                style={styles.icon}
                                resizeMode="contain"
                            />
                        </Pressable>
                        <Text style={styles.timerLabel}>{timer === 0 ? 'OFF' : `${timer}s`}</Text>
                    </View>

                    {/* 플래시 버튼 */}
                    <Pressable style={styles.iconBtn} onPress={toggleFlash}>
                        <Image
                            source={require('../../../assets/take-picture/flash.png')}
                            style={styles.icon}
                            resizeMode="contain"
                        />
                    </Pressable>

                    {/* 전환 버튼 */}
                    <Pressable style={styles.iconBtn} onPress={toggleFacing}>
                        <Image
                            source={require('../../../assets/take-picture/turn.png')}
                            style={styles.icon}
                            resizeMode="contain"
                        />
                    </Pressable>

                    {/* 촬영 버튼 (중앙) */}
                    <Pressable style={[styles.shutterOuter, !canShoot && { opacity: 0.5 }]} onPress={handleShutter}>
                        <Image
                            source={require('../../../assets/take-picture/take_picture.png')}
                            style={styles.shutterImage}
                            resizeMode="contain"
                        />
                    </Pressable>

                    {/* 최신 사진 썸네일 */}
                    {false && shots.length > 0 && (
                        <View style={styles.thumbnailContainer}>
                            <Image source={shots[0]} style={styles.thumbnailImage} />
                        </View>
                    )}

                    {/* 갤러리 선택 버튼 */}
                    <Pressable style={styles.iconBtn} onPress={handlePickFromGallery}>
                        {shots.length > 0 ? (
                            <View style={styles.thumbnailContainer}>
                                <Image source={shots[0]} style={styles.thumbnailImage} />
                            </View>
                        ) : (
                            <Image
                                source={require('../../../assets/take-picture/select_photo.png')}
                                style={styles.icon}
                                resizeMode="contain"
                            />
                        )}
                    </Pressable>

                    {/* 문서/PDF 선택 버튼 */}
                    <Pressable style={styles.iconBtn} onPress={handlePickDocument}>
                        <Image
                            source={require('../../../assets/take-picture/select_folder.png')}
                            style={styles.icon}
                            resizeMode="contain"
                        />
                    </Pressable>


                    {/* 촬영 완료 버튼 */}
                    <Pressable
                        style={[styles.finishBtn, shots.length === 0 && { opacity: 0.5 }]}
                        onPress={handleDone}
                        disabled={shots.length === 0}
                    >
                        <Image
                            source={require('../../../assets/take-picture/finish_takePicture.png')}
                            style={styles.finishImage}
                            resizeMode="contain"
                        />
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: BG },
    cameraWrap: { flex: 1 },

    center: { justifyContent: 'center', alignItems: 'center' },
    primaryBtn: {
        paddingHorizontal: scale(14),
        paddingVertical: scale(10),
        borderRadius: scale(14),
        backgroundColor: '#5E82FF',
    },
    primaryBtnText: { color: '#fff', fontSize: fontScale(13), fontWeight: '800' },

    topBar: {
        position: 'absolute',
        top: scale(18),
        left: scale(16),
        right: scale(16),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 5,
    },
    topTitle: { color: '#fff', fontSize: fontScale(16), fontWeight: '800' },
    backChip: {
        width: scale(28),
        height: scale(28),
        borderRadius: scale(14),
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backIcon: {
        width: scale(18),
        height: scale(18),
        transform: [{ rotate: '180deg' }],
    },

    rightButtons: {
        position: 'absolute',
        right: scale(16),
        top: scale(80),
        bottom: scale(160),
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(10),
        zIndex: 5,
    },
    timerBtnGroup: {
        alignItems: 'center',
        gap: scale(2),
    },
    iconBtn: {
        width: scale(48),
        height: scale(48),
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        width: scale(40),
        height: scale(40),
    },
    timerLabel: {
        color: '#fff',
        fontSize: fontScale(10),
        fontWeight: '600',
    },

    shutterOuter: {
        width: scale(70),
        height: scale(70),
        borderRadius: scale(35),
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: scale(8),
    },
    shutterImage: {
        width: scale(60),
        height: scale(60),
    },

    finishBtn: {
        width: scale(48),
        height: scale(48),
        borderRadius: scale(24),
        alignItems: 'center',
        justifyContent: 'center',
    },
    finishImage: {
        width: scale(60),
        height: scale(60),
    },

    thumbnailContainer: {
        width: scale(48),
        height: scale(48),
        alignItems: 'center',
        justifyContent: 'center',
    },
    thumbnailImage: {
        width: scale(44),
        height: scale(44),
        borderRadius: scale(8),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.35)',
    },

    documentIcon: {
        fontSize: 0,
        width: 0,
        height: 0,
    },

    bottomThumbs: {
        position: 'absolute',
        right: scale(16),
        top: '50%',
        marginTop: scale(120),
        alignItems: 'center',
        gap: scale(4),
        zIndex: 4,
    },
    thumb: {
        width: scale(44),
        height: scale(44),
        borderRadius: scale(10),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.35)',
    },
    moreText: { color: '#fff', fontSize: fontScale(12), fontWeight: '800', marginLeft: scale(4) },

    countOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 6,
    },
    countText: { color: '#fff', fontSize: fontScale(72), fontWeight: '900' },
});
