import { Alert } from 'react-native';

export function showSubscriptionUnavailableAlert() {
  Alert.alert(
    '구독 이용 안내',
    '구독은 현재 이용할 수 없습니다. 이용에 불편을 드려 죄송하며, 양해 부탁드립니다.',
    [{ text: '확인' }],
  );
}
