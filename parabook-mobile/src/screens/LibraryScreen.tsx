import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export const LibraryScreen = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Minha Biblioteca</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  text: { color: colors.textPrimary, fontSize: 18 }
});