import React from "react";
import { View } from "react-native";
import { styles } from "../styles/ScaffoldingScreen.styles";
import type { ScaffoldingStep } from "../logic/scaffoldingTypes";
import StudyImageActionButton from "../../../../components/study/StudyImageActionButton";

export default function ScaffoldingActionButtons({
  step,
  onStartLearning,
  onGrade,
  onMoveToRound2,
  onMoveToRound3,
  onFinishStudy,
}: {
  step: ScaffoldingStep;
  onStartLearning: () => void;
  onGrade: () => void;
  onMoveToRound2: () => void;
  onMoveToRound3: () => void;
  onFinishStudy: () => void;
}) {
  if (step === "1-1" || step === "2-1" || step === "3-1") {
    return (
      <View style={styles.buttonGroup}>
        <StudyImageActionButton
          source={require("../../../../../assets/study/start-study-button.png")}
          onPress={onStartLearning}
        />
      </View>
    );
  }

  if (step === "1-2" || step === "2-2" || step === "3-2") {
    return (
      <View style={styles.buttonGroup}>
        <StudyImageActionButton
          source={require("../../../../../assets/study/grade-button.png")}
          onPress={onGrade}
        />
      </View>
    );
  }

  if (step === "1-3") {
    return (
      <View style={styles.buttonGroup}>
        <StudyImageActionButton
          source={require("../../../../../assets/study/Round2.png")}
          onPress={onMoveToRound2}
        />
      </View>
    );
  }

  if (step === "2-3") {
    return (
      <View style={styles.buttonGroup}>
        <StudyImageActionButton
          source={require("../../../../../assets/study/Round3.png")}
          onPress={onMoveToRound3}
        />
      </View>
    );
  }

  if (step === "3-3") {
    return (
      <View style={styles.buttonGroup}>
        <StudyImageActionButton
          source={require("../../../../../assets/study/finish_study.png")}
          onPress={onFinishStudy}
        />
      </View>
    );
  }

  return null;
}
