export function distributionHeap(freeMemory: number, modCount: number = 0, baseMemory: number = 1024): number {
    const ramAvailableMB = freeMemory;
    let ramMininumMB: number;
    let ramTarget1MB: number;
    let ramTarget2MB: number;
    let ramTarget3MB: number;
    
    if (modCount > 0) {
        const modFactor = Math.min(modCount / 100, 100); 
        ramMininumMB = Math.max(512 + modCount / 160 * 1024, baseMemory); 
        ramTarget1MB = 1536 + modFactor * 512;  
        ramTarget2MB = 2560 + modFactor * 1024; 
        ramTarget3MB = 4096 + modFactor * 2048; 
    } else {
        ramMininumMB = Math.max(512, baseMemory);
        ramTarget1MB = 1536;  
        ramTarget2MB = 2560; 
        ramTarget3MB = 4096; 
    }
    let ramGiveMB = 0;
    let remainingMemory = ramAvailableMB;
    const phase1Delta = ramTarget1MB;
    const phase1Alloc = Math.min(remainingMemory, phase1Delta);
    ramGiveMB += phase1Alloc;
    remainingMemory -= phase1Delta;
    if (remainingMemory < 100) return finalizeMemoryMB(ramGiveMB, ramMininumMB); 

    const phase2Delta = ramTarget2MB - ramTarget1MB;
    const phase2Alloc = Math.min(remainingMemory * 0.7, phase2Delta);
    ramGiveMB += phase2Alloc;
    remainingMemory -= phase2Delta / 0.7;
    if (remainingMemory < 100) return finalizeMemoryMB(ramGiveMB, ramMininumMB);
    
    const phase3Delta = ramTarget3MB - ramTarget2MB;
    const phase3Alloc = Math.min(remainingMemory * 0.4, phase3Delta);
    ramGiveMB += phase3Alloc;
    remainingMemory -= phase3Delta / 0.4;
    if (remainingMemory < 100) return finalizeMemoryMB(ramGiveMB, ramMininumMB);
    
    const phase4Delta = ramTarget3MB;
    const phase4Alloc = Math.min(remainingMemory * 0.15, phase4Delta);
    ramGiveMB += phase4Alloc;
    
    return finalizeMemoryMB(ramGiveMB, ramMininumMB);
}

function finalizeMemoryMB(ramGiveMB: number, ramMininumMB: number): number {
    const finalMB = Math.round(Math.max(ramGiveMB, ramMininumMB));
    return finalMB;
}