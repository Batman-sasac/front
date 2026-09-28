import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, G, Polyline, Text as SvgText } from "react-native-svg";

import HomeSurfaceCard from "../../../components/home/HomeSurfaceCard";
import { scale } from "../../../lib/layout";
import {
  getAccuracyAttendanceRate,
  getWeeklyChartPoints,
  getWeeklyGrowthMessage,
} from "../logic/homeMetrics";
import { styles } from "../styles/HomeScreen.styles";
import type { HomeMonthlyStats, HomeWeeklyGrowth } from "../types";

type HomeWeeklyGrowthCardProps = {
  weeklyGrowth?: HomeWeeklyGrowth;
  monthlyStats?: HomeMonthlyStats;
};

export default function HomeWeeklyGrowthCard({
  weeklyGrowth,
  monthlyStats,
}: HomeWeeklyGrowthCardProps) {
  const [graphWidth, setGraphWidth] = useState(0);
  const graphHeight = scale(132);
  const growthMessage = weeklyGrowth
    ? getWeeklyGrowthMessage(weeklyGrowth.data)
    : null;
  const points = useMemo(
    () =>
      weeklyGrowth
        ? getWeeklyChartPoints(weeklyGrowth.data, graphWidth, graphHeight)
        : [],
    [graphHeight, graphWidth, weeklyGrowth],
  );
  const pointsString = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <HomeSurfaceCard variant="bottom">
      {growthMessage && <Text style={styles.smallTitle}>{growthMessage}</Text>}

      <View style={styles.lineGraphContainer}>
        {weeklyGrowth?.labels && weeklyGrowth.data ? (
          <View style={styles.lineChartWrapper}>
            <View
              style={styles.lineChartContainer}
              onLayout={(event) => setGraphWidth(event.nativeEvent.layout.width)}
            >
              <View style={styles.graphBackground} />
              <Svg
                width={graphWidth > 0 ? graphWidth : "100%"}
                height={graphHeight}
                style={styles.svgOverlay}
              >
                {points.length > 0 && (
                  <>
                    <Polyline
                      points={pointsString}
                      fill="none"
                      stroke="#5E82FF"
                      strokeWidth={2}
                    />
                    {points.map((point, index) => (
                      <G key={`point-${index}`}>
                        <Circle
                          cx={point.x}
                          cy={point.y}
                          r={4}
                          fill="#5E82FF"
                        />
                        <SvgText
                          x={point.x}
                          y={point.y - 12}
                          fontSize="14"
                          fontWeight="700"
                          fill="#5E82FF"
                          textAnchor="middle"
                        >
                          {point.value}
                        </SvgText>
                      </G>
                    ))}
                  </>
                )}
              </Svg>
            </View>

            {monthlyStats && (
              <View style={styles.graphStatsTextContainer}>
                <Text style={styles.graphStatsLabel}>
                  정답률*출석률:{" "}
                  {getAccuracyAttendanceRate(monthlyStats, weeklyGrowth.data)}%
                </Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.graphPlaceholder}>
            학습 기록이 없습니다{"\n"}학습을 시작해보세요!
          </Text>
        )}
      </View>
    </HomeSurfaceCard>
  );
}
