import { entries, forEach } from "lodash/fp";
import {
  grayscale,
  PDFDocument,
  PDFFont,
  PDFPage,
  PDFPageDrawTextOptions,
  StandardFonts,
} from "pdf-lib";
import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useQuery } from "react-query";
import { useAsync, useDebounce, useMeasure } from "react-use";
import styles from "./PDFFiller.module.css";
import { Container, Col, Row } from "react-bootstrap";
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

type PDFTemplate = "ca-santa-clara";

interface FetchPdfProps {
  template: PDFTemplate;
}

interface UserFields {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  streetAddress: string;
  city: string;
  zipCode: string;
  phone: string;
}

interface FixedFormFields {
  electionName: string;
  electionDate: string;
  state: string;
  checkbox: string;
}

type CrossoverFormFields = UserFields & FixedFormFields;

type FieldPositionProps = {
  [K in keyof CrossoverFormFields]: PDFPageDrawTextOptions;
};

type RequiredFieldProps = {
  [K in keyof UserFields]: boolean;
};

const FIXED_FIELDS: FixedFormFields = {
  electionName: "Presidential Primary Election",
  electionDate: "03/03/2020",
  state: "CA",
  checkbox: "X",
};

const DEFAULT_TEXT_OPTIONS: PDFPageDrawTextOptions = {
  size: 15,
  color: grayscale(0),
};

const FIELD_POSITION_PROPS: FieldPositionProps = {
  electionName: { x: 110, y: 390 },
  electionDate: { x: 580, y: 390 },
  firstName: { x: 120, y: 355 },
  middleName: { x: 270, y: 355 },
  lastName: { x: 400, y: 355 },
  dateOfBirth: { x: 650, y: 355 },
  streetAddress: { x: 160, y: 315 },
  city: { x: 160, y: 280 },
  state: { x: 385, y: 280 },
  zipCode: { x: 550, y: 280 },
  phone: { x: 210, y: 240 },
  checkbox: { x: 65, y: 145, size: 28 },
};

const REQUIRED_FIELDS: RequiredFieldProps = {
  firstName: true,
  middleName: false,
  lastName: true,
  dateOfBirth: true,
  streetAddress: true,
  city: true,
  zipCode: true,
  phone: true,
};

const getPdfUrlFromTemplate = (template: PDFTemplate) =>
  `${process.env.PUBLIC_URL}/pdf-templates/${template}.pdf`;

const fetchPDFAsBuffer = ({ template }: FetchPdfProps): Promise<ArrayBuffer> =>
  fetch(getPdfUrlFromTemplate(template)).then(res => res.arrayBuffer());

interface PDFFillerProps {
  template: PDFTemplate;
}

const buildPdfRenderer = (page: PDFPage, font: PDFFont) =>
  forEach<[keyof CrossoverFormFields, string]>(([field, value]) => {
    const options = {
      font,
      ...DEFAULT_TEXT_OPTIONS,
      ...FIELD_POSITION_PROPS[field],
    };
    page.drawText(value, options);
  });

