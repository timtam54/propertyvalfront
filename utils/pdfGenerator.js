import jsPDF from 'jspdf';

/**
 * Fetch Azure Blob images via server-side endpoint and convert to base64
 * @param {string[]} imageUrls - Array of Azure Blob URLs
 * @returns {Promise<string[]>} - Array of base64 encoded images
 */
async function fetchImagesAsBase64(imageUrls) {
  if (!imageUrls || imageUrls.length === 0) {
    return [];
  }

  // Filter to only Azure URLs (not already base64)
  const azureUrls = imageUrls.filter(url =>
    url && !url.startsWith('data:') && url.includes('blob.core.windows.net')
  );

  if (azureUrls.length === 0) {
    // Return any existing base64 images
    return imageUrls.filter(img => img && img.startsWith('data:image/'));
  }

  try {
    const response = await fetch('/api/images-to-base64', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ urls: azureUrls.slice(0, 3) }), // Limit to 3
    });

    if (!response.ok) {
      console.error('Failed to fetch images:', response.status);
      return [];
    }

    const data = await response.json();
    return data.images || [];
  } catch (error) {
    console.error('Error fetching images as base64:', error);
    return [];
  }
}

/**
 * Generate a professional PDF proposal from property evaluation data
 * @param {Object} property - Property details
 * @param {string} evaluationReport - The evaluation report text
 * @param {Object} comparablesData - Comparables data from web scraping
 * @param {number} pricePerSqm - Price per square meter
 * @returns {Promise<string>} - The generated filename
 */
export const generateEvaluationPDF = async (property, evaluationReport, comparablesData = null, pricePerSqm = null) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace = 20) => {
    if (yPosition + requiredSpace > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
      // Reset to default font to prevent style carryover
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(51, 65, 85);
      return true;
    }
    return false;
  };

  // Helper function to add text with word wrap
  const addText = (text, fontSize = 11, color = [0, 0, 0], fontStyle = 'normal') => {
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    doc.setFont('helvetica', fontStyle);
    const splitText = doc.splitTextToSize(text, pageWidth - 40);

    splitText.forEach(line => {
      checkPageBreak();
      doc.text(line, 20, yPosition);
      yPosition += fontSize * 0.5;
    });
    yPosition += 5;
  };

  // COVER PAGE
  // Header with logo placeholder
  doc.setFillColor(14, 165, 233); // Sky blue
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('PropertyEval', pageWidth / 2, 25, { align: 'center' });

  yPosition = 60;

  // Title
  doc.setFontSize(24);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('Property Evaluation Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  // Property address
  doc.setFontSize(16);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(property.location || 'Property Address', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 30;

  // Property summary box
  doc.setFillColor(240, 249, 255);
  doc.roundedRect(20, yPosition, pageWidth - 40, 60, 5, 5, 'F');

  yPosition += 15;
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('Property Summary', 30, yPosition);
  yPosition += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const summaryLines = [
    `${property.beds} Bedrooms  •  ${property.baths} Bathrooms  •  ${property.carpark} Car Parks`,
    property.size ? `Size: ${property.size} sqm` : '',
    property.property_type ? `Type: ${property.property_type}` : '',
    pricePerSqm ? `Price per sqm: $${pricePerSqm.toLocaleString()}/sqm` : ''
  ].filter(Boolean);

  summaryLines.forEach(line => {
    doc.text(line, 30, yPosition);
    yPosition += 7;
  });

  yPosition += 30;

  // Date and report type
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const reportDate = new Date().toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.text(`Report Date: ${reportDate}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 7;
  doc.text('Confidential Market Valuation', pageWidth / 2, yPosition, { align: 'center' });

  // Footer on cover page
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text('Powered by PropertyEval AI Valuation System', pageWidth / 2, pageHeight - 20, { align: 'center' });

  // NEW PAGE - Property Images (fetch from Azure via server-side endpoint)
  const base64Images = await fetchImagesAsBase64(property.images || []);

  if (base64Images.length > 0) {
    doc.addPage();
    yPosition = 20;

    // Section header
    doc.setFillColor(14, 165, 233);
    doc.rect(0, yPosition - 5, pageWidth, 15, 'F');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('Property Photos', pageWidth / 2, yPosition + 5, { align: 'center' });
    yPosition += 25;

    // Add images in a grid layout (2 columns), limit to 3
    const maxImages = 3;
    const imageWidth = (pageWidth - 50) / 2;
    const imageHeight = 70;
    let col = 0;
    let imagesAdded = 0;

    for (let i = 0; i < Math.min(base64Images.length, maxImages); i++) {
      const imageData = base64Images[i];

      try {
        // Calculate position
        const xPos = 20 + col * (imageWidth + 10);

        // Check if we need a new page
        if (yPosition + imageHeight > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }

        // Add the image
        const imageType = imageData.includes('png') ? 'PNG' : 'JPEG';
        doc.addImage(imageData, imageType, xPos, yPosition, imageWidth, imageHeight, undefined, 'MEDIUM');

        imagesAdded++;
        col++;

        // Move to next row after 2 images
        if (col >= 2) {
          col = 0;
          yPosition += imageHeight + 10;
        }
      } catch (error) {
        console.log('Error adding image to PDF:', error);
      }
    }

    // Add note about total images if there are more
    const totalImages = (property.images || []).length;
    if (totalImages > maxImages && imagesAdded > 0) {
      yPosition += col > 0 ? imageHeight + 15 : 10;
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Showing ${imagesAdded} of ${totalImages} photos`, pageWidth / 2, yPosition, { align: 'center' });
    }
  }

  // NEW PAGE - Full Evaluation Report
  doc.addPage();
  yPosition = 20;

  // Section header
  doc.setFillColor(14, 165, 233);
  doc.rect(0, yPosition - 5, pageWidth, 15, 'F');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Detailed Evaluation Report', pageWidth / 2, yPosition + 5, { align: 'center' });
  yPosition += 25;

  // Evaluation report content - very strict formatting for consistency
  const reportLines = evaluationReport.split('\n');

  reportLines.forEach(line => {
    const trimmedLine = line.trim();

    // Skip empty lines with small spacing
    if (!trimmedLine) {
      yPosition += 2;
      return;
    }

    // VERY STRICT heading detection - only numbered sections like "1)", "2)", "1.", "2."
    // This ensures only main section headings are formatted differently
    const isMainHeading = /^(\d+[.)]\s)/.test(trimmedLine);

    // EXPLICITLY set font properties for EVERY line to ensure consistency
    if (isMainHeading) {
      checkPageBreak(15);
      yPosition += 5;
      // Bold and blue for main headings only
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(14, 165, 233); // Blue color
    } else {
      // ALL OTHER TEXT - explicitly reset to normal to prevent any italic/oblique rendering
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(51, 65, 85); // Dark gray
    }

    // Split text to fit page width and render each line with same formatting
    const splitText = doc.splitTextToSize(trimmedLine, pageWidth - 40);
    splitText.forEach((textLine, index) => {
      checkPageBreak();
      // Re-apply font settings for each line segment to prevent style bleeding
      if (isMainHeading) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(14, 165, 233);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(51, 65, 85);
      }
      doc.text(textLine, 20, yPosition);
      yPosition += isMainHeading ? 7 : 5.5;
    });
  });

  // Footer on last page
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text('PropertyEval - Confidential', pageWidth - 20, pageHeight - 10, { align: 'right' });
  }

  // Generate filename
  const filename = `Property_Evaluation_${property.location?.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

  // Save the PDF
  doc.save(filename);

  return filename;
};
