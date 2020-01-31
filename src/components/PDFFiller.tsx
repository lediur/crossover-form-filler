import React, { useState } from "react";
import { useQuery } from "react-query";
import { PDFDocument } from "pdf-lib";
import { useAsync } from "react-use";

type PDFTemplate = "ca-santa-clara";

interface FetchPdfProps {
  template: PDFTemplate;
}

const getPdfUrlFromTemplate = (template: PDFTemplate) =>
  `${process.env.PUBLIC_URL}/pdf-templates/${template}.pdf`;

const fetchPdfAsBuffer = ({ template }: FetchPdfProps): Promise<ArrayBuffer> =>
  fetch(getPdfUrlFromTemplate(template)).then(res => res.arrayBuffer());

interface PDFFillerProps {
  template: PDFTemplate;
}

const PDFFiller: React.FC<PDFFillerProps> = ({ template }) => {
  const { data: originalPdf, isLoading, error } = useQuery(
    ["pdf", { template }],
    fetchPdfAsBuffer
  );
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  useAsync(async () => {
    if (originalPdf != null) {
      const doc = await PDFDocument.load(originalPdf);
      setPdfDoc(doc);
    }
  }, [originalPdf]);

  return <section className="pdf-filler"></section>;
};

export default PDFFiller;
