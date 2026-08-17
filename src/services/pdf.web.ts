export async function createPdf(html: string) {
  const { jsPDF } = await import('jspdf/dist/jspdf.es.min.js');
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.left = '-10000px';
  frame.style.top = '0';
  frame.style.width = '794px';
  frame.style.height = '1123px';
  document.body.appendChild(frame);

  try {
    const frameDocument = frame.contentDocument;
    if (!frameDocument) throw new Error('Unable to initialize PDF document');
    frameDocument.open();
    frameDocument.write(html);
    frameDocument.close();
    await Promise.all(
      Array.from(frameDocument.images)
        .filter((image) => !image.complete)
        .map(
          (image) =>
            new Promise<void>((resolve) => {
              image.addEventListener('load', () => resolve(), { once: true });
              image.addEventListener('error', () => resolve(), { once: true });
            }),
        ),
    );

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    await pdf.html(frameDocument.body, {
      autoPaging: 'text',
      width: 190,
      windowWidth: 794,
      x: 10,
      y: 10,
      html2canvas: {
        scale: 0.9,
        useCORS: true,
      },
    });
    return URL.createObjectURL(pdf.output('blob'));
  } finally {
    frame.remove();
  }
}

export async function sharePdf(uri: string) {
  window.open(uri, '_blank', 'noopener,noreferrer');
}