const PDFFiller: React.FC<PDFFillerProps> = ({ template }) => {
  const { data: originalPDF } = useQuery(
    ["originalPDF", { template }],
    fetchPDFAsBuffer,
    { staleTime: 360000 }
  );
  const [renderedPDF, setRenderedPDF] = useState<Uint8Array | null>(null);
  const [formInput, setFormInput] = useState<UserFields>({
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    phone: "",
    streetAddress: "",
    city: "",
    zipCode: "",
  });
  const [pdfFields, setPdfFields] = useState<UserFields | null>(null);
  const [ref, { width }] = useMeasure();

  useDebounce(
    () => {
      setPdfFields({
        ...formInput,
        dateOfBirth:
          formInput.dateOfBirth.length > 0
            ? new Date(formInput.dateOfBirth).toLocaleDateString("en-US", {
                timeZone: "UTC",
              })
            : "",
      });
    },
    250,
    [formInput, setPdfFields]
  );

  useAsync(async () => {
    if (originalPDF != null && pdfFields != null) {
      const doc = await PDFDocument.load(originalPDF);
      console.log("Rerendering PDF", pdfFields);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const page = doc.getPages()[0];
      const renderPdfFields = buildPdfRenderer(page, font);
      renderPdfFields(entries({ ...pdfFields, ...FIXED_FIELDS }));
      console.log("Saving PDF...");
      const renderedPdf = await doc.save();
      setRenderedPDF(renderedPdf);
    }
  }, [setRenderedPDF, pdfFields]);

  const isFormValid = () => {
    return Object.keys(formInput).every(
      key =>
        !REQUIRED_FIELDS[key as keyof UserFields] ||
        formInput[key as keyof UserFields].length > 0
    );
  };

  const handleChange = (field: keyof UserFields) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => setFormInput({ ...formInput, [field]: e.target.value });

  const handleDateOfBirthChange: React.ChangeEventHandler<HTMLInputElement> = e =>
    setFormInput({
      ...formInput,
      dateOfBirth: e.target.value,
    });

  const handleDownloadForm: React.MouseEventHandler<HTMLInputElement> = e => {
    e.preventDefault();
    if (renderedPDF != null) {
      const blob = new Blob([renderedPDF], { type: "application/pdf" });
      const objectUrl = window.URL.createObjectURL(blob);
      window.location.href = objectUrl;
    }
  };

  return (
    <Container className={styles.page} fluid ref={ref}>
      <Row>
        <Col md={4} className={styles.formContainer}>
          <header>
            <h1>Santa Clara Crossover Ballot Generator</h1>
          </header>
          <section>
            <header>
              <p>
                Fill out the information below. Your data will never leave your
                computer and is only used to fill out the crossover ballot
                request form.
              </p>
            </header>
            <form className={styles.form}>
              <input
                className={styles.input}
                type="text"
                onChange={handleChange("firstName")}
                placeholder="First name"
                autoComplete="given-name"
                value={formInput.firstName}
                required
              ></input>
              <input
                className={styles.input}
                type="text"
                onChange={handleChange("middleName")}
                placeholder="Middle name or initial"
                autoComplete="additional-name"
                value={formInput.middleName}
              ></input>
              <input
                className={styles.input}
                type="text"
                onChange={handleChange("lastName")}
                placeholder="Last name"
                autoComplete="family-name"
                value={formInput.lastName}
                required
              ></input>
              <input
                className={styles.input}
                type="date"
                onChange={handleDateOfBirthChange}
                placeholder="Date of birth"
                autoComplete="bday"
                value={formInput.dateOfBirth}
                required
              ></input>
              <input
                className={styles.input}
                type="text"
                onChange={handleChange("streetAddress")}
                placeholder="Street address"
                autoComplete="street-address"
                value={formInput.streetAddress}
                required
              ></input>
              <input
                className={styles.input}
                type="text"
                onChange={handleChange("city")}
                placeholder="City"
                autoComplete="address-level2"
                value={formInput.city}
                required
              ></input>
              <input
                className={styles.input}
                type="text"
                onChange={handleChange("zipCode")}
                placeholder="ZIP code"
                autoComplete="postal-code"
                value={formInput.zipCode}
                required
              ></input>
              <input
                className={styles.input}
                type="tel"
                onChange={handleChange("phone")}
                placeholder="Phone"
                autoComplete="tel"
                value={formInput.phone}
                required
              ></input>
              <p>
                Check the document to the right and make sure your information
                is correct.
              </p>
              <p>Then, download your form below.</p>
              <input
                type="submit"
                className={styles.downloadButton}
                value="Download form"
                onClick={handleDownloadForm}
                disabled={!isFormValid()}
              />
            </form>
          </section>
        </Col>
        <Col className={styles.documentContainer}>
          {renderedPDF != null && (
            <Document
              file={{ data: renderedPDF }}
              className={styles.document}
              loading={<LoadingDocument />}
            >
              <Page
                width={width > 750 ? Math.min((width * 2) / 3, 750) : width}
                pageIndex={0}
                className={styles.page}
              />
            </Document>
          )}
        </Col>
      </Row>
    </Container>
  );
};

const LoadingDocument: React.FC = () => (
  <div className={styles.loadingDocument}>
    <h2>Generating your document...</h2>
  </div>
);

export default PDFFiller;
