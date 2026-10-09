import React from 'react';

function FormInput({ onFilesChange }) {
  return (
    <div className="form-group">
      <label>Envie arquivos SQL (.sql) com CREATE TABLE (vários permitidos):</label>
      <div>
        <input type="file" accept=".sql,.txt" multiple onChange={e => onFilesChange && onFilesChange(e.target.files)} />
      </div>
    </div>
  );
}

export default FormInput;
