import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from '../theme/colors';

type Props = {
  uri?: string | null;
  width: number;
  height: number;
  title?: string;
};

export const BookCover = ({ uri, width, height, title }: Props) => {
  const [imageFailed, setImageFailed] = useState(false);
  const coverStyle = { width, height };

  useEffect(() => {
    setImageFailed(false);
  }, [uri]);

  if (uri && !imageFailed) {
    return (
      <Image
        source={{ uri }}
        style={[styles.cover, coverStyle]}
        resizeMode="cover"
        accessibilityLabel={title ? `Capa de ${title}` : 'Capa do livro'}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <View
      style={[styles.cover, styles.fallback, coverStyle]}
      accessibilityRole="image"
      accessibilityLabel={title ? `Livro sem capa: ${title}` : 'Livro sem capa'}
    >
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
