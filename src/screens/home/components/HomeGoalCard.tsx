import React from "react";
import { Text, View } from "react-native";

import HomeSurfaceCard from "../../../components/home/HomeSurfaceCard";
import { styles } from "../styles/HomeScreen.styles";
import type { HomeMonthlyStats } from "../types";

type HomeGoalCardProps = {
  monthlyGoal?: number | null;
  monthlyStats?: HomeMonthlyStats;
};

export default function HomeGoalCard({
  monthlyGoal,
  monthlyStats,
}: HomeGoalCardProps) {
  const goal = monthlyGoal ?? 20;
  const studyCount = monthlyStats?.this_month_count ?? 0;
  const currentMonth =
    monthlyStats?.this_month_name || new Date().getMonth() + 1;

  return (
    <HomeSurfaceCard
      variant="bottom"
      style={[styles.rightBottomCard, styles.goalCard]}
    >
      <Text style={styles.goalCardTitle}>이번 달 목표까지 얼마 안 남았어요!</Text>
      <View style={styles.goalInlineRow}>
        <Text style={styles.goalItemLabel}>이번 달 목표</Text>
        <View style={styles.goalProgressBarContainer}>
          <View
            style={[
              styles.goalProgressBar,
              { width: "100%", backgroundColor: "#5E82FF" },
            ]}
          />
          <Text style={styles.goalValueOverlay}>{goal}회</Text>
        </View>
      </View>

      <View style={styles.goalInlineRow}>
        <Text style={styles.goalItemLabel}>{currentMonth}월 총 학습</Text>
        {studyCount === 0 ? (
          <View
            style={[
              styles.goalProgressBarContainer,
              { backgroundColor: "transparent" },
            ]}
          >
            <Text
              style={[
                styles.goalValueOverlay,
                { position: "static", color: "#92A6FF" },
              ]}
            >
              0회
            </Text>
          </View>
        ) : (
          <View style={styles.goalProgressBarContainer}>
            <View
              style={[
                styles.goalProgressBar,
                {
                  width: `${Math.min((studyCount / goal) * 100, 100)}%`,
                  backgroundColor: "#92a6ff",
                },
              ]}
            />
            <Text style={styles.goalValueOverlay}>{studyCount}회</Text>
          </View>
        )}
      </View>

      <Text style={styles.goalHighlight}>
        {Math.max(goal - studyCount, 0)}회만 더 하면 목표달성!
      </Text>
    </HomeSurfaceCard>
  );
}
