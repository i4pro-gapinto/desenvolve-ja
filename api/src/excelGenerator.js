// excelGenerator.js
// Gera um arquivo Excel com os campos da tabela (exceto PK)
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function generateExcel(tableInfo, outputPath) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Layout Importação');

  // Pega os campos (exceto PK)
  const fields = tableInfo.columns.filter(col => !col.isPrimary);

  // Primeira linha: nomes dos campos em maiúsculo
  const headerRow = fields.map(col => col.name.toUpperCase());
  sheet.addRow(headerRow);

  // Segunda linha: dados de teste para cada campo
  const testRow = fields.map(col => {
    const tipo = col.type.toLowerCase();
    if (tipo.includes('char') || tipo.includes('text')) return 'teste';
    if (tipo.includes('int')) return 123;
    if (tipo.includes('date')) return '2025-10-03';
    if (tipo.includes('numeric') || tipo.includes('decimal') || tipo.includes('float') || tipo.includes('real')) return 1.23;
    if (tipo.includes('bit')) return 1;
    return 'valor';
  });
  sheet.addRow(testRow);

  // Ajusta largura das colunas
  fields.forEach((col, idx) => {
    sheet.getColumn(idx + 1).width = Math.max(12, col.name.length + 4);
  });

  await workbook.xlsx.writeFile(outputPath);
}

module.exports = { generateExcel };
