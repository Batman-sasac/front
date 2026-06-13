import React from 'react';
import { StyleProp, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { appColors, appFontWeight, appRadius, scale, fontScale } from '../../styles/theme';
import AppButton from './AppButton';

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
    <AppButton
      style={[styles.button, style]}
      disabledStyle={styles.buttonDisabled}
      textStyle={[styles.text, textStyle]}
      onPress={onPress}
      disabled={disabled}
    >
      {children}
    </AppButton>
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
