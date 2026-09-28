import React from "react";
import { Switch, Text, View } from "react-native";

import AlarmSettingRow from "../../components/alarm/AlarmSettingRow";
import AlarmSettingSection from "../../components/alarm/AlarmSettingSection";
import AlarmTimeChip from "../../components/alarm/AlarmTimeChip";
import AlarmTimePickerOverlay from "../../components/alarm/AlarmTimePickerOverlay";
import AppBackButton from "../../components/common/AppBackButton";
import { appColors } from "../../styles/theme";
import { useAlarmSettings } from "./hooks/useAlarmSettings";
import { styles } from "./styles/AlarmSettingScreen.styles";

type Props = {
  onNavigate: (screen: "alarm") => void;
};

const SWITCH_TRACK_COLORS = {
  false: appColors.borderStrong,
  true: appColors.primary,
};

export default function AlarmSettingScreen({ onNavigate }: Props) {
  const settings = useAlarmSettings();

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <AppBackButton
          style={styles.backButton}
          onPress={() => onNavigate("alarm")}
          iconStyle={styles.backIcon}
        />
        <Text style={styles.headerTitle}>알림설정</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <AlarmSettingSection title="복습 알림">
          <AlarmSettingRow
            label="복습 알림 설정"
            description="하루 한 번 복습 알림을 보내드려요"
            right={
              <Switch
                value={settings.reviewEnabled}
                onValueChange={settings.handleReviewEnabledChange}
                trackColor={SWITCH_TRACK_COLORS}
                thumbColor={appColors.white}
              />
            }
          />
          <AlarmSettingRow
            label="복습 알림 시간"
            right={
              <AlarmTimeChip
                label={settings.reviewTimeLabel}
                onPress={() => settings.openPicker("review")}
                disabled={!settings.reviewEnabled}
              />
            }
          />
        </AlarmSettingSection>

        <AlarmSettingSection title="리그 알림">
          <AlarmSettingRow
            label="리그 알림 설정"
            description="순위 변동이 있을 때 알려드려요"
            right={
              <Switch
                value={settings.leagueEnabled}
                onValueChange={settings.setLeagueEnabled}
                trackColor={SWITCH_TRACK_COLORS}
                thumbColor={appColors.white}
              />
            }
          />
        </AlarmSettingSection>

        <AlarmSettingSection title="방해 금지 시간">
          <AlarmSettingRow
            label="방해 금지 시간 설정"
            description="설정한 시간에는 알림을 보내지 않아요"
            right={
              <Switch
                value={settings.dndEnabled}
                onValueChange={settings.setDndEnabled}
                trackColor={SWITCH_TRACK_COLORS}
                thumbColor={appColors.white}
              />
            }
          />
          <AlarmSettingRow
            label="방해 금지 시간"
            right={
              <AlarmTimeChip
                label={settings.dndLabel}
                onPress={() => settings.openPicker("dndStart")}
                disabled={!settings.dndEnabled}
              />
            }
          />
        </AlarmSettingSection>
      </View>

      <AlarmTimePickerOverlay
        visible={settings.picker !== null}
        title={
          settings.picker === "review"
            ? "복습 알림 시간"
            : settings.picker === "dndStart"
              ? "방해 금지 시작 시간"
              : "방해 금지 종료 시간"
        }
        ampm={settings.tempTime.ampm}
        hour={settings.tempTime.hour}
        minute={settings.tempTime.minute}
        onChange={settings.changeTempTime}
        onClose={() => settings.setPicker(null)}
        onConfirm={settings.confirmPicker}
      />
    </View>
  );
}
