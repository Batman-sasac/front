import { Platform } from "react-native";
import type { CameraView } from "expo-camera";
import * as DocumentPicker from "expo-document-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import type { StudySource } from "../../studySource";

export async function pickGallerySources(): Promise<StudySource[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: false,
    allowsMultipleSelection: true,
    selectionLimit: 20,
    quality: 1,
  });
  if (result.canceled || !result.assets?.length) return [];

  const sources: StudySource[] = [];
  for (const asset of result.assets) {
    if (!asset.uri) continue;
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
    );
    sources.push({
      uri: manipulated.uri,
      kind: "image",
      name: asset.fileName ?? null,
      mimeType: asset.mimeType ?? "image/jpeg",
      size: asset.fileSize ?? null,
    });
  }
  return sources;
}

export async function openDocumentSourcePicker(
  onSources: (sources: StudySource[]) => void,
) {
  const isWeb =
    (typeof window !== "undefined" && !Platform.OS) || Platform.OS === "web";
  if (isWeb) {
    const input = document.createElement("input") as HTMLInputElement;
    input.type = "file";
    input.multiple = true;
    input.onchange = (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (!files) return;

      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result !== "string") return;
          onSources([
            {
              uri: reader.result,
              kind: file.type.startsWith("image/") ? "image" : "document",
              name: file.name,
              mimeType: file.type || null,
              size: file.size ?? null,
            },
          ]);
        };
        reader.onerror = () => {
          console.error("파일 읽기 실패:", file.name);
        };
        reader.readAsDataURL(file);
      });
    };
    input.click();
    return;
  }

  const result = await DocumentPicker.getDocumentAsync({
    type: "*/*",
    multiple: true,
    copyToCacheDirectory: false,
  });
  if (result.canceled || !result.assets?.length) return;
  onSources(
    result.assets.map(
      (asset) =>
        ({
          uri: asset.uri,
          kind: asset.mimeType?.startsWith("image/") ? "image" : "document",
          name: asset.name ?? null,
          mimeType: asset.mimeType ?? null,
          size: asset.size ?? null,
        }) satisfies StudySource,
    ),
  );
}

export async function captureCameraSource(
  camera: CameraView,
): Promise<StudySource | null> {
  const photo = await camera.takePictureAsync({
    quality: 0.8,
    skipProcessing: false,
  });
  if (!photo?.uri) return null;

  const manipulated = await ImageManipulator.manipulateAsync(
    photo.uri,
    [{ resize: { width: 1440 } }],
    { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
  );
  return {
    uri: manipulated.uri,
    kind: "image",
    name: "camera-photo.jpg",
    mimeType: "image/jpeg",
  };
}
