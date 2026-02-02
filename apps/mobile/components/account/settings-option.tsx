import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ChevronRight } from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";
import tw from "twrnc";

export type SettingsOptionProps = {
  label: string;
  onPress?: () => void;
  isLast?: boolean;
};

export function SettingsOption({ label, onPress, isLast = false }: SettingsOptionProps) {
  const borderColor = useThemeColor(
    { light: "#E5E7EB", dark: "#374151" },
    "icon",
  );
  const iconColor = useThemeColor(
    { light: "#9CA3AF", dark: "#6B7280" },
    "icon",
  );

  return (
    <TouchableOpacity
      style={[
        tw`flex-row justify-between items-center py-4`,
        !isLast && { borderBottomWidth: 1, borderBottomColor: borderColor },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <ThemedText type="defaultSemiBold" style={tw`text-base`}>
        {label}
      </ThemedText>
      <ChevronRight size={20} color={iconColor} />
    </TouchableOpacity>
  );
}
