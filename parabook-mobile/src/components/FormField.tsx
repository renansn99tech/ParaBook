import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, controlHeight, radii, spacing } from '../theme/colors';

type Props = TextInputProps & {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  isPassword?: boolean;
};

export const FormField = ({ label, icon, error, isPassword = false, onFocus, onBlur, ...inputProps }: Props) => {
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.container, focused && styles.focused, Boolean(error) && styles.errored]}>
        <Ionicons name={icon} size={20} color={focused ? colors.primary : colors.textMuted} />
        <TextInput
          {...inputProps}
          style={styles.input}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isPassword && !passwordVisible}
          selectionColor={colors.primary}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
        />
        {isPassword ? (
          <TouchableOpacity
            onPress={() => setPasswordVisible((current) => !current)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}
          >
            <Ionicons name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: controlHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBackground,
  },
  focused: {
    borderColor: colors.primary,
  },
  errored: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    height: '100%',
    color: colors.textPrimary,
    fontSize: 15,
    marginHorizontal: spacing.sm,
  },
  error: {
    color: colors.error,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});
