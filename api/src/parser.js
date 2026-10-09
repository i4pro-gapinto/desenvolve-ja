/**
 * Funções utilitárias para parse de CREATE TABLE
 */
function parseCreateTable(createTable) {
    // Remove quebras de linha e comentários
    const clean = createTable.replace(/--.*$/gm, '').replace(/\n|\r/g, ' ');
    const match = clean.match(/create\s+table\s+([\w]+)\.([\w]+)\s*\((.*)\)/i);
    if (!match) return null;
    const schema = match[1];
    const tableName = match[2];
    const fieldsRaw = match[3];
    // Divide campos por vírgula, mas ignora vírgulas dentro de parênteses
    const fields = [];
    let buffer = '', parens = 0;
    for (let c of fieldsRaw) {
        if (c === '(') parens++;
        if (c === ')') parens--;
        if (c === ',' && parens === 0) {
            fields.push(buffer.trim());
            buffer = '';
        } else {
            buffer += c;
        }
    }
    if (buffer.trim()) fields.push(buffer.trim());
    // Extrai nome, tipo, nullability, PK, FK
    const columns = [];
    let primaryKeys = [];
    const foreignKeys = [];
    for (let f of fields) {
        // FOREIGN KEY (cd_cliente) REFERENCES aut.t_cliente(id_cliente)
        const fkMatch = f.match(/foreign key \(([^\)]+)\) references ([\w]+)\.([\w]+)\(([^\)]+)\)/i);
        if (fkMatch) {
            foreignKeys.push({
                column: fkMatch[1].trim(),
                refSchema: fkMatch[2],
                refTable: fkMatch[3],
                refColumn: fkMatch[4].trim()
            });
            continue;
        }
        const pkMatch = f.match(/primary key/i);
        const colMatch = f.match(/^(\w+)\s+([\w\(\)]+)(.*)$/i);
        if (colMatch) {
            const name = colMatch[1];
            const type = colMatch[2];
            const rest = colMatch[3];
            const isPrimary = /primary key/i.test(rest);
            const isNullable = !/not null/i.test(rest);
            columns.push({ name, type, isPrimary, isNullable });
            if (isPrimary) primaryKeys.push(name);
        } else if (/primary key/i.test(f)) {
            // PRIMARY KEY (col1, col2)
            const pkCols = f.match(/\(([^\)]+)\)/);
            if (pkCols) {
                primaryKeys = pkCols[1].split(',').map(s => s.trim());
            }
        }
    }
    // Marca as colunas PK
    for (let col of columns) {
        if (primaryKeys.includes(col.name)) col.isPrimary = true;
    }
    return { schema, tableName, columns, primaryKeys, foreignKeys };
}

function parseAllCreateTables(text) {
    // Busca todas as ocorrências de CREATE TABLE ... ( ... )
    const re = /create\s+table\s+[\w]+\.[\w]+\s*\([^;]+\)/ig;
    const matches = text.match(re);
    if (!matches) return [];
    const results = [];
    for (let m of matches) {
        const parsed = parseCreateTable(m);
        if (parsed) results.push(parsed);
    }
    return results;
}

module.exports = { parseCreateTable, parseAllCreateTables };
