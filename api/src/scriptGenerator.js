/**
 * Funções utilitárias para geração de scripts a partir dos templates
 */
const path = require('path');

function generateTempTableName(tableName) {
    // Exemplo: p_cons_dados_informacoes_adicionais_2025 → #temp_pcdia2_dados_consulta
    let procName = `p_cons_${tableName}`;
    let tempInitials = '';
    let tempRest = '';
    if (procName.startsWith('p_cons_')) {
        let rest = procName.substring(6); // remove 'p_cons_'
        let parts = rest.split('_');
        let initials = '';
        for (let part of parts) {
            if (/^\d+$/.test(part)) {
                initials += part;
            } else if (part.length > 0) {
                initials += part[0];
            }
        }
        tempInitials = 'pc' + initials;
        tempRest = parts[0] || 'resultado';
    } else {
        tempInitials = 'temp';
        tempRest = 'resultado';
    }
    return `#temp_${tempInitials}_${tempRest}`;
}

function generateScript(example, tableInfo) {
    let script = example.replace(/schema/g, tableInfo.schema)
                       .replace(/nome_tabela/g, tableInfo.tableName);
    const tempTableName = generateTempTableName(tableInfo.tableName);
    const tempTableAlias = tempTableName.replace('#temp_', '').split('_')[0];
    script = script.replace(/#temp_pcte_resultado/g, tempTableName);
    script = script.replace(/--NOME_TABELA_TEMP--/g, tempTableName);
    script = script.replace(/--ALIAS_TABELA_TEMP--/g, tempTableAlias);

    // Parâmetros da procedure (sem = NULL)
    const paramList = tableInfo.columns.map(col => {
        let tipo = col.type.toUpperCase();
        if (tipo.startsWith('INT')) tipo = 'INT';
        if (tipo.startsWith('VARCHAR')) tipo = 'VARCHAR(MAX)';
        if (tipo.startsWith('NUMERIC')) tipo = 'NUMERIC(18,2)';
        if (tipo.startsWith('DECIMAL')) tipo = 'DECIMAL(18,2)';
        if (tipo.startsWith('CHAR')) tipo = 'VARCHAR(MAX)';
        if (tipo.startsWith('SMALLDATETIME') || tipo.startsWith('DATETIME')) tipo = 'SMALLDATETIME';
        return `    @${col.name}    ${tipo}`;
    }).join(',\n');
    // Parâmetros da procedure (com = NULL, exceto PK)
    const paramListNull = tableInfo.columns.filter(col => !col.isPrimary).map(col => {
        let tipo = col.type.toUpperCase();
        if (tipo.startsWith('INT')) tipo = 'INT';
        if (tipo.startsWith('VARCHAR')) tipo = 'VARCHAR(MAX)';
        if (tipo.startsWith('NUMERIC')) tipo = 'NUMERIC(18,2)';
        if (tipo.startsWith('DECIMAL')) tipo = 'DECIMAL(18,2)';
        if (tipo.startsWith('CHAR')) tipo = 'VARCHAR(MAX)';
        if (tipo.startsWith('SMALLDATETIME') || tipo.startsWith('DATETIME')) tipo = 'SMALLDATETIME';
        return `    @${col.name}    ${tipo} = NULL`;
    }).join(',\n');

    // Lista de campos para SELECT/INSERT/UPDATE
    const fieldList = tableInfo.columns.map(col => col.name).join(',\n        ');
    const selectFieldList = tableInfo.columns.filter(col => !col.isPrimary).map(col => `${col.name} = ${col.name}`).join(',\n            ');
    const fieldListInsert = tableInfo.columns.filter(col => !col.isPrimary).map(col => col.name).join(',\n            ');
    const valueListInsert = tableInfo.columns.filter(col => !col.isPrimary).map(col => `@${col.name}`).join(',\n            ');
    const updateList = tableInfo.columns.filter(col => !col.isPrimary).map(col => `${col.name} = @${col.name}`).join(',\n            ');

    // Datatypes para tabela temporária
    const fieldListDatatype = tableInfo.columns.map(col => {
        let tipo = col.type.toUpperCase();
        if (tipo.startsWith('INT')) tipo = 'INT';
        if (tipo.startsWith('VARCHAR')) tipo = 'VARCHAR(MAX)';
        if (tipo.startsWith('NUMERIC')) tipo = 'NUMERIC(18,2)';
        if (tipo.startsWith('DECIMAL')) tipo = 'DECIMAL(18,2)';
        if (tipo.startsWith('CHAR')) tipo = 'VARCHAR(MAX)';
        if (tipo.startsWith('SMALLDATETIME') || tipo.startsWith('DATETIME')) tipo = 'SMALLDATETIME';
        return `    ${col.name} ${tipo}`;
    }).join(',\n');

    // Bloco para USING do MERGE: campo = @campo
    const usingMerge = tableInfo.columns.map(col => `${col.name} = @${col.name}`).join(',\n                ');
    const chaveUsingMerge = (tableInfo.primaryKeys || []).map(pk => `target.${pk} = source.${pk}`).join(',\n                ');

    // Validações para campos obrigatórios (exceto PK)
    const validations = tableInfo.columns.filter(col => !col.isNullable && !col.isPrimary).map(col => `    IF @${col.name} IS NULL\n    BEGIN\n        SELECT \n            @cd_retorno = 1,\n            @nm_retorno = 'O campo ${col.name} deve ser informado.'\n        RETURN\n    END`).join('\n\n');

    // Validações de foreign key (insert/update)
    const fkValidations = (tableInfo.foreignKeys || []).map(fk =>
        `    IF NOT EXISTS (SELECT 1 FROM ${fk.refSchema}.${fk.refTable} WHERE ${fk.refColumn} = @${fk.column})\n    BEGIN\n        SELECT @cd_retorno = 1, @nm_retorno = 'Valor de @${fk.column} não existe em ${fk.refSchema}.${fk.refTable}.'\n        RETURN\n    END`
    ).join('\n\n');

    // Parâmetros PK para delete
    const pkParams = (tableInfo.primaryKeys || []).map(pk => `    @${pk} INT`).join(',\n');
    // WHERE PK para delete
    const pkWhere = (tableInfo.primaryKeys || []).map(pk => `${pk} = @${pk}`).join(' AND ');

    script = script.replace(/--CAMPOS_PARAMETROS--/g, paramList)
                   .replace(/--CAMPOS_PARAMETROS_NULL--/g, paramListNull)
                   .replace(/--CAMPOS_SELECT--/g, fieldList)
                   .replace(/--CAMPOS_FIELDS--/g, selectFieldList)
                   .replace(/--CAMPOS_SELECT_DATATYPE--/g, fieldListDatatype)
                   .replace(/--CAMPOS_INSERT--/g, fieldListInsert)
                   .replace(/--VALORES_INSERT--/g, valueListInsert)
                   .replace(/--CAMPOS_UPDATE--/g, updateList)
                   .replace(/--CAMPOS_USING_MERGE--/g, usingMerge)
                   .replace(/--CAMPO_CHAVE_USING_MERGE--/g, chaveUsingMerge)
                   .replace(/--VALIDACOES--/g, validations + (fkValidations ? '\n' + fkValidations : ''))
                   .replace(/--CAMPOS_PK--/g, pkParams)
                   .replace(/--CAMPOS_WHERE_PK--/g, pkWhere);

    return script;
}

module.exports = { generateScript, generateTempTableName };
