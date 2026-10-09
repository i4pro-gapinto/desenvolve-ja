

import React, { useState } from 'react';
import './App.css';

import FormInput from './components/FormInput';
import OptionsCheckbox from './components/OptionsCheckbox';

import FilesTable from './components/FilesTable';

const I4PRO_LOGO = 'https://www.i4pro.com.br/img/logo_4.svg';


function App() {
  const [createTable, setCreateTable] = useState('');
  const [options, setOptions] = useState({ consulta: false, insert_update: false, delete: false, layout_importacao: false });
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [files, setFiles] = useState([]);
  const [errorsList, setErrorsList] = useState([]);
  const [fileStatuses, setFileStatuses] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState(null);

  const handleChange = (e) => setCreateTable(e.target.value);
  const handleCheckbox = (e) => setOptions({ ...options, [e.target.name]: e.target.checked });
  const handleFilesChange = (filesList) => setUploadedFiles(filesList && filesList.length ? filesList : null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setDownloadUrl(null);
    setFiles([]);
    if ((!uploadedFiles && !createTable.trim()) || (!options.consulta && !options.insert_update && !options.delete && !options.layout_importacao)) {
      setError('Forneça CREATE TABLE via texto ou envie pelo menos um arquivo, e selecione pelo menos uma opção.');
      return;
    }
    setLoading(true);
    try {
      let response;
      if (uploadedFiles) {
        // Initialize file statuses
        const initStatuses = {};
        for (let i = 0; i < uploadedFiles.length; i++) initStatuses[uploadedFiles[i].name] = 'Pendente';
        setFileStatuses(initStatuses);
        const form = new FormData();
        for (let i = 0; i < uploadedFiles.length; i++) {
          form.append('files', uploadedFiles[i], uploadedFiles[i].name);
        }
        form.append('options', JSON.stringify(options));
        if (createTable) form.append('createTable', createTable);
        // Use XMLHttpRequest for progress and structured JSON response
        response = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
            xhr.open('POST', 'http://localhost:3001/generate?json=1');
            xhr.setRequestHeader('Accept', 'application/json');
          xhr.onload = () => {
            const headers = {};
            xhr.getAllResponseHeaders().trim().split(/\r?\n/).forEach(line => {
              const idx = line.indexOf(':');
              if (idx > 0) headers[line.slice(0, idx).toLowerCase()] = line.slice(idx + 1).trim();
            });
            const status = xhr.status;
            try {
              const json = JSON.parse(xhr.responseText);
              resolve({ ok: status >= 200 && status < 300, status, json, headers });
            } catch (e) {
              reject(new Error('Resposta inválida do servidor'));
            }
          };
          xhr.onerror = () => reject(new Error('Falha na requisição'));
          xhr.send(form);
        });
        // normalize to same shape as fetch Response
        if (!response.ok) {
          const data = response.json || {};
          throw new Error(data.error || 'Erro ao gerar scripts.');
        }
      } else {
        // Request JSON summary for text input
        response = await fetch('http://localhost:3001/generate?json=1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ createTable, options })
        });
      }
      if (!response.ok) {
        let msg = 'Erro ao gerar scripts.';
        try {
          const data = await response.json();
          if (data && data.error) msg = data.error;
        } catch {}
        throw new Error(msg);
      }
      // When we requested JSON, parse the structured response
      const data = response.json || await response.json();
      if (data.zipName) {
        const zipUrl = `http://localhost:3001/generated/${data.zipName}`;
        setDownloadUrl(zipUrl);
      }
      if (data.files) {
        setFiles(data.files.map(f => ({ ...f, url: f.url.startsWith('http') ? f.url : `http://localhost:3001${f.url}` })));
      }
      if (data.errors) setErrorsList(data.errors); else setErrorsList([]);
      // apply per-file reports to fileStatuses
      if (data.perFileReports && Array.isArray(data.perFileReports)) {
        const statuses = { ...fileStatuses };
        data.perFileReports.forEach(fr => {
          if (!fr.tables || fr.tables.length === 0) {
            statuses[fr.file] = fr.errors && fr.errors.length ? `Erro: ${fr.errors.join('; ')}` : 'Nenhuma tabela';
          } else {
            // summarize tables
            const parts = fr.tables.map(t => {
              if (t.errors && t.errors.length) return `${t.table}: Erro`;
              return `${t.table}: OK`;
            });
            statuses[fr.file] = parts.join(' | ');
          }
        });
        setFileStatuses(statuses);
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Erro ao gerar scripts.');
    }
    setLoading(false);
  };

  // Download ZIP: if we already have a downloadUrl, open it.
  // Otherwise request the server without ?json=1 to get the ZIP binary.
  const handleDownloadZip = async () => {
    try {
      if (downloadUrl) {
        window.open(downloadUrl);
        return;
      }
      setLoading(true);
      let resp;
      if (uploadedFiles) {
        const form = new FormData();
        for (let i = 0; i < uploadedFiles.length; i++) {
          form.append('files', uploadedFiles[i], uploadedFiles[i].name);
        }
        form.append('options', JSON.stringify(options));
        if (createTable) form.append('createTable', createTable);
        resp = await fetch('http://localhost:3001/generate', { method: 'POST', body: form });
      } else {
        resp = await fetch('http://localhost:3001/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ createTable, options })
        });
      }
      if (!resp.ok) {
        const data = await resp.json().catch(() => null);
        throw new Error((data && data.error) || 'Erro ao baixar ZIP');
      }
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);
      window.open(url);
    } catch (err) {
      setError(err.message || 'Erro ao baixar ZIP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <div style={{textAlign: 'center', marginBottom: 18}}>
        <img src={I4PRO_LOGO} alt="i4pro" style={{height: 54, marginBottom: 8}} />
      </div>
      <h2>Gerador de Procedures SQL</h2>
      <form onSubmit={handleSubmit} style={{ maxWidth: 600, margin: '0 auto', textAlign: 'left' }}>
  <FormInput value={createTable} onChange={handleChange} error={error && !createTable.trim()} onFilesChange={handleFilesChange} fileStatuses={fileStatuses} />
        {uploadedFiles && (
          <div style={{ fontSize: 13, color: '#374151' }}>
            Arquivos selecionados: {Array.from(uploadedFiles).map(f => f.name).join(', ')}
          </div>
        )}
  {/* files input in FormInput will call handleFilesChange */}
        <OptionsCheckbox options={options} onChange={handleCheckbox} />
        <button type="submit" disabled={loading} style={{ padding: '8px 24px', minWidth: 120 }}>
          {loading ? (
            <span><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Gerando...</span>
          ) : 'Gerar Scripts'}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: 8, background: '#fff', color: '#1a7c7c', border: '1.5px solid #1a7c7c', fontWeight: 500 }}
            onClick={() => {
            setCreateTable('');
            setOptions({ consulta: false, insert_update: false, delete: false, layout_importacao: false });
            setError('');
            setSuccess(false);
            setFiles([]);
            setDownloadUrl(null);
            setUploadedFiles(null);
            setFileStatuses({});
            
            setErrorsList([]);
          }}
        >
          Limpar
        </button>
        {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}
        {errorsList && errorsList.length > 0 && (
          <div style={{ color: '#b45309', marginTop: 12 }}>
            <strong>Atenção — erros encontrados:</strong>
            <ul>
              {errorsList.map((er, idx) => (
                <li key={idx}>{er.file}{er.table ? ` (tabela: ${er.table})` : ''}: {er.message}</li>
              ))}
            </ul>
          </div>
        )}
        {success && !error && (
          <div style={{ color: 'green', marginTop: 12 }}>Scripts gerados com sucesso!</div>
        )}
      </form>
      {/* Botão de download ZIP: visível após sucesso; usa handleDownloadZip que solicita o binário quando necessário */}
      {success && (
        <div style={{ textAlign: 'center', marginTop: files.length > 0 ? 0 : 32 }}>
          <button
            className="btn btn-primary"
            style={{ minWidth: 160, marginBottom: files.length > 0 ? 18 : 0 }}
            type="button"
            onClick={handleDownloadZip}
            disabled={loading}
          >
            {loading ? 'Processando...' : 'Baixar todos (.zip)'}
          </button>
        </div>
      )}
      <FilesTable files={files} errors={errorsList} onDownloadZip={handleDownloadZip} />
    </div>
  );
}

export default App;
