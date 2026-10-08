import React from 'react';
import { TouchableOpacity, type TouchableOpacityProps } from 'react-native';

/** Mantém o comportamento nativo e um alvo mínimo, inclusive em botões de ícone. */
export const AccessibleAction = ({ style, accessibilityRole = 'button', accessibilityState, disabled, ...props }: TouchableOpacityProps) => (
  <TouchableOpacity {...props} disabled={disabled} accessibilityRole={accessibilityRole}
    accessibilityState={{ ...accessibilityState, disabled: Boolean(disabled) }}
    style={[style, { minHeight: 44, minWidth: 44 }]} />
);
