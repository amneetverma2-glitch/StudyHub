
import { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

function PdfThumbnail({ note, fallback }) {
  const [thumbnail, setThumbnail] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let loadingTask;

    async function renderFirstPage() {
      const fileName = note?.file_name || "";

      if (!note?.id || !fileName.toLowerCase().endsWith(".pdf")) {
        setThumbnail("");
        setFailed(true);
        return;
      }

      try {
        setThumbnail("");
        setFailed(false);

        const response = await fetch(
          `http://localhost:5000/api/notes/${note.id}/file`
        );

        if (!response.ok) {
          throw new Error(`PDF request failed: ${response.status}`);
        }

        const data = await response.arrayBuffer();

        if (cancelled) return;

        loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        // Render at higher resolution for a sharper thumbnail.
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Canvas unavailable");
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        if (!cancelled) {
          // Crop the upper 58% of the page for a zoomed cover preview.
          const cropCanvas = document.createElement("canvas");
          const cropContext = cropCanvas.getContext("2d");
          const cropHeight = Math.floor(canvas.height * 0.58);

          if (!cropContext) {
            throw new Error("Crop canvas unavailable");
          }

          cropCanvas.width = canvas.width;
          cropCanvas.height = cropHeight;

          cropContext.drawImage(
            canvas,
            0, 0, canvas.width, cropHeight,
            0, 0, cropCanvas.width, cropCanvas.height
          );

          setThumbnail(cropCanvas.toDataURL("image/jpeg", 0.9));
          cropCanvas.width = 0;
          cropCanvas.height = 0;
        }

        page.cleanup();
        canvas.width = 0;
        canvas.height = 0;
      } catch (error) {
        if (!cancelled) {
          console.error("PDF thumbnail error:", error);
          setFailed(true);
        }
      }
    }

    renderFirstPage();

    return () => {
      cancelled = true;
      if (loadingTask) loadingTask.destroy();
    };
  }, [note?.id, note?.file_name]);

  if (thumbnail && !failed) {
    return (
      <img
        src={thumbnail}
        alt={`Preview of ${note?.title || "PDF document"}`}
        className="explore-pdf-thumbnail"
      />
    );
  }

  return fallback;
}

export default PdfThumbnail;
