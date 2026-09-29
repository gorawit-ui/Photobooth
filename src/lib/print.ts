/**
 * Print a composed photo on 4x6 inch portrait paper.
 *
 * The image goes into a print-only sheet outside the React tree; the
 * `@media print` rules in styles.css hide the app and size the sheet to
 * exactly 4in x 6in with `@page { size: 4in 6in; margin: 0 }`.
 * Only ever called from a button tap — never automatically.
 */

const SHEET_ID = 'print-sheet';

function getSheetImage(): HTMLImageElement {
  let sheet = document.getElementById(SHEET_ID);
  if (!sheet) {
    sheet = document.createElement('div');
    sheet.id = SHEET_ID;
    sheet.setAttribute('aria-hidden', 'true');
    sheet.appendChild(document.createElement('img'));
    document.body.appendChild(sheet);
  }
  return sheet.querySelector('img')!;
}

export async function printPhoto(url: string): Promise<void> {
  const img = getSheetImage();
  if (img.src !== url) {
    img.src = url;
    try {
      await img.decode();
    } catch {
      // decode() can reject for already-loaded images in some Safari versions;
      // the image is still usable.
    }
  }
  window.print();
}
