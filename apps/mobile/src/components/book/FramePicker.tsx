import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { FRAME_STYLES, type FrameStyle, type Photo } from "@photos/types";
import { PrintedPhoto, usePaper } from "@toneflix/flipbook-native";
import { Text } from "@/components/ui";
import type { DraftPage } from "@/lib/book-draft";
import { FlipbookModel } from "@/lib/flipbook";
import { colors, fonts, radius } from "@/theme";

const SWATCH = 64;
const FRAMES = Object.keys(FRAME_STYLES) as FrameStyle[];

/**
 * Frame swatches for a page, or for the selected photo on it. Each swatch is a tiny printed page.
 * Null follows the frame one level up: the book's for a page, the page's for a photo.
 */
export function FramePicker({
  page,
  slot,
  bookFrame,
  sample,
  onPick,
  onPickPhoto,
  onUseEverywhere,
}: {
  page: DraftPage;
  slot: number | null;
  bookFrame: FrameStyle;
  sample: Photo | null;
  onPick: (frame: FrameStyle | null) => void;
  onPickPhoto: (slot: number, frame: FrameStyle | null) => void;
  onUseEverywhere: (frame: FrameStyle) => void;
}) {
  const photo = slot !== null ? (page.photos[slot] ?? null) : null;
  const [forPhoto, setForPhoto] = useState(!!photo?.frame);

  if (page.layout === "single" || page.layout === "text") {
    return (
      <View style={styles.panel}>
        <Text variant="muted" style={[styles.small, styles.center]}>
          {page.layout === "single"
            ? "Full-bleed photos print to the edge, so they have no frame."
            : "Pages of words have no frame."}
        </Text>
      </View>
    );
  }

  const photoMode = forPhoto && !!photo && slot !== null;
  const pageFrame = page.frame ?? bookFrame;
  const choosing = photoMode
    ? {
        current: photo.frame ?? null,
        inherited: pageFrame,
        inheritLabel: "Page's frame",
      }
    : {
        current: page.frame,
        inherited: bookFrame,
        inheritLabel: "Book's frame",
      };
  const shown = choosing.current ?? choosing.inherited;
  const pick = (frame: FrameStyle | null) =>
    photoMode ? onPickPhoto(slot, frame) : onPick(frame);
  const preview = photoMode ? photo : sample;

  return (
    <View style={styles.panel}>
      <View style={styles.head}>
        <View style={styles.title}>
          <Text style={styles.kicker}>FRAME</Text>
          {photo && slot !== null && (
            <View
              style={styles.toggle}
              accessibilityRole="radiogroup"
              accessibilityLabel="Frame for"
            >
              {(
                [
                  [false, "This page"],
                  [true, `Photo ${slot + 1}`],
                ] as const
              ).map(([value, label]) => (
                <Pressable
                  key={label}
                  onPress={() => setForPhoto(value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: forPhoto === value }}
                  style={[
                    styles.toggleOption,
                    forPhoto === value && styles.toggleOn,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      forPhoto === value && styles.toggleTextOn,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
        {!photoMode && page.frame !== null && page.frame !== bookFrame && (
          <Text
            variant="link"
            accessibilityRole="button"
            onPress={() => onUseEverywhere(page.frame!)}
            style={styles.small}
          >
            Use {FRAME_STYLES[page.frame].label} on every page
          </Text>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        accessibilityRole="radiogroup"
        accessibilityLabel="Photo frame"
      >
        <Swatch
          frame={choosing.inherited}
          label={choosing.inheritLabel}
          checked={choosing.current === null}
          sample={preview}
          onPress={() => pick(null)}
        />
        {FRAMES.map((value) => (
          <Swatch
            key={value}
            frame={value}
            label={FRAME_STYLES[value].label}
            checked={choosing.current === value}
            sample={preview}
            onPress={() => pick(value)}
          />
        ))}
      </ScrollView>
      <Text variant="muted" style={styles.small}>
        {FRAME_STYLES[shown].description}.
      </Text>
    </View>
  );
}

function Swatch({
  frame,
  label,
  checked,
  sample,
  onPress,
}: {
  frame: FrameStyle;
  label: string;
  checked: boolean;
  sample: Photo | null;
  onPress: () => void;
}) {
  const look = usePaper();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={styles.swatch}
    >
      <View
        style={[
          styles.tile,
          { backgroundColor: look.background },
          checked && styles.checked,
        ]}
      >
        <View style={styles.inset}>
          <PrintedPhoto
            photo={FlipbookModel.photo(sample)}
            frame={frame}
            unit={SWATCH * 0.03}
          />
        </View>
      </View>
      <Text
        numberOfLines={2}
        style={[styles.label, checked && styles.labelChecked]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 8,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },
  head: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  title: { flexDirection: "row", alignItems: "center", gap: 8 },
  toggle: {
    flexDirection: "row",
    padding: 2,
    borderRadius: radius.full,
    backgroundColor: colors.surface100,
  },
  toggleOption: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  toggleOn: {
    backgroundColor: colors.white,
    boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
  },
  toggleText: { fontSize: 12, fontFamily: fonts.medium, color: colors.ink500 },
  toggleTextOn: { color: colors.ink900 },
  center: { textAlign: "center" },
  kicker: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.ink500,
  },
  small: { fontSize: 12 },
  row: { gap: 10 },
  swatch: { width: SWATCH, alignItems: "center", gap: 4 },
  tile: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.05)",
  },
  checked: { borderColor: colors.brand500 },
  inset: {
    position: "absolute",
    top: "12%",
    right: "12%",
    bottom: "12%",
    left: "12%",
  },
  label: {
    fontSize: 11,
    lineHeight: 13,
    textAlign: "center",
    color: colors.ink500,
  },
  labelChecked: { fontFamily: fonts.medium, color: colors.ink900 },
});
