/**
 * Rotas principais da API
 */
const express = require('express');
const multer = require('multer');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const { parseCreateTable, parseAllCreateTables } = require('./parser');
const { generateScript } = require('./scriptGenerator');

const { readExampleFile, ensureGeneratedDir, GENERATED_DIR } = require('./fileUtils');
const { generateExcel } = require('./excelGenerator');

const router = express.Router();
// Usar armazenamento em memória para facilitar leitura de múltiplos arquivos
const storage = multer.memoryStorage();
// Limits
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB por arquivo
const MAX_FILES = 10; // máximo de arquivos por requisição
const upload = multer({ storage, limits: { fileSize: MAX_FILE_SIZE } });

// Geração dos scripts
router.post('/generate', upload.any(), async (req, res) => {
    let { createTable, options } = req.body || {};
    // If options were uploaded as a JSON file field, parse it
    if ((!options || options === '{}') && req.files && Array.isArray(req.files)) {
        const optFile = req.files.find(f => f.fieldname === 'options');
        if (optFile && optFile.buffer) {
            try { options = JSON.parse(optFile.buffer.toString('utf8')); } catch (e) { /* ignore */ }
        }
    }
    // Filter only files that were uploaded as 'files' (others may be option files)
    const uploadedFiles = (req.files || []).filter(f => f.fieldname === 'files');
    // options may arrive as JSON string when sent in multipart/form-data
    if (typeof options === 'string') {
        try { options = JSON.parse(options); } catch (e) { /* keep as string if parse fails */ }
    }
    ensureGeneratedDir();
    const files = [];
    const errors = []; // accumulate { file: filename, table: tableName?, message }
    const perFileReports = []; // detailed per-file and per-table report

    // Se arquivos foram enviados, processa cada um (pode conter múltiplos CREATE TABLE)
    if (uploadedFiles && uploadedFiles.length > 0) {
        if (uploadedFiles.length > MAX_FILES) {
            return res.status(400).json({ error: `Número de arquivos excede o máximo permitido (${MAX_FILES}).` });
        }
        const { parseAllCreateTables } = require('./parser');
        for (let f of uploadedFiles) {
            const fileReport = { file: f.originalname, tables: [], errors: [] };
            const content = f.buffer.toString('utf8');
            const tables = parseAllCreateTables(content);
            if (!tables || tables.length === 0) {
                const msg = 'Nenhum CREATE TABLE encontrado.';
                errors.push({ file: f.originalname, message: msg });
                fileReport.errors.push(msg);
                perFileReports.push(fileReport);
                continue;
            }
            for (let tableInfo of tables) {
                const tableReport = { table: tableInfo.tableName, generated: [], errors: [] };
                try {
                    if (options && options.consulta) {
                        const example = readExampleFile('consulta');
                        const script = generateScript(example, tableInfo);
                        const fileName = `${tableInfo.schema}.p_cons_${tableInfo.tableName}.sql`;
                        fs.writeFileSync(path.join(GENERATED_DIR, fileName), script);
                        files.push({ name: fileName, url: `/generated/${fileName}` });
                        tableReport.generated.push(fileName);
                    }
                    if (options && options.insert_update) {
                        const example = readExampleFile('insert_update');
                        const script = generateScript(example, tableInfo);
                        const fileName = `${tableInfo.schema}.p_inserir_alterar_${tableInfo.tableName}.sql`;
                        fs.writeFileSync(path.join(GENERATED_DIR, fileName), script);
                        files.push({ name: fileName, url: `/generated/${fileName}` });
                        tableReport.generated.push(fileName);
                    }
                    if (options && options.delete) {
                        const example = readExampleFile('delete');
                        const script = generateScript(example, tableInfo);
                        const fileName = `${tableInfo.schema}.p_exclui_${tableInfo.tableName}.sql`;
                        fs.writeFileSync(path.join(GENERATED_DIR, fileName), script);
                        files.push({ name: fileName, url: `/generated/${fileName}` });
                        tableReport.generated.push(fileName);
                    }
                    if (options && options.layout_importacao) {
                        const fileName = `${tableInfo.schema}.layout_importacao_${tableInfo.tableName}.xlsx`;
                        const filePath = path.join(GENERATED_DIR, fileName);
                        try {
                            await generateExcel(tableInfo, filePath);
                            files.push({ name: fileName, url: `/generated/${fileName}` });
                            tableReport.generated.push(fileName);
                        } catch (err) {
                            const em = `Erro ao gerar planilha: ${err.message}`;
                            errors.push({ file: f.originalname, table: tableInfo.tableName, message: em });
                            tableReport.errors.push(em);
                        }
                    }
                } catch (err) {
                    tableReport.errors.push(err.message);
                    errors.push({ file: f.originalname, table: tableInfo.tableName, message: err.message });
                }
                fileReport.tables.push(tableReport);
            }
            perFileReports.push(fileReport);
        }
    }

    // Se não houve arquivos, processa o texto do campo createTable (compatibilidade)
    if ((!req.files || req.files.length === 0) && createTable) {
        const tableInfo = parseCreateTable(createTable);
        if (!tableInfo) {
            errors.push({ file: 'texto', message: 'CREATE TABLE inválido ou não reconhecido.' });
        } else {
            try {
                if (options && options.consulta) {
                    const example = readExampleFile('consulta');
                    const script = generateScript(example, tableInfo);
                    const fileName = `${tableInfo.schema}.p_cons_${tableInfo.tableName}.sql`;
                    fs.writeFileSync(path.join(GENERATED_DIR, fileName), script);
                    files.push({ name: fileName, url: `/generated/${fileName}` });
                }
                if (options && options.insert_update) {
                    const example = readExampleFile('insert_update');
                    const script = generateScript(example, tableInfo);
                    const fileName = `${tableInfo.schema}.p_inserir_alterar_${tableInfo.tableName}.sql`;
                    fs.writeFileSync(path.join(GENERATED_DIR, fileName), script);
                    files.push({ name: fileName, url: `/generated/${fileName}` });
                }
                if (options && options.delete) {
                    const example = readExampleFile('delete');
                    const script = generateScript(example, tableInfo);
                    const fileName = `${tableInfo.schema}.p_exclui_${tableInfo.tableName}.sql`;
                    fs.writeFileSync(path.join(GENERATED_DIR, fileName), script);
                    files.push({ name: fileName, url: `/generated/${fileName}` });
                }
                if (options && options.layout_importacao) {
                    const fileName = `${tableInfo.schema}.layout_importacao_${tableInfo.tableName}.xlsx`;
                    const filePath = path.join(GENERATED_DIR, fileName);
                    try {
                        await generateExcel(tableInfo, filePath);
                        files.push({ name: fileName, url: `/generated/${fileName}` });
                    } catch (err) {
                        errors.push({ file: 'texto', table: tableInfo.tableName, message: `Erro ao gerar planilha: ${err.message}` });
                    }
                }
            } catch (err) {
                errors.push({ file: 'texto', table: tableInfo.tableName, message: err.message });
            }
        }
    }
    // (legacy single-text path handled above)
    // If client explicitly requested JSON via query param, return JSON now (no ZIP creation)
    if (req.query && req.query.json === '1') {
        const filesMeta = files.map(f => {
            const p = path.join(GENERATED_DIR, f.name);
            let size = null, mtime = null;
            try { const st = fs.statSync(p); size = st.size; mtime = st.mtime; } catch (e) {}
            return { name: f.name, url: `http://localhost:3001${f.url}`, size, mtime };
        });
        if (files.length === 0) return res.status(400).json({ error: 'Nenhum arquivo gerado.', errors, perFileReports });
        return res.json({ files: filesMeta, errors, perFileReports, zipName: null });
    }

    // Compacta os arquivos em um zip (legacy/download path)
    const zipName = `scripts_${Date.now()}.zip`;
    const zipPath = path.join(GENERATED_DIR, zipName);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => {
        const filesMeta = files.map(f => {
            const p = path.join(GENERATED_DIR, f.name);
            let size = null, mtime = null;
            try { const st = fs.statSync(p); size = st.size; mtime = st.mtime; } catch (e) {}
            return { name: f.name, url: `http://localhost:3001${f.url}`, size, mtime };
        });
        // Default: send ZIP as attachment and set headers
        res.set('x-files', JSON.stringify(filesMeta));
        if (errors.length) res.set('x-errors', JSON.stringify(errors));
        // also include compact per-file report header (may be large)
        if (perFileReports && perFileReports.length) res.set('x-per-file', JSON.stringify(perFileReports));
        if (files.length === 0) {
            return res.status(400).json({ error: 'Nenhum arquivo gerado.', errors });
        }
        res.download(zipPath, zipName, () => {
            files.forEach(f => {
                const filePath = path.join(GENERATED_DIR, f.name);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            });
            fs.unlinkSync(zipPath);
        });
    });
    archive.pipe(output);
    files.forEach(f => archive.file(path.join(GENERATED_DIR, f.name), { name: f.name }));
    archive.finalize();
});

// Download individual
router.get('/generated/:filename', (req, res) => {
    const filePath = path.join(GENERATED_DIR, req.params.filename);
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send('Arquivo não encontrado');
    }
});

module.exports = router;
