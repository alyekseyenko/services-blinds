"use client";

import { useEffect, useState } from "react";
import { ONBOARDING_CHAPTER_PICKER_OPEN_EVENT } from "@/lib/onboarding/events";
import { TourChapterPicker } from "@/components/onboarding/TourHelpButton";

/** Um único picker global — sobrevive ao fecho de menus modais que embutiam o botão ?. */
export default function TourChapterPickerHost() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(ONBOARDING_CHAPTER_PICKER_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(ONBOARDING_CHAPTER_PICKER_OPEN_EVENT, onOpen);
  }, []);

  return <TourChapterPicker open={open} onClose={() => setOpen(false)} />;
}
