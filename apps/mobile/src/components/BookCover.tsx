import { useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { BookLookProvider, CoverView } from "@toneflix/flipbook-native";
import {
  COVER_THEMES,
  FlipbookModel,
  type Book,
  type BookTheme,
  type Photo,
} from "@photos/types";
import { BOOK_FONTS } from "@/components/book/look";

/** Cover cloth and foil for each theme, from the flipbook library's cloths. */
export const COVERS = Object.fromEntries(
  Object.entries(COVER_THEMES).map(([theme, { cloth, ink, label }]) => [
    theme,
    { cloth, foil: ink, label },
  ]),
) as Record<BookTheme, { cloth: string; foil: string; label: string }>;

export type CoverLook = Pick<Book, "title" | "description" | "theme"> &
  Partial<Pick<Book, "coverDesign" | "coverText">> & {
    coverPhoto?: Photo | null;
  };

/** A book's front cover, drawn by the flipbook library at whatever size its box is. */
export function BookCover({ book }: { book: CoverLook }) {
  const [width, setWidth] = useState(0);
  const look = FlipbookModel.cover({
    coverDesign: "classic",
    coverText: null,
    coverPhoto: null,
    ...book,
  });

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={(event: LayoutChangeEvent) =>
        setWidth(event.nativeEvent.layout.width)
      }
    >
      {width > 0 && (
        <BookLookProvider fonts={BOOK_FONTS}>
          <CoverView book={look} width={width} />
        </BookLookProvider>
      )}
    </View>
  );
}
