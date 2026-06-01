import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { scale } from '../../styles/theme';

type Props = {
    children: React.ReactNode;
};

export default function CharacterFormLayout({ children }: Props) {
    return (
        <View style={styles.root}>
            <View style={styles.contentRow}>
                <Image
                    source={require('../../../assets/character/bat-character.png')}
                    style={styles.character}
                    resizeMode="contain"
                />
                <View style={styles.rightBox}>{children}</View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '80%',
        maxWidth: scale(900),
    },
    character: {
        width: scale(260),
        height: scale(260),
        marginRight: scale(80),
    },
    rightBox: {
        width: scale(520),
    },
});
