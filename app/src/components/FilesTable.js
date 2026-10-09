import React from 'react';

function FilesTable({ files, onDownloadZip, errors }) {
  if ((!files || files.length === 0) && (!errors || errors.length === 0)) return null;
  return (
    <div className="mt-4">
      {files && files.length > 0 && (
        <>
          <h5>Arquivos Gerados</h5>
          <table className="table table-bordered table-sm">
            <thead>
              <tr>
                <th>Arquivo</th>
                <th>Download</th>
              </tr>
            </thead>
            <tbody>
              {files.map(file => (
                <tr key={file.name}>
                  <td>{file.name}</td>
                  <td><a href={file.url} download className="btn btn-link btn-sm">Baixar</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {errors && errors.length > 0 && (
        <div style={{ color: '#b45309', marginTop: 12 }}>
          <strong>Erros:</strong>
          <ul>
            {errors.map((er, i) => (
              <li key={i}>{er.file}{er.table ? ` (tabela: ${er.table})` : ''}: {er.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default FilesTable;
