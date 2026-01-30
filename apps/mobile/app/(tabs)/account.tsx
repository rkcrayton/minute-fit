import {Animated, StyleSheet, Image, View,TouchableOpacity} from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import {SafeAreaView} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ScrollView = Animated.ScrollView;

export default function AccountScreen() {
  return (
      <SafeAreaView style={styles.container} edges={['top','left','right']}>
        <ThemedView style={[styles.container,{paddingTop: 20, position:'relative'}]}>
            <ScrollView contentContainerStyle={{}}>
              <Image
                source={require('@/assets/images/gottaminute_transparent_big.png')}
                style={styles.logo}
                />
              <Image
                source={require('@/assets/images/Todo.png')}
                style={[styles.image]}
              />
              <ThemedText type='title' style={[styles.text, {fontSize:35, letterSpacing:1}]}>Aoi Todo</ThemedText>
              <View style={styles.divider}/>

              <ThemedText type='title' style={[styles.text,{fontSize:26}]}>My Goals</ThemedText>

              <View style={{flexDirection: 'row'}}>

                <View style={styles.goalCards}>
                  <Ionicons
                      name="chevron-forward"
                      size={20}
                      color='white'
                      style={styles.chevron}
                  />
                  <ThemedText style={styles.goalText}>11,000</ThemedText>
                  <ThemedText style={styles.goalText}>Daily Steps</ThemedText>
                </View>

                <View style={styles.goalCards}>
                  <Ionicons
                      name="chevron-forward"
                      size={20}
                      color='white'
                      style={styles.chevron}
                  />
                  <ThemedText style={styles.goalText}>25</ThemedText>
                  <ThemedText style={styles.goalText}>Minutes Worked Out</ThemedText>
                </View>

              </View>
              <View style={styles.settingsContainer}>
                <ThemedText style={styles.settingsHeader}>Preferences & Settings</ThemedText>
                <TouchableOpacity
                    style={styles.settingsItem}
                    onPress={() => {alert("FocusMode Pressed")}}
                >
                  <ThemedText style={styles.settingsItemText}>Focus Mode</ThemedText>
                  <ThemedText style={styles.settingsItemText}>›</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.settingsItem}
                    onPress={() => {alert("Workouts/Week Pressed")}}
                >
                  <ThemedText style={styles.settingsItemText}>Workouts/Week</ThemedText>
                  <ThemedText style={styles.settingsItemText}>›</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.settingsItem}
                    onPress={() => {alert("Duration Pressed")}}
                >
                  <ThemedText style={styles.settingsItemText}>Duration</ThemedText>
                  <ThemedText style={styles.settingsItemText}>›</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.settingsItem}
                    onPress={() => {alert("Exercise Variability Pressed")}}
                >
                  <ThemedText style={styles.settingsItemText}>Exercise Variability</ThemedText>
                  <ThemedText style={styles.settingsItemText}>›</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.settingsItem}
                    onPress={() => {alert("Payment Method Pressed")}}
                >
                  <ThemedText style={styles.settingsItemText}>Payment Method</ThemedText>
                  <ThemedText style={styles.settingsItemText}>›</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.settingsItem}
                  onPress={() => {alert("My Gear Pressed")}}
                  >
                  <ThemedText style={styles.settingsItemText}>My Gear</ThemedText>
                  <ThemedText style={styles.settingsItemText}>›</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.settingsItem}
                    onPress={() => {alert("Subscription Pressed")}}
                >
                  <ThemedText style={styles.settingsItemText}>Subscription</ThemedText>
                  <ThemedText style={styles.settingsItemText}>›</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.settingsItem}
                    onPress={() => {alert("Profile Pressed")}}
                >
                  <ThemedText style={styles.settingsItemText}>Profile Info</ThemedText>
                  <ThemedText style={styles.settingsItemText}>›</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.settingsItem}
                    onPress={() => {alert("Logout Pressed")}}
                >
                  <ThemedText style={styles.settingsItemText}>Log out</ThemedText>
                  <ThemedText style={styles.settingsItemText}>›</ThemedText>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </ThemedView>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  text: {
    textAlign: 'left',
    fontWeight: 'bold',
    paddingTop: 10
  },
  logo: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 120,
    height: 90,
    resizeMode: 'contain',
    zIndex: 10,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 100/2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    width: '90%',
    alignSelf: 'center',
    marginVertical: 5,
  },
  goalCards:{
    justifyContent: 'center',
    flex: 1,
    height: 100,
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    padding: 20,
    margin: 8
  },
  chevron: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  goalText:{
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  settingsContainer: {
    backgroundColor: '#E0F2FE',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    marginTop: 30,
  },
  settingsHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginBottom: 16,
  },
  settingsItemText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000',
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  }
});
