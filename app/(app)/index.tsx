import { Text, View, TouchableOpacity } from "react-native";
import { useAuth } from "../../contexts/AuthContext";

export default function Index() {
    const { user, profile, signOut } = useAuth();

    return (
        <View className="flex-1 justify-center items-center bg-white px-6">
            <Text className="text-3xl font-bold text-[#2C3E50]">Therapie App</Text>
            <Text className="text-gray-500 mt-2 text-center">
                Hallo {profile?.firstName || user?.email}! Willkommen zurück.
            </Text>

            <View className="mt-8 bg-gray-100 p-6 rounded-2xl w-full items-center">
                <Text className="text-gray-600 mb-4">Role: {profile?.role}</Text>
                <Text className="text-sm text-gray-400 text-center mb-6">
                    Hier findest du bald deine Aufgaben und Reflektionen.
                </Text>

                <TouchableOpacity
                    className="bg-red-500 py-3 px-8 rounded-xl"
                    onPress={signOut}
                >
                    <Text className="text-white font-bold">Abmelden</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
