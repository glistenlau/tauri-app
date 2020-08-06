import React from 'react';
import logo from './logo.svg';
import { promisified } from 'tauri/api/tauri';
import './App.css';

function App() {
  const [key, setKey] = React.useState("");
  const [val, setVal] = React.useState("");
  const [result, setResult] = React.useState("");

  const handleKeyChange = React.useCallback((event) => {
    setKey(event.target.value);
  },[]);

  const handleValChange = React.useCallback((event) => {
    setVal(event.target.value);
  },[]);

  const handleClickGet = React.useCallback(async () => {
    try {
      const res:any = await promisified({
        cmd: 'executeRocksDB',
        action: 'get',
        key,
        val,
      });  
      setResult(res);
    } catch (e) {
      setResult(e);
    }
  }, [key, val]);

  const handleClickPut = React.useCallback(async () => {
    try {
      const res:any = await promisified({
        cmd: 'executeRocksDB',
        action: 'put',
        key,
        val,
      });  
      setResult(res);
    } catch (e) {
      setResult(e);
    }  
  }, [key, val]);
  
  return (
    <div className="App">
      <input type="text" value={key} onChange={handleKeyChange}/>
      <input type="text" value={val} onChange={handleValChange}/>
      <button onClick={handleClickGet}>
        Get
      </button>
      <button onClick={handleClickPut}>
        Put
      </button>
      <br/>
      {result}
    </div>
  );
}

export default App;
