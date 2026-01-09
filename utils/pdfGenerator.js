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
 * Parse markdown text and extract formatting
 * @param {string} text - The markdown text to parse
 * @returns {Array} - Array of text segments with formatting info
 */
function parseMarkdownLine(text) {
  const segments = [];
  let remaining = text;

  // Process bold text (**text** or __text__)
  const boldRegex = /\*\*(.+?)\*\*|__(.+?)__/g;
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), bold: false });
    }
    // Add the bold text
    segments.push({ text: match[1] || match[2], bold: true });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), bold: false });
  }

  // If no segments, return the whole text
  if (segments.length === 0) {
    segments.push({ text, bold: false });
  }

  return segments;
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
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let yPosition = 20;

  // Color palette
  const colors = {
    primary: [14, 165, 233],      // Sky blue
    primaryDark: [2, 132, 199],   // Darker blue
    heading: [15, 23, 42],        // Slate 900
    subheading: [30, 58, 138],    // Blue 800
    text: [51, 65, 85],           // Slate 600
    lightText: [100, 116, 139],   // Slate 500
    muted: [148, 163, 184],       // Slate 400
    accent: [16, 185, 129],       // Emerald 500
    warning: [245, 158, 11],      // Amber 500
    bgLight: [240, 249, 255],     // Sky 50
    bgAccent: [236, 253, 245],    // Emerald 50
    white: [255, 255, 255],
  };

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace = 20) => {
    if (yPosition + requiredSpace > pageHeight - 25) {
      doc.addPage();
      yPosition = 25;
      return true;
    }
    return false;
  };

  // Helper to draw a rounded box
  const drawBox = (x, y, width, height, fillColor, borderColor = null, borderRadius = 5) => {
    doc.setFillColor(...fillColor);
    doc.roundedRect(x, y, width, height, borderRadius, borderRadius, 'F');
    if (borderColor) {
      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.5);
      doc.roundedRect(x, y, width, height, borderRadius, borderRadius, 'S');
    }
  };

  // Helper to render text with inline bold
  const renderFormattedText = (text, x, y, maxWidth, fontSize = 11, baseColor = colors.text) => {
    const segments = parseMarkdownLine(text);
    let currentX = x;
    doc.setFontSize(fontSize);

    segments.forEach(segment => {
      if (segment.bold) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.heading);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...baseColor);
      }

      const textWidth = doc.getTextWidth(segment.text);

      // Check if we need to wrap
      if (currentX + textWidth > x + maxWidth) {
        // Simple wrap - just render what fits
        const words = segment.text.split(' ');
        words.forEach((word, idx) => {
          const wordWidth = doc.getTextWidth(word + ' ');
          if (currentX + wordWidth > x + maxWidth) {
            y += fontSize * 0.5;
            currentX = x;
            checkPageBreak();
          }
          doc.text(word + (idx < words.length - 1 ? ' ' : ''), currentX, y);
          currentX += wordWidth;
        });
      } else {
        doc.text(segment.text, currentX, y);
        currentX += textWidth;
      }
    });

    return y;
  };

  // ==================== COVER PAGE ====================

  // Header gradient bar
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 45, 'F');
  doc.setFillColor(...colors.primaryDark);
  doc.rect(0, 40, pageWidth, 5, 'F');

  // Logo/Brand
  doc.setFontSize(32);
  doc.setTextColor(...colors.white);
  doc.setFont('helvetica', 'bold');
  doc.text('PropertyEval', pageWidth / 2, 28, { align: 'center' });

  yPosition = 70;

  // Main title
  doc.setFontSize(28);
  doc.setTextColor(...colors.heading);
  doc.setFont('helvetica', 'bold');
  doc.text('Property Valuation Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Property address
  doc.setFontSize(14);
  doc.setTextColor(...colors.lightText);
  doc.setFont('helvetica', 'normal');
  const addressLines = doc.splitTextToSize(property.location || 'Property Address', pageWidth - 60);
  addressLines.forEach(line => {
    doc.text(line, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 7;
  });
  yPosition += 15;

  // Property summary card
  drawBox(25, yPosition, pageWidth - 50, 70, colors.bgLight, colors.primary);
  yPosition += 15;

  doc.setFontSize(14);
  doc.setTextColor(...colors.primaryDark);
  doc.setFont('helvetica', 'bold');
  doc.text('Property Summary', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(...colors.text);

  // Property specs in a nice layout
  const specs = [
    `${property.beds || 0} Bedrooms`,
    `${property.baths || 0} Bathrooms`,
    `${property.carpark || 0} Car Spaces`
  ].join('   •   ');
  doc.text(specs, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  if (property.size) {
    doc.text(`Land Size: ${property.size} sqm`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
  }
  if (property.property_type) {
    doc.text(`Property Type: ${property.property_type}`, pageWidth / 2, yPosition, { align: 'center' });
  }

  yPosition += 45;

  // Estimated value highlight box (if we can extract it)
  const valueMatch = evaluationReport?.match(/##\s*\d+\.?\s*Estimated Value Range[\s\S]*?\$\s*([\d,]+)[^\d]*(?:to|and|-|–)[^\d]*\$\s*([\d,]+)/i);
  if (valueMatch) {
    drawBox(30, yPosition, pageWidth - 60, 45, colors.bgAccent, colors.accent);
    yPosition += 12;

    doc.setFontSize(11);
    doc.setTextColor(...colors.accent);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTIMATED VALUE RANGE', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    doc.setFontSize(22);
    doc.setTextColor(...colors.heading);
    doc.text(`$${valueMatch[1]} - $${valueMatch[2]}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 30;
  }

  // Report metadata
  yPosition = pageHeight - 50;
  doc.setFontSize(10);
  doc.setTextColor(...colors.lightText);
  doc.setFont('helvetica', 'normal');
  const reportDate = new Date().toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.text(`Report Generated: ${reportDate}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 7;
  doc.text('Confidential Market Valuation', pageWidth / 2, yPosition, { align: 'center' });

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(...colors.muted);
  doc.text('Powered by PropertyEval AI Valuation System', pageWidth / 2, pageHeight - 15, { align: 'center' });

  // ==================== PROPERTY IMAGES PAGE ====================
  const base64Images = await fetchImagesAsBase64(property.images || []);

  if (base64Images.length > 0) {
    doc.addPage();
    yPosition = 20;

    // Section header
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setFontSize(14);
    doc.setTextColor(...colors.white);
    doc.setFont('helvetica', 'bold');
    doc.text('Property Photos', pageWidth / 2, 13, { align: 'center' });
    yPosition = 35;

    // Add images in a grid layout
    const maxImages = 3;
    const imageWidth = (pageWidth - 50) / 2;
    const imageHeight = 70;
    let col = 0;

    for (let i = 0; i < Math.min(base64Images.length, maxImages); i++) {
      const imageData = base64Images[i];

      try {
        const xPos = 20 + col * (imageWidth + 10);

        if (yPosition + imageHeight > pageHeight - 30) {
          doc.addPage();
          yPosition = 25;
        }

        const imageType = imageData.includes('png') ? 'PNG' : 'JPEG';
        doc.addImage(imageData, imageType, xPos, yPosition, imageWidth, imageHeight, undefined, 'MEDIUM');

        col++;
        if (col >= 2) {
          col = 0;
          yPosition += imageHeight + 10;
        }
      } catch (error) {
        console.log('Error adding image to PDF:', error);
      }
    }

    const totalImages = (property.images || []).length;
    if (totalImages > maxImages) {
      yPosition += col > 0 ? imageHeight + 15 : 10;
      doc.setFontSize(10);
      doc.setTextColor(...colors.lightText);
      doc.text(`Showing ${Math.min(base64Images.length, maxImages)} of ${totalImages} photos`, pageWidth / 2, yPosition, { align: 'center' });
    }
  }

  // ==================== DETAILED EVALUATION REPORT ====================
  doc.addPage();
  yPosition = 20;

  // Section header
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 20, 'F');
  doc.setFontSize(14);
  doc.setTextColor(...colors.white);
  doc.setFont('helvetica', 'bold');
  doc.text('Detailed Evaluation Report', pageWidth / 2, 13, { align: 'center' });
  yPosition = 35;

  // Process the evaluation report with proper markdown parsing
  const reportLines = evaluationReport.split('\n');

  reportLines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) {
      yPosition += 3;
      return;
    }

    // Detect main section headings: ## 1. Title or ## Title
    const mainHeadingMatch = trimmedLine.match(/^##\s*(\d+\.?\s*)?(.+)$/);
    if (mainHeadingMatch) {
      checkPageBreak(20);
      yPosition += 8;

      // Draw a subtle background for section headers
      drawBox(marginLeft - 5, yPosition - 6, contentWidth + 10, 12, colors.bgLight);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...colors.primaryDark);

      const headingText = mainHeadingMatch[1]
        ? `${mainHeadingMatch[1]}${mainHeadingMatch[2]}`
        : mainHeadingMatch[2];
      doc.text(headingText, marginLeft, yPosition);
      yPosition += 12;
      return;
    }

    // Detect sub-headings with ** at the start
    const subHeadingMatch = trimmedLine.match(/^\*\*(.+?)\*\*:?$/);
    if (subHeadingMatch) {
      checkPageBreak(15);
      yPosition += 5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...colors.subheading);
      doc.text(subHeadingMatch[1] + (trimmedLine.endsWith(':') ? ':' : ''), marginLeft, yPosition);
      yPosition += 8;
      return;
    }

    // Detect bullet points (- or •)
    const bulletMatch = trimmedLine.match(/^[-•]\s*(.+)$/);
    if (bulletMatch) {
      checkPageBreak(12);

      // Draw bullet
      doc.setFillColor(...colors.primary);
      doc.circle(marginLeft + 3, yPosition - 2, 1.5, 'F');

      // Render bullet content with potential bold text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colors.text);

      const bulletText = bulletMatch[1];
      const bulletLines = doc.splitTextToSize(bulletText, contentWidth - 15);

      bulletLines.forEach((bulletLine, idx) => {
        checkPageBreak();

        // Check for bold text in the line
        if (bulletLine.includes('**')) {
          renderFormattedText(bulletLine.replace(/\*\*/g, ''), marginLeft + 10, yPosition, contentWidth - 15, 10);
        } else {
          doc.text(bulletLine, marginLeft + 10, yPosition);
        }
        yPosition += 5;
      });
      yPosition += 2;
      return;
    }

    // Detect numbered list items (1. 2. 3.)
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch && parseInt(numberedMatch[1]) <= 20) {
      checkPageBreak(12);

      // Draw number in a circle
      doc.setFillColor(...colors.primary);
      doc.circle(marginLeft + 4, yPosition - 2, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...colors.white);
      doc.text(numberedMatch[1], marginLeft + 4, yPosition - 0.5, { align: 'center' });

      // Render numbered item content
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colors.text);

      const itemText = numberedMatch[2];
      const itemLines = doc.splitTextToSize(itemText, contentWidth - 15);

      itemLines.forEach((itemLine, idx) => {
        checkPageBreak();
        if (idx === 0) {
          doc.text(itemLine, marginLeft + 12, yPosition);
        } else {
          doc.text(itemLine, marginLeft + 12, yPosition);
        }
        yPosition += 5;
      });
      yPosition += 3;
      return;
    }

    // Regular paragraph text
    checkPageBreak(10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...colors.text);

    // Handle inline bold text
    let processedLine = trimmedLine;

    // Check if line contains bold markers
    if (processedLine.includes('**')) {
      // Split by bold markers and render each part
      const parts = processedLine.split(/(\*\*[^*]+\*\*)/);
      let currentX = marginLeft;

      parts.forEach(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
          // Bold text
          doc.setFont('helvetica', 'bold');
          const boldText = part.slice(2, -2);
          doc.text(boldText, currentX, yPosition);
          currentX += doc.getTextWidth(boldText);
          doc.setFont('helvetica', 'normal');
        } else if (part) {
          // Check if text needs wrapping
          const textWidth = doc.getTextWidth(part);
          if (currentX + textWidth > pageWidth - marginRight) {
            // Wrap to new line
            const words = part.split(' ');
            words.forEach((word, idx) => {
              const wordWidth = doc.getTextWidth(word + ' ');
              if (currentX + wordWidth > pageWidth - marginRight) {
                yPosition += 5;
                currentX = marginLeft;
                checkPageBreak();
              }
              doc.text(word + (idx < words.length - 1 ? ' ' : ''), currentX, yPosition);
              currentX += wordWidth;
            });
          } else {
            doc.text(part, currentX, yPosition);
            currentX += textWidth;
          }
        }
      });
      yPosition += 5;
    } else {
      // No bold - simple text wrap
      const splitText = doc.splitTextToSize(processedLine, contentWidth);
      splitText.forEach(textLine => {
        checkPageBreak();
        doc.text(textLine, marginLeft, yPosition);
        yPosition += 5;
      });
    }
    yPosition += 2;
  });

  // ==================== PAGE NUMBERS & FOOTER ====================
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(...colors.muted);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, pageHeight - 18, pageWidth - marginRight, pageHeight - 18);

    // Page number
    doc.setFontSize(9);
    doc.setTextColor(...colors.muted);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Branding
    doc.text('PropertyEval', marginLeft, pageHeight - 10);
    doc.text('Confidential', pageWidth - marginRight, pageHeight - 10, { align: 'right' });
  }

  // Generate filename
  const filename = `Property_Evaluation_${property.location?.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

  // Save the PDF
  doc.save(filename);

  return filename;
};
