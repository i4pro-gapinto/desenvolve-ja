CREATE PROCEDURE schema.p_cons_nome_tabela
(
    @where                  VARCHAR(MAX)    = '',
    @orderby                VARCHAR(MAX)    = '',
    
    @eng_filtropadrao       VARCHAR(8000)   = NULL,
    @cd_usuario             VARCHAR(50)     = NULL,
    @cd_empresa             INT             = NULL,
    @cd_retorno             INT             = NULL  OUTPUT,
    @nm_retorno             VARCHAR(MAX)    = NULL  OUTPUT,
    @nr_versao_proc         VARCHAR(15)     = NULL  OUTPUT
)
AS

SET NOCOUNT ON
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED

SELECT @nr_versao_proc = LTRIM(RTRIM(REPLACE(REPLACE('Revision: 1.0 $','Revision:',''),'$','')))

BEGIN TRY

    DECLARE 
        @sql            NVARCHAR(max)

    /* Cria temp para armazenar os resultados */
    IF OBJECT_ID(N'tempdb..--NOME_TABELA_TEMP--','U') IS NOT NULL
    BEGIN
        DROP TABLE --NOME_TABELA_TEMP--
    END

    CREATE TABLE --NOME_TABELA_TEMP--
    (
        --CAMPOS_SELECT_DATATYPE--
    )

    IF CHARINDEX('where 1=2', @where) > 0
    BEGIN
        SELECT
            --CAMPOS_SELECT--
        FROM --NOME_TABELA_TEMP-- temp
        WHERE 1=2

        RETURN
    END

    /* insere na temp resultados existentes */
    INSERT INTO --NOME_TABELA_TEMP--
    (
        --CAMPOS_SELECT--
    )
    SELECT
        --CAMPOS_SELECT--
    FROM schema.nome_tabela t

    SELECT @sql =
        'SELECT	'											+ CHAR(10) +
        '   --CAMPOS_FIELDS-- '								+ CHAR(10) +
        'FROM --NOME_TABELA_TEMP-- --ALIAS_TABELA_TEMP-- '                     + CHAR(10) +
        'WHERE 1 = 1 '										+ CHAR(10)

    IF ISNULL(@orderby, '') <> ''
        SELECT @sql = @sql + isnull(@orderby,'')

    EXEC dbo.sp_executesql @sql 

    SELECT 
       @cd_retorno = 0,
       @nm_retorno = edn.f_mensagem_erro(@cd_retorno,@cd_usuario,NULL,NULL,NULL,NULL,NULL)
    /*Processamento efetuado com sucesso*/
    RETURN

END TRY
BEGIN CATCH
    IF ISNULL(ERROR_MESSAGE(),'') <> ''
    BEGIN
        SELECT
            @cd_retorno = CASE WHEN ISNULL(@cd_retorno,0) < 1 THEN 1 ELSE @cd_retorno END,
            @nm_retorno = 'Procedure:       ' + ISNULL(OBJECT_NAME(@@PROCID),'') +
                    ' - versao        ' + ISNULL(CONVERT(VARCHAR(20), @nr_versao_proc),'0') + CASE WHEN OBJECT_NAME(@@PROCID) <> ISNULL(ERROR_PROCEDURE(), OBJECT_NAME(@@PROCID)) THEN
                    ' - erro na proc: ' + ISNULL(CONVERT(VARCHAR(100), ERROR_PROCEDURE()), '') ELSE '' END +
                    ' - erro :        ' + ISNULL(CONVERT(VARCHAR(300), ERROR_MESSAGE()), '') + CASE WHEN ISNULL(ERROR_LINE(), 0) <> 1 THEN +
                    ' - linha:        ' + CONVERT(VARCHAR(5), ERROR_LINE()) ELSE '' END
    END
END CATCH