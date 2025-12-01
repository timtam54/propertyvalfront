import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Generate a professional PDF proposal from property evaluation data
 * @param {Object} property - Property details
 * @param {string} evaluationReport - The evaluation report text
 * @param {Object} comparablesData - Comparables data from web scraping
 * @param {number} pricePerSqm - Price per square meter
 */
export const generateEvaluationPDF = (property, evaluationReport, comparablesData = null, pricePerSqm = null) => {
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
  doc.text('PropertyPitch', pageWidth / 2, 25, { align: 'center' });
  
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
  doc.text('Powered by PropertyPitch AI Valuation System', pageWidth / 2, pageHeight - 20, { align: 'center' });
  
  // NEW PAGE - Market Comparables (if available)
  if (comparablesData && comparablesData.statistics && comparablesData.statistics.total_found > 0) {
    doc.addPage();
    yPosition = 20;
    
    // Section header
    doc.setFillColor(14, 165, 233);
    doc.rect(0, yPosition - 5, pageWidth, 15, 'F');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('Market Comparables Data', pageWidth / 2, yPosition + 5, { align: 'center' });
    yPosition += 25;
    
    // Statistics
    const stats = comparablesData.statistics;
    if (stats.total_found > 0) {
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(`Market Statistics (${stats.total_found} comparable properties)`, 20, yPosition);
      yPosition += 10;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      
      const statsData = [
        ['Price Range', `$${stats.price_range?.min?.toLocaleString() || 0} - $${stats.price_range?.max?.toLocaleString() || 0}`],
        ['Average Price', `$${stats.price_range?.avg?.toLocaleString() || 0}`],
        ['Median Price', `$${stats.price_range?.median?.toLocaleString() || 0}`],
        ['Average Sold Price', `$${stats.sold_avg?.toLocaleString() || 0} (${stats.sold_count || 0} sales)`],
        ['Average Listing Price', `$${stats.listing_avg?.toLocaleString() || 0} (${stats.listing_count || 0} listings)`]
      ];
      
      statsData.forEach(([label, value]) => {
        doc.text(`${label}:`, 25, yPosition);
        doc.setFont('helvetica', 'bold');
        doc.text(value, 90, yPosition);
        doc.setFont('helvetica', 'normal');
        yPosition += 7;
      });
      yPosition += 10;
    }
    
    // Recently Sold Properties Table
    if (comparablesData.comparable_sold && comparablesData.comparable_sold.length > 0) {
      checkPageBreak(40);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Recently Sold Properties (Domain.com.au)', 20, yPosition);
      yPosition += 5;
      
      const soldData = comparablesData.comparable_sold.slice(0, 5).map(comp => [
        comp.address,
        `$${comp.price.toLocaleString()}`,
        `${comp.beds || 'N/A'} bed, ${comp.baths || 'N/A'} bath`,
        comp.sold_date || 'Recently'
      ]);
      
      doc.autoTable({
        startY: yPosition,
        head: [['Address', 'Price', 'Features', 'Sold']],
        body: soldData,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 35, halign: 'right' },
          2: { cellWidth: 45 },
          3: { cellWidth: 35 }
        }
      });
      
      yPosition = doc.lastAutoTable.finalY + 15;
    }
    
    // Current Listings Table
    if (comparablesData.comparable_listings && comparablesData.comparable_listings.length > 0) {
      checkPageBreak(40);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Current Listings (Realestate.com.au)', 20, yPosition);
      yPosition += 5;
      
      const listingsData = comparablesData.comparable_listings.slice(0, 5).map(comp => [
        comp.address,
        `$${comp.price.toLocaleString()}`,
        `${comp.beds || 'N/A'} bed, ${comp.baths || 'N/A'} bath`,
        comp.listing_type || 'For Sale'
      ]);
      
      doc.autoTable({
        startY: yPosition,
        head: [['Address', 'Price', 'Features', 'Status']],
        body: listingsData,
        theme: 'grid',
        headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 35, halign: 'right' },
          2: { cellWidth: 45 },
          3: { cellWidth: 35 }
        }
      });
      
      yPosition = doc.lastAutoTable.finalY + 15;
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
    doc.text('© 2025 PropertyPitch - Confidential', pageWidth - 20, pageHeight - 10, { align: 'right' });
  }
  
  // Generate filename
  const filename = `Property_Evaluation_${property.location?.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  
  // Save the PDF
  doc.save(filename);
  
  return filename;
};
