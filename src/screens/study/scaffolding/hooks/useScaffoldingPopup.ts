import { useState } from "react";

export function useScaffoldingPopup() {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [onConfirm, setOnConfirm] = useState<(() => void) | null>(null);

  const showPopup = (
    nextTitle: string,
    nextMessage: string,
    nextOnConfirm?: () => void,
  ) => {
    setTitle(nextTitle);
    setMessage(nextMessage);
    setOnConfirm(() => nextOnConfirm ?? null);
    setVisible(true);
  };

  const handleConfirm = () => {
    setVisible(false);
    const callback = onConfirm;
    setOnConfirm(null);
    callback?.();
  };

  return {
    visible,
    title,
    message,
    showPopup,
    handleConfirm,
  };
}
