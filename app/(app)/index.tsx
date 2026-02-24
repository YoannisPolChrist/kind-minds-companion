import { Text, View } from "react-native";

export default function Index() {
    return (
        <View className="flex-1 justify-center items-center bg-white">
            <Text className="text-2xl font-bold text-gray-800">Therapie App</Text>
            <Text className="text-gray-500 mt-2">Willkommen im Dashboard</Text>
        </View>
    );
}
