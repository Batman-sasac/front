import { useEffect, useState } from "react";
import { Alert } from "react-native";

import {
  getMyNotificationStatus,
  registerAndSyncPushToken,
  updateNotificationSettings,
} from "../../../api/notification";
import { getErrorMessage } from "../../../app/error/errors";
import {
  getCachedNotificationStatus,
  getToken,
  setCachedNotificationStatus,
} from "../../../lib/storage";
import {
  changeNotificationTime,
  DEFAULT_REVIEW_TIME,
  formatNotificationTime,
  parseRemindTime,
  to24HourString,
  type ActiveTimePicker,
  type NotificationTime,
} from "../logic/notificationTime";

const DEFAULT_DND_START: NotificationTime = {
  ampm: "오후",
  hour: 10,
  minute: 30,
};

const DEFAULT_DND_END: NotificationTime = {
  ampm: "오전",
  hour: 7,
  minute: 30,
};

export function useAlarmSettings() {
  const [reviewEnabled, setReviewEnabled] = useState(true);
  const [leagueEnabled, setLeagueEnabled] = useState(true);
  const [dndEnabled, setDndEnabled] = useState(true);
  const [reviewTime, setReviewTime] =
    useState<NotificationTime>(DEFAULT_REVIEW_TIME);
  const [dndStart, setDndStart] =
    useState<NotificationTime>(DEFAULT_DND_START);
  const [dndEnd, setDndEnd] = useState<NotificationTime>(DEFAULT_DND_END);
  const [picker, setPicker] = useState<ActiveTimePicker>(null);
  const [tempTime, setTempTime] =
    useState<NotificationTime>(DEFAULT_REVIEW_TIME);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      const [token, cached] = await Promise.all([
        getToken(),
        getCachedNotificationStatus(),
      ]);
      if (!token || cancelled) return;
      if (cached) {
        setReviewEnabled(cached.is_notify);
        setReviewTime(parseRemindTime(cached.remind_time));
      }
      void registerAndSyncPushToken(token).catch(() => {});

      try {
        const response = await getMyNotificationStatus(token);
        if (cancelled) return;
        const rawTime =
          response?.remind_time != null ? String(response.remind_time) : null;
        setReviewEnabled(Boolean(response?.is_notify));
        setReviewTime(parseRemindTime(rawTime));
        await setCachedNotificationStatus({
          is_notify: Boolean(response?.is_notify),
          remind_time: rawTime,
        });
      } catch (_error) {
        // 조회 실패 시 캐시 또는 기본값을 유지한다.
      }
    };

    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveReviewSettings = async (
    enabled: boolean,
    time: NotificationTime,
  ) => {
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("알림 설정", "로그인이 필요합니다.");
        return;
      }
      const remindTime = to24HourString(time);
      await updateNotificationSettings(token, {
        is_notify: enabled,
        remind_time: remindTime,
      });
      await setCachedNotificationStatus({
        is_notify: enabled,
        remind_time: remindTime,
      });
    } catch (error) {
      Alert.alert(
        "알림 설정 저장 실패",
        getErrorMessage(error, "알림 설정 저장에 실패했습니다."),
      );
    }
  };

  const handleReviewEnabledChange = (enabled: boolean) => {
    setReviewEnabled(enabled);
    void saveReviewSettings(enabled, reviewTime);
  };

  const openPicker = (target: ActiveTimePicker) => {
    setPicker(target);
    if (target === "review") setTempTime(reviewTime);
    if (target === "dndStart") setTempTime(dndStart);
    if (target === "dndEnd") setTempTime(dndEnd);
  };

  const confirmPicker = () => {
    if (picker === "review") {
      setReviewTime(tempTime);
      void saveReviewSettings(reviewEnabled, tempTime);
    }
    if (picker === "dndStart") setDndStart(tempTime);
    if (picker === "dndEnd") setDndEnd(tempTime);
    setPicker(null);
  };

  return {
    reviewEnabled,
    leagueEnabled,
    setLeagueEnabled,
    dndEnabled,
    setDndEnabled,
    reviewTime,
    dndStart,
    dndEnd,
    picker,
    setPicker,
    tempTime,
    reviewTimeLabel: formatNotificationTime(reviewTime),
    dndLabel: `${formatNotificationTime(dndStart)} ~ ${formatNotificationTime(dndEnd)}`,
    handleReviewEnabledChange,
    openPicker,
    confirmPicker,
    changeTempTime: (field: keyof NotificationTime, difference: number) => {
      setTempTime((current) =>
        changeNotificationTime(current, field, difference),
      );
    },
  };
}
