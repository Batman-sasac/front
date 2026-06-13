import React from 'react';
import {
    Image,
    ImageStyle,
    Pressable,
    StyleProp,
    StyleSheet,
    ViewStyle,
} from 'react-native';
import { scale } from '../../styles/theme';

type Props = {
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
    iconStyle?: StyleProp<ImageStyle>;
    hitSlop?: number;
};

export default function AppBackButton({
    onPress,
    style,
    iconStyle,
    hitSlop = 10,
}: Props) {
    return (
        <Pressable style={style} onPress={onPress} hitSlop={hitSlop}>
            <Image
                source={require('../../../assets/shift.png')}
                style={[styles.icon, iconStyle]}
                resizeMode="contain"
            />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    icon: {
        width: scale(20),
        height: scale(20),
        transform: [{ rotate: '180deg' }],
    },
});
