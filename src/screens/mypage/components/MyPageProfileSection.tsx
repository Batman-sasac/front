import React, { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { scale } from "../../../lib/layout";
import { getLevelUpCharacterSource } from "../../../lib/learningCharacter";
import { styles } from "../styles/MyPageScreen.styles";

type MyPageProfileSectionProps = {
  nickname: string;
  typeLabel: string;
  level: number;
  totalStudyCount: number;
  continuousDays: number;
  monthlyGoal: number | null;
  isSubscribed: boolean;
  onEditNickname: () => void;
  onEditMonthlyGoal: () => void;
  onPlanManage?: () => void;
};

export default function MyPageProfileSection({
  nickname,
  typeLabel,
  level,
  totalStudyCount,
  continuousDays,
  monthlyGoal,
  isSubscribed,
  onEditNickname,
  onEditMonthlyGoal,
  onPlanManage,
}: MyPageProfileSectionProps) {
  const [planTooltipTextWidth, setPlanTooltipTextWidth] = useState<number | null>(
    null,
  );

  return (
    <View style={styles.profileSection}>
      <View style={styles.leftColumn}>
        <Image
          source={getLevelUpCharacterSource(typeLabel, level)}
          style={styles.character}
          resizeMode="contain"
        />
        <View style={styles.nameRow}>
          <Text style={styles.nickname}>{nickname}</Text>
          <Pressable
            style={styles.nicknameEditButton}
            onPress={onEditNickname}
          >
            <Image
              source={require("../../../../assets/mypage/nickname-change.png")}
              style={styles.nicknameEditIcon}
              resizeMode="contain"
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.rightColumn}>
        <View style={styles.levelSection}>
          <Text style={styles.levelText}>
            Level <Text style={styles.levelValue}>{level}</Text>{" "}
            <Text style={styles.typeText}>
              {typeLabel || "학습 유형 미지정"}
            </Text>
          </Text>
        </View>

        <View style={styles.statsRow}>
          <StatItem
            icon={require("../../../../assets/mypage/total-study.png")}
            title="총 학습 횟수"
            value={`${totalStudyCount}회`}
          />
          <StatItem
            icon={require("../../../../assets/mypage/continuous-study.png")}
            title="연속 학습일"
            value={`${continuousDays}일`}
          />
          <Pressable style={styles.statItem} onPress={onEditMonthlyGoal}>
            <View style={styles.statIconRow}>
              <Image
                source={require("../../../../assets/mypage/monthly-goal.png")}
                style={styles.statIcon}
                resizeMode="contain"
              />
              <Text style={styles.statTitle}>월간 목표</Text>
            </View>
            <Text style={styles.statValue}>{monthlyGoal || 0}회</Text>
          </Pressable>

          <View style={styles.planGuideWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="구독 플랜 관리"
              style={styles.statItem}
              onPress={onPlanManage}
            >
              <View style={styles.statIconRow}>
                <Image
                  source={require("../../../../assets/mypage/subscription-plan.png")}
                  style={styles.statIcon}
                  resizeMode="contain"
                />
                <Text style={styles.statTitle}>플랜 관리</Text>
              </View>
              <Text style={styles.statValue}>
                {isSubscribed ? "구독중" : "무료플랜"}
              </Text>
            </Pressable>
            <View
              style={[
                styles.planTooltip,
                planTooltipTextWidth != null && {
                  width: planTooltipTextWidth + scale(24),
                },
              ]}
              pointerEvents="none"
            >
              <View style={styles.planTooltipArrow} />
              <Text
                style={styles.planTooltipText}
                numberOfLines={1}
                onTextLayout={(event) => {
                  const measuredWidth = event.nativeEvent.lines[0]?.width;
                  if (!measuredWidth) return;
                  const nextWidth = Math.ceil(measuredWidth);
                  setPlanTooltipTextWidth((currentWidth) =>
                    currentWidth === nextWidth ? currentWidth : nextWidth,
                  );
                }}
              >
                <Text style={styles.planTooltipStrong}>구독</Text>
                {"하고 AI 학습을 "}
                <Text style={styles.planTooltipStrong}>월 250회</Text>
                {"까지 이용해 보세요."}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
type StatItemProps = {
  icon: ReturnType<typeof require>;
  title: string;
  value: string;
};

function StatItem({ icon, title, value }: StatItemProps) {
  return (
    <View style={styles.statItem}>
      <View style={styles.statIconRow}>
        <Image source={icon} style={styles.statIcon} resizeMode="contain" />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}
