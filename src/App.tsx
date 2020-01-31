import React from "react";
import PDFFiller from "./components/PDFFiller";
import styles from "./App.module.css";

const App: React.FC = () => {
  return (
    <div className={styles.App}>
      <PDFFiller template="ca-santa-clara" />
    </div>
  );
};

export default App;
