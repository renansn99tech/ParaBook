import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from '../theme/colors';

type Props = {
  uri?: string | null;
  width: number;
  height: number;
};

export const BookCover = ({ uri, width, height }: Props) => {
  const coverStyle = { width, height };

  if (uri) {
    return <Image source={{ uri }} style={[styles.cover, coverStyle]} resizeMode="cover" />;
  }

  return (
    <View style={[styles.cover, styles.fallback, coverStyle]}>
      <Ionicons name="book-outline" size={Math.min(30, width * 0.42)} color={colors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  cover: {
    borderRadius: radii.sm,
    backgroundColor: colors.background,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
