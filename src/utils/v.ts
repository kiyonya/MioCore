export function compareVersions(version1:string, version2:string) {
    const extractVersionNumbers = (version:string) => {
        const match = version.match(/(\d+(?:\.\d+)*)/);
        return match ? match[0] : '';
    };
    const cleanVersion1 = extractVersionNumbers(version1);
    const cleanVersion2 = extractVersionNumbers(version2);
    const parts1 = cleanVersion1.split('.').map(Number);
    const parts2 = cleanVersion2.split('.').map(Number);
    const maxLength = Math.max(parts1.length, parts2.length);
    for (let i = 0; i < maxLength; i++) {
        const num1 = i < parts1.length ? parts1[i] : 0;
        const num2 = i < parts2.length ? parts2[i] : 0;
        if (num1 > num2) {
            return version1;
        } else if (num1 < num2) {
            return version2;
        }
    }
    return version1.length >= version2.length ? version1 : version2;
}
