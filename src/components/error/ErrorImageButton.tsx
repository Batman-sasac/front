import React from 'react';
import {
    Image,
    ImageSourcePropType,
    ImageStyle,
    Pressable,
    StyleProp,
    ViewStyle,
} from 'react-native';

type Props = {
    source: ImageSourcePropType;
    onPress: () => void;
    wrapperStyle: StyleProp<ViewStyle>;
    imageStyle: StyleProp<ImageStyle>;
};

export default function ErrorImageButton({
    source,
    onPress,
    wrapperStyle,
    imageStyle,
}: Props) {
    return (
        <Pressable onPress={onPress} style={wrapperStyle}>
            <Image source={source} style={imageStyle} resizeMode="stretch" />
        </Pressable>
    );
}
