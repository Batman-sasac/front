import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { CameraView } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CameraIconButton from "../../components/inputData/CameraIconButton";
import SelectedSourceStrip from "../../components/inputData/SelectedSourceStrip";
import StudySourcePreview from "../../components/inputData/StudySourcePreview";
import { scale } from "../../lib/layout";
import type { StudySource } from "./studySource";
import { useTakePictureController } from "./takePicture/hooks/useTakePictureController";
import { styles } from "./takePicture/styles/TakePicture.styles";

type Props = {
  onBack: () => void;
  onDone: (sources: StudySource[]) => void;
};

const getShotKey = (shot: StudySource, index: number) =>
  shot.uri ? `uri-${shot.uri}-${index}` : `shot-${index}`;

export default function TakePicture({ onBack, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const controller = useTakePictureController({ onDone });
  const visibleShotCount = Math.min(controller.shots.length, 4);
  const selectedShotListWidth =
    visibleShotCount * scale(46) +
    Math.max(visibleShotCount - 1, 0) * scale(8) +
    scale(8);

  if (!controller.cameraPermission) {
    return (
      <CameraPermissionState
        message="카메라 권한 상태를 확인 중입니다."
        onBack={onBack}
      />
    );
  }

  if (!controller.cameraPermission.granted) {
    return (
      <CameraPermissionState
        message="카메라 권한이 필요합니다."
        onRequestPermission={controller.handleRequestCameraPermission}
        onBack={onBack}
      />
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.cameraWrap}>
        {controller.isCameraActive && (
          <CameraView
            ref={controller.cameraRef}
            style={styles.cameraFill}
            facing={controller.facing}
            flash={controller.flash}
            ratio="16:9"
          />
        )}

        <View style={[styles.topBar, { top: insets.top + scale(8) }]}>
          <Pressable style={styles.backChip} onPress={onBack}>
            <Image
              source={require("../../../assets/shift.png")}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </Pressable>
          <Text style={styles.topTitle}>자료 입력</Text>
          <View style={styles.topBarSpacer} />
        </View>

        {controller.isCounting && controller.countdown > 0 && (
          <View style={styles.countOverlay}>
            <Text style={styles.countText}>{controller.countdown}</Text>
          </View>
        )}

        <View style={styles.rightButtons}>
          <View style={styles.timerBtnGroup}>
            <CameraIconButton
              source={require("../../../assets/take-picture/timer.png")}
              onPress={controller.toggleTimer}
            />
            <Text style={styles.timerLabel}>
              {controller.timer === 0 ? "OFF" : `${controller.timer}s`}
            </Text>
          </View>

          <CameraIconButton
            source={require("../../../assets/take-picture/flash.png")}
            onPress={controller.toggleFlash}
          />
          <CameraIconButton
            source={require("../../../assets/take-picture/turn.png")}
            onPress={controller.toggleFacing}
          />

          <Pressable
            style={[
              styles.shutterOuter,
              !controller.canShoot && { opacity: 0.5 },
            ]}
            onPress={controller.handleShutter}
          >
            <Image
              source={require("../../../assets/take-picture/take_picture.png")}
              style={styles.shutterImage}
              resizeMode="contain"
            />
          </Pressable>

          <CameraIconButton
            source={require("../../../assets/take-picture/select_photo.png")}
            onPress={controller.handlePickFromGallery}
          />
          <CameraIconButton
            source={require("../../../assets/take-picture/select_folder.png")}
            onPress={controller.handlePickDocument}
          />

          {controller.shots.length > 0 && (
            <View style={styles.thumbnailAnchor}>
              <Pressable
                style={styles.iconBtn}
                onPress={controller.handleToggleShotList}
              >
                <View style={styles.thumbnailContainer}>
                  <StudySourcePreview
                    source={controller.shots[0]}
                    style={styles.thumbnailImage}
                  />
                </View>
              </Pressable>

              {controller.isShotListVisible && (
                <SelectedSourceStrip
                  sources={controller.shots}
                  width={selectedShotListWidth}
                  getSourceKey={getShotKey}
                  onRemove={controller.handleRemoveShot}
                />
              )}
            </View>
          )}

          <Pressable
            style={[
              styles.finishBtn,
              controller.shots.length === 0 && { opacity: 0.5 },
            ]}
            onPress={controller.handleDone}
            disabled={controller.shots.length === 0}
          >
            <Image
              source={require("../../../assets/take-picture/finish_takePicture.png")}
              style={styles.finishImage}
              resizeMode="contain"
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

type CameraPermissionStateProps = {
  message: string;
  onRequestPermission?: () => void;
  onBack: () => void;
};

function CameraPermissionState({
  message,
  onRequestPermission,
  onBack,
}: CameraPermissionStateProps) {
  return (
    <View style={[styles.root, styles.center]}>
      <Text style={styles.permissionText}>{message}</Text>
      {onRequestPermission && (
        <Pressable style={styles.primaryBtn} onPress={onRequestPermission}>
          <Text style={styles.primaryBtnText}>권한 요청</Text>
        </Pressable>
      )}
      <Pressable
        style={[styles.primaryBtn, styles.secondaryBtn]}
        onPress={onBack}
      >
        <Text style={styles.primaryBtnText}>뒤로가기</Text>
      </Pressable>
    </View>
  );
}
