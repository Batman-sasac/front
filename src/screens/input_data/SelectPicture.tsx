import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Image,
    ScrollView,
    ImageSourcePropType,
    PanResponder,
    PanResponderInstance,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { scale, fontScale } from '../../lib/layout';
import { getOcrUsage } from '../../api/ocr';

type Props = {
    sources: ImageSourcePropType[];
    onBack: () => void;
    onStartLearning: (finalSources: ImageSourcePropType[], ocrLoading?: boolean, subjectName?: string, cropInfo?: { px: number; py: number; pw: number; ph: number }) => void;
};

const BG = '#F6F7FB';
const MASK_COLOR = 'rgba(0,0,0,0.35)';
const MIN_BOX = 80;

type CropRect = { x: number; y: number; w: number; h: number };
type DisplayRect = { dx: number; dy: number; dw: number; dh: number };

function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
}

function getDisplayRect(cw: number, ch: number, iw: number, ih: number): DisplayRect {
    if (cw <= 0 || ch <= 0) return { dx: 0, dy: 0, dw: 0, dh: 0 };
    if (iw <= 0 || ih <= 0) return { dx: 0, dy: 0, dw: cw, dh: ch };

    const s = Math.min(cw / iw, ch / ih);
    const dw = iw * s;
    const dh = ih * s;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;
    return { dx, dy, dw, dh };
}

