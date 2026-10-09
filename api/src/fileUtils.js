/**
 * Utilitários para leitura de arquivos de exemplo e diretórios
 */
const fs = require('fs');
const path = require('path');

const EXAMPLES_DIR = path.join(__dirname, '../examples');
const GENERATED_DIR = path.join(__dirname, '../generated');

function readExampleFile(type) {
    const filePath = path.join(EXAMPLES_DIR, `proc_${type}.sql`);
    return fs.readFileSync(filePath, 'utf8');
}

function ensureGeneratedDir() {
    if (!fs.existsSync(GENERATED_DIR)) {
        fs.mkdirSync(GENERATED_DIR);
    }
}

module.exports = { readExampleFile, ensureGeneratedDir, GENERATED_DIR };
