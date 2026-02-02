import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Image, View, ImageSourcePropType } from "react-native";
import tw from "twrnc";

export type AccountHeaderProps = {
  userName: string;
  userImage: ImageSourcePropType;
  logoImage: ImageSourcePropType;
};

export function AccountHeader({ userName, userImage, logoImage }: AccountHeaderProps) {
  const cardBgColor = useThemeColor(
    { light: "#F9FAFB", dark: "#1F2937" },
    "background",
  );
  const borderColor = useThemeColor(
    { light: "#E5E7EB", dark: "#374151" },
    "icon",
  );

  return (
    <ThemedView style={tw`mb-6`}>
      {/* Logo */}
      <Image
        source={logoImage}
        style={tw`absolute top-2 right-2 w-24 h-18 z-10 opacity-90`}
        resizeMode="contain"
      />

      {/* Card Container */}
      <ThemedView
        style={[
          tw`rounded-3xl p-6 items-center border`,
          { backgroundColor: cardBgColor, borderColor },
        ]}
      >
        {/* Profile Image */}
        <View style={tw`mb-4 shadow-lg`}>
          <View
            style={[
              tw`w-28 h-28 rounded-full items-center justify-center border-4`,
              { borderColor: "#3B82F6" },
            ]}
          >
            <Image
              source={userImage}
              style={tw`w-full h-full rounded-full`}
            />
          </View>
        </View>

        {/* User Name */}
        <ThemedText type="title" style={tw`text-3xl tracking-wide`}>
          {userName}
        </ThemedText>

        {/* accent */}
        <View
          style={[
            tw`w-16 h-1 rounded-full mt-3`,
            { backgroundColor: "#3B82F6" },
          ]}
        />
      </ThemedView>
    </ThemedView>
  );
}
