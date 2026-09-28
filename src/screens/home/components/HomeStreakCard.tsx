import React from "react";
import { Image, Text, View } from "react-native";

import HomeSurfaceCard from "../../../components/home/HomeSurfaceCard";
import { getMondayBasedTodayIndex } from "../logic/homeMetrics";
import { styles } from "../styles/HomeScreen.styles";

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

type HomeStreakCardProps = {
  streak: number;
  weekAttendance: boolean[];
};

export default function HomeStreakCard({
  streak,
  weekAttendance,
}: HomeStreakCardProps) {
  const todayIndex = getMondayBasedTodayIndex();

  return (
    <HomeSurfaceCard variant="small">
      <View style={styles.streakRow}>
        <Image
          source={require("../../../../assets/fire.png")}
          style={[styles.fireImage, streak >= 2 && styles.fireImageActive]}
          resizeMode="contain"
        />
        <View style={styles.streakContent}>
          <Text style={styles.streakTitle}>
            연속 학습 <Text style={styles.streakStrong}>{streak}</Text>일
          </Text>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((label, index) => {
              const checked = weekAttendance[index];
              return (
                <View key={label} style={styles.weekItem}>
                  <View
                    style={[
                      styles.weekCircle,
                      checked && styles.weekCircleChecked,
                    ]}
                  >
                    <Text
                      style={[
                        styles.weekLabel,
                        checked && styles.weekLabelChecked,
                      ]}
                    >
                      {label}
                    </Text>
                  </View>
                  {index === todayIndex && <View style={styles.todayTriangle} />}
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </HomeSurfaceCard>
  );
}