export default function SelectPicture({ sources, onBack, onStartLearning }: Props) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [rotation, setRotation] = useState(0);
    const [subjectName, setSubjectName] = useState('');  // 과목명 추가
    const [ocrUsage, setOcrUsage] = useState<{ remaining: number; pages_limit: number; status: string; message?: string } | null>(null);
    const [ocrUsageError, setOcrUsageError] = useState<string | null>(null);

    const selectedSource = useMemo(() => {
        if (!sources || sources.length === 0) return null;
        return sources[Math.min(selectedIndex, sources.length - 1)];
    }, [sources, selectedIndex]);

    const recent4 = useMemo(() => (sources || []).slice(0, 4), [sources]);

    const [containerW, setContainerW] = useState(0);
    const [containerH, setContainerH] = useState(0);

    const [imageW, setImageW] = useState(0);
    const [imageH, setImageH] = useState(0);

    const displayRect = useMemo(() => {
        return getDisplayRect(containerW, containerH, imageW, imageH);
    }, [containerW, containerH, imageW, imageH]);

    const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 0, h: 0 });

    const cropRef = useRef<CropRect>(crop);
    const displayRef = useRef<DisplayRect>(displayRect);
    const containerRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
    const imageRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

    // 웹 마우스 이벤트 처리
    const dragStateRef = useRef<{ type: 'move' | 'tl' | 'tr' | 'bl' | 'br' | null; startX: number; startY: number; startCrop: CropRect }>({
        type: null,
        startX: 0,
        startY: 0,
        startCrop: { x: 0, y: 0, w: 0, h: 0 },
    });

    // 핸들 마우스 다운 이벤트 (웹)
    const handleHandleMouseDown = (corner: 'tl' | 'tr' | 'bl' | 'br') => (e: any) => {
        if (e.preventDefault) e.preventDefault();
        dragStateRef.current = {
            type: corner,
            startX: e.clientX || e.pageX || 0,
            startY: e.clientY || e.pageY || 0,
            startCrop: { ...cropRef.current },
        };
    };

    useEffect(() => {
        cropRef.current = crop;
    }, [crop]);

    useEffect(() => {
        displayRef.current = displayRect;
    }, [displayRect]);

    useEffect(() => {
        containerRef.current = { w: containerW, h: containerH };
    }, [containerW, containerH]);

    useEffect(() => {
        imageRef.current = { w: imageW, h: imageH };
    }, [imageW, imageH]);

    useEffect(() => {
        if (!selectedSource) return;

        const anySrc: any = selectedSource;
        const uri = typeof anySrc?.uri === 'string' ? (anySrc.uri as string) : null;

        if (uri) {
            Image.getSize(
                uri,
                (w, h) => {
                    setImageW(w);
                    setImageH(h);
                },
                () => {
                    setImageW(0);
                    setImageH(0);
                }
            );
            return;
        }

        const anyImage: any = Image as any;
        if (typeof anyImage.resolveAssetSource === 'function') {
            const resolved = anyImage.resolveAssetSource(selectedSource);
            if (resolved?.width && resolved?.height) {
                setImageW(resolved.width);
                setImageH(resolved.height);
            }
        }
    }, [selectedSource]);

    useEffect(() => {
        let cancelled = false;

        const loadUsage = async () => {
            try {
                const usage = await getOcrUsage();
                if (!cancelled) {
                    setOcrUsage({
                        remaining: usage.remaining ?? 0,
                        pages_limit: usage.pages_limit ?? 0,
                        status: usage.status,
                        message: usage.message,
                    });
                    setOcrUsageError(null);
                }
            } catch (e: any) {
                if (!cancelled) {
                    setOcrUsage(null);
                    setOcrUsageError(e?.message ?? 'OCR 사용량을 불러오지 못했습니다.');
                }
            }
        };

        loadUsage();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (displayRect.dw <= 0 || displayRect.dh <= 0) return;

        const w = displayRect.dw * 0.62;
        const h = displayRect.dh * 0.56;
        const x = displayRect.dx + (displayRect.dw - w) / 2;
        const y = displayRect.dy + (displayRect.dh - h) / 2;

        setCrop({ x, y, w, h });

        // containerRef도 함께 업데이트
        containerRef.current = { w: containerW, h: containerH };
        console.log('🖼️ Crop 초기화:', { x, y, w, h }, 'Container:', { w: containerW, h: containerH });
    }, [displayRect.dx, displayRect.dy, displayRect.dw, displayRect.dh, selectedIndex, containerW, containerH]);

    const getPixelCrop = () => {
        const d = displayRef.current;
        const c = cropRef.current;
        const iw = imageRef.current.w;
        const ih = imageRef.current.h;

        if (d.dw <= 0 || d.dh <= 0 || iw <= 0 || ih <= 0) {
            return null;
        }

        const rx = (c.x - d.dx) / d.dw;
        const ry = (c.y - d.dy) / d.dh;
        const rw = c.w / d.dw;
        const rh = c.h / d.dh;

        const px = Math.round(rx * iw);
        const py = Math.round(ry * ih);
        const pw = Math.round(rw * iw);
        const ph = Math.round(rh * ih);

        return { px, py, pw, ph, imageW: iw, imageH: ih };
    };

    const [isCropping, setIsCropping] = useState(false);

    const cropImage = async () => {
        if (!selectedSource) return;

        // containerRef 업데이트 보장
        containerRef.current = { w: containerW, h: containerH };
        imageRef.current = { w: imageW, h: imageH };
        displayRef.current = displayRect;
        cropRef.current = crop;

        console.log('🖼️ cropImage 호출:', { containerW, containerH, imageW, imageH, displayRect, crop });

        const pixelCrop = getPixelCrop();
        if (!pixelCrop) {
            console.error('🖼️ 픽셀 crop 정보 없음', { displayRect, crop, containerW, containerH, imageW, imageH });
            return;
        }

        const anySrc: any = selectedSource;
        const uri = typeof anySrc?.uri === 'string' ? (anySrc.uri as string) : null;

        if (!uri || !uri.startsWith('file://')) {
            // 더미 이미지는 그대로 진행
            onStartLearning(sources, false, subjectName);
            return;
        }

        try {
            setIsCropping(true);
            console.log('Crop 좌표:', pixelCrop);

            // crop 정보를 onStartLearning에 함께 전달
            onStartLearning(sources, true, subjectName, pixelCrop);
        } catch (error) {
            console.error('Crop 에러:', error);
            alert('사진 자르기에 실패했습니다.');
        } finally {
            setIsCropping(false);
        }
    };

    const handleStart = () => {
        if (!selectedSource) return;
        cropImage();
    };

    const handleRotateLeft = () => {
        setRotation((prev) => prev - 90);
    };

    const handleRotateRight = () => {
        setRotation((prev) => prev + 90);
    };

    const createMoveResponder = (): PanResponderInstance => {
        let start: CropRect = { x: 0, y: 0, w: 0, h: 0 };

        return PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                start = { ...cropRef.current };
            },
            onPanResponderMove: (_, g) => {
                const d = displayRef.current;

                const minX = d.dx;
                const minY = d.dy;
                const maxX = d.dx + d.dw - start.w;
                const maxY = d.dy + d.dh - start.h;

                const nx = clamp(start.x + g.dx, minX, maxX);
                const ny = clamp(start.y + g.dy, minY, maxY);

                setCrop((prev) => ({ ...prev, x: nx, y: ny }));
            },
        });
    };

    const createResizeResponder = (corner: 'tl' | 'tr' | 'bl' | 'br'): PanResponderInstance => {
        let start: CropRect = { x: 0, y: 0, w: 0, h: 0 };

        return PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                start = { ...cropRef.current };
            },
            onPanResponderMove: (_, g) => {
                const d = displayRef.current;

                const minW = MIN_BOX;
                const minH = MIN_BOX;

                if (corner === 'br') {
                    const maxW = d.dx + d.dw - start.x;
                    const maxH = d.dy + d.dh - start.y;

                    const nw = clamp(start.w + g.dx, minW, maxW);
                    const nh = clamp(start.h + g.dy, minH, maxH);

                    setCrop((prev) => ({ ...prev, w: nw, h: nh }));
                    return;
                }

                if (corner === 'tr') {
                    const maxW = d.dx + d.dw - start.x;
                    const minY = d.dy;
                    const maxH = start.y + start.h - minY;

                    const nw = clamp(start.w + g.dx, minW, maxW);
                    const nh = clamp(start.h - g.dy, minH, maxH);
                    const ny = clamp(start.y + g.dy, minY, start.y + start.h - minH);

                    setCrop(() => ({ x: start.x, y: ny, w: nw, h: nh }));
                    return;
                }

                if (corner === 'bl') {
                    const minX = d.dx;
                    const maxW = start.x + start.w - minX;
                    const maxH = d.dy + d.dh - start.y;

                    const nw = clamp(start.w - g.dx, minW, maxW);
                    const nh = clamp(start.h + g.dy, minH, maxH);
                    const nx = clamp(start.x + g.dx, minX, start.x + start.w - minW);

                    setCrop(() => ({ x: nx, y: start.y, w: nw, h: nh }));
                    return;
                }

                const minX = d.dx;
                const minY = d.dy;
                const maxW = start.x + start.w - minX;
                const maxH = start.y + start.h - minY;

                const nw = clamp(start.w - g.dx, minW, maxW);
                const nh = clamp(start.h - g.dy, minH, maxH);
                const nx = clamp(start.x + g.dx, minX, start.x + start.w - minW);
                const ny = clamp(start.y + g.dy, minY, start.y + start.h - minH);

                setCrop(() => ({ x: nx, y: ny, w: nw, h: nh }));
            },
        });
    };

    const moveResponder = useRef<PanResponderInstance>(createMoveResponder()).current;
    const tlResponder = useRef<PanResponderInstance>(createResizeResponder('tl')).current;
    const trResponder = useRef<PanResponderInstance>(createResizeResponder('tr')).current;
    const blResponder = useRef<PanResponderInstance>(createResizeResponder('bl')).current;
    const brResponder = useRef<PanResponderInstance>(createResizeResponder('br')).current;

    // 웹 마우스 이벤트 핸들러
    const handleMouseDown = (type: 'move' | 'tl' | 'tr' | 'bl' | 'br') => (e: any) => {
        dragStateRef.current = {
            type,
            startX: e.clientX || e.pageX || 0,
            startY: e.clientY || e.pageY || 0,
            startCrop: { ...cropRef.current },
        };
    };

    const handleMouseMove = (e: any) => {
        if (dragStateRef.current.type === null) return;

        const moveX = (e.clientX || e.pageX || 0) - dragStateRef.current.startX;
        const moveY = (e.clientY || e.pageY || 0) - dragStateRef.current.startY;
        const start = dragStateRef.current.startCrop;
        const d = displayRef.current;
        const minW = MIN_BOX;
        const minH = MIN_BOX;

        let next: CropRect;

        if (dragStateRef.current.type === 'move') {
            const minX = d.dx;
            const minY = d.dy;
            const maxX = d.dx + d.dw - start.w;
            const maxY = d.dy + d.dh - start.h;

            next = {
                x: clamp(start.x + moveX, minX, maxX),
                y: clamp(start.y + moveY, minY, maxY),
                w: start.w,
                h: start.h,
            };
        } else if (dragStateRef.current.type === 'br') {
            const maxW = d.dx + d.dw - start.x;
            const maxH = d.dy + d.dh - start.y;
            next = {
                x: start.x,
                y: start.y,
                w: clamp(start.w + moveX, minW, maxW),
                h: clamp(start.h + moveY, minH, maxH),
            };
        } else if (dragStateRef.current.type === 'tr') {
            const maxW = d.dx + d.dw - start.x;
            const minY = d.dy;
            const maxH = start.y + start.h - minY;

            next = {
                x: start.x,
                y: clamp(start.y + moveY, minY, start.y + start.h - minH),
                w: clamp(start.w + moveX, minW, maxW),
                h: clamp(start.h - moveY, minH, maxH),
            };
        } else if (dragStateRef.current.type === 'bl') {
            const minX = d.dx;
            const maxW = start.x + start.w - minX;
            const maxH = d.dy + d.dh - start.y;

            next = {
                x: clamp(start.x + moveX, minX, start.x + start.w - minW),
                y: start.y,
                w: clamp(start.w - moveX, minW, maxW),
                h: clamp(start.h + moveY, minH, maxH),
            };
        } else {
            // tl
            const minX = d.dx;
            const minY = d.dy;
            const maxW = start.x + start.w - minX;
            const maxH = start.y + start.h - minY;

            next = {
                x: clamp(start.x + moveX, minX, start.x + start.w - minW),
                y: clamp(start.y + moveY, minY, start.y + start.h - minH),
                w: clamp(start.w - moveX, minW, maxW),
                h: clamp(start.h - moveY, minH, maxH),
            };
        }

        setCrop(next);
    };

    const handleMouseUp = () => {
        dragStateRef.current.type = null;
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const overlayStyles = useMemo(() => {
        const cw = containerRef.current.w;
        const ch = containerRef.current.h;
        const c = cropRef.current;

        const topH = clamp(c.y, 0, ch);
        const bottomTop = clamp(c.y + c.h, 0, ch);
        const bottomH = clamp(ch - bottomTop, 0, ch);

        const leftW = clamp(c.x, 0, cw);
        const rightLeft = clamp(c.x + c.w, 0, cw);
        const rightW = clamp(cw - rightLeft, 0, cw);

        return {
            top: { height: topH },
            bottom: { top: bottomTop, height: bottomH },
            left: { top: c.y, height: c.h, width: leftW },
            right: { left: rightLeft, top: c.y, height: c.h, width: rightW },
            frame: { left: c.x, top: c.y, width: c.w, height: c.h },
        };
    }, [crop, containerW, containerH]);

    const limitReached = ocrUsage?.status === 'limit_reached';

    return (
        <View style={styles.root}>
            <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
                <Image
                    source={require('../../../assets/shift.png')}
                    style={styles.backIcon}
                    resizeMode="contain"
                />
            </Pressable>

            <View style={styles.centerWrap}>
                <Text style={styles.guide}>원하는 개념 한 가지만 포함되도록 잘라주세요.</Text>

                {ocrUsage && (
                    <View style={styles.usageChip}>
                        <Text style={styles.usageText}>
                            OCR 남은 횟수 {ocrUsage.remaining}/{ocrUsage.pages_limit}
                        </Text>
                    </View>
                )}
                {ocrUsageError && (
                    <Text style={styles.usageErrorText}>{ocrUsageError}</Text>
                )}
                {limitReached && ocrUsage?.message && !ocrUsageError && (
                    <Text style={styles.usageErrorText}>{ocrUsage.message}</Text>
                )}

                <TextInput
                    style={styles.subjectInput}
                    placeholder="과목명 입력 (예: 수학, 영어)"
                    placeholderTextColor="#999"
                    value={subjectName}
                    onChangeText={setSubjectName}
                />

                <View style={styles.previewWrap}>
                    {selectedSource ? (
                        <View
                            style={styles.previewInner}
                            onLayout={(e) => {
                                const { width, height } = e.nativeEvent.layout;
                                setContainerW(width);
                                setContainerH(height);
                            }}
                        >
                            <Image source={selectedSource} style={[styles.previewImage, { transform: [{ rotate: `${rotation}deg` }] }]} resizeMode="contain" />

                            <View style={styles.cropArea}>
                                <View style={[styles.maskTop, overlayStyles.top, { pointerEvents: 'none' }]} />
                                <View style={[styles.maskBottom, overlayStyles.bottom, { pointerEvents: 'none' }]} />
                                <View style={[styles.maskLeft, overlayStyles.left, { pointerEvents: 'none' }]} />
                                <View style={[styles.maskRight, overlayStyles.right, { pointerEvents: 'none' }]} />

                                <View style={[styles.cropFrame, overlayStyles.frame, { pointerEvents: 'box-only' }]} {...moveResponder.panHandlers}>
                                    <View style={[styles.cropCornerTL, { pointerEvents: 'none' }]} />
                                    <View style={[styles.cropCornerTR, { pointerEvents: 'none' }]} />
                                    <View style={[styles.cropCornerBL, { pointerEvents: 'none' }]} />
                                    <View style={[styles.cropCornerBR, { pointerEvents: 'none' }]} />

                                    <View
                                        style={[styles.handle, styles.handleTL, { pointerEvents: 'auto' }]}
                                        {...tlResponder.panHandlers}
                                    >
                                        <View style={[styles.handleDot, { pointerEvents: 'none' }]} />
                                    </View>
                                    <View
                                        style={[styles.handle, styles.handleTR, { pointerEvents: 'auto' }]}
                                        {...trResponder.panHandlers}
                                    >
                                        <View style={[styles.handleDot, { pointerEvents: 'none' }]} />
                                    </View>
                                    <View
                                        style={[styles.handle, styles.handleBL, { pointerEvents: 'auto' }]}
                                        {...blResponder.panHandlers}
                                    >
                                        <View style={[styles.handleDot, { pointerEvents: 'none' }]} />
                                    </View>
                                    <View
                                        style={[styles.handle, styles.handleBR, { pointerEvents: 'auto' }]}
                                        {...brResponder.panHandlers}
                                    >
                                        <View style={[styles.handleDot, { pointerEvents: 'none' }]} />
                                    </View>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>선택된 이미지가 없습니다.</Text>
                        </View>
                    )}
                </View>

                {/* 회전 버튼들 - 사진 밖에 배치 */}
                <View style={styles.rotateRow}>
                    <Pressable style={styles.rotateBtnLeft} onPress={handleRotateLeft} hitSlop={10}>
                        <Image
                            source={require('../../../assets/turn-icon.png')}
                            style={styles.rotateIcon}
                            resizeMode="contain"
                        />
                    </Pressable>

                    <Pressable style={styles.rotateBtnRight} onPress={handleRotateRight} hitSlop={10}>
                        <Image
                            source={require('../../../assets/turn-icon.png')}
                            style={[styles.rotateIcon, styles.rotateRight]}
                            resizeMode="contain"
                        />
                    </Pressable>
                </View>

                <View style={styles.recentWrap}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.recentRow}
                    >
                        {recent4.map((src, idx) => {
                            const active = idx === selectedIndex;
                            return (
                                <Pressable
                                    key={String(idx)}
                                    onPress={() => setSelectedIndex(idx)}
                                    style={[styles.thumbBtn, active && styles.thumbBtnActive]}
                                >
                                    <Image source={src} style={styles.thumb} />
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>

            <Pressable
                style={[styles.fab, (!sources || sources.length === 0 || isCropping || limitReached) && { opacity: 0.5 }]}
                onPress={handleStart}
                disabled={!sources || sources.length === 0 || isCropping || limitReached}
            >
                {isCropping ? (
                    <ActivityIndicator size="large" color="#FFFFFF" />
                ) : (
                    <Image
                        source={require('../../../assets/study/start-study-button.png')}
                        style={styles.fabImage}
                        resizeMode="contain"
                    />
                )}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BG,
    },

    backBtn: {
        position: 'absolute',
        left: scale(18),
        top: scale(22),
        width: scale(44),
        height: scale(44),
        borderRadius: scale(22),
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    backIcon: {
        width: scale(20),
        height: scale(20),
        transform: [{ rotate: '180deg' }],
    },

    centerWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(16),
        paddingTop: scale(60),
        paddingBottom: scale(24),
    },

    guide: {
        textAlign: 'center',
        fontSize: fontScale(18),
        fontWeight: '800',
        color: '#111827',
        marginBottom: scale(12),
        lineHeight: fontScale(26),
    },
    usageChip: {
        alignSelf: 'center',
        backgroundColor: '#EEF2FF',
        paddingHorizontal: scale(12),
        paddingVertical: scale(6),
        borderRadius: scale(999),
        marginBottom: scale(10),
    },
    usageText: {
        color: '#4338CA',
        fontSize: fontScale(12),
        fontWeight: '700',
    },
    usageErrorText: {
        color: '#EF4444',
        fontSize: fontScale(11),
        fontWeight: '700',
        marginBottom: scale(8),
        textAlign: 'center',
    },

    subjectInput: {
        width: '100%',
        maxWidth: scale(350),
        paddingHorizontal: scale(12),
        paddingVertical: scale(10),
        marginBottom: scale(20),
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: scale(8),
        fontSize: fontScale(14),
        color: '#111827',
        backgroundColor: '#FFFFFF',
    },

    previewWrap: {
        width: '100%',
        maxWidth: scale(550),
        height: scale(380),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scale(12),
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    previewInner: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },

    empty: {
        width: '100%',
        height: '100%',
        borderRadius: scale(16),
        backgroundColor: 'rgba(0,0,0,0.04)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: '#9CA3AF',
        fontSize: fontScale(13),
        fontWeight: '700',
    },

    cropArea: {
        position: 'absolute',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
    },

    maskTop: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        backgroundColor: MASK_COLOR,
    },
    maskBottom: {
        position: 'absolute',
        left: 0,
        width: '100%',
        backgroundColor: MASK_COLOR,
    },
    maskLeft: {
        position: 'absolute',
        left: 0,
        backgroundColor: MASK_COLOR,
    },
    maskRight: {
        position: 'absolute',
        backgroundColor: MASK_COLOR,
    },

    cropFrame: {
        position: 'absolute',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.9)',
    },

    cropCornerTL: {
        position: 'absolute',
        left: 6,
        top: 6,
        width: 18,
        height: 18,
        borderLeftWidth: 2,
        borderTopWidth: 2,
        borderColor: '#FFFFFF',
    },
    cropCornerTR: {
        position: 'absolute',
        right: 6,
        top: 6,
        width: 18,
        height: 18,
        borderRightWidth: 2,
        borderTopWidth: 2,
        borderColor: '#FFFFFF',
    },
    cropCornerBL: {
        position: 'absolute',
        left: 6,
        bottom: 6,
        width: 18,
        height: 18,
        borderLeftWidth: 2,
        borderBottomWidth: 2,
        borderColor: '#FFFFFF',
    },
    cropCornerBR: {
        position: 'absolute',
        right: 6,
        bottom: 6,
        width: 18,
        height: 18,
        borderRightWidth: 2,
        borderBottomWidth: 2,
        borderColor: '#FFFFFF',
    },

    handle: {
        position: 'absolute',
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        opacity: 1,
        cursor: 'pointer',
    } as any,
    handleDot: {
        width: 12,
        height: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#FFFFFF',
        cursor: 'pointer',
    } as any,
    handleTL: { left: -12, top: -12, cursor: 'nwse-resize' } as any,
    handleTR: { right: -12, top: -12, cursor: 'nesw-resize' } as any,
    handleBL: { left: -12, bottom: -12, cursor: 'nesw-resize' } as any,
    handleBR: { right: -12, bottom: -12, cursor: 'nwse-resize' } as any,

    rotateRow: {
        width: '100%',
        maxWidth: scale(550),
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: scale(16),
        marginTop: scale(12),
        marginBottom: scale(12),
    },
    rotateBtnLeft: {
        width: scale(48),
        height: scale(48),
        alignItems: 'center',
        justifyContent: 'center',
    },
    rotateBtnRight: {
        width: scale(48),
        height: scale(48),
        alignItems: 'center',
        justifyContent: 'center',
    },
    rotateIcon: {
        width: scale(28),
        height: scale(28),
        tintColor: '#1F2937',
    },
    rotateRight: {
        transform: [{ scaleX: -1 }],
    },

    recentWrap: {
        width: '100%',
        maxWidth: scale(550),
        height: scale(90),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scale(8),
    },
    recentRow: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(16),
        paddingHorizontal: scale(16),
    },
    thumbBtn: {
        borderRadius: scale(14),
        borderWidth: 3,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    thumbBtnActive: {
        borderColor: '#5E82FF',
        shadowColor: '#5E82FF',
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    thumb: {
        width: scale(70),
        height: scale(70),
        borderRadius: scale(11),
    },

    fab: {
        position: 'absolute',
        right: scale(28),
        bottom: scale(28),
        width: scale(128),
        height: scale(128),
        borderRadius: 0,
        zIndex: 10,
        elevation: 5,
        shadowColor: '#5E82FF',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    fabImage: {
        width: '100%',
        height: '100%',
    },
});