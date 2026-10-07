import { useCallback, useRef, useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenLayout, Card, Field, Notice, useFieldStyles } from '../../../components/ScreenLayout';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { EmptyState } from '../../../components/EmptyState';
import { StatusBadge } from '../../../components/StatusBadge';
import { containerApi } from '../api/container.api';
import type { ContainerRecord } from '../api/container.api';
import type { YardStackParamList } from '../../../navigation/types';
export function ContainerSearchScreen() {
  const fieldStyles = useFieldStyles();
  const navigation = useNavigation<NativeStackNavigationProp<YardStackParamList>>();
  const [query,setQuery] = useState(''); const [rows,setRows] = useState<ContainerRecord[]>([]);
  const [loading,setLoading] = useState(false); const [searched,setSearched] = useState(false); const [error,setError] = useState('');
  const lastQuery = useRef('');
  const performSearch = useCallback(async (value: string) => {
    setLoading(true);setError('');setRows([]);
    try {const result = await containerApi.search(value);setRows(result.data);setSearched(true);}
    catch(err) {setError(err instanceof Error ? err.message : 'Không tải được container.');}
    finally {setLoading(false);}
  },[]);
  useFocusEffect(useCallback(() => {if(lastQuery.current) void performSearch(lastQuery.current);},[performSearch]));
  const search = async () => {
    if (!query.trim() || loading) return;
    lastQuery.current = query.trim().toUpperCase();
    await performSearch(lastQuery.current);
  };
  return <ScreenLayout title="Tra cứu container" subtitle="Thông tin vòng đời và vị trí bãi">
    <Card><Field label="Số container" value={query} onChangeText={setQuery} autoCapitalize="characters" placeholder="Nhập số hoặc một phần số container" onSubmitEditing={() => void search()} />
      <PrimaryButton title="Tìm kiếm container" onPress={() => void search()} disabled={!query.trim()} loading={loading} /></Card>
    {error ? <Notice message={error} /> : null}
    {searched && !loading && rows.length === 0 ? <EmptyState title="Không tìm thấy container" description="Kiểm tra số container hoặc thử từ khóa khác." /> : null}
    {rows.map(row => <TouchableOpacity key={row.id} accessibilityRole="button" onPress={() => navigation.navigate('ContainerDetail',{visitId:row.id,containerNo:row.container.containerNumber})}>
      <Card title={row.container.containerNumber}><StatusBadge label={row.state} variant="info" /><Text style={fieldStyles.value}>{row.container.isoCode} · {row.houseBl?.consignee?.name || 'Chưa có chủ hàng'}</Text></Card>
    </TouchableOpacity>)}
  </ScreenLayout>;
}
