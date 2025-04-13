// src/utils/pdfGenerator.js
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Funktion för att generera en besiktnings-PDF
export const generateInspectionPDF = (inspection, installation, customer, address) => {
  // Skapa ny PDF med A4-format
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Konfigurera fonter
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  
  // Sidhuvud
  doc.text("Besiktningsprotokoll", pageWidth / 2, 20, { align: "center" });
  
  // Logo (om du har en)
  // doc.addImage(logoUrl, "PNG", 14, 10, 30, 30);
  
  // Information om kund och anläggning
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  
  // Skapa ruta för kundinfo
  doc.rect(14, 30, pageWidth - 28, 40);
  doc.setFont("helvetica", "bold");
  doc.text("Kunduppgifter", 16, 38);
  doc.setFont("helvetica", "normal");
  doc.text(`Kund: ${customer?.name || 'Uppgift saknas'}`, 16, 46);
  doc.text(`Adress: ${address?.street || ''}, ${address?.postalCode || ''} ${address?.city || ''}`, 16, 54);
  doc.text(`Anläggning: ${installation?.name || 'Uppgift saknas'}`, 16, 62);
  
  // Besiktningsinformation
  doc.rect(14, 75, pageWidth - 28, 20);
  doc.setFont("helvetica", "bold");
  doc.text("Besiktningsuppgifter", 16, 83);
  doc.setFont("helvetica", "normal");
  
  const inspectionDate = inspection.createdAt 
    ? new Date(inspection.createdAt.seconds * 1000).toLocaleDateString() 
    : 'Okänt datum';
  const completedDate = inspection.completedAt 
    ? new Date(inspection.completedAt.seconds * 1000).toLocaleDateString() 
    : '-';
  
  doc.text(`Besiktningsdatum: ${inspectionDate}`, 16, 91);
  doc.text(`Status: ${inspection.status === 'completed' ? 'Slutförd' : 'Pågående'}`, pageWidth - 60, 91);
  
  // Innehållsförteckning för sektioner
  let yPosition = 100;
  doc.setFont("helvetica", "bold");
  doc.text("Innehåll:", 14, yPosition);
  yPosition += 8;
  
  inspection.sections.forEach((section, index) => {
    doc.setFont("helvetica", "normal");
    doc.text(`${index + 1}. ${section.title}`, 20, yPosition);
    yPosition += 7;
  });
  
  // Generera varje sektion i besiktningen
  yPosition += 10;
  inspection.sections.forEach((section, sectionIndex) => {
    // Kontrollera om vi behöver en ny sida
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`${sectionIndex + 1}. ${section.title}`, 14, yPosition);
    yPosition += 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    
    // Skapa tabell för sektionens kontrollpunkter
    const tableData = [];
    
    section.items.forEach(item => {
      if (item.type === 'header') {
        // Lägg till rubrik som en rad med bakgrundsfärg
        tableData.push([{ content: item.label, colSpan: 3, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);
      } else {
        const value = item.type === 'checkbox' 
          ? (item.value ? '✓' : '✗') 
          : (item.value || '-');
          
        const notes = item.notes || '-';
        
        tableData.push([
          item.label, 
          value,
          notes
        ]);
      }
    });
    
    // Generera tabellen
    doc.autoTable({
      startY: yPosition,
      head: [['Kontrollpunkt', 'Värde', 'Anteckningar']],
      body: tableData,
      theme: 'grid',
      styles: { overflow: 'linebreak', cellPadding: 3 },
      headerStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        // Sidfot
        doc.setFontSize(10);
        doc.text(`Besiktningsprotokoll - Sida ${doc.internal.getNumberOfPages()}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
      }
    });
    
    // Uppdatera Y-position efter tabellen
    yPosition = doc.lastAutoTable.finalY + 15;
    
    // Lägg till bilder om sådana finns 
    for (const item of section.items) {
      if (item.images && item.images.length > 0) {
        // Lägg till en rubrik för bilderna
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFont("helvetica", "bold");
        doc.text(`Bilder för: ${item.label}`, 14, yPosition);
        yPosition += 8;
        
        // Placera bilder i ett rutnät
        let xPosition = 14;
        const imageWidth = 80;
        const imageHeight = 60;
        
        for (const image of item.images) {
          // Kontrollera om vi behöver en ny rad eller ny sida
          if (xPosition + imageWidth > pageWidth - 14) {
            xPosition = 14;
            yPosition += imageHeight + 10;
          }
          
          if (yPosition + imageHeight > 280) {
            doc.addPage();
            yPosition = 20;
            xPosition = 14;
          }
          
          // Här skulle du normalt lägga till bilden från URL
          // Men detta kräver att bilderna är tillgängliga via cors-vänliga URL:er
          // Vi lägger till en placeholder istället
          doc.setFillColor(220, 220, 220);
          doc.rect(xPosition, yPosition, imageWidth, imageHeight, 'F');
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.text('Bilden kunde inte laddas', xPosition + imageWidth/2, yPosition + imageHeight/2, { align: 'center' });
          
          xPosition += imageWidth + 10;
        }
        
        // Uppdatera y-position efter bilderna
        yPosition += imageHeight + 15;
      }
    }
  });
  
  // Underskrifter
  if (yPosition > 220) {
    doc.addPage();
    yPosition = 40;
  } else {
    yPosition += 20;
  }
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Underskrifter", 14, yPosition);
  yPosition += 10;
  
  // Linjer för underskrifter
  doc.setDrawColor(0);
  doc.line(14, yPosition + 20, 100, yPosition + 20); // Besiktningsman
  doc.line(pageWidth - 100, yPosition + 20, pageWidth - 14, yPosition + 20); // Kund
  
  doc.setFont("helvetica", "normal");
  doc.text("Besiktningsman", 14, yPosition + 30);
  doc.text("Kund", pageWidth - 100, yPosition + 30);
  
  // Spara dokumentet
  return doc;
};