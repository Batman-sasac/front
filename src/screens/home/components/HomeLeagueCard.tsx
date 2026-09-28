import React from "react";
import { Image, Pressable, Text, View } from "react-native";

import { getLeagueSummary } from "../logic/homeMetrics";
import { styles } from "../styles/HomeScreen.styles";
import type { HomeLeagueUser } from "../types";

type HomeLeagueCardProps = {
  rewardRank?: number | null;
  rewardTotal?: number | null;
  leagueUsers: HomeLeagueUser[];
  onPress: () => void;
};

export default function HomeLeagueCard({
  rewardRank,
  rewardTotal,
  leagueUsers,
  onPress,
}: HomeLeagueCardProps) {
  const summary = getLeagueSummary(rewardRank, rewardTotal, leagueUsers);

  return (
    <Pressable style={styles.leagueCard} onPress={onPress}>
      <Text style={styles.leagueTitle}>현재 리그 순위</Text>
      <View style={styles.leagueRow}>
        <Image
          source={require("../../../../assets/league-trophy/iron.png")}
          style={styles.leagueTrophy}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.leagueMainText}>
            아이언 리그{" "}
            <Text style={styles.leagueRank}>{summary.displayRank}</Text> 위
          </Text>
          <Text style={styles.leagueSubText}>{summary.subText}</Text>
        </View>
        <Image
          source={require("../../../../assets/shift.png")}
          style={styles.leagueArrowImage}
          resizeMode="contain"
        />
      </View>
    </Pressable>
  );
}
