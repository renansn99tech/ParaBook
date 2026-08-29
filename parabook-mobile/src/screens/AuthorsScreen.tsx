import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { AuthorSummary, featureService } from '../services/featureService';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Authors'>;

export const AuthorsScreen = ({ navigation }: Props) => {
  const [authors, setAuthors] = useState<AuthorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setAuthors(await featureService.getAuthors()); }
    catch { setError('Nao foi possivel carregar os autores.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return <SafeAreaView style={styles.container}>
    <View style={styles.header}><TouchableOpacity style={styles.icon} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={23} color={colors.textPrimary} /></TouchableOpacity><Text style={styles.title}>Autores</Text><View style={styles.icon} /></View>
    {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : error ? <View style={styles.center}><Ionicons name="cloud-offline-outline" size={44} color={colors.textMuted} /><Text style={styles.state}>{error}</Text><TouchableOpacity style={styles.retry} onPress={load}><Text style={styles.retryText}>Tentar novamente</Text></TouchableOpacity></View> : <FlatList data={authors} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.list} ListEmptyComponent={<Text style={styles.state}>Nenhum autor publicado no momento.</Text>} renderItem={({ item }) => <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('PublicProfile', { username: item.username })}>{item.photo ? <Image source={{ uri: item.photo }} style={styles.avatar} /> : <View style={styles.avatar}><Ionicons name="person" size={25} color={colors.primary} /></View>}<View style={styles.info}><Text style={styles.name}>{item.name}</Text><Text style={styles.username}>@{item.username} · {item.totalBooks} obras</Text><Text style={styles.bio} numberOfLines={2}>{item.biography || 'Sem biografia cadastrada.'}</Text></View><Ionicons name="chevron-forward" size={19} color={colors.textMuted} /></TouchableOpacity>} />}
  </SafeAreaView>;
};

const styles = StyleSheet.create({ container:{flex:1,backgroundColor:colors.background},header:{flexDirection:'row',alignItems:'center',padding:14,borderBottomWidth:1,borderBottomColor:colors.border},icon:{width:42,height:42,alignItems:'center',justifyContent:'center'},title:{flex:1,textAlign:'center',color:colors.textPrimary,fontSize:18,fontWeight:'700'},center:{flex:1,alignItems:'center',justifyContent:'center',padding:28},state:{color:colors.textSecondary,textAlign:'center',marginTop:12,lineHeight:20},retry:{marginTop:16,minHeight:44,paddingHorizontal:16,justifyContent:'center',backgroundColor:colors.primary,borderRadius:22},retryText:{color:colors.textPrimary,fontWeight:'700'},list:{padding:18,flexGrow:1},card:{flexDirection:'row',alignItems:'center',padding:14,marginBottom:10,borderRadius:12,backgroundColor:colors.cardBackground,borderWidth:1,borderColor:colors.border},avatar:{width:54,height:54,borderRadius:27,alignItems:'center',justifyContent:'center',backgroundColor:colors.background},info:{flex:1,marginHorizontal:12},name:{color:colors.textPrimary,fontSize:16,fontWeight:'700'},username:{color:colors.primary,fontSize:12,marginTop:3},bio:{color:colors.textSecondary,fontSize:13,lineHeight:18,marginTop:6} });
