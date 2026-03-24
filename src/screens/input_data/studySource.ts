export type StudySourceKind = 'image' | 'document';

export type StudySource = {
    uri: string;
    kind: StudySourceKind;
    name?: string | null;
    mimeType?: string | null;
    size?: number | null;
};

export function isImageStudySource(source: StudySource | null | undefined) {
    if (!source?.uri) return false;
    if (source.kind === 'image') return true;
    return typeof source.mimeType === 'string' && source.mimeType.startsWith('image/');
}

export function getStudySourceName(source: StudySource | null | undefined, fallback = '파일') {
    if (source?.name && source.name.trim()) return source.name;
    const uri = source?.uri ?? '';
    const lastSegment = uri.split('/').pop();
    return lastSegment && lastSegment.trim() ? lastSegment : fallback;
}

export function getStudySourceExtension(source: StudySource | null | undefined) {
    const name = getStudySourceName(source, '');
    const match = name.match(/\.([a-z0-9]+)$/i);
    return match?.[1]?.toUpperCase() ?? '';
}
