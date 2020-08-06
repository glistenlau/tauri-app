use oracle::Connection;

pub fn main() -> Result<(), oracle::Error> {
  let conn;
  let connect_string = format!("(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST={})(PORT={}))(CONNECT_DATA=(SERVER=DEDICATED)(SID={})))", "localhost", "1521", "anaconda");
  match Connection::connect("ANACONDA", "ANACONDA", connect_string) {
    Ok(connection) => conn = connection,
    Err(e) => {
      println!("Connect oracle failed: {}", e);
      return Ok(());
    }
  }

  let sql = "select * from greenco.account";

  // Select a table with a bind variable.
  println!("---------------|---------------|---------------|");
  match conn.query(sql, &[]) {
    Ok(rows) => {
      println!("Query succeed.");
      for info in rows.column_info() {
        print!(" {:14}|", info);
      }
      for row_result in rows {
        if let Ok(row) = row_result {
          // get a column value by position (0-based)
          let ename: String = row.get(0)?;
          // get a column by name (case-insensitive)
          let sal: String = row.get(1)?;

          println!(" {:14}| {:>10}    |", ename, sal);
        } else {
          println!("row error.");
        }
      }
    }
    Err(e) => {
      println!("Query failed: {}", e);
    }
  }
  Ok(())
}
