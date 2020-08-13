import React from "react";
import logo from "./logo.svg";
import { promisified } from "tauri/api/tauri";
import "./App.css";

import Oracle from "./apis/oracle";
import Postgres from "./apis/postgres";
import rocksDB from "./apis/dataStore";

function App() {
  const [key, setKey] = React.useState("select * from greenco.account where id in (SELECT * FROM TABLE(CAST(? AS ANACONDA.IDArrayType)))");
  const [val, setVal] = React.useState("");
  const [result, setResult] = React.useState("");

  const handleKeyChange = React.useCallback((event) => {
    setKey(event.target.value);
  }, []);

  const handleValChange = React.useCallback((event) => {
    setVal(event.target.value);
  }, []);

  const handleClickGet = React.useCallback(async () => {
    try {
      const res: any = await rocksDB.getItem(key);
      console.log("get result: ", res);
      setResult(res);
    } catch (e) {
      setResult(e);
    }
  }, [key]);

  const handleClickPut = React.useCallback(async () => {
    try {
      const res: any = await rocksDB.setItem(key, val);
      console.log("put result: ", res);
      setResult(res);
    } catch (e) {
      setResult(e);
    }
  }, [key, val]);

  const handleClickOracle = React.useCallback(async () => {
    try {
      const params = val ? [[1, 2, 3]]: [];
      const res: any = await Oracle.execute(key, params);
      console.log("get rsp:", res);
      setResult(res);
    } catch (e) {
      setResult(e);
    }
  }, [key, val]);

  const handleClickPostgres = React.useCallback(async () => {
    try {
      const params = val ? [val]: [];
      const res: any = await Postgres.execute(key, params);
      console.log("get rsp:", res);
      setResult(res);
    } catch (e) {
      setResult(e);
    }
  }, [key, val]);

  return (
    <div className="App">
      <textarea rows={5} value={key} onChange={handleKeyChange} />
      <textarea rows={5} value={val} onChange={handleValChange} />
      <button onClick={handleClickGet}>Get</button>
      <button onClick={handleClickPut}>Put</button>
      <button onClick={handleClickOracle}>Execute Oracle</button>
      <button onClick={handleClickPostgres}>Execute Postgres</button>
      <br />
      {`${result}`}
    </div>
  );
}

export default App;
