import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import tw from "twrnc";
import { SettingsOption } from "./settings-option";

export type SettingsItem = {
  label: string;
  onPress?: () => void;
};

export type SettingsProps = {
  title: string;
  items: SettingsItem[];
};

export function Settings({ title, items }: SettingsProps) {
  const cardBgColor = useThemeColor({}, "surface");
  const borderColor = useThemeColor({}, "border");

  return (
    <ThemedView
      style={[
        tw`p-5 rounded-xl mb-6 border`,
        { backgroundColor: cardBgColor, borderColor },
      ]}
    >
      <ThemedText
        type="defaultSemiBold"
        style={tw`mb-4 opacity-60 text-xs uppercase tracking-wide`}
      >
        {title}
      </ThemedText>

      {items.map((item, index) => (
        <SettingsOption
          key={index}
          label={item.label}
          onPress={item.onPress}
          isLast={index === items.length - 1}
        />
      ))}
    </ThemedView>
  );
}
