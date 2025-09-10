import React, { useState, FC } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { BellRing, ShieldCheck, ShieldOff } from 'lucide-react-native';
import { SleepService } from '../services/SleepService'; // Assuming this path is correct

// We can now use standard components directly with `className`
export const SleepPermissionTester: FC = () => {
  const [permissionStatus, setPermissionStatus] = useState<'Unknown' | 'Granted' | 'Denied'>('Unknown');
  const [isTracking, setIsTracking] = useState<boolean>(false);

  const handleRequestPermission = async () => {
    try {
      const isGranted = await SleepService.requestPermission();
      setPermissionStatus(isGranted ? 'Granted' : 'Denied');
      if (!isGranted) {
        Alert.alert(
          "Permission Denied",
          "The app cannot track sleep without activity permission. Please enable it in the phone settings."
        );
      }
    } catch (error) {
      console.error("Permission request error:", error);
      Alert.alert("Error", "An error occurred while requesting permission.");
    }
  };

  const handleStartTracking = async () => {
    if (permissionStatus !== 'Granted') {
      Alert.alert("Permission Required", "Please grant the sleep tracking permission first.");
      return;
    }
    try {
      const result = await SleepService.startTracking();
      Alert.alert("Success", result);
      setIsTracking(true);
    } catch (error: any) {
      Alert.alert("Tracking Error", error.message);
    }
  };

  const handleStopTracking = async () => {
    try {
        const result = await SleepService.stopTracking();
        Alert.alert("Success", result);
        setIsTracking(false);
    } catch (error: any) {
        Alert.alert("Error", error.message);
    }
  }

  return (
    <View className="bg-white p-6 rounded-2xl shadow-lg m-4 border border-gray-200">
      <Text className="text-xl font-bold text-gray-800 text-center mb-4">Sleep API Test</Text>

      <View className="flex-row items-center justify-center space-x-3 my-3">
        {permissionStatus === 'Granted' && <ShieldCheck size={24} color="#16a34a" />}
        {permissionStatus === 'Denied' && <ShieldOff size={24} color="#dc2626" />}
        <Text className="text-lg text-gray-700">
          Permission Status:
          <Text
            className={`font-bold ${
              permissionStatus === 'Granted' ? 'text-green-600' : permissionStatus === 'Denied' ? 'text-red-600' : 'text-gray-500'
            }`}
          >
            {` ${permissionStatus}`}
          </Text>
        </Text>
      </View>

      <TouchableOpacity
        className="bg-blue-500 p-4 rounded-full mt-4 flex-row justify-center items-center"
        onPress={handleRequestPermission}
      >
        <BellRing size={20} color="white" />
        <Text className="text-white text-center text-lg font-bold ml-2">1. Request Permission</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className={`${isTracking ? 'bg-gray-400' : 'bg-indigo-600'} p-4 rounded-full mt-4`}
        onPress={handleStartTracking}
        disabled={isTracking}
      >
        <Text className="text-white text-center text-lg font-bold">2. Start Tracking</Text>
      </TouchableOpacity>

       <TouchableOpacity
        className={`${!isTracking ? 'bg-gray-400' : 'bg-red-600'} p-4 rounded-full mt-4`}
        onPress={handleStopTracking}
        disabled={!isTracking}
      >
        <Text className="text-white text-center text-lg font-bold">3. Stop Tracking</Text>
      </TouchableOpacity>
    </View>
  );
};