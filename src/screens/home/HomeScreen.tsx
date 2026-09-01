import React from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";

import Sidebar from "../../components/Sidebar";
import { confirmLogout } from "../../lib/auth";
import HomeGoalCard from "./components/HomeGoalCard";
import HomeLeagueCard from "./components/HomeLeagueCard";
import HomeProfileCard from "./components/HomeProfileCard";
import HomeStreakCard from "./components/HomeStreakCard";
import HomeWeeklyGrowthCard from "./components/HomeWeeklyGrowthCard";
import { styles } from "./styles/HomeScreen.styles";
import type {
  HomeLeagueUser,
  HomeMonthlyStats,
  HomeWeeklyGrowth,
} from "./types";

type HomeScreenName =
  | "home"
  | "league"
  | "alarm"
  | "mypage"
  | "takePicture"
  | "brushup";

type Props = {
  nickname: string;
  typeLabel: string;
  level: number;
  exp: number;
  streak: number;
  hasCheckedInToday: boolean;
  onCheckIn: () => void;
  weekAttendance: boolean[];
  weeklyGrowth?: HomeWeeklyGrowth;
  monthlyStats?: HomeMonthlyStats;
  monthlyGoal?: number | null;
  myRewardRank?: number | null;
  myRewardTotal?: number | null;
  leagueUsers?: HomeLeagueUser[];
  onNavigate: (screen: HomeScreenName) => void;
  onLogout?: () => void;
};

export default function HomeScreen({
  nickname,
  typeLabel,
  level,
  exp,
  streak,
  hasCheckedInToday,
  onCheckIn,
  weekAttendance,
  weeklyGrowth,
  monthlyStats,
  monthlyGoal,
  myRewardRank,
  myRewardTotal,
  leagueUsers = [],
  onNavigate,
  onLogout,
}: Props) {
  const handleLogoutPress = () => {
    confirmLogout(() => {
      if (onLogout) onLogout();
      else onNavigate("home");
    });
  };

  return (
    <View style={styles.root}>
      <Sidebar
        activeScreen="home"
        onNavigate={onNavigate}
        onLogout={handleLogoutPress}
      />

      <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
        <View style={styles.headerRow}>
          <Text style={styles.welcome}>{nickname}님 환영해요!</Text>
          <Pressable
            style={styles.alarmButton}
            onPress={() => onNavigate("alarm")}
          >
            <Image
              source={require("../../../assets/homebutton/alarm.png")}
              style={styles.alarmIcon}
              resizeMode="contain"
            />
          </Pressable>
        </View>

        <View style={styles.contentRow}>
          <View style={styles.leftColumn}>
            <HomeProfileCard
              typeLabel={typeLabel}
              level={level}
              exp={exp}
              hasCheckedInToday={hasCheckedInToday}
              onCheckIn={onCheckIn}
              onOpenReview={() => onNavigate("brushup")}
            />
            <HomeWeeklyGrowthCard
              weeklyGrowth={weeklyGrowth}
              monthlyStats={monthlyStats}
            />
          </View>

          <View style={styles.rightColumn}>
            <HomeStreakCard
              streak={streak}
              weekAttendance={weekAttendance}
            />
            <HomeLeagueCard
              rewardRank={myRewardRank}
              rewardTotal={myRewardTotal}
              leagueUsers={leagueUsers}
              onPress={() => onNavigate("league")}
            />
            <HomeGoalCard
              monthlyGoal={monthlyGoal}
              monthlyStats={monthlyStats}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
