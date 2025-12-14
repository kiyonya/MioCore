export function parseManifestMF(manifestText: string): Record<string, string> {
    const result: Record<string, string> = {};
    if (!manifestText || manifestText.trim() === '') {
        return result;
    }
    const lines = manifestText.split('\n');
    let currentKey = '';
    let currentValue = '';

    for (const line of lines) {
        if (line.trim() === '') {
            continue;
        }
        if (line.startsWith(' ')) {
            currentValue += '\n' + line.trimStart();
        } else {
            if (currentKey) {
                result[currentKey] = currentValue;
            }
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                currentKey = line.substring(0, colonIndex).trim();
                currentValue = line.substring(colonIndex + 1).trim();
            } else {
                console.warn(`Invalid line in manifest: ${line}`);
                currentKey = '';
                currentValue = '';
            }
        }
    }
    if (currentKey) {
        result[currentKey] = currentValue;
    }
    return result;
}