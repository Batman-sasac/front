import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';
import { appColors, appFontWeight, appRadius, scale, fontScale } from '../../styles/theme';

type Props = {
  children: React.ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
};

export default function AppPrimaryButton({
  children,
  onPress,
  style,
  textStyle,
  disabled = false,
}: Props) {
  return (
    <Pressable
      style={[styles.button, disabled && styles.buttonDisabled, style]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      <Text style={[styles.text, textStyle]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: appColors.primary,
    borderRadius: scale(appRadius.pill),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: appColors.borderStrong,
  },
  text: {
    color: appColors.white,
    fontSize: fontScale(15),
    fontWeight: appFontWeight.bold,
  },
});
