import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../theme/colors';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  compact?: boolean;
  action?: React.ReactNode;
};

export const EmptyState = ({ icon, title, description, compact = false, action }: Props) => (
  <View style={[styles.container, compact && styles.compact]}>
    <View style={styles.iconContainer}>
      <Ionicons name={icon} size={compact ? 22 : 26} color={colors.textMuted} />
    </View>
    <Text style={styles.title}>{title}</Text>
    {description ? <Text style={styles.description}>{description}</Text> : null}
    {action}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compact: {
    paddingVertical: spacing.lg,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  description: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
