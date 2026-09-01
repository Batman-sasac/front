import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";

import type { StudySource } from "../../studySource";
import {
  captureCameraSource,
  openDocumentSourcePicker,
  pickGallerySources,
} from "../services/studySourcePicker";

export type CameraTimer = 0 | 3 | 5 | 10;
export type CameraFacing = "back" | "front";
export type CameraFlash = "off" | "on" | "auto";

type UseTakePictureControllerParams = {
  onDone: (sources: StudySource[]) => void;
};

export function useTakePictureController({
  onDone,
}: UseTakePictureControllerParams) {
  const cameraRef = useRef<CameraView | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [hasMediaPermission, setHasMediaPermission] = useState<boolean | null>(
    null,
  );
  const [facing, setFacing] = useState<CameraFacing>("back");
  const [flash, setFlash] = useState<CameraFlash>("off");
  const [timer, setTimer] = useState<CameraTimer>(0);
  const [countdown, setCountdown] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  const [shots, setShots] = useState<StudySource[]>([]);
  const [isShotListVisible, setIsShotListVisible] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true);

  useEffect(() => {
    const requestInitialPermission = async () => {
      if (
        cameraPermission &&
        !cameraPermission.granted &&
        cameraPermission.canAskAgain
      ) {
        await requestCameraPermission();
      }
    };

    void requestInitialPermission();
  }, []);

  useEffect(
    () => () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (shots.length === 0) {
      setIsShotListVisible(false);
    }
  }, [shots.length]);

  const canShoot = useMemo(
    () => cameraPermission?.granted === true && !isCounting,
    [cameraPermission?.granted, isCounting],
  );

  const toggleTimer = () => {
    setTimer((current) => {
      if (current === 0) return 3;
      if (current === 3) return 5;
      if (current === 5) return 10;
      return 0;
    });
  };

  const toggleFlash = () => {
    setFlash((current) =>
      current === "off" ? "on" : current === "on" ? "auto" : "off",
    );
  };

  const toggleFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const ensureMediaPermission = async () => {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (current.granted) {
      setHasMediaPermission(true);
      return true;
    }
    if (current.canAskAgain === false) {
      setHasMediaPermission(false);
      showMediaPermissionAlert();
      return false;
    }

    const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
    setHasMediaPermission(requested.granted);
    if (!requested.granted && requested.canAskAgain === false) {
      showMediaPermissionAlert();
    }
    return requested.granted;
  };

  const handlePickFromGallery = async () => {
    const granted =
      hasMediaPermission === true ? true : await ensureMediaPermission();
    if (!granted) return;
    setIsCameraActive(false);

    setTimeout(async () => {
      try {
        const resizedSources = await pickGallerySources();
        if (resizedSources.length > 0) {
          setShots((current) => [...current, ...resizedSources]);
        }
      } catch (error) {
        console.error("갤러리 처리 에러:", error);
      } finally {
        setIsCameraActive(true);
      }
    }, 200);
  };

  const handlePickDocument = async () => {
    try {
      await openDocumentSourcePicker((sources) => {
        setShots((current) => [...current, ...sources]);
      });
    } catch (error) {
      console.error("파일 선택 실패:", error);
    }
  };

  const shootNow = async () => {
    try {
      if (!cameraRef.current) return;
      const source = await captureCameraSource(cameraRef.current);
      if (source) {
        setShots((current) => [source, ...current]);
      }
    } catch (error) {
      console.log("촬영 실패:", error);
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
    let remaining = timer;
    countdownTimerRef.current = setInterval(async () => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0 && countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setIsCounting(false);
        setCountdown(0);
        await shootNow();
      }
    }, 1000);
  };

  const handleDone = () => {
    if (shots.length === 0) return;
    setIsCameraActive(false);
    onDone(shots);
  };

  const handleRequestCameraPermission = async () => {
    try {
      if (cameraPermission?.granted) return;
      if (cameraPermission?.canAskAgain === false) {
        showCameraPermissionAlert();
        return;
      }

      const result = await requestCameraPermission();
      if (!result.granted && result.canAskAgain === false) {
        showCameraPermissionAlert();
      }
    } catch (error) {
      console.error("카메라 권한 요청 실패:", error);
      Alert.alert("오류", "카메라 권한 요청 중 문제가 발생했습니다.");
    }
  };

  return {
    cameraRef,
    cameraPermission,
    facing,
    flash,
    timer,
    countdown,
    isCounting,
    shots,
    isShotListVisible,
    isCameraActive,
    canShoot,
    toggleTimer,
    toggleFlash,
    toggleFacing,
    handlePickFromGallery,
    handlePickDocument,
    handleShutter,
    handleDone,
    handleRequestCameraPermission,
    handleToggleShotList: () => {
      if (shots.length > 0) setIsShotListVisible((current) => !current);
    },
    handleRemoveShot: (removeIndex: number) => {
      setShots((current) =>
        current.filter((_, index) => index !== removeIndex),
      );
    },
  };
}

function showMediaPermissionAlert() {
  Alert.alert(
    "사진 권한 필요",
    "갤러리에서 학습 자료 이미지를 선택하려면 사진 접근 권한이 필요합니다. 설정에서 사진 권한을 허용해주세요.",
    [
      { text: "취소", style: "cancel" },
      { text: "설정으로 이동", onPress: () => Linking.openSettings() },
    ],
  );
}

function showCameraPermissionAlert() {
  Alert.alert("카메라 권한 필요", "설정에서 카메라 권한을 허용해주세요.", [
    { text: "취소", style: "cancel" },
    { text: "설정으로 이동", onPress: () => Linking.openSettings() },
  ]);
}
