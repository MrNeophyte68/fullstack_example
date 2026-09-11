export function exportCanvas(canvas: HTMLCanvasElement, name: string): void {
    const anchor = document.createElement('a');
    anchor.download = `${name.replace(/\s+/g, '_')}.png`;
    anchor.href = canvas.toDataURL('image/png');
    anchor.click();
}
