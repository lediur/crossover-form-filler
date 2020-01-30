import React from "react";

type PDFTemplate = "ca-santa-clara";

interface PDFFillerProps {
  template: PDFTemplate;
}

const PDFFiller: React.FC<PDFFillerProps> = ({ template }) => {
  return <section className="pdf-filler"></section>;
};

export default PDFFiller;
