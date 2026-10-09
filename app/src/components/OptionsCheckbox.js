import React from 'react';

function OptionsCheckbox({ options, onChange }) {
  return (
    <div className="form-group mb-3">
      <label>O que deseja gerar?</label>
      <div className="form-check">
        <input type="checkbox" id="consulta" checked={options.consulta} onChange={onChange} name="consulta" className="form-check-input" />
        <label htmlFor="consulta" className="form-check-label">Procedure de Consulta</label>
      </div>
      <div className="form-check">
        <input type="checkbox" id="insert_update" checked={options.insert_update} onChange={onChange} name="insert_update" className="form-check-input" />
        <label htmlFor="insert_update" className="form-check-label">Procedure de Insert/Update</label>
      </div>
      <div className="form-check">
        <input type="checkbox" id="delete" checked={options.delete} onChange={onChange} name="delete" className="form-check-input" />
        <label htmlFor="delete" className="form-check-label">Procedure de Delete</label>
      </div>
      <div className="form-check">
        <input type="checkbox" id="layout_importacao" checked={options.layout_importacao} onChange={onChange} name="layout_importacao" className="form-check-input" />
        <label htmlFor="layout_importacao" className="form-check-label">Layout Importação (Excel)</label>
      </div>
    </div>
  );
}

export default OptionsCheckbox;
