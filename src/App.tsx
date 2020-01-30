import React from "react";
import PDFFiller from "./components/PDFFiller";

const App: React.FC = () => {
  return (
    <div className="App">
      <PDFFiller template="ca-santa-clara" />
    </div>
  );
};

export default App;
