import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Image, View, ImageSourcePropType, TouchableOpacity } from "react-native";
import { Camera } from "lucide-react-native";
import tw from "twrnc";

export type AccountHeaderProps = {
  userName: string;
  userImage: ImageSourcePropType | string;
  logoImage: ImageSourcePropType;
  onAvatarPress?: () => void;
};

export function AccountHeader({ userName, userImage, logoImage, onAvatarPress }: AccountHeaderProps) {
  const cardBgColor = useThemeColor({}, "surface");
  const borderColor = useThemeColor({}, "border");

  const imageSource =
    typeof userImage === "string" ? { uri: userImage } : userImage;

  const avatarContent = (
    <View style={tw`mb-4 shadow-lg`}>
      <View
        style={[
          tw`w-28 h-28 rounded-full items-center justify-center border-4`,
          { borderColor: "#3B82F6" },
        ]}
      >
        <Image
          source={imageSource}
          style={tw`w-full h-full rounded-full`}
        />
        {onAvatarPress && (
          <View
            style={[
              tw`absolute bottom-0 right-0 w-8 h-8 rounded-full items-center justify-center`,
              { backgroundColor: "#3B82F6" },
            ]}
          >
            <Camera size={16} color="#FFFFFF" />
          </View>
        )}
      </View>
    </View>
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
        {onAvatarPress ? (
          <TouchableOpacity
            onPress={onAvatarPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
          >
            {avatarContent}
          </TouchableOpacity>
        ) : (
          avatarContent
        )}

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
