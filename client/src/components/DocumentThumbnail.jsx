
import { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import JSZip from "jszip";
import mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function makeThumbnail(title, lines, type) {
  const isPresentation = type === "PPTX";
  const width = 600;
  const height = 338;
  const heading = (title || "Study Material").slice(0, 65);

  const textLines = lines
    .filter(Boolean)
    .slice(0, 5);

  const lineMarkup = textLines
    .map((line, index) => {
      const shortLine = line.slice(0, 65);
      const y = 165 + index * 25;

      return `
        <rect x="42" y="${y - 12}" width="5" height="5"
          rx="2" fill="#6577df"/>
        <text x="58" y="${y}" font-size="14"
          fill="#475569">${escapeXml(shortLine)}</text>
      `;
    })
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
      width="${width}" height="${height}"
      viewBox="0 0 ${width} ${height}">
      <rect width="600" height="338" fill="#f1f4ff"/>
      <rect x="24" y="18" width="552" height="302"
        rx="12" fill="#ffffff"/>
      <rect x="24" y="18" width="552" height="8"
        rx="4" fill="#5265d9"/>
      <text x="42" y="55" font-size="11"
        font-weight="700" letter-spacing="1.5"
        fill="#5265d9">${type} • STUDYHUB</text>
      <text x="42" y="98" font-size="22"
        font-weight="700" fill="#172554">
        ${escapeXml(heading.slice(0, 42))}
      </text>
      ${
        heading.length > 42
          ? `<text x="42" y="125" font-size="18" fill="#172554">
              ${escapeXml(heading.slice(42, 65))}
            </text>`
          : ""
      }
      <line x1="42" y1="140" x2="558" y2="140"
        stroke="#e2e8f0"/>
      ${lineMarkup}
      <text x="42" y="296" font-size="10"
        fill="#94a3b8">DOCUMENT PREVIEW</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function getDocxThumbnail(data, note) {
  const result = await mammoth.extractRawText({
    arrayBuffer: data,
  });

  const lines = result.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 2);

  const title = note.title || lines[0] || "Study Notes";

  return makeThumbnail(title, lines, "DOCX");
}

async function getPptxThumbnail(data, note) {
  const zip = await JSZip.loadAsync(data);
  const slideFile = zip.file("ppt/slides/slide1.xml");

  if (!slideFile) {
    throw new Error("First PowerPoint slide not found");
  }

  const xml = await slideFile.async("text");
  const document = new DOMParser().parseFromString(
    xml,
    "application/xml"
  );

  const lines = Array.from(document.getElementsByTagName("a:t"))
    .map((element) => element.textContent?.trim() || "")
    .filter(Boolean);

  const title = lines[0] || note.title || "Presentation";

  return makeThumbnail(title, lines.slice(1), "PPTX");
}

function DocumentThumbnail({ note, fallback }) {
  const [thumbnail, setThumbnail] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let loadingTask = null;

    async function generateThumbnail() {
      const fileName = note?.file_name || "";
      const extension = fileName.split(".").pop()?.toLowerCase();

      setThumbnail("");
      setFailed(false);

      if (!note?.id || !["pdf", "docx", "pptx"].includes(extension)) {
        setFailed(true);
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:5000/api/notes/${note.id}/file`
        );

        if (!response.ok) {
          throw new Error(`File request failed: ${response.status}`);
        }

        const data = await response.arrayBuffer();

        if (cancelled) return;

        let image = "";

        if (extension === "pdf") {
          loadingTask = pdfjsLib.getDocument({ data });

          const pdf = await loadingTask.promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 2 });

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) throw new Error("PDF canvas unavailable");

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);

          await page.render({
            canvasContext: context,
            viewport,
          }).promise;

          if (cancelled) return;

          const cropCanvas = document.createElement("canvas");
          const cropContext = cropCanvas.getContext("2d");

          if (!cropContext) throw new Error("PDF crop canvas unavailable");

          cropCanvas.width = canvas.width;
          cropCanvas.height = Math.floor(canvas.height * 0.58);

          cropContext.drawImage(
            canvas,
            0, 0, canvas.width, cropCanvas.height,
            0, 0, cropCanvas.width, cropCanvas.height
          );

          image = cropCanvas.toDataURL("image/jpeg", 0.9);

          cropCanvas.width = 0;
          cropCanvas.height = 0;
          canvas.width = 0;
          canvas.height = 0;
          page.cleanup();
        }

        if (extension === "docx") {
          image = await getDocxThumbnail(data, note);
        }

        if (extension === "pptx") {
          image = await getPptxThumbnail(data, note);
        }

        if (!cancelled && image) {
          setThumbnail(image);
          setFailed(false);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            `${extension?.toUpperCase()} thumbnail error:`,
            error
          );
          setFailed(true);
        }
      }
    }

    generateThumbnail();

    return () => {
      cancelled = true;

      if (loadingTask) {
        loadingTask.destroy();
      }
    };
  }, [note?.id, note?.file_name, note?.title]);

  if (thumbnail && !failed) {
    return (
      <img
        src={thumbnail}
        alt={`${note?.title || "Study material"} thumbnail`}
        className="explore-pdf-thumbnail"
      />
    );
  }

  return fallback;
}

export default DocumentThumbnail;
